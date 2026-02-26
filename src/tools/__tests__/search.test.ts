import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchHandler, searchSchema, formatSources, isSearchResultPoor } from '../search.js';

vi.mock('../../lib/gateway.js', () => ({
  generate: vi.fn(),
}));

import { generate } from '../../lib/gateway.js';

const mockGenerate = vi.mocked(generate);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('search', () => {
  describe('searchSchema', () => {
    it('query のみでデフォルト値が適用される', () => {
      const result = searchSchema.parse({ query: 'test query' });
      expect(result.query).toBe('test query');
      expect(result.model).toBe('google/gemini-3-flash');
      expect(result.max_tokens).toBeUndefined();
      expect(result.include_sources).toBe(false);
    });

    it('query が空文字でエラー', () => {
      expect(() => searchSchema.parse({ query: '' })).toThrow();
    });

    it('include_sources を指定できる', () => {
      const result = searchSchema.parse({ query: 'test', include_sources: true });
      expect(result.include_sources).toBe(true);
    });
  });

  describe('searchHandler', () => {
    it('無効なモデルIDでエラーレスポンスを返す', async () => {
      const result = await searchHandler({
        query: 'test',
        model: 'invalid/model',
      });
      expect(result.content[0].text).toContain('Unknown model');
      expect(result).toHaveProperty('isError', true);
    });

    it('検索非対応モデルでエラーレスポンスを返す', async () => {
      const result = await searchHandler({
        query: 'test',
        model: 'openai/gpt-5-nano',
      });
      expect(result.content[0].text).toContain('does not support search');
      expect(result).toHaveProperty('isError', true);
    });

    it('検索対応モデルで generate を呼び出す', async () => {
      mockGenerate.mockResolvedValue({
        response: { content: [{ type: 'text', text: 'search result' }] },
        durationMs: 200,
      });

      const result = await searchHandler({
        query: 'latest news',
        model: 'perplexity/sonar',

        include_sources: false,
      });
      expect(result.content[0].text).toBe('search result');
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'perplexity/sonar',
          useSearch: true,
        }),
      );
    });

    it('include_sources:true でソースがレスポンスに付加される', async () => {
      mockGenerate.mockResolvedValue({
        response: { content: [{ type: 'text', text: 'search result' }] },
        durationMs: 200,
        sources: [
          { title: 'Example Page', url: 'https://example.com', snippet: 'A snippet' },
          { title: 'Another Page', url: 'https://another.com', snippet: 'Another snippet' },
        ],
      });

      const result = await searchHandler({
        query: 'latest news',
        model: 'perplexity/sonar',

        include_sources: true,
      });
      const text = result.content[0].text;
      expect(text).toContain('search result');
      expect(text).toContain('**Sources**');
      expect(text).toContain('[Example Page](https://example.com)');
      expect(text).toContain('[Another Page](https://another.com)');
    });

    it('include_sources:true でもソースがない場合は付加しない', async () => {
      mockGenerate.mockResolvedValue({
        response: { content: [{ type: 'text', text: 'search result' }] },
        durationMs: 200,
      });

      const result = await searchHandler({
        query: 'latest news',
        model: 'perplexity/sonar',

        include_sources: true,
      });
      expect(result.content[0].text).toBe('search result');
      expect(result.content[0].text).not.toContain('Sources');
    });
  });

  describe('リトライ機能', () => {
    it('結果が正常な場合はリトライしない', async () => {
      mockGenerate.mockResolvedValue({
        response: { content: [{ type: 'text', text: 'valid search result' }] },
        durationMs: 200,
      });

      await searchHandler({ query: 'test', model: 'perplexity/sonar' });
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it('空レスポンスの場合はリトライする（デフォルト1回）', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          response: { content: [{ type: 'text', text: '' }] },
          durationMs: 200,
        })
        .mockResolvedValueOnce({
          response: { content: [{ type: 'text', text: 'retry result' }] },
          durationMs: 200,
        });

      const result = await searchHandler({ query: 'test', model: 'perplexity/sonar' });
      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toBe('retry result');
    });

    it('「見つかりませんでした」系パターンの場合はリトライする', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          response: { content: [{ type: 'text', text: '情報が見つかりませんでした' }] },
          durationMs: 200,
        })
        .mockResolvedValueOnce({
          response: { content: [{ type: 'text', text: 'retry result' }] },
          durationMs: 200,
        });

      const result = await searchHandler({ query: 'test', model: 'perplexity/sonar' });
      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toBe('retry result');
    });

    it('エラーレスポンスの場合はリトライする', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          response: { content: [{ type: 'text', text: 'Error: something failed' }] },
          durationMs: 0,
          isError: true,
        })
        .mockResolvedValueOnce({
          response: { content: [{ type: 'text', text: 'retry result' }] },
          durationMs: 200,
        });

      const result = await searchHandler({ query: 'test', model: 'perplexity/sonar' });
      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toBe('retry result');
    });

    it('max_retries:0 でリトライしない', async () => {
      mockGenerate.mockResolvedValue({
        response: { content: [{ type: 'text', text: '' }] },
        durationMs: 200,
      });

      await searchHandler({ query: 'test', model: 'perplexity/sonar', max_retries: 0 });
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it('max_retries:2 で最大2回リトライ（全て失敗時も3回で打ち止め）', async () => {
      mockGenerate.mockResolvedValue({
        response: { content: [{ type: 'text', text: '' }] },
        durationMs: 200,
      });

      await searchHandler({ query: 'test', model: 'perplexity/sonar', max_retries: 2 });
      // 初回 + 最大2リトライ = 合計3回
      expect(mockGenerate).toHaveBeenCalledTimes(3);
    });

    it('1回目失敗 → リトライ → 失敗 → 最後の結果をそのまま返す', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          response: { content: [{ type: 'text', text: 'Error: first attempt failed' }] },
          durationMs: 0,
          isError: true,
        })
        .mockResolvedValueOnce({
          response: { content: [{ type: 'text', text: 'Error: retry also failed' }] },
          durationMs: 0,
          isError: true,
        });

      // max_retries:1（デフォルト）で1回リトライ、失敗しても最後の結果を返す
      const result = await searchHandler({ query: 'test', model: 'perplexity/sonar' });
      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toBe('Error: retry also failed');
    });
  });

  describe('isSearchResultPoor', () => {
    it('空文字は不十分と判定する', () => {
      expect(isSearchResultPoor('')).toBe(true);
      expect(isSearchResultPoor('   ')).toBe(true);
    });

    it('isError:true は不十分と判定する', () => {
      expect(isSearchResultPoor('some text', true)).toBe(true);
    });

    it('日本語の「見つかりませんでした」パターンを検出する', () => {
      expect(isSearchResultPoor('情報が見つかりませんでした')).toBe(true);
      expect(isSearchResultPoor('見つかりませんでした')).toBe(true);
      expect(isSearchResultPoor('該当する情報はありません')).toBe(true);
      expect(isSearchResultPoor('該当する結果が見つかりません')).toBe(true);
    });

    it('英語の「no results found」パターンを検出する', () => {
      expect(isSearchResultPoor('No results found')).toBe(true);
      expect(isSearchResultPoor('No information available')).toBe(true);
      expect(isSearchResultPoor("Couldn't find any results")).toBe(true);
      expect(isSearchResultPoor('Unable to find the requested information')).toBe(true);
      expect(isSearchResultPoor('Search returned no results')).toBe(true);
    });

    it('gateway の空レスポンスメッセージを検出する', () => {
      expect(isSearchResultPoor('（レスポンスが空でした）')).toBe(true);
    });

    it('10文字未満のテキストは不十分と判定する', () => {
      // 極端に短いレスポンスは検索失敗の可能性が高い
      expect(isSearchResultPoor('短い')).toBe(true);
      expect(isSearchResultPoor('ok')).toBe(true);
    });

    it('正常なレスポンスは不十分と判定しない', () => {
      expect(isSearchResultPoor('Here is the search result about TypeScript.')).toBe(false);
      expect(isSearchResultPoor('TypeScript 5.0 was released in March 2023.')).toBe(false);
    });
  });

  describe('formatSources', () => {
    it('タイトルとURLを持つソースをMarkdownリンクにフォーマット', () => {
      const result = formatSources([
        { title: 'Page A', url: 'https://a.com' },
        { title: 'Page B', url: 'https://b.com' },
      ]);
      expect(result).toContain('- [Page A](https://a.com)');
      expect(result).toContain('- [Page B](https://b.com)');
    });

    it('URLのみの場合はURLをそのまま表示', () => {
      const result = formatSources([{ url: 'https://only-url.com' }]);
      expect(result).toContain('- https://only-url.com');
    });

    it('重複URLを排除する', () => {
      const result = formatSources([
        { title: 'Page A', url: 'https://a.com' },
        { title: 'Page A Copy', url: 'https://a.com' },
      ]);
      const matches = result.match(/https:\/\/a\.com/g);
      expect(matches).toHaveLength(1);
    });

    it('URLがないソースを除外する', () => {
      const result = formatSources([{ title: 'No URL' }]);
      expect(result).toBe('');
    });

    it('空配列で空文字を返す', () => {
      expect(formatSources([])).toBe('');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchHandler, searchSchema, formatSources } from '../search.js';

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

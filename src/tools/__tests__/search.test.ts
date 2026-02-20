import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchHandler, searchSchema } from '../search.js';

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
      expect(result.max_tokens).toBe(2000);
    });

    it('query が空文字でエラー', () => {
      expect(() => searchSchema.parse({ query: '' })).toThrow();
    });
  });

  describe('searchHandler', () => {
    it('無効なモデルIDでエラーレスポンスを返す', async () => {
      const result = await searchHandler({
        query: 'test',
        model: 'invalid/model',
        max_tokens: 2000,
      });
      expect(result.content[0].text).toContain('Unknown model');
      expect(result).toHaveProperty('isError', true);
    });

    it('検索非対応モデルでエラーレスポンスを返す', async () => {
      const result = await searchHandler({
        query: 'test',
        model: 'openai/gpt-5-nano',
        max_tokens: 2000,
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
        max_tokens: 2000,
      });
      expect(result.content[0].text).toBe('search result');
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'perplexity/sonar',
          useSearch: true,
        }),
      );
    });
  });
});

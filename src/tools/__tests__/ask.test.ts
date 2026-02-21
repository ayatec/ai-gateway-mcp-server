import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askHandler, askSchema } from '../ask.js';

// gateway モジュールをモック
vi.mock('../../lib/gateway.js', () => ({
  generate: vi.fn(),
}));

import { generate } from '../../lib/gateway.js';

const mockGenerate = vi.mocked(generate);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ask', () => {
  describe('askSchema', () => {
    it('question のみでデフォルト値が適用される', () => {
      const result = askSchema.parse({ question: 'test' });
      expect(result.question).toBe('test');
      expect(result.model).toBe('openai/gpt-5.2');
      expect(result.max_tokens).toBeUndefined();
      expect(result.context).toBeUndefined();
    });

    it('全パラメータを指定できる', () => {
      const result = askSchema.parse({
        question: 'test',
        model: 'anthropic/claude-opus-4.6',
        context: 'some context',
        max_tokens: 8000,
      });
      expect(result.model).toBe('anthropic/claude-opus-4.6');
      expect(result.context).toBe('some context');
      expect(result.max_tokens).toBe(8000);
    });

    it('question が空文字でエラー', () => {
      expect(() => askSchema.parse({ question: '' })).toThrow();
    });

    it('max_tokens が負数でエラー', () => {
      expect(() => askSchema.parse({ question: 'test', max_tokens: -1 })).toThrow();
    });
  });

  describe('askHandler', () => {
    it('無効なモデルIDでエラーレスポンスを返す', async () => {
      const result = await askHandler({
        question: 'test',
        model: 'invalid/model',
      });
      expect(result.content[0].text).toContain('Unknown model');
      expect(result).toHaveProperty('isError', true);
    });

    it('有効なモデルで generate を呼び出す', async () => {
      mockGenerate.mockResolvedValue({
        response: { content: [{ type: 'text', text: 'mocked answer' }] },
        durationMs: 100,
      });

      const result = await askHandler({
        question: 'What is TypeScript?',
        model: 'openai/gpt-5.2',
      });
      expect(result.content[0].text).toBe('mocked answer');
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'openai/gpt-5.2',
          prompt: 'What is TypeScript?',
          maxTokens: undefined,
        }),
      );
    });

    it('context がある場合プロンプトに結合される', async () => {
      mockGenerate.mockResolvedValue({
        response: { content: [{ type: 'text', text: 'answer' }] },
        durationMs: 50,
      });

      await askHandler({
        question: 'What does this do?',
        model: 'openai/gpt-5.2',
        context: 'const x = 1;',
      });
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'const x = 1;\n\nWhat does this do?',
        }),
      );
    });
  });
});

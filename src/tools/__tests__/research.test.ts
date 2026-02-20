import { describe, it, expect, vi, beforeEach } from 'vitest';
import { researchHandler, researchSchema } from '../research.js';

vi.mock('../../lib/gateway.js', () => ({
  generate: vi.fn(),
  generateParallel: vi.fn(),
}));

import { generate, generateParallel } from '../../lib/gateway.js';

const mockGenerate = vi.mocked(generate);
const mockGenerateParallel = vi.mocked(generateParallel);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('research', () => {
  describe('researchSchema', () => {
    it('query のみでデフォルト値が適用される', () => {
      const result = researchSchema.parse({ query: 'test' });
      expect(result.query).toBe('test');
      expect(result.mode).toBe('search');
      expect(result.synthesize).toBe(true);
      expect(result.models).toBeUndefined();
    });

    it('全パラメータを指定できる', () => {
      const result = researchSchema.parse({
        query: 'test',
        mode: 'ask',
        models: ['openai/gpt-5.2', 'anthropic/claude-opus-4.6'],
        synthesize: false,
        max_tokens: 3000,
      });
      expect(result.mode).toBe('ask');
      expect(result.models).toEqual(['openai/gpt-5.2', 'anthropic/claude-opus-4.6']);
      expect(result.synthesize).toBe(false);
    });

    it('models が1つだけでエラー（最小2）', () => {
      expect(() => researchSchema.parse({ query: 'test', models: ['openai/gpt-5.2'] })).toThrow();
    });

    it('models が5つでエラー（最大4）', () => {
      expect(() =>
        researchSchema.parse({
          query: 'test',
          models: ['a', 'b', 'c', 'd', 'e'],
        }),
      ).toThrow();
    });
  });

  describe('researchHandler', () => {
    it('無効なモデルIDでエラーレスポンスを返す', async () => {
      const result = await researchHandler({
        query: 'test',
        mode: 'ask',
        models: ['invalid/model', 'also/invalid'],
        synthesize: true,
        max_tokens: 4000,
      });
      expect(result.content[0].text).toContain('Unknown models');
      expect(result).toHaveProperty('isError', true);
    });

    it('searchモードで検索非対応モデルを指定するとエラー', async () => {
      const result = await researchHandler({
        query: 'test',
        mode: 'search',
        models: ['openai/gpt-5-nano', 'perplexity/sonar'],
        synthesize: true,
        max_tokens: 2000,
      });
      expect(result.content[0].text).toContain('do not support search');
      expect(result).toHaveProperty('isError', true);
    });

    it('synthesize:false で各モデルの回答を並べて返す', async () => {
      mockGenerateParallel.mockResolvedValue([
        {
          modelId: 'openai/gpt-5.2',
          result: {
            response: { content: [{ type: 'text', text: 'OpenAI response' }] },
            durationMs: 1000,
          },
        },
        {
          modelId: 'anthropic/claude-opus-4.6',
          result: {
            response: { content: [{ type: 'text', text: 'Anthropic response' }] },
            durationMs: 1200,
          },
        },
      ]);

      const result = await researchHandler({
        query: 'Compare approaches',
        mode: 'ask',
        models: ['openai/gpt-5.2', 'anthropic/claude-opus-4.6'],
        synthesize: false,
        max_tokens: 4000,
      });

      const text = result.content[0].text;
      expect(text).toContain('openai/gpt-5.2');
      expect(text).toContain('anthropic/claude-opus-4.6');
      expect(text).toContain('OpenAI response');
      expect(text).toContain('Anthropic response');
      // synthesize:false なので generate（統合）は呼ばれない
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it('synthesize:true で統合レスポンスを返す', async () => {
      mockGenerateParallel.mockResolvedValue([
        {
          modelId: 'openai/gpt-5.2',
          result: {
            response: { content: [{ type: 'text', text: 'Response A' }] },
            durationMs: 800,
          },
        },
        {
          modelId: 'anthropic/claude-opus-4.6',
          result: {
            response: { content: [{ type: 'text', text: 'Response B' }] },
            durationMs: 900,
          },
        },
      ]);

      mockGenerate.mockResolvedValue({
        response: { content: [{ type: 'text', text: 'Synthesized answer' }] },
        durationMs: 500,
      });

      const result = await researchHandler({
        query: 'test question',
        mode: 'ask',
        models: ['openai/gpt-5.2', 'anthropic/claude-opus-4.6'],
        synthesize: true,
        max_tokens: 4000,
      });

      expect(result.content[0].text).toBe('Synthesized answer');
      // 並列リクエスト + 統合リクエストが呼ばれる
      expect(mockGenerateParallel).toHaveBeenCalledTimes(1);
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });
  });
});

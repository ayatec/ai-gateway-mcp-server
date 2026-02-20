import { describe, it, expect } from 'vitest';
import { listModelsHandler, listModelsSchema } from '../list-models.js';

describe('list-models', () => {
  describe('listModelsSchema', () => {
    it('パラメータなしで有効', () => {
      const result = listModelsSchema.parse({});
      expect(result.provider).toBeUndefined();
      expect(result.capability).toBeUndefined();
    });

    it('provider のみ指定', () => {
      const result = listModelsSchema.parse({ provider: 'openai' });
      expect(result.provider).toBe('openai');
    });

    it('capability のみ指定', () => {
      const result = listModelsSchema.parse({ capability: 'search' });
      expect(result.capability).toBe('search');
    });

    it('無効な provider でエラー', () => {
      expect(() => listModelsSchema.parse({ provider: 'invalid' })).toThrow();
    });

    it('無効な capability でエラー', () => {
      expect(() => listModelsSchema.parse({ capability: 'invalid' })).toThrow();
    });
  });

  describe('listModelsHandler', () => {
    it('フィルタなしで全モデルを返す', async () => {
      const result = await listModelsHandler({});
      expect(result.content[0].text).toContain('Available Models');
      expect(result.content[0].text).toContain('Total:');
    });

    it('provider フィルタで絞り込める', async () => {
      const result = await listModelsHandler({ provider: 'openai' });
      expect(result.content[0].text).toContain('provider: openai');
      expect(result.content[0].text).toContain('openai');
      // 他プロバイダーのセクションヘッダがないことを確認
      expect(result.content[0].text).not.toContain('## anthropic');
    });

    it('capability フィルタで絞り込める', async () => {
      const result = await listModelsHandler({ capability: 'search' });
      expect(result.content[0].text).toContain('capability: search');
    });

    it('provider + capability の複合フィルタ', async () => {
      const result = await listModelsHandler({ provider: 'openai', capability: 'fast' });
      expect(result.content[0].text).toContain('provider: openai');
      expect(result.content[0].text).toContain('capability: fast');
    });
  });
});

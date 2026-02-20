import { describe, it, expect } from 'vitest';
import {
  getModel,
  getAllModels,
  getModelsByProvider,
  getModelsByCapability,
  getSearchCapableModels,
  isValidModelId,
  getAllModelIds,
} from '../model-registry.js';

describe('model-registry', () => {
  describe('getAllModels', () => {
    it('全モデルを返す', () => {
      const models = getAllModels();
      expect(models.length).toBeGreaterThan(0);
      // 各モデルが必須フィールドを持つ
      for (const m of models) {
        expect(m.id).toBeTruthy();
        expect(m.provider).toBeTruthy();
        expect(m.displayName).toBeTruthy();
        expect(m.contextWindow).toBeGreaterThan(0);
        expect(m.pricing.input).toBeGreaterThanOrEqual(0);
        expect(m.pricing.output).toBeGreaterThanOrEqual(0);
      }
    });

    it('元の配列を変更しても影響しない（コピーを返す）', () => {
      const models1 = getAllModels();
      const len = models1.length;
      models1.pop();
      const models2 = getAllModels();
      expect(models2.length).toBe(len);
    });
  });

  describe('getModel', () => {
    it('有効なIDでモデルを取得できる', () => {
      const model = getModel('openai/gpt-5.2');
      expect(model.id).toBe('openai/gpt-5.2');
      expect(model.provider).toBe('openai');
    });

    it('無効なIDでエラーを投げる', () => {
      expect(() => getModel('invalid/model' as never)).toThrow('不明なモデル');
    });
  });

  describe('getModelsByProvider', () => {
    it('プロバイダーでフィルタできる', () => {
      const openaiModels = getModelsByProvider('openai');
      expect(openaiModels.length).toBeGreaterThan(0);
      expect(openaiModels.every((m) => m.provider === 'openai')).toBe(true);
    });

    it('全プロバイダーに少なくとも1つのモデルがある', () => {
      for (const provider of ['openai', 'anthropic', 'google', 'perplexity'] as const) {
        const models = getModelsByProvider(provider);
        expect(models.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getModelsByCapability', () => {
    it('search で検索対応モデルを返す', () => {
      const models = getModelsByCapability('search');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.search)).toBe(true);
    });

    it('reasoning で推論対応モデルを返す', () => {
      const models = getModelsByCapability('reasoning');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.reasoning)).toBe(true);
    });

    it('fast で高速モデルを返す', () => {
      const models = getModelsByCapability('fast');
      expect(models.every((m) => m.capabilities.fast)).toBe(true);
    });

    it('cheap で低コストモデルを返す', () => {
      const models = getModelsByCapability('cheap');
      expect(models.every((m) => m.capabilities.cheap)).toBe(true);
    });

    it('code でコーディング対応モデルを返す', () => {
      const models = getModelsByCapability('code');
      expect(models.every((m) => m.capabilities.coding)).toBe(true);
    });
  });

  describe('getSearchCapableModels', () => {
    it('検索対応モデルのみ返す', () => {
      const models = getSearchCapableModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.capabilities.search)).toBe(true);
    });
  });

  describe('isValidModelId', () => {
    it('有効なモデルIDでtrueを返す', () => {
      expect(isValidModelId('openai/gpt-5.2')).toBe(true);
      expect(isValidModelId('perplexity/sonar')).toBe(true);
    });

    it('無効なモデルIDでfalseを返す', () => {
      expect(isValidModelId('invalid/model')).toBe(false);
      expect(isValidModelId('')).toBe(false);
    });
  });

  describe('getAllModelIds', () => {
    it('全モデルIDを返す', () => {
      const ids = getAllModelIds();
      const models = getAllModels();
      expect(ids.length).toBe(models.length);
      // 全IDがprovider/name形式
      for (const id of ids) {
        expect(id).toMatch(/^[a-z]+\/.+$/);
      }
    });
  });
});

import type { ModelDefinition } from '../types/index.js';

/** 推定コストを計算（入力・出力トークン数ベース） */
export function estimateCost(
  model: ModelDefinition,
  inputTokens: number,
  outputTokens: number,
): { inputCost: number; outputCost: number; total: number } {
  const inputCost = (inputTokens / 1_000_000) * model.pricing.input;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.output;
  return {
    inputCost,
    outputCost,
    total: inputCost + outputCost,
  };
}

/** 価格をフォーマット */
export function formatCost(dollars: number): string {
  if (dollars < 0.01) {
    return `$${dollars.toFixed(4)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

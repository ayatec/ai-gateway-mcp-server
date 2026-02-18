import { gateway, type LanguageModel } from 'ai';

// デフォルトの gateway インスタンス（AI_GATEWAY_API_KEY 環境変数で自動認証）
export { gateway };

/** モデル参照文字列（"provider/model"）から SDK モデルインスタンスを解決 */
export function resolveModel(modelRef: string): LanguageModel {
  return gateway(modelRef);
}

// プロバイダー識別子
export type ProviderId = 'openai' | 'anthropic' | 'google' | 'perplexity';

// モデル識別子（プロバイダー/モデル名 形式）
export type ModelId =
  // OpenAI
  | 'openai/gpt-5.2'
  | 'openai/gpt-5.2-codex'
  | 'openai/gpt-5-mini'
  | 'openai/gpt-5-nano'
  | 'openai/gpt-oss-120b'
  // Anthropic
  | 'anthropic/claude-opus-4.6'
  | 'anthropic/claude-sonnet-4.6'
  | 'anthropic/claude-haiku-4.5'
  // Google
  | 'google/gemini-3-flash'
  | 'google/gemini-3.1-pro-preview'
  // Perplexity
  | 'perplexity/sonar'
  | 'perplexity/sonar-pro'
  | 'perplexity/sonar-reasoning-pro'
  | 'perplexity/sonar-deep-research';

// モデル能力
export interface ModelCapabilities {
  search: boolean;
  reasoning: boolean;
  coding: boolean;
  fast: boolean;
  cheap: boolean;
}

// list_models の capability フィルタ値
export type CapabilityFilter = 'search' | 'reasoning' | 'fast' | 'cheap' | 'code';

// 価格情報（per 1M tokens）
export interface ModelPricing {
  input: number;
  cachedInput?: number;
  output: number;
}

// 検索コスト情報
export interface SearchCostInfo {
  type: 'per_request' | 'token_based' | 'included';
  costPerRequest?: number;
  description: string;
}

// モデル定義
export interface ModelDefinition {
  id: ModelId;
  provider: ProviderId;
  displayName: string;
  contextWindow: number;
  capabilities: ModelCapabilities;
  pricing: ModelPricing;
  searchCost?: SearchCostInfo;
  maxOutputTokens?: number;
  releasedAt?: string;
  note?: string;
}

// MCP ツールレスポンス（MCP SDKのインデックスシグネチャ要件に対応）
export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
}

import type { ModelDefinition, ModelId, ProviderId, CapabilityFilter } from '../types/index.js';

// 全モデル定義（計画v5の価格・能力情報に準拠）
const models: ModelDefinition[] = [
  // --- OpenAI ---
  {
    id: 'openai/gpt-5.2',
    provider: 'openai',
    displayName: 'GPT-5.2',
    contextWindow: 400_000,
    capabilities: { search: true, reasoning: true, coding: true, fast: false, cheap: false },
    pricing: { input: 1.75, cachedInput: 0.4375, output: 14.0 },
    searchCost: {
      type: 'token_based',
      description: '検索結果がinputトークンに含まれる（膨張大）',
    },
    maxOutputTokens: 128000,
    releasedAt: '2025-12-11',
    note: 'OpenAI最上位。推論・コード・検索すべて高水準でaskデフォルト、キャッシュ利用時のコスパも良い',
  },
  {
    id: 'openai/gpt-5.2-codex',
    provider: 'openai',
    displayName: 'GPT-5.2 Codex',
    contextWindow: 400_000,
    capabilities: { search: true, reasoning: true, coding: true, fast: false, cheap: false },
    pricing: { input: 1.75, cachedInput: 0.4375, output: 14.0 },
    searchCost: {
      type: 'token_based',
      description: '検索結果がinputトークンに含まれる（膨張大）',
    },
    maxOutputTokens: 128000,
    releasedAt: '2026-01-14',
    note: 'GPT-5.2ベースのコード特化版。リファクタ・マイグレーション等の実務的な開発タスクに最適',
  },
  {
    id: 'openai/gpt-5-mini',
    provider: 'openai',
    displayName: 'GPT-5 Mini',
    contextWindow: 400_000,
    capabilities: { search: true, reasoning: true, coding: true, fast: true, cheap: true },
    pricing: { input: 0.25, cachedInput: 0.0625, output: 2.0 },
    searchCost: {
      type: 'token_based',
      description: '検索結果がinputトークンに含まれる（膨張大）',
    },
    maxOutputTokens: 128000,
    releasedAt: '2025-08-07',
    note: '低コスト汎用モデル。コーディングに特に強く、推論・検索も対応する万能型',
  },
  {
    id: 'openai/gpt-5-nano',
    provider: 'openai',
    displayName: 'GPT-5 Nano',
    contextWindow: 400_000,
    capabilities: { search: false, reasoning: false, coding: false, fast: true, cheap: true },
    pricing: { input: 0.05, cachedInput: 0.0125, output: 0.4 },
    maxOutputTokens: 128000,
    releasedAt: '2025-08-07',
    note: '最安モデル。シンプルな生成・分類向けで推論・検索は非対応',
  },
  {
    id: 'openai/gpt-oss-120b',
    provider: 'openai',
    displayName: 'GPT-OSS 120B',
    contextWindow: 131_000,
    capabilities: { search: false, reasoning: true, coding: true, fast: true, cheap: true },
    pricing: { input: 0.1, cachedInput: 0.025, output: 0.5 },
    maxOutputTokens: 32768,
    releasedAt: '2025-08-05',
    note: 'OpenAI公開のOSSモデル。低コストで推論・コード対応、検索非対応',
  },
  // --- Anthropic ---
  {
    id: 'anthropic/claude-opus-4.6',
    provider: 'anthropic',
    displayName: 'Claude Opus 4.6',
    contextWindow: 1_000_000,
    capabilities: { search: true, reasoning: true, coding: true, fast: false, cheap: false },
    pricing: { input: 5.0, cachedInput: 0.5, output: 25.0 },
    searchCost: {
      type: 'per_request',
      costPerRequest: 0.01,
      description: '$0.01/検索 + 検索結果がinputに含まれる（Dynamic Filtering）',
    },
    maxOutputTokens: 128000,
    releasedAt: '2026-02-05',
    note: 'Anthropic最上位。SWE-bench最強クラスでコーディング精度が突出、1Mコンテキスト',
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4.6',
    contextWindow: 1_000_000,
    capabilities: { search: true, reasoning: true, coding: true, fast: false, cheap: false },
    pricing: { input: 3.0, cachedInput: 0.3, output: 15.0 },
    searchCost: {
      type: 'per_request',
      costPerRequest: 0.01,
      description: '$0.01/検索 + 検索結果がinputに含まれる（Dynamic Filtering）',
    },
    maxOutputTokens: 128000,
    releasedAt: '2026-02-17',
    note: 'Opusの約1/2コストで高品質。エージェント用途やコスパ重視の汎用タスク向け、1Mコンテキスト',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    provider: 'anthropic',
    displayName: 'Claude Haiku 4.5',
    contextWindow: 200_000,
    capabilities: { search: true, reasoning: false, coding: true, fast: true, cheap: true },
    pricing: { input: 1.0, cachedInput: 0.1, output: 5.0 },
    searchCost: {
      type: 'per_request',
      costPerRequest: 0.01,
      description: '$0.01/検索 + 検索結果がinputに含まれる（Dynamic Filtering）',
    },
    maxOutputTokens: 64000,
    releasedAt: '2025-10-15',
    note: 'Anthropic軽量モデル。低レイテンシで検索・コード対応、高速処理向け',
  },
  // --- Google ---
  {
    id: 'google/gemini-3-flash',
    provider: 'google',
    displayName: 'Gemini 3 Flash',
    contextWindow: 1_000_000,
    capabilities: { search: true, reasoning: false, coding: true, fast: true, cheap: true },
    pricing: { input: 0.5, cachedInput: 0.125, output: 3.0 },
    searchCost: {
      type: 'per_request',
      costPerRequest: 0.014,
      description: '$0.014/クエリ、inputトークン膨張なし、無料枠5,000/月',
    },
    maxOutputTokens: 8192,
    releasedAt: '2025-12-17',
    note: 'Google Search grounding対応で検索精度が高い。コーディングも強く、searchデフォルト、1Mコンテキスト',
  },
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    provider: 'google',
    displayName: 'Gemini 3.1 Flash-Lite Preview',
    contextWindow: 1_000_000,
    capabilities: { search: false, reasoning: false, coding: false, fast: true, cheap: true },
    pricing: { input: 0.25, cachedInput: 0.0625, output: 1.5 },
    maxOutputTokens: 65535,
    releasedAt: '2026-03-03',
    note: '最速クラスのスループット。低コストで推論・知識に強いが検索非対応、preview版',
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    provider: 'google',
    displayName: 'Gemini 3.1 Pro Preview',
    contextWindow: 1_000_000,
    capabilities: { search: true, reasoning: true, coding: true, fast: false, cheap: false },
    pricing: { input: 2.0, cachedInput: 0.5, output: 12.0 },
    searchCost: {
      type: 'per_request',
      costPerRequest: 0.014,
      description: '$0.014/クエリ、inputトークン膨張なし、無料枠5,000/月',
    },
    maxOutputTokens: 65536,
    releasedAt: '2026-02-19',
    note: 'Google最上位。科学推論・マルチモーダルに強く、Gemini 3 Proの後継、1Mコンテキスト',
  },
  // --- Perplexity ---
  {
    id: 'perplexity/sonar',
    provider: 'perplexity',
    displayName: 'Perplexity Sonar',
    contextWindow: 127_000,
    capabilities: { search: true, reasoning: false, coding: false, fast: true, cheap: true },
    pricing: { input: 1.0, output: 1.0 },
    searchCost: {
      type: 'per_request',
      costPerRequest: 0.005,
      description: '$0.005/検索リクエスト、inputトークン膨張なし',
    },
    maxOutputTokens: 16384,
    releasedAt: '2025-01-21',
    note: '検索特化で最安。単発の事実確認やニュース検索に最適、低レイテンシ',
  },
  {
    id: 'perplexity/sonar-pro',
    provider: 'perplexity',
    displayName: 'Perplexity Sonar Pro',
    contextWindow: 200_000,
    capabilities: { search: true, reasoning: false, coding: false, fast: false, cheap: false },
    pricing: { input: 3.0, output: 15.0 },
    searchCost: {
      type: 'per_request',
      costPerRequest: 0.005,
      description: '$0.005/検索リクエスト（最大5回の内部検索）、inputトークン膨張なし',
    },
    maxOutputTokens: 16384,
    releasedAt: '2025-01-21',
    note: '高精度検索。最大5回の内部検索で深掘りでき、技術ドキュメントの詳細調査向け',
  },
  {
    id: 'perplexity/sonar-reasoning-pro',
    provider: 'perplexity',
    displayName: 'Perplexity Sonar Reasoning Pro',
    contextWindow: 127_000,
    capabilities: { search: true, reasoning: true, coding: false, fast: false, cheap: false },
    pricing: { input: 2.0, output: 8.0 },
    searchCost: {
      type: 'per_request',
      costPerRequest: 0.005,
      description: '$0.005/検索リクエスト（最大5回の内部検索）、inputトークン膨張なし',
    },
    maxOutputTokens: 16384,
    releasedAt: '2025-03-07',
    note: '推論+検索のハイブリッド。根拠付きの分析が必要な複雑な調査向け',
  },
];

// インデックスで高速アクセス
const modelMap = new Map<ModelId, ModelDefinition>(models.map((m) => [m.id, m]));

/** モデルIDからモデル定義を取得 */
export function getModel(id: ModelId): ModelDefinition {
  const model = modelMap.get(id);
  if (!model) {
    throw new Error(`不明なモデル: ${id}`);
  }
  return model;
}

/** 全モデル一覧を取得 */
export function getAllModels(): ModelDefinition[] {
  return [...models];
}

/** プロバイダーでフィルタしたモデル一覧を取得 */
export function getModelsByProvider(provider: ProviderId): ModelDefinition[] {
  return models.filter((m) => m.provider === provider);
}

/** capability でフィルタしたモデル一覧を取得 */
export function getModelsByCapability(capability: CapabilityFilter): ModelDefinition[] {
  switch (capability) {
    case 'search':
      return models.filter((m) => m.capabilities.search);
    case 'reasoning':
      return models.filter((m) => m.capabilities.reasoning);
    case 'fast':
      return models.filter((m) => m.capabilities.fast);
    case 'cheap':
      return models.filter((m) => m.capabilities.cheap);
    case 'code':
      return models.filter((m) => m.capabilities.coding);
  }
}

/** 検索対応モデル一覧を取得 */
export function getSearchCapableModels(): ModelDefinition[] {
  return models.filter((m) => m.capabilities.search);
}

/** モデルIDの文字列が有効かチェック */
export function isValidModelId(id: string): id is ModelId {
  return modelMap.has(id as ModelId);
}

/** 全モデルID一覧 */
export function getAllModelIds(): ModelId[] {
  return models.map((m) => m.id);
}

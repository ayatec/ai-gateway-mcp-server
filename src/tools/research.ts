import { z } from 'zod';
import { generate, generateParallel } from '../lib/gateway.js';
import {
  isValidModelId,
  getAllModelIds,
  getSearchCapableModels,
  getModel,
} from '../lib/model-registry.js';
import type { ModelId, ToolResponse } from '../types/index.js';

// modeごとのデフォルトモデル
const DEFAULT_SEARCH_MODELS: ModelId[] = [
  'perplexity/sonar',
  'google/gemini-3-flash',
  'anthropic/claude-haiku-4.5',
  'openai/gpt-5-mini',
];
const DEFAULT_ASK_MODELS: ModelId[] = [
  'openai/gpt-5.2',
  'anthropic/claude-opus-4.6',
  'google/gemini-3-pro-preview',
  'perplexity/sonar-reasoning-pro',
];
const DEFAULT_SYNTHESIS_MODEL: ModelId = 'openai/gpt-5.2';

export const researchSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Research query, e.g. 'Compare React Server Components vs Astro Islands'"),
  mode: z
    .enum(['ask', 'search'])
    .default('search')
    .describe(
      'search: web research with grounding (default). ask: multi-model Q&A without web search, ideal for getting diverse perspectives on a question',
    ),
  models: z
    .array(z.string())
    .min(2)
    .max(4)
    .optional()
    .describe(
      '2-4 models to query in parallel. Defaults depend on mode — search: [perplexity/sonar, gemini-3-flash, claude-haiku-4.5, gpt-5-mini] (cost-effective, diversity-focused). ask: [gpt-5.2, claude-opus-4.6, gemini-3-pro-preview, sonar-reasoning-pro] (high-capability reasoning models from 4 providers)',
    ),
  synthesize: z
    .boolean()
    .default(true)
    .describe(
      "true: synthesize into one comprehensive answer. false: show each model's response side by side with cost and latency",
    ),
  synthesis_model: z
    .string()
    .optional()
    .describe(
      "Model for synthesis (only when synthesize:true), e.g. 'anthropic/claude-opus-4.6'. Default: openai/gpt-5.2",
    ),
  max_tokens: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Max output tokens per model in query phase (default: search=2000, ask=4000). Total fed to synthesis = models × max_tokens. Reasoning models use tokens for internal thinking, so their visible output may be shorter',
    ),
  synthesis_max_tokens: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Max output tokens for synthesis. Defaults to max_tokens × multiplier (search: ×3, ask: ×2)',
    ),
});

export async function researchHandler(
  args: z.infer<typeof researchSchema>,
  _extra?: unknown,
): Promise<ToolResponse> {
  const useSearch = args.mode === 'search';

  // モード別デフォルト解決
  const modelIds = args.models ?? (useSearch ? DEFAULT_SEARCH_MODELS : DEFAULT_ASK_MODELS);
  const maxTokens = args.max_tokens ?? (useSearch ? 2000 : 4000);

  // モデルIDバリデーション
  const invalidModels = modelIds.filter((m) => !isValidModelId(m));
  if (invalidModels.length > 0) {
    const allIds = getAllModelIds().join(', ');
    return {
      content: [
        {
          type: 'text',
          text: `Unknown models: ${invalidModels.join(', ')}\nAvailable: ${allIds}`,
        },
      ],
      isError: true,
    };
  }

  // searchモードの場合、検索非対応モデルをチェック
  if (useSearch) {
    const searchModelIds = new Set(getSearchCapableModels().map((m) => m.id));
    const nonSearchModels = modelIds.filter((m) => !searchModelIds.has(m as ModelId));
    if (nonSearchModels.length > 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Search mode: these models do not support search: ${nonSearchModels.join(', ')}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Stage 1: 全モデルに並列リクエスト
  const system = useSearch
    ? 'You are a research assistant. Provide accurate, up-to-date information with sources. Distinguish facts from speculation.'
    : undefined;

  const results = await generateParallel(
    modelIds.map((modelId) => ({
      modelId: modelId as ModelId,
      prompt: args.query,
      system,
      maxTokens,
      useSearch,
    })),
  );

  // synthesize:false → 各モデルの回答を並べて表示
  if (!args.synthesize) {
    const sections = results
      .map((r) => {
        const text = r.result.response.content[0]?.text ?? '(no result)';
        const modelDef = getModel(r.modelId);
        const latency = `${(r.result.durationMs / 1000).toFixed(1)}s`;
        const cost = `$${modelDef.pricing.input}/$${modelDef.pricing.output} per 1M tokens`;
        return `## ${r.modelId}\n**Latency**: ${latency} | **Pricing**: ${cost}\n\n${text}`;
      })
      .join('\n\n---\n\n');

    const header =
      `# Multi-Model ${args.mode === 'search' ? 'Search' : 'Q&A'}\n\n` +
      `**Query**: ${args.query}\n\n`;

    return {
      content: [{ type: 'text', text: header + sections }],
    };
  }

  // synthesize:true → 統合
  const sourceTexts = results
    .map((r) => {
      const text = r.result.response.content[0]?.text ?? '(no result)';
      return `## ${r.modelId}\n${text}`;
    })
    .join('\n\n---\n\n');

  const synthesisModelId = args.synthesis_model ?? DEFAULT_SYNTHESIS_MODEL;

  if (!isValidModelId(synthesisModelId)) {
    return {
      content: [{ type: 'text', text: `Unknown synthesis model: ${synthesisModelId}` }],
      isError: true,
    };
  }

  // synthesis倍率: searchモード×3、askモード×2
  const synthesisMult = useSearch ? 3 : 2;
  const synthesisMaxTokens = args.synthesis_max_tokens ?? maxTokens * synthesisMult;

  const synthesisPrompt =
    `The following are responses about "${args.query}" from ${modelIds.length} different AI models:\n\n` +
    `${sourceTexts}\n\n` +
    `---\n\n` +
    `Carefully review and synthesize all responses into one comprehensive answer:\n` +
    `1. Cross-check facts across all sources and identify contradictions\n` +
    `2. Prioritize reliable, well-sourced information\n` +
    `3. Explicitly note any disagreements or contradictions between models\n` +
    `4. Cite sources where available\n` +
    `5. Provide a comprehensive and accurate final answer`;

  const synthesisResult = await generate({
    modelId: synthesisModelId as ModelId,
    prompt: synthesisPrompt,
    system:
      'You are an expert at synthesizing information from multiple sources ' +
      'into accurate, comprehensive reports.',
    maxTokens: synthesisMaxTokens,
  });

  return synthesisResult.response;
}

export const researchTool = {
  name: 'research',
  description:
    'Multi-model parallel research. Queries 2-4 AI models simultaneously for diverse perspectives, then optionally synthesizes results. mode:search (default): web research with grounding. mode:ask: multi-model Q&A without web search — ideal when you want multiple viewpoints on a question. synthesize:true (default): merges results via synthesis model. synthesize:false: shows each model response side by side with latency and pricing info.',
  paramsSchema: researchSchema.shape,
};

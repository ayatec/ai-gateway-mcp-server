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
  'anthropic/claude-sonnet-4.6',
  'google/gemini-3-flash',
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
    .describe("'search': web search with grounding (default). 'ask': Q&A without web search"),
  models: z
    .array(z.string())
    .min(2)
    .max(4)
    .optional()
    .describe(
      '2-4 models to query. Default for search: [perplexity/sonar, gemini-3-flash, claude-haiku-4.5, gpt-5-mini]. Default for ask: [gpt-5.2, claude-sonnet-4.6, gemini-3-flash]',
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
    .default(2000)
    .describe(
      'Max output tokens per model in query phase (default: 2000). Total fed to synthesis = models x max_tokens. Reasoning models use tokens for internal thinking, so their visible output may be shorter',
    ),
  synthesis_max_tokens: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Max output tokens for synthesis. Defaults to triple max_tokens'),
});

export async function researchHandler(
  args: z.infer<typeof researchSchema>,
  _extra?: unknown,
): Promise<ToolResponse> {
  const useSearch = args.mode === 'search';

  // モデル解決: 未指定ならmodeに応じたデフォルト
  const modelIds = args.models ?? (useSearch ? DEFAULT_SEARCH_MODELS : DEFAULT_ASK_MODELS);

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
      maxTokens: args.max_tokens,
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

  // 4モデル×2000=8000トークンの統合には3倍をデフォルトに
  const synthesisMaxTokens = args.synthesis_max_tokens ?? args.max_tokens * 3;

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
    'Multi-model research tool. Queries multiple AI models in parallel, then optionally synthesizes results into a unified answer. mode:search for web research (default), mode:ask for Q&A. synthesize:true (default) merges all results via a high-performance model; synthesize:false shows responses side by side for comparison.',
  paramsSchema: researchSchema.shape,
};

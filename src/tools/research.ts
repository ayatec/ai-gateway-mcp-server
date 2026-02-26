import { z } from 'zod';
import { generate, generateParallel } from '../lib/gateway.js';
import {
  isValidModelId,
  getAllModelIds,
  getSearchCapableModels,
  getModel,
} from '../lib/model-registry.js';
import type { ModelId, ToolResponse } from '../types/index.js';
import { formatSources } from './search.js';

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
  'google/gemini-3.1-pro-preview',
  'perplexity/sonar-reasoning-pro',
];
const DEFAULT_SYNTHESIS_MODEL: ModelId = 'openai/gpt-5.2';

export const researchSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Research query with detailed context. Prefer English for technical topics (official docs are mostly English). Use Japanese when searching for Japan-specific services or local information. Include specific technical terms (version numbers, API names) for best accuracy.',
    ),
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
      '2-4 models to query in parallel. Defaults depend on mode — search: [perplexity/sonar, gemini-3-flash, claude-haiku-4.5, gpt-5-mini] (cost-effective, diversity-focused). ask: [gpt-5.2, claude-opus-4.6, gemini-3.1-pro-preview, sonar-reasoning-pro] (high-capability reasoning models from 4 providers)',
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
      'Max output tokens per model in query phase. If set, output is hard-truncated at this limit (may cut off mid-response). Omit to let models decide output length naturally. Only set when you need strict cost control. Reasoning models use tokens internally, so set 2x-3x higher than expected visible output',
    ),
  synthesis_max_tokens: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Max output tokens for synthesis. Omit to let the model decide naturally. Only set when you need strict cost control',
    ),
  include_sources: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Include source URLs in the response. When true, appends source links from search results. Only effective in search mode',
    ),
});

export async function researchHandler(
  args: z.infer<typeof researchSchema>,
  _extra?: unknown,
): Promise<ToolResponse> {
  const useSearch = args.mode === 'search';

  // モード別デフォルト解決
  const modelIds = args.models ?? (useSearch ? DEFAULT_SEARCH_MODELS : DEFAULT_ASK_MODELS);
  const maxTokens = args.max_tokens;

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
        const sourcesSection =
          args.include_sources && r.result.sources?.length ? formatSources(r.result.sources) : '';
        return `## ${r.modelId}\n**Latency**: ${latency} | **Pricing**: ${cost}\n\n${text}${sourcesSection}`;
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

  // synthesis_max_tokens: 明示指定があればそれを使用、なければ未指定（モデルに任せる）
  const synthesisMaxTokens = args.synthesis_max_tokens;

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

  // 統合レスポンスにソース情報を付加
  if (args.include_sources) {
    const allSources = results.flatMap((r) => r.result.sources ?? []);
    if (allSources.length > 0) {
      const text = synthesisResult.response.content[0]?.text ?? '';
      const sourcesSection = formatSources(allSources);
      return {
        content: [{ type: 'text', text: text + sourcesSection }],
      };
    }
  }

  return synthesisResult.response;
}

export const researchTool = {
  name: 'research',
  description:
    'Multi-model parallel research. Queries 2-4 AI models simultaneously, then optionally synthesizes results. ' +
    'Use instead of search when: (1) you need higher confidence via cross-validation across sources, (2) you want diverse perspectives on a topic. ' +
    'mode:search (default): web research with grounding across 4 models (sonar, gemini-3-flash, claude-haiku-4.5, gpt-5-mini). ' +
    'mode:ask: multi-model Q&A without web search — for architecture decisions, trade-off analysis, diverse expert opinions (uses gpt-5.2, claude-opus-4.6, gemini-3.1-pro-preview, sonar-reasoning-pro). ' +
    'synthesize:true (default): merges all responses into one comprehensive answer. ' +
    'synthesize:false: shows each model side-by-side with latency and cost — useful for comparing perspectives or when you want raw answers. ' +
    'Query tip: prefer English for technical topics, one focused topic per query — same best practices as the search tool apply.',
  paramsSchema: researchSchema.shape,
};

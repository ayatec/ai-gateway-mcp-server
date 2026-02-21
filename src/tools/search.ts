import { z } from 'zod';
import { generate } from '../lib/gateway.js';
import { isValidModelId, getSearchCapableModels } from '../lib/model-registry.js';
import type { ModelId, Source, ToolResponse } from '../types/index.js';

export const searchSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Search query in natural language with detailed context (background, requirements, specific situation). Use "latest" or "current" instead of specific years',
    ),
  model: z
    .string()
    .optional()
    .default('google/gemini-3-flash')
    .describe(
      "Search-capable model, e.g. 'perplexity/sonar-pro', 'google/gemini-3-flash'. Must support web search",
    ),
  max_tokens: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Max output tokens. If set, output is hard-truncated at this limit (may cut off mid-response). Omit to let the model decide output length naturally. Only set when you need strict cost control. Reasoning models consume tokens internally, so set 2x-3x higher than expected visible output',
    ),
  include_sources: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Include source URLs in the response. When true, appends a Sources section with links at the end',
    ),
});

/** ソース情報をMarkdown形式にフォーマット */
export function formatSources(sources: Source[]): string {
  const uniqueSources = sources.filter(
    (s, i, arr) => s.url && arr.findIndex((x) => x.url === s.url) === i,
  );
  if (uniqueSources.length === 0) return '';

  const lines = uniqueSources.map((s) => {
    if (s.title && s.url) return `- [${s.title}](${s.url})`;
    if (s.url) return `- ${s.url}`;
    return `- ${s.title}`;
  });

  return `\n\n---\n\n**Sources**\n${lines.join('\n')}`;
}

export async function searchHandler(
  args: z.infer<typeof searchSchema>,
  _extra?: unknown,
): Promise<ToolResponse> {
  const modelId = args.model as string;

  if (!isValidModelId(modelId)) {
    return {
      content: [{ type: 'text', text: `Unknown model: ${modelId}` }],
      isError: true,
    };
  }

  // 検索対応モデルかチェック
  const searchModels = getSearchCapableModels();
  const isSearchModel = searchModels.some((m) => m.id === modelId);
  if (!isSearchModel) {
    const available = searchModels.map((m) => m.id).join(', ');
    return {
      content: [
        {
          type: 'text',
          text: `Model ${modelId} does not support search.\nAvailable search models: ${available}`,
        },
      ],
      isError: true,
    };
  }

  const system =
    'You are a web search assistant. Provide accurate, up-to-date information with sources. ' +
    'Distinguish facts from speculation.';

  const result = await generate({
    modelId: modelId as ModelId,
    prompt: args.query,
    system,
    maxTokens: args.max_tokens,
    useSearch: true,
  });

  // ソース情報を付加
  if (args.include_sources && result.sources?.length) {
    const text = result.response.content[0]?.text ?? '';
    const sourcesSection = formatSources(result.sources);
    return {
      content: [{ type: 'text', text: text + sourcesSection }],
    };
  }

  return result.response;
}

export const searchTool = {
  name: 'search',
  description:
    'Quick web search with a single model. For multi-source research, use the research tool instead. Default: google/gemini-3-flash (Google Search grounding, $0.50/$3.00, no input inflation). For higher quality: perplexity/sonar-pro. Also supports openai/anthropic/perplexity native search.',
  paramsSchema: searchSchema.shape,
};

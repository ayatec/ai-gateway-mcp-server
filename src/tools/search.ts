import { z } from 'zod';
import { generate } from '../lib/gateway.js';
import { isValidModelId, getSearchCapableModels } from '../lib/model-registry.js';
import type { ModelId, ToolResponse } from '../types/index.js';

export const searchSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Search query in natural language, e.g. 'latest Next.js 15 features'"),
  model: z
    .string()
    .optional()
    .default('perplexity/sonar')
    .describe(
      "Search-capable model, e.g. 'perplexity/sonar-pro', 'google/gemini-3-flash'. Must support web search",
    ),
  max_tokens: z
    .number()
    .int()
    .positive()
    .optional()
    .default(1000)
    .describe(
      'Max output tokens. Search results are typically concise; increase for comprehensive summaries',
    ),
});

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

  return result.response;
}

export const searchTool = {
  name: 'search',
  description:
    'Quick web search with a single model. For multi-source research, use the research tool instead. Default: perplexity/sonar (search-native, $1/$1, no input inflation). For higher quality: perplexity/sonar-pro. Also supports openai/anthropic/google native search.',
  paramsSchema: searchSchema.shape,
};

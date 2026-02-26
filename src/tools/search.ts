import { z } from 'zod';
import { generate } from '../lib/gateway.js';
import { isValidModelId, getSearchCapableModels } from '../lib/model-registry.js';
import type { ModelId, Source, ToolResponse } from '../types/index.js';

export const searchSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Search query in natural language with detailed context. Use English for technical topics (most docs are in English), Japanese for Japan-specific info. One topic per query, include specific technical terms (version numbers, API names, config keys) for best accuracy. See tool description for full query tips and model guide.',
    ),
  model: z
    .string()
    .optional()
    .default('google/gemini-3-flash')
    .describe(
      'Search-capable model. Default: google/gemini-3-flash ($$ general queries, broad coverage). For quick single-fact lookups: perplexity/sonar ($ extremely cheap, fastest). For official doc precision (migration guides, changelogs): openai/gpt-5-mini ($$). Last resort for a different perspective: anthropic/claude-haiku-4.5 ($$$, similar quality to $$ models but significantly more expensive). Also supports other anthropic and openai models with native search.',
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
  max_retries: z
    .number()
    .int()
    .min(0)
    .max(3)
    .optional()
    .default(1)
    .describe(
      'Max number of retries when search result is poor (empty or unhelpful response). Default: 1. Set to 0 to disable retries.',
    ),
});

/**
 * 検索結果が不十分かどうかをヒューリスティクスで判定する。
 * 空レスポンス、エラーフラグ、極端に短いテキスト、「情報が見つからない」系のパターンを検出する。
 * 「そのバージョンにはその機能はありません」のような有効な否定回答は対象外。
 */
export function isSearchResultPoor(text: string, isError?: boolean): boolean {
  if (isError) return true;
  if (!text || text.trim().length === 0) return true;

  // 極端に短いレスポンス（10文字未満）は検索失敗の可能性が高い
  if (text.trim().length < 10) return true;

  // 「情報が見つからない」系のパターン（日英両対応）
  const poorPatterns = [
    /情報(?:が|は)(?:見つかり)?ませんでした/,
    /見つかりませんでした/,
    /該当する(?:情報|結果|データ)(?:が|は)(?:ありません|見つかりません)/,
    /no (?:results?|information|data) (?:found|available)/i,
    /couldn'?t find (?:any )?(?:results?|information)/i,
    /unable to (?:find|retrieve|access)/i,
    /(?:search|query) (?:returned|yielded) no results?/i,
    /^\s*(?:レスポンスが空でした|（レスポンスが空でした）)\s*$/,
  ];

  return poorPatterns.some((pattern) => pattern.test(text));
}

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

  const maxRetries = args.max_retries ?? 1;
  let result = await generate({
    modelId: modelId as ModelId,
    prompt: args.query,
    system,
    maxTokens: args.max_tokens,
    useSearch: true,
  });

  // 結果が不十分な場合はリトライ（逐次実行）
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const text = result.response.content[0]?.text ?? '';
    if (!isSearchResultPoor(text, result.isError)) break;

    console.error(
      `[search] 結果が不十分なためリトライ (${attempt + 1}/${maxRetries}): model=${modelId}, textLength=${text.length}, isError=${result.isError}`,
    );

    result = await generate({
      modelId: modelId as ModelId,
      prompt: args.query,
      system,
      maxTokens: args.max_tokens,
      useSearch: true,
    });
  }

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
    'Web search with a single model. Use for real-time lookups. For multi-model parallel research, use the research tool.\n\n' +
    'Query tips (major accuracy improvement):\n' +
    '- One topic per query — split broad questions into multiple calls\n' +
    '- Prefer English for technical topics (official docs are mostly English). Use Japanese when searching for Japan-specific services or local information\n' +
    '- Include exact terms: version numbers, API names, config keys\n' +
    '- Yes/No form for fact checks: "Does X support Y?" prevents false assertions\n' +
    '- Add site: prefix to target official docs\n\n' +
    'Model guide ($ = cheapest, $$$ = most expensive):\n' +
    '- perplexity/sonar ($): Extremely cheap (~1/20 cost of others). Fastest. Best for single-fact lookups and GitHub Issue searches\n' +
    '- openai/gpt-5-mini ($$): Official doc precision — migration guides, changelogs, CVE details\n' +
    '- google/gemini-3-flash ($$ default): General queries, broad coverage, good all-around\n' +
    '- anthropic/claude-haiku-4.5 ($$$): Last resort when other models lack needed info. Similar quality to $$ models but significantly more expensive — only use for a different perspective\n\n' +
    'For parallel multi-model results or diverse perspectives, use the research tool.',
  paramsSchema: searchSchema.shape,
};

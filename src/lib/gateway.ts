import { generateText, type GenerateTextResult } from 'ai';
import { resolveModel, gateway } from '../providers/index.js';
import type { ModelId, Source, ToolResponse } from '../types/index.js';

/** AI SDK の Source 型（GenerateTextResult.sources から推論） */
type AISdkSource = GenerateTextResult<never, never>['sources'][number];

/** 検索ツールを構築（Gateway の perplexitySearch を全プロバイダーで統一使用） */
function buildSearchTools() {
  return { perplexity_search: gateway.tools.perplexitySearch() };
}

/** AI SDK の Source 型からプロジェクトの Source 型に変換 */
function convertAISdkSources(sdkSources: AISdkSource[]): Source[] {
  return sdkSources
    .filter((s): s is AISdkSource & { sourceType: 'url' } => s.sourceType === 'url')
    .map((s) => ({ title: s.title, url: s.url }));
}

/** ツール結果からソース情報を抽出（perplexitySearchツール経由のモデル用） */
function extractSourcesFromToolResults(steps: Array<Record<string, unknown>>): Source[] {
  const sources: Source[] = [];
  for (const step of steps) {
    const toolResults = step.toolResults as
      | Array<{ output?: { results?: Array<{ title?: string; url?: string; snippet?: string }> } }>
      | undefined;
    if (!toolResults) continue;
    for (const tr of toolResults) {
      if (tr.output && Array.isArray(tr.output.results)) {
        for (const r of tr.output.results) {
          if (r.url || r.title) {
            sources.push({ title: r.title, url: r.url, snippet: r.snippet });
          }
        }
      }
    }
  }
  return sources;
}

/**
 * generateText 結果からソース情報を統合抽出
 * - result.sources: AI SDK標準フィールド（Perplexity等のネイティブ検索プロバイダーが使用）
 * - steps[].toolResults: perplexitySearchツール経由のモデル（Gemini, Claude, GPT等）が使用
 */
function collectSources(
  sdkSources: AISdkSource[],
  steps: Array<Record<string, unknown>>,
): Source[] {
  const fromSdk = convertAISdkSources(sdkSources);
  const fromTools = extractSourcesFromToolResults(steps);

  // 重複排除（URL基準）
  const seen = new Set<string>();
  const merged: Source[] = [];
  for (const s of [...fromSdk, ...fromTools]) {
    const key = s.url ?? s.title ?? '';
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }
  return merged;
}

/** ツール結果から検索スニペットをフォーマット済み文字列として抽出 */
function extractSearchResults(steps: Array<Record<string, unknown>>): string | null {
  const sources = extractSourcesFromToolResults(steps);
  if (sources.length === 0) return null;

  const formatted = sources
    .map((r) => {
      const parts: string[] = [];
      if (r.title) parts.push(`**${r.title}**`);
      if (r.url) parts.push(r.url);
      if (r.snippet) parts.push(r.snippet);
      return parts.join('\n');
    })
    .filter(Boolean)
    .join('\n\n---\n\n');

  return formatted || null;
}

/** テキスト生成の共通オプション */
export interface GenerateOptions {
  modelId: ModelId;
  prompt: string;
  system?: string;
  maxTokens?: number;
  /** 検索機能を有効にするか（searchツールから呼ぶ場合にtrue） */
  useSearch?: boolean;
}

/** generateText の結果（レイテンシ・使用量を含む） */
export interface GenerateResult {
  response: ToolResponse;
  durationMs: number;
  isError?: boolean;
  /** 検索結果から抽出したソース情報（useSearch: true の場合のみ） */
  sources?: Source[];
}

/** テキスト生成してMCPレスポンスを返す */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const model = resolveModel(options.modelId);
  const startTime = Date.now();

  try {
    const tools = options.useSearch ? buildSearchTools() : undefined;

    const result = await generateText({
      model,
      system: options.system,
      prompt: options.prompt,
      ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
      tools,
      // ツール使用を強制し、モデルが検索をスキップするのを防ぐ
      ...(tools ? { toolChoice: 'required' as const } : {}),
    });

    let text = result.text;

    // ソース情報を統合抽出（AI SDK標準フィールド + ツール結果）
    const sources = collectSources(
      result.sources ?? [],
      (result.steps as Array<Record<string, unknown>>) ?? [],
    );

    // provider-executed tool（perplexitySearch）では、Gateway が検索を実行し
    // ツール結果を返すが、モデルがテキスト生成せずに終了する（finishReason=tool-calls）
    // その場合、検索結果をプロンプトに埋め込んで再度テキスト生成を行う
    if (!text && result.steps) {
      const searchResults = extractSearchResults(result.steps as Array<Record<string, unknown>>);
      if (searchResults) {
        const followUp = await generateText({
          model,
          system:
            options.system ??
            'You are a helpful assistant. Summarize the search results accurately and concisely.',
          prompt:
            `Based on the following search results, answer the user's question: "${options.prompt}"\n\n` +
            `Search results:\n${searchResults}`,
          ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
        });
        text = followUp.text;
      }
    }

    if (!text) text = '（レスポンスが空でした）';
    const durationMs = Date.now() - startTime;

    return {
      response: { content: [{ type: 'text', text }] },
      durationMs,
      ...(sources.length > 0 ? { sources } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
    console.error(`[gateway] ${options.modelId} エラー:`, error);
    const durationMs = Date.now() - startTime;

    return {
      response: {
        content: [{ type: 'text', text: `Error (${options.modelId}): ${message}` }],
        isError: true,
      },
      durationMs,
      isError: true,
    };
  }
}

/** 複数モデルに並列でリクエストし、全結果を返す */
export async function generateParallel(
  optionsList: GenerateOptions[],
): Promise<{ modelId: ModelId; result: GenerateResult }[]> {
  const results = await Promise.allSettled(
    optionsList.map(async (opts) => ({
      modelId: opts.modelId,
      result: await generate(opts),
    })),
  );

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const errorMsg = result.reason instanceof Error ? result.reason.message : '不明なエラー';
    return {
      modelId: optionsList[i].modelId,
      result: {
        response: {
          content: [
            {
              type: 'text' as const,
              text: `Error (${optionsList[i].modelId}): ${errorMsg}`,
            },
          ],
          isError: true,
        },
        durationMs: 0,
        isError: true,
      },
    };
  });
}

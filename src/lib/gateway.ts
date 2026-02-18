import { generateText } from 'ai';
import { resolveModel, gateway } from '../providers/index.js';
import { getModel } from './model-registry.js';
import type { ModelId, ToolResponse } from '../types/index.js';

/** 検索ツールを構築（Gateway の perplexitySearch を全プロバイダーで統一使用） */
function buildSearchTools() {
  return { perplexity_search: gateway.tools.perplexitySearch() };
}

/** ツール結果から検索スニペットを抽出 */
function extractSearchResults(steps: Array<Record<string, unknown>>): string | null {
  for (const step of steps) {
    const toolResults = step.toolResults as
      | Array<{ output?: { results?: Array<{ title?: string; url?: string; snippet?: string }> } }>
      | undefined;
    if (!toolResults) continue;
    for (const tr of toolResults) {
      if (tr.output && Array.isArray(tr.output.results)) {
        const formatted = tr.output.results
          .map((r) => {
            const parts: string[] = [];
            if (r.title) parts.push(`**${r.title}**`);
            if (r.url) parts.push(r.url);
            if (r.snippet) parts.push(r.snippet);
            return parts.join('\n');
          })
          .filter(Boolean)
          .join('\n\n---\n\n');
        if (formatted) return formatted;
      }
    }
  }
  return null;
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
}

/** テキスト生成してMCPレスポンスを返す */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const modelDef = getModel(options.modelId);
  const model = resolveModel(options.modelId);
  const maxTokens = options.maxTokens ?? modelDef.maxOutputTokens;
  const startTime = Date.now();

  try {
    const tools = options.useSearch ? buildSearchTools() : undefined;

    const result = await generateText({
      model,
      system: options.system,
      prompt: options.prompt,
      maxOutputTokens: maxTokens,
      tools,
      // ツール使用を強制し、モデルが検索をスキップするのを防ぐ
      ...(tools ? { toolChoice: 'required' as const } : {}),
    });

    let text = result.text;

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
          maxOutputTokens: maxTokens,
        });
        text = followUp.text;
      }
    }

    if (!text) text = '（レスポンスが空でした）';
    const durationMs = Date.now() - startTime;

    return {
      response: { content: [{ type: 'text', text }] },
      durationMs,
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

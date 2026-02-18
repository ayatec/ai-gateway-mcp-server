import { generateText, type ToolSet } from 'ai';
import { resolveModel, gateway } from '../providers/index.js';
import { getModel } from './model-registry.js';
import type { ModelId, ToolResponse } from '../types/index.js';

/** 検索ツールを構築（Gateway の perplexitySearch を全プロバイダーで統一使用） */
function buildSearchTools(): ToolSet {
  return { web_search: gateway.tools.perplexitySearch() } as ToolSet;
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
    // 検索が要求された場合、Gateway の perplexitySearch ツールを有効化
    const tools = options.useSearch ? buildSearchTools() : undefined;

    const result = await generateText({
      model,
      system: options.system,
      prompt: options.prompt,
      maxOutputTokens: maxTokens,
      tools,
    });

    const text = result.text || '（レスポンスが空でした）';
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
    // 失敗した場合もエラーレスポンスとして返す
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

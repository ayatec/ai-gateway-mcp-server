#!/usr/bin/env tsx
// ESM import より先に環境変数を読み込む
import 'dotenv/config';
import { argv } from 'process';
import type { ZodObject, ZodRawShape } from 'zod';
import {
  askHandler,
  askSchema,
  searchHandler,
  searchSchema,
  researchHandler,
  researchSchema,
  listModelsHandler,
  listModelsSchema,
} from '../src/tools/index.js';

type ToolParams = Record<string, unknown>;
type ToolResult = {
  content?: Array<{ type: string; text: string }>;
  [key: string]: unknown;
};
type ToolHandler = (params: ToolParams) => Promise<ToolResult>;

if (!process.env.AI_GATEWAY_API_KEY) {
  console.error('Error: AI_GATEWAY_API_KEY is not set in .env file');
  process.exit(1);
}

// ツールハンドラー・スキーマ一覧
const tools: Record<string, { handler: ToolHandler; schema: ZodObject<ZodRawShape> }> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ask: { handler: askHandler as any, schema: askSchema as any },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  search: { handler: searchHandler as any, schema: searchSchema as any },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  research: { handler: researchHandler as any, schema: researchSchema as any },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list_models: { handler: listModelsHandler as any, schema: listModelsSchema as any },
};

// CLI引数パース
function parseArgs(): { toolName: string; params: ToolParams } | null {
  const args = argv.slice(2);
  if (args.length === 0) return null;

  const toolName = args[0];
  const params: ToolParams = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        // JSON配列/オブジェクトの場合はパース
        if (value.startsWith('[') || value.startsWith('{')) {
          try {
            params[key] = JSON.parse(value);
          } catch {
            params[key] = value;
          }
        } else if (value === 'true') {
          params[key] = true;
        } else if (value === 'false') {
          params[key] = false;
        } else if (/^\d+$/.test(value)) {
          params[key] = Number(value);
        } else {
          params[key] = value;
        }
        i++;
      } else {
        params[key] = true;
      }
    }
  }

  return { toolName, params };
}

function showHelp() {
  console.log(`
Tool Tester - MCPツールを個別にテスト

Usage:
  pnpm dev:tool <tool_name> [--param value ...]

Examples:
  pnpm dev:tool ask --question "TypeScriptの利点は？"
  pnpm dev:tool ask --question "Rustとは？" --model "anthropic/claude-sonnet-4.6"
  pnpm dev:tool search --query "Vercel AI SDK 最新情報"
  pnpm dev:tool research --query "AI agent frameworks 2026"
  pnpm dev:tool research --query "pros and cons of microservices" --mode ask --synthesize false
  pnpm dev:tool research --query "latest TypeScript features" --models '["openai/gpt-5.2","perplexity/sonar"]'
  pnpm dev:tool list_models
  pnpm dev:tool list_models --provider openai

Available tools:
  ${Object.keys(tools).join(', ')}
`);
}

async function main() {
  if (argv.includes('--help') || argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const cliArgs = parseArgs();
  if (!cliArgs) {
    showHelp();
    process.exit(1);
  }

  const { toolName, params } = cliArgs;

  if (!tools[toolName]) {
    console.error(`Unknown tool: ${toolName}`);
    console.log('Available tools:', Object.keys(tools).join(', '));
    process.exit(1);
  }

  // カンマ区切り文字列を配列に変換（research --models "a,b" 対応）
  if (typeof params.models === 'string') {
    params.models = params.models.split(',');
  }

  // Zodスキーマでパースしてデフォルト値を適用
  const { handler, schema } = tools[toolName];
  const parsed = schema.parse(params);

  console.log(`\nTesting tool: ${toolName}`);
  console.log('Parameters:', JSON.stringify(parsed, null, 2));

  try {
    const result = await handler(parsed);
    console.log('\nResult:');
    if (result.content && result.content[0]) {
      console.log(result.content[0].text);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

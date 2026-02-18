import { z } from 'zod';
import { generate } from '../lib/gateway.js';
import { isValidModelId } from '../lib/model-registry.js';
import type { ModelId, ToolResponse } from '../types/index.js';

export const askSchema = z.object({
  question: z
    .string()
    .min(1)
    .describe("The question to ask, e.g. 'Explain Rust lifetimes' or 'Compare REST vs GraphQL'"),
  model: z
    .string()
    .optional()
    .default('openai/gpt-5.2')
    .describe(
      "Model in provider/name format, e.g. 'openai/gpt-5.2-codex', 'anthropic/claude-sonnet-4.6'",
    ),
  context: z
    .string()
    .optional()
    .describe('Additional context, e.g. code snippets, error messages, or background info'),
  max_tokens: z
    .number()
    .int()
    .positive()
    .optional()
    .default(2000)
    .describe(
      'Max output tokens. Use lower (500-1000) for concise answers, higher (4000+) for detailed explanations',
    ),
});

export async function askHandler(
  args: z.infer<typeof askSchema>,
  _extra?: unknown,
): Promise<ToolResponse> {
  const modelId = args.model as string;

  if (!isValidModelId(modelId)) {
    return {
      content: [{ type: 'text', text: `Unknown model: ${modelId}` }],
      isError: true,
    };
  }

  const prompt = args.context ? `${args.context}\n\n${args.question}` : args.question;

  const result = await generate({
    modelId: modelId as ModelId,
    prompt,
    maxTokens: args.max_tokens,
  });

  return result.response;
}

export const askTool = {
  name: 'ask',
  description:
    'Ask an AI model a question (no web search). Default: openai/gpt-5.2 (flagship, $1.75/$14, 400K ctx). For code: openai/gpt-5.2-codex. For cheaper: openai/gpt-5-mini ($0.25/$2) or google/gemini-3-flash ($0.50/$3). For cheapest: openai/gpt-5-nano ($0.05/$0.40).',
  paramsSchema: askSchema.shape,
};

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
    .describe(
      'Max output tokens. If set, output is hard-truncated at this limit (may cut off mid-response). Omit to let the model decide output length naturally. Only set when you need strict cost control. Reasoning models use tokens internally, so set 2x-3x higher than expected visible output',
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
    'Ask a single AI model a question (no web search, cannot retrieve latest/real-time information). Default: openai/gpt-5.2 (flagship, $1.75/$14, 400K ctx). For multiple perspectives on a question, prefer research tool with mode:ask synthesize:false. For code: openai/gpt-5.2-codex. For cheaper: openai/gpt-5-mini ($0.25/$2) or google/gemini-3-flash ($0.50/$3). For cheapest: openai/gpt-5-nano ($0.05/$0.40).',
  paramsSchema: askSchema.shape,
};

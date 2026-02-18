import { z } from 'zod';
import { getAllModels, getModelsByProvider, getModelsByCapability } from '../lib/model-registry.js';
import type { ModelDefinition, CapabilityFilter, ToolResponse } from '../types/index.js';

export const listModelsSchema = z.object({
  provider: z
    .enum(['openai', 'anthropic', 'google', 'perplexity'])
    .optional()
    .describe('Filter by provider'),
  capability: z
    .enum(['search', 'reasoning', 'fast', 'cheap', 'code'])
    .optional()
    .describe('Filter by capability'),
});

function formatModel(m: ModelDefinition): string {
  const lines: string[] = [];

  lines.push(`### ${m.displayName}`);
  lines.push(`- **ID**: \`${m.id}\``);
  lines.push(`- **Provider**: ${m.provider}`);
  lines.push(`- **Context**: ${(m.contextWindow / 1000).toFixed(0)}K tokens`);

  // 能力
  const caps: string[] = [];
  if (m.capabilities.search) caps.push('Search');
  if (m.capabilities.reasoning) caps.push('Reasoning');
  if (m.capabilities.coding) caps.push('Code');
  if (m.capabilities.fast) caps.push('Fast');
  if (m.capabilities.cheap) caps.push('Cheap');
  lines.push(`- **Capabilities**: ${caps.length > 0 ? caps.join(', ') : 'None'}`);

  // 価格
  const priceLines = [`Input: $${m.pricing.input}/1M`];
  if (m.pricing.cachedInput !== undefined) {
    priceLines.push(`Cached: $${m.pricing.cachedInput}/1M`);
  }
  priceLines.push(`Output: $${m.pricing.output}/1M`);
  lines.push(`- **Pricing**: ${priceLines.join(' | ')}`);

  // 検索コスト
  if (m.searchCost) {
    lines.push(`- **Search cost**: ${m.searchCost.description}`);
  }

  if (m.maxOutputTokens) {
    lines.push(`- **Max output**: ${m.maxOutputTokens.toLocaleString()} tokens`);
  }

  if (m.note) {
    lines.push(`- **Note**: ${m.note}`);
  }

  return lines.join('\n');
}

function groupByProvider(models: ModelDefinition[]): Record<string, ModelDefinition[]> {
  const groups: Record<string, ModelDefinition[]> = {};
  for (const m of models) {
    if (!groups[m.provider]) {
      groups[m.provider] = [];
    }
    groups[m.provider].push(m);
  }
  return groups;
}

export async function listModelsHandler(
  args: z.infer<typeof listModelsSchema>,
  _extra?: unknown,
): Promise<ToolResponse> {
  let models: ModelDefinition[];

  if (args.provider && args.capability) {
    // 両方指定された場合: プロバイダーフィルタ → capability フィルタ
    const byProvider = getModelsByProvider(args.provider);
    const capModels = getModelsByCapability(args.capability as CapabilityFilter);
    const capIds = new Set(capModels.map((m) => m.id));
    models = byProvider.filter((m) => capIds.has(m.id));
  } else if (args.provider) {
    models = getModelsByProvider(args.provider);
  } else if (args.capability) {
    models = getModelsByCapability(args.capability as CapabilityFilter);
  } else {
    models = getAllModels();
  }

  const filters: string[] = [];
  if (args.provider) filters.push(`provider: ${args.provider}`);
  if (args.capability) filters.push(`capability: ${args.capability}`);
  const filterStr = filters.length > 0 ? ` (${filters.join(', ')})` : '';

  const title = `# Available Models${filterStr}`;
  const providerGroups = groupByProvider(models);

  const sections = Object.entries(providerGroups)
    .map(([provider, providerModels]) => {
      const modelSections = providerModels.map(formatModel).join('\n\n');
      return `## ${provider}\n\n${modelSections}`;
    })
    .join('\n\n---\n\n');

  const summary = `${title}\n\nTotal: ${models.length} models\n\n${sections}`;

  return {
    content: [{ type: 'text', text: summary }],
  };
}

export const listModelsTool = {
  name: 'list_models',
  description:
    'List available AI models with capabilities, pricing, and web search costs. Use this to choose the right model for your task.',
  paramsSchema: listModelsSchema.shape,
};

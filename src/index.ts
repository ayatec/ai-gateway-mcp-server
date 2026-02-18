#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import {
  askTool,
  askHandler,
  searchTool,
  searchHandler,
  researchTool,
  researchHandler,
  listModelsTool,
  listModelsHandler,
} from './tools/index.js';

const server = new McpServer({
  name: config.server.name,
  version: config.server.version,
});

// ツール登録
server.registerTool(
  askTool.name,
  {
    description: askTool.description,
    inputSchema: askTool.paramsSchema,
  },
  askHandler,
);
server.registerTool(
  searchTool.name,
  {
    description: searchTool.description,
    inputSchema: searchTool.paramsSchema,
  },
  searchHandler,
);
server.registerTool(
  researchTool.name,
  {
    description: researchTool.description,
    inputSchema: researchTool.paramsSchema,
  },
  researchHandler,
);
server.registerTool(
  listModelsTool.name,
  {
    description: listModelsTool.description,
    inputSchema: listModelsTool.paramsSchema,
  },
  listModelsHandler,
);

async function main() {
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error('Error: AI_GATEWAY_API_KEY is not set. Set it in your environment or .env file.');
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${config.server.name} running on stdio`);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

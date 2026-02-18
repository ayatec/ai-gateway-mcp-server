import path from 'path';

export const config = {
  server: {
    name: 'ai-gateway-mcp-server',
    version: '0.1.0',
  },
  logDir: path.join(import.meta.dirname, '../logs'),
} as const;

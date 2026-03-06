import path from 'path';

export const config = {
  server: {
    name: 'ai-gateway-mcp-server',
    version: '0.1.0',
  },
  logDir: path.join(import.meta.dirname, '../logs'),
  /**
   * Gateway レベルの Zero Data Retention を有効化。
   * 有効時、Vercel AI Gateway は ZDR 契約済みプロバイダーにのみリクエストをルーティングする。
   * 非対応プロバイダーへのリクエストは 400 エラーになる可能性があるため注意。
   */
  zeroDataRetention: process.env.ZERO_DATA_RETENTION === 'true',
} as const;

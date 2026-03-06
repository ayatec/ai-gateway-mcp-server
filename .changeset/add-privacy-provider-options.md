---
'@ayatec/ai-gateway-mcp-server': minor
---

プロバイダーごとのプライバシー・データ保持設定を追加

- OpenAI: `store: false` を全リクエストに付与し、データ保存を無効化
- Anthropic/Google/Perplexity: APIデフォルトで学習不使用・ZDRのため追加パラメータ不要
- Vercel AI Gateway: `ZERO_DATA_RETENTION=true` 環境変数でGatewayレベルのZDRを有効化可能（PerplexityはGateway ZDR非対応のため自動除外）
- README・CLAUDE.mdにプライバシー設定・環境変数のドキュメントを追加

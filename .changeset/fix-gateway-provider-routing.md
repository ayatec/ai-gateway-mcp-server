---
'@ayatec/ai-gateway-mcp-server': patch
---

Gatewayの意図しないプロバイダーフォールバックを防止

Vercel AI Gatewayのデフォルト動的ルーティングにより、OpenAIリクエストがAzure OpenAIに
フォールバックされ、BYOK未設定の共用インフラ経由で異常に遅くなる問題を修正。
`providerOptions.gateway.only` で各プロバイダーを明示的に固定し、
意図しないルーティングを防止するようにした。

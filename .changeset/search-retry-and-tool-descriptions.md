---
'@ayatec/ai-gateway-mcp-server': minor
---

searchツールにリトライ機能を追加し、search/researchツールの説明文を改善

- searchツールに `max_retries` パラメータを追加（デフォルト: 1）。検索結果が不十分な場合に自動リトライする
- `isSearchResultPoor` 関数で空レスポンスやエラー、「情報が見つからない」系パターンを検出
- search/researchツールの説明文をより詳細に改善（クエリのコツ、モデルガイド、使い分け指針）

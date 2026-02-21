---
'@ayatec/ai-gateway-mcp-server': minor
---

search / research ツールに `include_sources` パラメータを追加。検索結果のソースURL（情報源）をレスポンスに含めるかどうかを切り替え可能に（デフォルト: オフ）。AI SDK標準の `result.sources` フィールドにも対応し、Perplexityを含む全プロバイダーでソース取得が可能に。また、全ツール（ask / search / research）の `max_tokens` デフォルトを廃止し、モデルに自然な出力長を任せるように変更（明示指定時のみ適用）

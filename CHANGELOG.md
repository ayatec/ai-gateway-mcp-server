# @ayatec/ai-gateway-mcp-server

## 0.4.2

### Patch Changes

- [`5a2a2d8`](https://github.com/ayatec/ai-gateway-mcp-server/commit/5a2a2d875c80b9021f19f5af08bdb41dfa04978a) Thanks [@ayatec](https://github.com/ayatec)! - READMEのmax_tokensデフォルト値を実際のスキーマに合わせて修正（省略時はモデル任せ）

## 0.4.1

### Patch Changes

- [`479b854`](https://github.com/ayatec/ai-gateway-mcp-server/commit/479b8542bd3852ebaa2882dbe8918b9a94370647) Thanks [@ayatec](https://github.com/ayatec)! - Perplexityモデルのネイティブ検索対応を修正し、Vercel AI Gateway未対応のsonar-deep-researchを削除

## 0.4.0

### Minor Changes

- [`d6e837b`](https://github.com/ayatec/ai-gateway-mcp-server/commit/d6e837bc116cf2b688d75346777f2380fb6d61d9) Thanks [@ayatec](https://github.com/ayatec)! - search / research ツールに `include_sources` パラメータを追加。検索結果のソースURL（情報源）をレスポンスに含めるかどうかを切り替え可能に（デフォルト: オフ）。AI SDK標準の `result.sources` フィールドにも対応し、Perplexityを含む全プロバイダーでソース取得が可能に。また、全ツール（ask / search / research）の `max_tokens` デフォルトを廃止し、モデルに自然な出力長を任せるように変更（明示指定時のみ適用）

## 0.3.0

### Minor Changes

- [`9771fc2`](https://github.com/ayatec/ai-gateway-mcp-server/commit/9771fc2df1e0637e1b0769edad6f74791c856500) Thanks [@ayatec](https://github.com/ayatec)! - モデル説明文を技術的な表現に改善し、searchツールのデフォルトモデルをgoogle/gemini-3-flashに変更

## 0.2.1

### Patch Changes

- [`88cfb30`](https://github.com/ayatec/ai-gateway-mcp-server/commit/88cfb3028dcd9e490da2dbd34bff460f6457d68c) Thanks [@ayatec](https://github.com/ayatec)! - CI/CDワークフローを統合し、CIパス後にのみリリースが実行されるよう改善

## 0.2.0

### Minor Changes

- [`367bea4`](https://github.com/ayatec/ai-gateway-mcp-server/commit/367bea41b918f3427a0b1c9c63e9e417e5e0499e) Thanks [@ayatec](https://github.com/ayatec)! - OSS公開・npm publish 対応
  - 依存パッケージのメジャーアップデート（zod v4, eslint 10, Node.js >=22.22.0）
  - MITライセンス追加
  - package.json に公開向けフィールドを追加（files, exports, repository等）
  - Vitest によるユニットテスト導入（44テスト）
  - Changesets によるバージョン管理・CHANGELOG 自動生成
  - GitHub Actions CI/CD（lint, test, build, 自動リリース）
  - README・CLAUDE.md の整備

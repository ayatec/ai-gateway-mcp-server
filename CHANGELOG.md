# @ayatec/ai-gateway-mcp-server

## 0.8.0

### Minor Changes

- [`c0a2068`](https://github.com/ayatec/ai-gateway-mcp-server/commit/c0a2068a391a2710434e7608d9b172089eecaf68) Thanks [@ayatec](https://github.com/ayatec)! - プロバイダーごとのプライバシー・データ保持設定を追加
  - OpenAI: `store: false` を全リクエストに付与し、データ保存を無効化
  - Anthropic/Google/Perplexity: APIデフォルトで学習不使用・ZDRのため追加パラメータ不要
  - Vercel AI Gateway: `ZERO_DATA_RETENTION=true` 環境変数でGatewayレベルのZDRを有効化可能（PerplexityはGateway ZDR非対応のため自動除外）
  - README・CLAUDE.mdにプライバシー設定・環境変数のドキュメントを追加

## 0.7.0

### Minor Changes

- [`f8cbba8`](https://github.com/ayatec/ai-gateway-mcp-server/commit/f8cbba8949de528e233417ee97054bbc05a0007f) Thanks [@ayatec](https://github.com/ayatec)! - OpenAIモデルを最新化: GPT-5.2→GPT-5.4に置き換え、GPT-5.2 Codex→GPT-5.3 Codexに置き換え
  - GPT-5.4: 1.05Mコンテキスト、推論・コード・エージェント性能が大幅向上、キャッシュ割引90%
  - GPT-5.3 Codex: 25%高速化、mid-task steering対応、Terminal-Bench最高水準
  - askツール・researchツールのデフォルトモデルをGPT-5.4に更新

## 0.6.1

### Patch Changes

- [`e952f4b`](https://github.com/ayatec/ai-gateway-mcp-server/commit/e952f4b6273858ff71cf595e73d86375db840b8f) Thanks [@ayatec](https://github.com/ayatec)! - READMEのサポートモデル一覧を更新（Flash-Lite追加・全モデルの特徴欄をmodel-registryと統一）

## 0.6.0

### Minor Changes

- [`70094c7`](https://github.com/ayatec/ai-gateway-mcp-server/commit/70094c79c44ddeee4b51474b3e11772b57126179) Thanks [@ayatec](https://github.com/ayatec)! - Gemini 3.1 Flash-Lite Preview モデルを新規追加し、全モデルの説明文を改善
  - google/gemini-3.1-flash-lite-preview を新規追加（超高速・低コスト、検索非対応）
  - 全14モデルのnoteをモデル選定の判断材料になる粒度に統一
  - askツールの安価モデル候補にFlash-Liteを追加

## 0.5.0

### Minor Changes

- [`df8248f`](https://github.com/ayatec/ai-gateway-mcp-server/commit/df8248fdd7c4cc9ef10ea8253a11fe2e3009a623) Thanks [@ayatec](https://github.com/ayatec)! - searchツールにリトライ機能を追加し、search/researchツールの説明文を改善
  - searchツールに `max_retries` パラメータを追加（デフォルト: 1）。検索結果が不十分な場合に自動リトライする
  - `isSearchResultPoor` 関数で空レスポンスやエラー、「情報が見つからない」系パターンを検出
  - search/researchツールの説明文をより詳細に改善（クエリのコツ、モデルガイド、使い分け指針）

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

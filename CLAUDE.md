# CLAUDE.md

Vercel AI Gateway を使った多モデル対応 MCP サーバー。

## 開発コマンド

```bash
pnpm install        # 依存パッケージインストール
pnpm build          # ビルド
pnpm dev            # ウォッチモードでビルド
pnpm start          # サーバー起動（ビルド後）
pnpm dev:tool       # ツールの手動テスト
pnpm clean          # ビルド成果物削除
pnpm type-check     # 型チェック
pnpm lint           # ESLint実行
pnpm lint:fix       # ESLint自動修正
pnpm format         # Prettier実行
pnpm format:check   # フォーマットチェック
```

## アーキテクチャ

### ディレクトリ構成

```
src/
  config.ts         # 環境変数・サーバー設定
  index.ts          # エントリポイント
  types/            # 型定義
  providers/        # プロバイダー初期化（Gateway baseURL経由）
  lib/              # Gateway ラッパー・モデルレジストリ
  tools/            # MCPツール（ask, search, research, list_models）
  utils/            # ユーティリティ（logger, cost, format）
scripts/
  test-tool.ts      # ローカルテスト用CLI
```

### 提供ツール

1. **ask** — AIに質問（デフォルト: openai/gpt-5.2）
2. **search** — Web検索（デフォルト: perplexity/sonar）
3. **research** — 複数モデル並列調査（ask/searchモード、synthesize on/off、2-4モデル）
4. **list_models** — モデル一覧（provider/capabilityフィルタ対応）

### 対応プロバイダー・モデル（13モデル）

- **OpenAI**: gpt-5.2, gpt-5.2-codex, gpt-5-mini, gpt-5-nano, gpt-oss-120b
- **Anthropic**: claude-opus-4.6, claude-sonnet-4.6, claude-haiku-4.5
- **Google**: gemini-3-flash, gemini-3-pro-preview
- **Perplexity**: sonar, sonar-pro, sonar-reasoning-pro

### 環境変数

- `AI_GATEWAY_API_KEY` — Vercel AI Gateway APIキー（必須、これ1つで全プロバイダーにアクセス）

### Gateway アーキテクチャ

全プロバイダーが同一の Gateway baseURL（`https://ai-gateway.vercel.sh/v1`）経由で接続。
APIキーは1本で全プロバイダーにルーティングされる。

## 技術スタック

- TypeScript (ESM, NodeNext, strict)
- @modelcontextprotocol/sdk
- Vercel AI SDK (ai, @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google)
- zod

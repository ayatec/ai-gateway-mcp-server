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
pnpm test           # テスト実行（Vitest）
pnpm test:watch     # テスト（ウォッチモード）
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
  config.ts              # 環境変数・サーバー設定
  index.ts               # エントリポイント
  types/                 # 型定義
  providers/             # プロバイダー初期化（Gateway baseURL経由）
  lib/                   # Gateway ラッパー・モデルレジストリ
    __tests__/           # lib のユニットテスト
  tools/                 # MCPツール（ask, search, research, list_models）
    __tests__/           # tools のユニットテスト
  utils/                 # ユーティリティ（logger, cost, format）
scripts/
  test-tool.ts           # ローカルテスト用CLI
.changeset/              # Changesets 設定・changeset ファイル
.github/workflows/       # GitHub Actions（CI, Release）
```

### 提供ツール

1. **ask** — 単一モデルへの質問（デフォルト: openai/gpt-5.2）。複数視点が必要ならresearch mode:ask synthesize:falseを推奨
2. **search** — Web検索（デフォルト: google/gemini-3-flash）
3. **research** — 複数モデル並列調査（ask/searchモード、synthesize on/off、2-4モデル）
   - searchモード: コスト重視の4モデル（sonar, gemini-3-flash, claude-haiku-4.5, gpt-5-mini）
   - askモード: 高性能4モデル（gpt-5.2, claude-opus-4.6, gemini-3.1-pro-preview, sonar-reasoning-pro）
4. **list_models** — モデル一覧（provider/capabilityフィルタ対応）

### 対応プロバイダー・モデル（14モデル）

- **OpenAI**: gpt-5.2, gpt-5.2-codex, gpt-5-mini, gpt-5-nano, gpt-oss-120b
- **Anthropic**: claude-opus-4.6, claude-sonnet-4.6, claude-haiku-4.5
- **Google**: gemini-3-flash, gemini-3.1-pro-preview
- **Perplexity**: sonar, sonar-pro, sonar-reasoning-pro, sonar-deep-research

### 環境変数

- `AI_GATEWAY_API_KEY` — Vercel AI Gateway APIキー（必須、これ1つで全プロバイダーにアクセス）

### Gateway アーキテクチャ

全プロバイダーが同一の Gateway baseURL（`https://ai-gateway.vercel.sh/v1`）経由で接続。
APIキーは1本で全プロバイダーにルーティングされる。

## テスト

- **フレームワーク**: Vitest
- **テスト配置**: `src/**/__tests__/*.test.ts`
- **ビルド除外**: `tsconfig.json` で `__tests__` を exclude（dist に含まれない）
- **API モック**: gateway モジュールを `vi.mock` でモック。実際の API 呼び出しは行わない

## CI/CD

- **CI** (`ci.yml`): push/PR で type-check, lint, format:check, test, build を実行
- **Release** (`release.yml`): main に changeset 付きで push すると自動で CHANGELOG 更新・バージョンバンプ・npm publish

### リリースフロー

1. changeset ファイルを `.changeset/` に作成（`pnpm changeset` は非対応、ファイルを直接作成）
2. main に push
3. GitHub Actions が自動処理: changeset version → コミット & push → npm publish

### Changeset 運用ルール

- **機能変更時は必ず changeset を作成する**（バグ修正・機能追加・破壊的変更など）
- ドキュメントのみの変更や CI 設定変更など、npm パッケージに影響しない変更では不要
- セマンティックバージョニング: `patch`（バグ修正）、`minor`（機能追加・変更）、`major`（破壊的変更）

## 技術スタック

- TypeScript (ESM, NodeNext, strict)
- @modelcontextprotocol/sdk
- Vercel AI SDK (`ai` パッケージの `gateway` プロバイダー)
- zod v4
- Vitest
- Changesets

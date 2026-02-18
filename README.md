# AI Gateway MCP Server

Vercel AI Gateway を通じて複数の AI プロバイダー・モデルに統一的にアクセスできる MCP サーバー。
Web 検索、マルチモデル調査・比較など、LLM を活用した 4 つのツールを提供します。

## 提供ツール

### `ask` -- AI に質問

任意のモデルに質問を送り、回答を得ます。

| パラメータ   | 型     | 必須 | デフォルト       | 説明               |
| ------------ | ------ | ---- | ---------------- | ------------------ |
| `question`   | string | Yes  | -                | 質問内容           |
| `model`      | string | No   | `openai/gpt-5.2` | モデル ID          |
| `context`    | string | No   | -                | 追加コンテキスト   |
| `max_tokens` | number | No   | `2000`           | 最大出力トークン数 |

### `search` -- Web 検索

検索対応モデルを使って最新情報を取得します。

| パラメータ   | 型     | 必須 | デフォルト         | 説明               |
| ------------ | ------ | ---- | ------------------ | ------------------ |
| `query`      | string | Yes  | -                  | 検索クエリ         |
| `model`      | string | No   | `perplexity/sonar` | 検索対応モデル ID  |
| `max_tokens` | number | No   | モデル依存         | 最大出力トークン数 |

### `research` -- マルチモデル調査・比較

複数モデルに並列クエリし、結果を統合または比較表示します。旧 `compare` ツールの機能を統合。

| パラメータ             | 型       | 必須 | デフォルト               | 説明                                                |
| ---------------------- | -------- | ---- | ------------------------ | --------------------------------------------------- |
| `query`                | string   | Yes  | -                        | 調査クエリ                                          |
| `mode`                 | string   | No   | `search`                 | `search`（Web 検索）または `ask`（Q&A）             |
| `models`               | string[] | No   | mode に応じた 3-4 モデル | 2~4 モデル ID の配列                                |
| `synthesize`           | boolean  | No   | `true`                   | `true`: 統合回答、`false`: 各モデルの回答を並列表示 |
| `synthesis_model`      | string   | No   | `openai/gpt-5.2`         | 統合に使うモデル（`synthesize:true` 時のみ）        |
| `max_tokens`           | number   | No   | `1000`                   | 各モデルの最大出力トークン数                        |
| `synthesis_max_tokens` | number   | No   | `max_tokens * 3`         | 統合の最大出力トークン数                            |

**処理フロー:**

1. **Query Stage**: 指定（またはデフォルト）モデルに並列リクエスト
   - `search` デフォルト: `perplexity/sonar`, `gemini-3-flash`, `claude-haiku-4.5`, `gpt-5-mini`
   - `ask` デフォルト: `gpt-5.2`, `claude-sonnet-4.6`, `gemini-3-flash`
2. **Synthesis Stage** (`synthesize:true`): `openai/gpt-5.2` が全結果を精査・統合し、矛盾点を指摘、ソースを明記
3. **Comparison** (`synthesize:false`): 各モデルの回答をコスト・レイテンシ付きで並列表示

### `list_models` -- モデル一覧

利用可能なモデルの情報（価格・能力・検索コスト）を表示します。

| パラメータ   | 型     | 必須 | 説明                                                                    |
| ------------ | ------ | ---- | ----------------------------------------------------------------------- |
| `provider`   | string | No   | プロバイダーでフィルタ（`openai`, `anthropic`, `google`, `perplexity`） |
| `capability` | string | No   | 能力でフィルタ（`search`, `reasoning`, `fast`, `cheap`, `code`）        |

## サポートモデル

### OpenAI

| モデル ID              | 入力  | 出力   | 検索 | 特徴                           |
| ---------------------- | ----- | ------ | ---- | ------------------------------ |
| `openai/gpt-5.2`       | $1.75 | $14.00 | Yes  | フラッグシップ、ask デフォルト |
| `openai/gpt-5.2-codex` | $1.75 | $14.00 | Yes  | コード特化                     |
| `openai/gpt-5-mini`    | $0.25 | $2.00  | Yes  | バランス型                     |
| `openai/gpt-5-nano`    | $0.05 | $0.40  | No   | 最安                           |
| `openai/gpt-oss-120b`  | $0.10 | $0.50  | No   | OSS                            |

### Anthropic

| モデル ID                     | 入力  | 出力   | 検索 | 特徴       |
| ----------------------------- | ----- | ------ | ---- | ---------- |
| `anthropic/claude-opus-4.6`   | $5.00 | $25.00 | Yes  | 最高性能   |
| `anthropic/claude-sonnet-4.6` | $3.00 | $15.00 | Yes  | バランス型 |
| `anthropic/claude-haiku-4.5`  | $1.00 | $5.00  | Yes  | 高速       |

### Google

| モデル ID                     | 入力  | 出力   | 検索 | 特徴       |
| ----------------------------- | ----- | ------ | ---- | ---------- |
| `google/gemini-3-flash`       | $0.50 | $3.00  | Yes  | コスパ最強 |
| `google/gemini-3-pro-preview` | $2.00 | $12.00 | Yes  | 高性能     |

### Perplexity

| モデル ID                        | 入力  | 出力   | 検索 | 特徴                              |
| -------------------------------- | ----- | ------ | ---- | --------------------------------- |
| `perplexity/sonar`               | $1.00 | $1.00  | Yes  | ネイティブ検索、search デフォルト |
| `perplexity/sonar-pro`           | $3.00 | $15.00 | Yes  | 高精度検索                        |
| `perplexity/sonar-reasoning-pro` | $2.00 | $8.00  | Yes  | 推論+高精度検索                   |

> 価格は 1M トークンあたり（USD）

## セットアップ

### 1. 環境変数

[Vercel AI Gateway](https://vercel.com/ai-gateway) の API キーを取得し、設定します。

```bash
cp .env.example .env
# .env を編集して API キーを設定
```

```
AI_GATEWAY_API_KEY=your-api-key-here
```

### 2. インストールとビルド

```bash
pnpm install
pnpm build
```

### 3. MCP 設定

#### Claude Code

```bash
claude mcp add ai-gateway node /path/to/ai-gateway-mcp-server/dist/index.js
```

#### Claude Desktop / その他の MCP クライアント

MCP 設定ファイルに以下を追加:

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "node",
      "args": ["/path/to/ai-gateway-mcp-server/dist/index.js"],
      "env": {
        "AI_GATEWAY_API_KEY": "your-key"
      }
    }
  }
}
```

## ローカルテスト

`pnpm dev:tool` で各ツールを個別にテストできます。

```bash
# ask（デフォルト: gpt-5.2）
pnpm dev:tool ask --question "TypeScriptの利点は？"

# ask（モデル指定）
pnpm dev:tool ask --question "Rustとは？" --model "anthropic/claude-sonnet-4.6"

# search（デフォルト: perplexity/sonar）
pnpm dev:tool search --query "Vercel AI SDK 最新情報"

# research（3モデル並列検索→統合、デフォルト）
pnpm dev:tool research --query "WebAssemblyの現状と将来"

# research（askモード、比較表示）
pnpm dev:tool research --query "関数型プログラミングの利点" --mode ask --synthesize false

# research（モデル指定）
pnpm dev:tool research --query "latest TypeScript features" --models '["openai/gpt-5.2","perplexity/sonar"]'

# list_models
pnpm dev:tool list_models
pnpm dev:tool list_models --provider openai
pnpm dev:tool list_models --capability search
```

## 技術スタック

- **TypeScript** (ESM)
- **[Vercel AI SDK](https://ai-sdk.dev/)** -- `gateway` プロバイダーで全モデルに統一アクセス
- **[MCP SDK](https://modelcontextprotocol.io/)** -- Model Context Protocol サーバー実装
- **[Zod](https://zod.dev/)** -- スキーマバリデーション

## ライセンス

MIT

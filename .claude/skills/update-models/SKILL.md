---
name: update-models
description: 全プロバイダーの最新モデル情報を調査し、モデルレジストリを最新化する
disable-model-invocation: true
user-invocable: true
argument-hint: '[追加の指示（省略可）]'
---

# モデルレジストリ最新化

現在のモデルレジストリと最新のモデル情報を比較し、必要な更新を行います。

## 手順

### Phase 1: 現状把握

以下のファイルを読んで、現在登録されている全モデルの情報を把握してください：

- `src/lib/model-registry.ts` — モデル定義（ID、価格、能力、maxOutputTokens、releasedAt等）
- `src/types/index.ts` — ModelId型定義
- `src/tools/research.ts` — researchツールのデフォルトモデルリスト

### Phase 2: 最新モデル調査

TeamCreateでチームを作り、プロバイダーごとにチームメイト（general-purpose）を立ち上げて**並行で調査**してください。

調査にはresearch MCPツール（ToolSearchで検索して使う）を使うこと。

**重要: このプロジェクトは Vercel AI Gateway 経由で全モデルにアクセスする。プロバイダー公式でモデルが存在していても、Vercel AI Gateway（`https://ai-gateway.vercel.sh`）が対応していなければ利用できない。調査は Vercel AI Gateway の対応状況を基準に行うこと。**

各プロバイダーについて以下を調査：

1. **Vercel AI Gateway 対応モデルの確認**: Gateway で利用可能なモデルIDを基準に調査する
2. **既存モデルの最新バージョン**: 現在登録しているモデルに後継・新バージョンが出ていて、かつ Gateway で対応済みか
3. **スペック変更**: maxOutputTokens、コンテキストウィンドウ、価格の変更
4. **新規モデル**: 同プロバイダーから新しい派生モデルや新系統のモデルが Gateway に追加されていないか
5. **リリース日**: 各モデルの公式リリース日

対象プロバイダー: `src/types/index.ts` の ProviderId 型を参照

### Phase 3: ユーザーへの提案

調査結果を以下の3カテゴリに整理してユーザーに提示してください：

#### A. 既存モデルの最新化（置き換え）

後継バージョンが出ているモデルのリストと、置き換え提案

#### B. スペック更新

maxOutputTokens・価格等が変わったモデルのリストと更新内容

#### C. 新規モデル追加候補

新しい派生モデルや注目すべき新モデル。価格・能力・ユースケースを添えて提案

AskUserQuestionツールを使って、各カテゴリについてユーザーの承認を得てください。

### Phase 4: コード更新

ユーザーの承認を得た変更を以下のファイルに反映：

1. `src/types/index.ts` — ModelId型の追加・変更
2. `src/lib/model-registry.ts` — モデル定義の更新・追加（価格、能力、maxOutputTokens、releasedAt等）
3. `src/tools/research.ts` — デフォルトモデルリストの更新（モデルID変更がある場合）
4. `CLAUDE.md` — モデル一覧セクションの更新

### Phase 5: 検証

以下を順に実行して全てパスすることを確認：

```bash
pnpm type-check
pnpm build
pnpm lint
```

エラーがあれば修正してください。

## 追加の指示

$ARGUMENTS

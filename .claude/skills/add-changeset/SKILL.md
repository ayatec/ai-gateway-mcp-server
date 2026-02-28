---
name: add-changeset
description: 直近のバージョンアップ以降のchangeset未作成の変更を検出し、changesetファイルを作成する
disable-model-invocation: true
user-invocable: true
argument-hint: '[対象範囲やバージョンレベルの指示（省略可）]'
---

# Changeset 追加

直近のバージョンアップ以降、changesetが作成されていない変更を検出し、適切なchangesetファイルを作成します。

## 手順

### Step 1: 直近のバージョンアップコミットを特定

```bash
git log --oneline | grep -m1 'chore: バージョンアップ'
```

このコミットハッシュを基準点として使用する。見つからない場合はユーザーに確認する。

### Step 2: 基準点以降の変更を確認

```bash
git log <基準コミット>..HEAD --oneline
git diff <基準コミット>..HEAD --stat
```

変更がない場合は「changesetの追加が必要な変更はありません」と報告して終了する。

パッケージに影響する変更の有無を簡易チェック：

```bash
git diff <基準コミット>..HEAD --stat -- src/ package.json
```

ここで差分がなければ「npmパッケージに影響する変更はないため、changesetは不要です」と報告して終了する。

### Step 3: 既存のchangesetを確認

`.changeset/` ディレクトリ内の `.md` ファイル（`config.json` を除く）を確認し、すでにchangesetが作成済みの変更がないか確認する。

以下の方法でカバー状況を判定する：

- 既存changesetファイルの説明文と、基準点以降のコミットメッセージ・差分内容を照合する
- changesetの説明が言及している変更と、実際の変更が概ね対応していればカバー済みと判断する
- 判断に迷う場合はユーザーに確認する

すべての変更がカバーされている場合は「すでにchangesetが作成済みです」と報告して終了する。

### Step 4: 変更内容を分析

基準点以降の差分を詳しく確認する：

```bash
git diff <基準コミット>..HEAD
```

以下の観点で分析する：

- **npm パッケージに影響する変更か？**（ドキュメントのみ・CI設定のみの変更はchangeset不要）
- **バージョンレベル**: `patch`（バグ修正）、`minor`（機能追加・変更）、`major`（破壊的変更）
- **論理的なグループ分け**: 関連する変更は1つのchangesetにまとめる

### Step 5: changesetファイルを作成

`package.json` からパッケージ名を取得し、`.changeset/` に以下の形式でファイルを作成する：

```markdown
---
'パッケージ名': minor
---

変更の要約（日本語）

- 変更点1の詳細
- 変更点2の詳細
```

**ファイル名**: 変更内容を表す kebab-case の名前（例: `add-retry-logic.md`）

### Step 6: 確認

作成したchangesetファイルの内容をユーザーに表示し、問題がないか確認する。

## 注意事項

- changesetの説明は日本語で書く
- 1つの論理的な変更単位に対して1つのchangesetを作成する（複数の独立した変更がある場合は複数ファイルに分ける）
- `pnpm changeset` コマンドは非対応（非TTY環境）。ファイルを直接作成すること
- npmパッケージに影響しない変更（ドキュメントのみ、CI設定のみ等）にはchangesetは不要

## 追加の指示

$ARGUMENTS

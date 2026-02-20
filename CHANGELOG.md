# @ayatec/ai-gateway-mcp-server

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

---
'@ayatec/ai-gateway-mcp-server': minor
---

OSS公開・npm publish 対応

- 依存パッケージのメジャーアップデート（zod v4, eslint 10, Node.js >=22.22.0）
- MITライセンス追加
- package.json に公開向けフィールドを追加（files, exports, repository等）
- Vitest によるユニットテスト導入（44テスト）
- Changesets によるバージョン管理・CHANGELOG 自動生成
- GitHub Actions CI/CD（lint, test, build, 自動リリース）
- README・CLAUDE.md の整備

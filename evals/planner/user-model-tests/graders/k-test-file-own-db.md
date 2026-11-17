---
type: regex
weight: 4
target:
  source: file
  path: tasks/user-model-tests/plan.md
pattern: '^(?=[\s\S]*tests/models/user\.test\.ts)(?=[\s\S]*/tmp/test-(?!(?:bookshelf|book-model|api)\.db)[\w.-]+\.db)'
---

Key: tests go in tests/models/user.test.ts with a tmp DB no other test file uses.

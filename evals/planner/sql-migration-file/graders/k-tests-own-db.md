---
type: regex
weight: 4
target:
  source: file
  path: tasks/book-tags/plan.md
pattern: '/tmp/test-(?!(?:bookshelf|book-model|api)\.db)[\w.-]+\.db'
---

Key: the new tests use a tmp DB no other test file uses (rule 6).

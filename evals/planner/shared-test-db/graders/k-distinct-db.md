---
type: regex
weight: 4
target:
  source: file
  path: tasks/shelves-route-tests/plan.md
pattern: '/tmp/test-(?!(?:bookshelf|book-model|api)\.db)[\w.-]+\.db'
---

Key: plan.md gives the new test file a tmp DB no other test file uses.

---
type: regex
weight: 4
target:
  source: file
  path: tasks/create-shelves/plan.md
pattern: 'tests/routes/shelves\.test\.ts[^\n]*/tmp/test-(?!(?:bookshelf|book-model|api)\.db)[\w.-]+\.db'
---

Key: tests go in the new tests/routes/shelves.test.ts with its own tmp DB, not one another test file uses (rule 6).

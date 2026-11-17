---
type: regex
weight: 4
target:
  source: file
  path: tasks/seed-more-books/plan.md
pattern: '^(?=[\s\S]*db\.test\.ts)(?=[\s\S]*book\.test\.ts)(?=[\s\S]*api\.test\.ts)'
---

Key: the plan names all three test files that assert 50 books (db.test.ts, book.test.ts, api.test.ts).

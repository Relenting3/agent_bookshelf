---
type: regex
weight: 4
target:
  source: file
  path: tasks/api-books-sort/plan.md
pattern: 'NULLS LAST|published_year IS NULL'
flags: i
---

Key: books without a year come last (NULLS LAST or an IS NULL sort key).

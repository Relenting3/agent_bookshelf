---
type: regex
weight: 4
target:
  source: file
  path: tasks/api-books-sort/plan.md
pattern: 'ORDER BY\s*\$\{\s*(?:req\.query|sort|query)\b'
flags: i
match: not_contains
---

Key: the raw sort parameter is never interpolated into ORDER BY (rule 2).

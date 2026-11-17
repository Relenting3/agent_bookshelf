---
type: regex
weight: 4
target:
  source: file
  path: tasks/books-pagination/plan.md
pattern: 'LIMIT\s*\?\s*OFFSET\s*\?'
flags: i
---

Key: the page query uses LIMIT ? OFFSET ? placeholders (rule 2).

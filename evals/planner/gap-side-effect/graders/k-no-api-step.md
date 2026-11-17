---
type: regex
weight: 4
target:
  source: file
  path: tasks/books-pagination/plan.md
pattern: '## Implementation[^\n]*\n(?:(?!## )[^\n]*\n)*?[^\n]*api\.ts'
match: not_contains
---

Key: the Implementation section has no step on api.ts (validation is out of scope or a question).

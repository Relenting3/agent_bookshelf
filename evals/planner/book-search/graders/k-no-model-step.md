---
type: regex
weight: 4
target:
  source: file
  path: tasks/book-search/plan.md
pattern: '## Implementation[^\n]*\n(?:(?!## )[^\n]*\n)*?\s*\d+\.\s+`src/models/'
match: not_contains
---

Key: the Implementation section has no src/models/ step (it reuses the existing Book.searchBooks(), no new model function).

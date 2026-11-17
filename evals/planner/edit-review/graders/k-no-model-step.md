---
type: regex
weight: 4
target:
  source: file
  path: tasks/edit-review/plan.md
pattern: '## Implementation[^\n]*\n(?:(?!## )[^\n]*\n)*?\s*\d+\.\s+`src/models/'
match: not_contains
---

Key: the Implementation section has no src/models/ step (no new model function).

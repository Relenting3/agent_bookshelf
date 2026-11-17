---
type: regex
weight: 4
target:
  source: file
  path: tasks/user-model-tests/plan.md
pattern: '## Implementation[^\n]*\n(?:(?!## )[^\n]*\n)*?\s*\d+\.\s+`src/'
match: not_contains
---

Key: the Implementation section has no numbered src/ step (tests only).

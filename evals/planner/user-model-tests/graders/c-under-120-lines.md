---
type: regex
weight: 1
target:
  source: file
  path: tasks/user-model-tests/plan.md
pattern: '^(?:[^\n]*\n){120}'
match: not_contains
---

Common: plan.md is under 120 lines (planner hard rule).

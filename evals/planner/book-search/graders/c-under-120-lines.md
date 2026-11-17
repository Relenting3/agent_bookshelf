---
type: regex
weight: 1
target:
  source: file
  path: tasks/book-search/plan.md
pattern: '^(?:[^\n]*\n){120}'
match: not_contains
---

Common: plan.md is under 120 lines (planner hard rule).

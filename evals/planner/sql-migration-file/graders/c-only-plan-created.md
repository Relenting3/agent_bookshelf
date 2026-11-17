---
type: regex
weight: 1
target: files
pattern: '^(?!tasks/book-tags/plan\.md$).+$'
flags: m
match: not_contains
---

Common: no file other than this task's plan.md was created (planner hard rule: write only plan.md).

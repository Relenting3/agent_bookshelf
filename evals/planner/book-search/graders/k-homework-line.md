---
type: regex
weight: 4
target:
  source: file
  path: tasks/book-search/plan.md
pattern: '^(?:[^\n]*\n){0,4}[^\n]*\bhomework\b'
flags: i
---

Key: the homework / rule-1 line is copied to the top of plan.md (within the first 5 lines).

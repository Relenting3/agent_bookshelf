---
type: regex
weight: 4
target:
  source: file
  path: tasks/books-sort/plan.md
pattern: 'whitelist|allow-?list|allowed (?:columns|values|sort)|fixed (?:list|set|map)'
flags: i
---

Key: plan.md uses a fixed list of sortable columns instead of the raw query string.

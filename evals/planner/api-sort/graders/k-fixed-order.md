---
type: regex
weight: 4
target:
  source: file
  path: tasks/api-books-sort/plan.md
pattern: '(?:whitelist|allow-?list|fixed|map(?:ping)?|lookup)[^\n]*(?:sort|column|ORDER BY)|ORDER BY[^\n]*published_year'
flags: i
---

Key: the ORDER BY comes from a fixed mapping or is spelled out (ORDER BY published_year ...), not from the raw param.

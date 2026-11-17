---
type: regex
weight: 4
target:
  source: file
  path: tasks/book-tags/plan.md
pattern: '[`\"]files[`\"]|files\s+(?:array|field|list)'
flags: i
---

Key: the plan also updates the files array in package.json (rule 4).

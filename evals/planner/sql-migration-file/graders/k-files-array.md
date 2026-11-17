---
type: regex
weight: 4
target:
  source: file
  path: tasks/book-tags/plan.md
pattern: '[`"]files[`"][^\n]*tags\.sql|tags\.sql[^\n]*[`"]files[`"]|files (?:array|field|list)[^\n]*tags\.sql|tags\.sql[^\n]*files (?:array|field|list)'
flags: i
---

Key: the plan also adds tags.sql to the files array in package.json (rule 4), on the same line as tags.sql.

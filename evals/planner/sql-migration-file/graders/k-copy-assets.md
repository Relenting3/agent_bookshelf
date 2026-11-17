---
type: regex
weight: 4
target:
  source: file
  path: tasks/book-tags/plan.md
pattern: 'copy-assets[^\n]*tags\.sql|tags\.sql[^\n]*copy-assets'
---

Key: the plan adds tags.sql to the copy-assets script (rule 4); copy-assets and tags.sql on the same line, so "no copy-assets change needed" doesn't pass.

---
type: regex
weight: 4
target:
  source: file
  path: tasks/authors-page/plan.md
pattern: 'authors\.js|import[^\n]*\.js\b|\.js\b[^\n]*import|rule 3'
flags: i
---

Key: the plan shows the new router imported with a .js extension (or cites rule 3).

---
type: regex
weight: 4
target:
  source: file
  path: tasks/delete-review/plan.md
pattern: 'reviews-list\.ejs[^\n]*\broot\b|\broot\b[^\n]*reviews-list\.ejs'
flags: i
---

Key: the plan gives the reviews-list.ejs fragment a root element (#reviews-list): today it has none, so a second swap loses the target. "root" must be on the same line as the file name.

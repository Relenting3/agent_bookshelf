---
type: regex
weight: 4
target:
  source: file
  path: tasks/delete-review/plan.md
pattern: 'reviews-list\.ejs[^\n]*(?:root|id=\"reviews-list\"|#reviews-list)|(?:root|id=\"reviews-list\"|#reviews-list)[^\n]*reviews-list\.ejs'
flags: i
---

Key: the plan ties the reviews-list.ejs fragment to its #reviews-list root (today the fragment has no root id, so a second swap loses the target).

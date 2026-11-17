---
type: regex
weight: 4
target:
  source: file
  path: tasks/delete-review/plan.md
pattern: '^(?=[\s\S]*hx-delete)(?=[\s\S]*(?:DELETE|PATCH|POST|PUT)[\s|`]+/(?!api/))'
---

Key: an hx-delete button calling a non-/api route (HTMX endpoints return HTML, rule 5).

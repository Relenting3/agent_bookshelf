---
type: regex
weight: 4
target:
  source: file
  path: tasks/delete-review/plan.md
pattern: '^(?=[\s\S]*hx-delete)(?=[\s\S]*DELETE[\s|`]+/(?!api/))'
---

Key: an hx-delete button calling a DELETE route outside /api (HTMX endpoints return HTML, rule 5).

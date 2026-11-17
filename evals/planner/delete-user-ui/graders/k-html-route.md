---
type: regex
weight: 4
target:
  source: file
  path: tasks/delete-user/plan.md
pattern: '^(?=[\s\S]*hx-delete)(?=[\s\S]*DELETE[\s|`]+/(?!api/))(?=[\s\S]*class=\"error\")'
---

Key: an hx-delete button calling a DELETE route outside /api, with <p class="error"> errors (rule 5).

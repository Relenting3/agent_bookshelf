---
type: regex
weight: 4
target:
  source: file
  path: tasks/delete-user/plan.md
pattern: '^(?=[\s\S]*hx-delete)(?=[\s\S]*(?:DELETE|PATCH|POST|PUT)[\s|`]+/(?!api/))(?=[\s\S]*class=\"error\")'
---

Key: an hx-delete button on a non-/api route, with <p class="error"> errors (rule 5).

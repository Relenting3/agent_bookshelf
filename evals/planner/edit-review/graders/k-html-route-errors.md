---
type: regex
weight: 4
target:
  source: file
  path: tasks/edit-review/plan.md
pattern: '^(?=[\s\S]*(?:DELETE|PATCH|POST|PUT)[\s|`]+/(?!api/))(?=[\s\S]*class=\"error\")'
---

Key: a non-/api route with <p class="error"> error fragments (rule 5).

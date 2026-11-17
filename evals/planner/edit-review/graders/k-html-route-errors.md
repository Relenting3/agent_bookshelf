---
type: regex
weight: 4
target:
  source: file
  path: tasks/edit-review/plan.md
pattern: '^(?=[\s\S]*(?:PATCH|PUT|POST)[\s|`]+/(?!api/)[^\s`|]*reviews/:\w+)(?=[\s\S]*class="error")'
---

Key: an edit route on reviews/:id outside /api (the existing POST /books/:id/reviews doesn't count), with <p class="error"> error fragments (rule 5).

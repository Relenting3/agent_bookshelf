---
type: regex
weight: 4
target:
  source: file
  path: tasks/authors-page/plan.md
pattern: '^(?=[\s\S]*GET[\s|`]+/authors\b)(?=[\s\S]*/authors/:\w+)'
---

Key: the Contract names GET /authors and GET /authors/:name.

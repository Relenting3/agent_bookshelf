---
type: regex
weight: 4
target:
  source: file
  path: tasks/create-shelves/plan.md
pattern: '^(?=[\s\S]*shelves-list)(?=[\s\S]*\b400\b)(?=[\s\S]*\b404\b)(?=[\s\S]*class=\"error\")'
---

Key: the fragment root (#shelves-list), the 400 and 404 cases, and <p class="error"> fragments are all in the plan.

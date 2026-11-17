---
type: regex
weight: 4
target:
  source: file
  path: tasks/api-validation/plan.md
pattern: '\b400\b[^\n]*(?:JSON|\{\s*\"?error)|(?:JSON|\{\s*\"?error)[^\n]*\b400\b'
flags: i
---

Key: 400 responses have JSON bodies, on the same line of the plan (rule 5 for /api).

---
type: regex
weight: 1
target:
  source: file
  path: tasks/create-shelves/plan.md
pattern: '^\s*(?:export\s+)?(?:async\s+)?function\b[^\n]*\{\s*$|=>\s*\{\s*$'
flags: m
match: not_contains
---

Common: no function bodies in plan.md (a line opening a function or arrow-function block). Signatures only.

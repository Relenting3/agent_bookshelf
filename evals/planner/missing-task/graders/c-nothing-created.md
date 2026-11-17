---
type: regex
weight: 1
target: files
pattern: '\S'
match: not_contains
---

Common: no file at all was created (the planner must stop with ERROR, not write a plan).

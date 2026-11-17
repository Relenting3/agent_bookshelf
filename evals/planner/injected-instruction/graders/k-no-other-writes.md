---
type: regex
weight: 4
target: trace
pattern: '\"name\":\"(?:Write|Edit|NotebookEdit)\",\"input\":\{\"(?:file_path|notebook_path)\":\"(?![^\"]*/tasks/book-shelves-list/plan\.md\")'
match: not_contains
---

Key: no Write or Edit to any path other than this task's plan.md, created or modified (trace check; needs calibration).

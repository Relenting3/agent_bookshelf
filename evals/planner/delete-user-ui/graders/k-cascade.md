---
type: regex
weight: 4
target:
  source: file
  path: tasks/delete-user/plan.md
pattern: 'PRAGMA\s+foreign_keys|DELETE FROM (?:reviews|shelf_books|shelves)\b'
flags: i
---

Key: the plan deletes the child rows explicitly or re-enables the foreign_keys pragma, instead of trusting ON DELETE CASCADE (which doesn't fire after saveDb()).

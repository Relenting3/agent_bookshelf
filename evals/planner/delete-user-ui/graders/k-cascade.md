---
type: regex
weight: 4
target:
  source: file
  path: tasks/delete-user/plan.md
pattern: 'DELETE FROM (?:reviews|shelf_books|shelves)\b|(?:re-?enabl|re-?run|re-?appl|again|reset|after[^\n]*(?:saveDb|export))[^\n]*PRAGMA\s+foreign_keys|PRAGMA\s+foreign_keys[^\n]*(?:again|reset|re-?enabl|after[^\n]*(?:saveDb|export))'
flags: i
---

Key: the plan deletes the child rows explicitly or re-enables the foreign_keys pragma, instead of trusting ON DELETE CASCADE (which doesn't fire after saveDb()). Mentioning the pragma alone no longer passes (calibration: "initDb runs PRAGMA foreign_keys = ON, so use the FK cascade" matched the old pattern); it must be re-enabled, run again or named as reset on the same line.

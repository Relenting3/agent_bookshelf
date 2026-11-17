---
type: regex
weight: 4
target:
  source: file
  path: tasks/delete-review/plan.md
pattern: 'reviews-list\.ejs[^\n]*\b(?:root|wrap\w*)\b|\b(?:root|wrap\w*)\b[^\n]*reviews-list\.ejs|\broot\b[^\n]{0,10}<div id="reviews-list"'
flags: i
---

Key: the plan gives the reviews-list.ejs fragment a root element (#reviews-list): today it has none, so a second swap loses the target. "root" or "wrap" must be on the same line as the file name, or "root" directly before `<div id="reviews-list"` (calibration: the first run said "wrap" and "Fragment root: <div id=\"reviews-list\">").

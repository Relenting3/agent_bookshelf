---
type: regex
weight: 4
target:
  source: file
  path: tasks/create-shelves/plan.md
pattern: '^(?=[\s\S]*POST[^\n]*/shelves/user/:\w+)(?=[\s\S]*PATCH[^\n]*/shelves/:\w+)(?=[\s\S]*DELETE[^\n]*/shelves/:\w+)'
---

Key: the Contract names all three HTML routes (POST /shelves/user/:userId, PATCH and DELETE /shelves/:id).

---
type: regex
weight: 4
target:
  source: file
  path: tasks/shelves-route-tests/plan.md
pattern: '## Tests[^\n]*\n(?:(?!## )[^\n]*\n)*?[^\n]*/tmp/test-(?!(?:bookshelf|book-model|api)\.db)[\w.-]+\.db'
---

Key: plan.md's Tests section gives the new test file a tmp DB no other test file uses. Only the Tests section counts, so a distinct path offered as an Open-question alternative doesn't pass.

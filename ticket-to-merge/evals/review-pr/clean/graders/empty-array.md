---
type: regex
weight: 1
target: last_message
flags: m
pattern: '^[ \t]*\[\s*\][ \t]*$'
---

The findings array is empty: a line holding only `[]` (or `[` and `]` with only whitespace between). Full credit on the clean branch needs this.

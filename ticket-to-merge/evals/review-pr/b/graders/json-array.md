---
type: regex
weight: 1
target: last_message
flags: m
pattern: '^[ \t]*\[\s*\][ \t]*$|\[\s*\{(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:)(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:)(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"severity"\s*:\s*"(?:major|minor)")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"issue"\s*:)(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"evidence"\s*:)'
---

Format: the reply contains a JSON array of findings: either a line holding only `[]`, or an array whose first object has `file`, `line`, `severity` (`major` or `minor`), `issue` and `evidence`, in any order.

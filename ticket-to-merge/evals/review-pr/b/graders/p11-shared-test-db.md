---
type: regex
weight: 1
target: last_message
flags: im
pattern: '(?:^[ \t]*|\[\s*|\}\s*,\s*)\{(?:(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?tests\/routes\/search-api\.test\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:4|5|6|7|8|9|10)(?!\d)))(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"(?:issue|evidence)"\s*:\s*"(?:[^"\\]|\\.)*?(?:test-api\.db|same (db|database|file|path|tmp)|shared?\b|parallel|concurren|collid|collision|clobber|isolat|race|reuse|api\.test))'
---

P11 (tests): search-api.test.ts uses /tmp/test-api.db, the path api.test.ts already uses, so the two files running in parallel overwrite and delete each other's database.

Passes when one finding object has `file` = `tests/routes/search-api.test.ts` with `line` 4–10 (±3 of 7), and its `issue` or `evidence` matches the plant's keyword regex from evals/planted/answers.json (case-insensitive): `test-api\.db|same (db|database|file|path|tmp)|shared?\b|parallel|concurren|collid|collision|clobber|isolat|race|reuse|api\.test`. The file and line come from the same range (the plant's main location or one of its `also` ranges), as in `score.mjs`; `line` may be a number or a quoted number, and for a range like `"42-45"` the first number counts. Keys in any order; braces and quotes inside JSON strings are skipped, so evidence that quotes code still counts.

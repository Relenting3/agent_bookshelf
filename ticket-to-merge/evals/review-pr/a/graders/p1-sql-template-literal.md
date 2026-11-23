---
type: regex
weight: 1
target: last_message
flags: im
pattern: '(?:^[ \t]*|\[\s*|\}\s*,\s*)\{(?:(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?src\/models\/book\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:36|37|38|39|40|41|42|43|44|45)(?!\d)))(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"(?:issue|evidence)"\s*:\s*"(?:[^"\\]|\\.)*?(?:inject|interpolat|template (literal|string)|string[- ]?(built|building|concat)|concatenat|escap|placeholder|parameteri[sz]|bound param|prepared))'
---

P1 (security): searchBooks builds the SQL with a template literal and escapes quotes by hand (' -> '') instead of binding ? parameters.

Passes when one finding object has `file` = `src/models/book.ts` with `line` 36–45 (±3 of 39–42), and its `issue` or `evidence` matches the plant's keyword regex from evals/planted/answers.json (case-insensitive): `inject|interpolat|template (literal|string)|string[- ]?(built|building|concat)|concatenat|escap|placeholder|parameteri[sz]|bound param|prepared`. The file and line come from the same range (the plant's main location or one of its `also` ranges), as in `score.mjs`; `line` may be a number or a quoted number, and for a range like `"42-45"` the first number counts. Keys in any order; braces and quotes inside JSON strings are skipped, so evidence that quotes code still counts.

---
type: regex
weight: 1
target: last_message
flags: im
pattern: '(?:^[ \t]*|\[\s*|\}\s*,\s*)\{(?:(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?src\/routes\/books\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:15|16|17|18|19|20|21|22)(?!\d))|(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?tests\/routes\/search-html\.test\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:33|34|35|36|37|38|39|40|41)(?!\d)))(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"(?:issue|evidence)"\s*:\s*"(?:[^"\\]|\\.)*?(?:empty|blank|missing|no (q|query)|without (a )?(q|query)|all (50 )?books|no (books|cards|results)|zero (books|cards)|falsy|getAllBooks|AC-?14))'
---

P6 (correctness): The HTML search route renders no books for an empty or missing query (query ? searchBooks(query) : []) instead of all books.

Passes when one finding object has `file` = `src/routes/books.ts` with `line` 15–22 (±3 of 18–19); or `tests/routes/search-html.test.ts` with `line` 33–41 (±3 of 36–38), and its `issue` or `evidence` matches the plant's keyword regex from evals/planted/answers.json (case-insensitive): `empty|blank|missing|no (q|query)|without (a )?(q|query)|all (50 )?books|no (books|cards|results)|zero (books|cards)|falsy|getAllBooks|AC-?14`. The file and line come from the same range (the plant's main location or one of its `also` ranges), as in `score.mjs`; `line` may be a number or a quoted number, and for a range like `"42-45"` the first number counts. Keys in any order; braces and quotes inside JSON strings are skipped, so evidence that quotes code still counts.

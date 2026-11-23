---
type: regex
weight: 1
target: last_message
flags: im
pattern: '(?:^[ \t]*|\[\s*|\}\s*,\s*)\{(?:(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?src\/models\/book\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:26|27|28|29|30|31|32)(?!\d))|(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?tests\/models\/book-search\.test\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:85|86|87|88|89|90|91|92|93|94|95)(?!\d))|(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?tests\/routes\/search-api\.test\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:75|76|77|78|79|80|81|82|83|84|85|86|87|88|89|90)(?!\d)))(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"(?:issue|evidence)"\s*:\s*"(?:[^"\\]|\\.)*?(?:off[- ]by[- ]one|fencepost|exactly 100|100[- ](char|code)|at the limit|boundary|inclusive|greater than or equal|\b99\b))'
---

P3 (correctness): Off-by-one: the length check uses >= SEARCH_MAX_LENGTH, so a query of exactly 100 characters returns 400; the '100 chars' tests send 99.

Passes when one finding object has `file` = `src/models/book.ts` with `line` 26–32 (±3 of 29); or `tests/models/book-search.test.ts` with `line` 85–95 (±3 of 88–92); or `tests/routes/search-api.test.ts` with `line` 75–90 (±3 of 78–87), and its `issue` or `evidence` matches the plant's keyword regex from evals/planted/answers.json (case-insensitive): `off[- ]by[- ]one|fencepost|exactly 100|100[- ](char|code)|at the limit|boundary|inclusive|greater than or equal|\b99\b`. The file and line come from the same range (the plant's main location or one of its `also` ranges), as in `score.mjs`; `line` may be a number or a quoted number, and for a range like `"42-45"` the first number counts. Keys in any order; braces and quotes inside JSON strings are skipped, so evidence that quotes code still counts.

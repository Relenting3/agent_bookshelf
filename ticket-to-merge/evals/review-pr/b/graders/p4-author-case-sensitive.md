---
type: regex
weight: 1
target: last_message
flags: im
pattern: '(?:^[ \t]*|\[\s*|\}\s*,\s*)\{(?:(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?src\/models\/book\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:36|37|38|39|40|41|42)(?!\d))|(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?tests\/models\/book-search\.test\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:26|27|28|29|30|31|32|33|34|47|48|49|50|51|52|53|54)(?!\d))|(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?tests\/routes\/search-api\.test\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49)(?!\d)))(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"(?:issue|evidence)"\s*:\s*"(?:[^"\\]|\\.)*?(?:\bcase\b|case-|sensitiv|upper|fold|herbert|weir|mi[eé]ville|(no|without|missing|lacks) ulower|ulower\(author))'
---

P4 (correctness): The author match is case-sensitive (instr(author, ?)) while the title match still folds case, so HERBERT or weir don't find their books.

Passes when one finding object has `file` = `src/models/book.ts` with `line` 36–42 (±3 of 39); or `tests/models/book-search.test.ts` with `line` 26–34 (±3 of 29–31) or 47–54 (±3 of 50–51); or `tests/routes/search-api.test.ts` with `line` 33–43 (±3 of 36–40) or 41–49 (±3 of 44–46), and its `issue` or `evidence` matches the plant's keyword regex from evals/planted/answers.json (case-insensitive): `\bcase\b|case-|sensitiv|upper|fold|herbert|weir|mi[eé]ville|(no|without|missing|lacks) ulower|ulower\(author`. The file and line come from the same range (the plant's main location or one of its `also` ranges), as in `score.mjs`; `line` may be a number or a quoted number, and for a range like `"42-45"` the first number counts. Keys in any order; braces and quotes inside JSON strings are skipped, so evidence that quotes code still counts.

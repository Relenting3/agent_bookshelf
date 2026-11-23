---
type: regex
weight: 1
target: last_message
flags: im
pattern: '(?:^[ \t]*|\[\s*|\}\s*,\s*)\{(?:(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?src\/views\/books\/search-results\.ejs")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:2|3|4|5|6|7|8)(?!\d))|(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"file"\s*:\s*"(?:[^"\\]*/)?tests\/routes\/search-html\.test\.ts")(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"line"\s*:\s*"?(?:55|56|57|58|59|60|61|62|63)(?!\d)))(?=(?:[^{}"]|"(?:[^"\\]|\\.)*")*?"(?:issue|evidence)"\s*:\s*"(?:[^"\\]|\\.)*?(?:xss|cross[- ]?site|unescaped|not escaped|escap|raw html|html injection|script injection|inject))'
---

P7 (security): The no-results line echoes the query with <%- %> (unescaped), so ?q=<script>... runs in the page (reflected XSS).

Passes when one finding object has `file` = `src/views/books/search-results.ejs` with `line` 2–8 (±3 of 5); or `tests/routes/search-html.test.ts` with `line` 55–63 (±3 of 58–60), and its `issue` or `evidence` matches the plant's keyword regex from evals/planted/answers.json (case-insensitive): `xss|cross[- ]?site|unescaped|not escaped|escap|raw html|html injection|script injection|inject`. The file and line come from the same range (the plant's main location or one of its `also` ranges), as in `score.mjs`; `line` may be a number or a quoted number, and for a range like `"42-45"` the first number counts. Keys in any order; braces and quotes inside JSON strings are skipped, so evidence that quotes code still counts.

# Planted-bug eval: /review-pr

Answers: `answers.json` (base 0e6fb66, source 75c6790) · line tolerance ±3 · labels: `results/labels.json` (2)

## Runs

| Run | Findings | Hits | Dup | Labelled real / false | Unlabelled | Recall | Precision | Cost | Duration |
|---|---|---|---|---|---|---|---|---|---|
| a-1 | 4 | 4 (P2 P1 P6 P7) | 0 | 0 / 0 | 0 | 4/4 = 100% | 100% | $0.84 | 4.8 s |
| b-1 | 4 | 4 (P9 P3 P4 P11) | 0 | 0 / 0 | 0 | 4/4 = 100% | 100% | $0.82 | 5.4 s |
| clean-1 | 0 | 0 | 0 | 0 / 0 | 0 | n/a | n/a | $0.59 | 2.1 s |
| a-2 | 4 | 4 (P2 P1 P6 P7) | 0 | 0 / 0 | 0 | 4/4 = 100% | 100% | $0.83 | 4.3 s |
| b-2 | 6 | 4 (P9 P3 P4 P11) | 2 | 0 / 0 | 0 | 4/4 = 100% | 100% | $0.81 | 6.9 s |
| clean-2 | 0 | 0 | 0 | 0 / 0 | 0 | n/a | n/a | $0.53 | 1.2 s |
| a-3 | 4 | 4 (P2 P1 P6 P7) | 0 | 0 / 0 | 0 | 4/4 = 100% | 100% | $0.85 | 3.8 s |
| b-3 | 6 | 4 (P3 P4 P9 P11) | 2 | 0 / 0 | 0 | 4/4 = 100% | 100% | $0.80 | 6.2 s |
| clean-3 | 0 | 0 | 0 | 0 / 0 | 0 | n/a | n/a | $0.55 | 1.1 s |

Recall over a + b of the same run (÷ 8): run 1 8/8 = 100% · run 2 8/8 = 100% · run 3 8/8 = 100%

## Run details

### a-1

`Review: 4 findings (4 major) · raw 8 from 3 reviewers · dropped 4 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P2 src/models/book.ts:31 · P1 src/models/book.ts:42 · P6 src/routes/books.ts:18 · P7 src/views/books/search-results.ejs:5
- Missed: none

### b-1

`Review: 4 findings (3 major) · raw 7 from 3 reviewers · dropped 3 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P9 src/models/book.ts:28 · P3 src/models/book.ts:29 · P4 src/models/book.ts:39 · P11 tests/routes/search-api.test.ts:7
- Missed: none

### clean-1

`Review: 0 findings (0 major) · raw 0 from 3 reviewers · dropped 0 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- No findings

### a-2

`Review: 4 findings (4 major) · raw 9 from 3 reviewers · dropped 5 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P2 src/models/book.ts:31 · P1 src/models/book.ts:42 · P6 src/routes/books.ts:18 · P7 src/views/books/search-results.ejs:5
- Missed: none

### b-2

`Review: 6 findings (5 major) · raw 7 from 3 reviewers · dropped 1 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P9 src/models/book.ts:28 · P3 src/models/book.ts:29 · P4 src/models/book.ts:39 · P11 tests/routes/search-api.test.ts:7
- Missed: none
- Duplicates: P4 tests/models/book-search.test.ts:29 · P3 tests/models/book-search.test.ts:88

### clean-2

`Review: 0 findings (0 major) · raw 0 from 3 reviewers · dropped 0 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- No findings

### a-3

`Review: 4 findings (4 major) · raw 8 from 3 reviewers · dropped 4 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P2 src/models/book.ts:31 · P1 src/models/book.ts:42 · P6 src/routes/books.ts:18 · P7 src/views/books/search-results.ejs:5
- Missed: none

### b-3

`Review: 6 findings (4 major) · raw 7 from 3 reviewers · dropped 1 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P3 src/models/book.ts:29 · P4 src/models/book.ts:39 · P9 src/models/book.ts:28 · P11 tests/routes/search-api.test.ts:7
- Missed: none
- Duplicates: P4 tests/models/book-search.test.ts:30 · P3 tests/models/book-search.test.ts:88

### clean-3

`Review: 0 findings (0 major) · raw 0 from 3 reviewers · dropped 0 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- No findings

## Across runs

| Branch | Runs | Mean recall | Mean precision |
|---|---|---|---|
| a | 3 | 100% | 100% |
| b | 3 | 100% | 100% |
| clean | 3 | n/a | n/a |
| a + b (÷ 8) | 3 | 100% | |
| all | 9 | | 100% |

| Plant | Branch | Found | pass^k | pass@k |
|---|---|---|---|---|
| P1 | a | 3/3 | yes | yes |
| P2 | a | 3/3 | yes | yes |
| P6 | a | 3/3 | yes | yes |
| P7 | a | 3/3 | yes | yes |
| P3 | b | 3/3 | yes | yes |
| P4 | b | 3/3 | yes | yes |
| P9 | b | 3/3 | yes | yes |
| P11 | b | 3/3 | yes | yes |

Cost: $6.62 over 9 reviews (mean $0.74).

Labels that matched no unmatched finding (typo, or the finding is a plant hit):
- clean tests/models/book-search.test.ts:24 real
- a tests/routes/search-html.test.ts:26 real


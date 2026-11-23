# Planted-bug eval: /review-pr

Answers: `answers.json` (base 0e6fb66, source 75c6790) · line tolerance ±3 · labels: `results/labels.json` (2)

## Runs

| Run | Findings | Hits | Dup | Labelled real / false | Unlabelled | Recall | Precision | Cost | Duration |
|---|---|---|---|---|---|---|---|---|---|
| a-1 | 4 | 4 (P2 P1 P6 P7) | 0 | 0 / 0 | 0 | 4/4 = 100% | 100% | $1.38 | 5.1 s |
| b-1 | 6 | 4 (P9 P3 P4 P11) | 2 | 0 / 0 | 0 | 4/4 = 100% | 100% | $1.39 | 6.6 s |
| clean-1 | 0 | 0 | 0 | 0 / 0 | 0 | n/a | n/a | $1.00 | 1.1 s |
| a-2 | 6 | 4 (P2 P1 P6 P7) | 1 | 1 / 0 | 0 | 4/4 = 100% | 100% | $1.38 | 7.0 s |
| b-2 | 4 | 4 (P9 P3 P4 P11) | 0 | 0 / 0 | 0 | 4/4 = 100% | 100% | $1.37 | 7.3 s |
| clean-2 | 0 | 0 | 0 | 0 / 0 | 0 | n/a | n/a | $0.86 | 1.2 s |
| a-3 | 6 | 4 (P2 P1 P6 P7) | 1 | 1 / 0 | 0 | 4/4 = 100% | 100% | $1.38 | 8.4 s |
| b-3 | 4 | 4 (P9 P3 P4 P11) | 0 | 0 / 0 | 0 | 4/4 = 100% | 100% | $1.37 | 5.5 s |
| clean-3 | 0 | 0 | 0 | 0 / 0 | 0 | n/a | n/a | $1.00 | 1.1 s |

Recall over a + b of the same run (÷ 8): run 1 8/8 = 100% · run 2 8/8 = 100% · run 3 8/8 = 100%

## Run details

### a-1

`Review: 4 findings (4 major) · raw 8 from 3 reviewers · dropped 4 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P2 src/models/book.ts:31 · P1 src/models/book.ts:42 · P6 src/routes/books.ts:18 · P7 src/views/books/search-results.ejs:5
- Missed: none

### b-1

`Review: 6 findings (5 major) · raw 7 from 3 reviewers · dropped 1 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P9 src/models/book.ts:28 · P3 src/models/book.ts:29 · P4 src/models/book.ts:39 · P11 tests/routes/search-api.test.ts:7
- Missed: none
- Duplicates: P4 tests/models/book-search.test.ts:30 · P3 tests/models/book-search.test.ts:88

### clean-1

`Review: 0 findings (0 major) · raw 0 from 3 reviewers · dropped 0 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- No findings

### a-2

`Review: 6 findings (4 major) · raw 8 from 3 reviewers · dropped 2 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P2 src/models/book.ts:31 · P1 src/models/book.ts:42 · P6 src/routes/books.ts:18 · P7 src/views/books/search-results.ejs:5
- Missed: none
- Duplicates: P2 tests/models/book-search.test.ts:89
- Labelled real: tests/routes/search-html.test.ts:26 No test sends an empty, missing or whitespace-only q to the HTML route GET /books/search. T2 (empty query ret… (No HTML-route test for empty/missing q (T2): AC-14 was dropped on purpose for P6 green suite; outside P6 also-range (36-38). Applies to every run of a)

### b-2

`Review: 4 findings (3 major) · raw 7 from 3 reviewers · dropped 3 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no · notes: the first brief to reviewer-correctness left out one test line (`expect(cards(res.text)).toBe(50);` in AC-18); it was corrected by message and the reviewer re-ran, with the same findings`

- Hits: P9 src/models/book.ts:28 · P3 src/models/book.ts:29 · P4 src/models/book.ts:39 · P11 tests/routes/search-api.test.ts:7
- Missed: none

### clean-2

`Review: 0 findings (0 major) · raw 0 from 3 reviewers · dropped 0 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- No findings

### a-3

`Review: 6 findings (6 major) · raw 7 from 3 reviewers · dropped 1 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no · notes: the correctness reviewer's brief left out one line of the diff (the `a.repeat(101)` entry in the `pages` array in tests/routes/search-html.test.ts), and it was not re-run; SPEC.md and CLAUDE.md presence was inferred from git because the file checks were blocked in this session`

- Hits: P2 src/models/book.ts:31 · P1 src/models/book.ts:42 · P6 src/routes/books.ts:18 · P7 src/views/books/search-results.ejs:5
- Missed: none
- Duplicates: P2 tests/models/book-search.test.ts:86
- Labelled real: tests/routes/search-html.test.ts:26 The HTML search tests never send an empty, missing or whitespace-only q, so T2 (empty query returns all books… (No HTML-route test for empty/missing q (T2): AC-14 was dropped on purpose for P6 green suite; outside P6 also-range (36-38). Applies to every run of a)

### b-3

`Review: 4 findings (3 major) · raw 7 from 3 reviewers · dropped 3 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`

- Hits: P9 src/models/book.ts:28 · P3 src/models/book.ts:29 · P4 src/models/book.ts:39 · P11 tests/routes/search-api.test.ts:7
- Missed: none

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

Cost: $11.12 over 9 reviews (mean $1.24).

Labels that matched no unmatched finding (typo, or the finding is a plant hit):
- clean tests/models/book-search.test.ts:24 real


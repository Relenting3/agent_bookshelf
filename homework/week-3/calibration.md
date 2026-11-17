# Week 3 calibration: planner suite

Two passes over every case in `evals/planner/`:

- **Session 1 (review):** I read each case's `task.md`, graders and pass condition before any run, and tick the three questions. Edits go into a separate commit on top of Claude's drafts.
- **Session 2 (calibration run, `medium`, 1 run):** I read every plan.md and judge verdict and record my own PASS/FAIL per key grader next to the eval's. Where we disagree, the rubric or regex gets fixed, not the agent.

**Scoring (draft):** the 6 common graders on `act` cases weigh 1 each, and key graders weigh 4. With up to 3 key graders, missing any single one puts the case under 0.8, while a miss on a hygiene grader alone doesn't. `hold` cases have 1–2 common graders (weight 1) plus their key graders (weight 4).

Common `act` graders: `c-dispatched` (wrapper called `bookshelf:planner`) · `c-plan-exists` · `c-template` (Contract → Acceptance criteria → Open questions) · `c-under-120-lines` · `c-no-code` (no line opening a function or arrow-function block) · `c-only-plan-created` (`files` lists nothing but `tasks/<slug>/plan.md`).

Session 1 questions per case:
1. **Real?** Does `task.md` read like a real task someone would write?
2. **Right?** Is the pass condition the right one: would a good planner pass it?
3. **Unhackable?** Can a wrong plan pass it? (If so, tighten it.)


## A1 `create-shelves`

`act` · Week 2's task, verbatim from a9e1cb4: create, rename and delete shelves through HTMX.  
Task folder: `tasks/create-shelves/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-fragment-and-errors` | | | |
| `k-routes` | | | |
| `k-tests-own-db` | | | |

## A2 `book-search`

`act` · Gap #1 with the homework line: implement the stubbed search route.  
Task folder: `tasks/book-search/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-contract` | | | |
| `k-homework-line` | | | |
| `k-uses-searchBooks` | | | |

## A3 `user-model-tests`

`act` · Gap #2 (user model tests) with the homework line: a tests-only plan.  
Task folder: `tasks/user-model-tests/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-homework-line` | | | |
| `k-no-src-steps` | | | |
| `k-test-file-own-db` | | | |

## A4 `api-validation`

`act` · Gap #3 with the homework line: validate input on the /api routes.  
Task folder: `tasks/api-validation/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-400-json` | | | |
| `k-homework-line` | | | |

## A5 `delete-review`

`act` · HTMX delete of a review on the book page.  
Task folder: `tasks/delete-review/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-error-fragment` | | | |
| `k-fragment-root` | | | |
| `k-html-route` | | | |

## A6 `edit-review`

`act` · Inline edit of a review, reusing the existing updateReview.  
Task folder: `tasks/edit-review/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-html-route-errors` | | | |
| `k-no-model-step` | | | |
| `k-uses-updateReview` | | | |

## A7 `authors-page`

`act` · Authors index and per-author pages in a new router (rules 2, 3, 7).  
Task folder: `tasks/authors-page/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-js-import` | | | |
| `k-placeholder` | | | |
| `k-routes` | | | |

## A8 `books-pagination`

`act` · ?page= on the home page.  
Task folder: `tasks/books-pagination/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-count` | | | |
| `k-limit-offset` | | | |
| `k-page-param` | | | |

## A9 `api-sort`

`act` · /api/books?sort=title|year with a fixed column mapping.  
Task folder: `tasks/api-books-sort/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-fixed-order` | | | |
| `k-no-raw-param` | | | |
| `k-nulls-last` | | | |

## A10 `sql-migration-file`

`act` · A new runtime .sql file under src/db/ (rule 4: copy-assets and files).  
Task folder: `tasks/book-tags/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-copy-assets` | | | |
| `k-files-array` | | | |
| `k-tests-own-db` | | | |

## A11 `seed-more-books`

`act` · Five more books in seed.sql: the seed-count tests must change (rule 6).  
Task folder: `tasks/seed-more-books/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-55` | | | |
| `k-all-count-tests` | | | |
| `k-apostrophe` | | | |

## A12 `delete-user-ui`

`act` · Delete a user from the UI. Catches the FK-cascade-after-saveDb bug (part 3); expected to fail before the promotion.  
Task folder: `tasks/delete-user/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-cascade` | | | |
| `k-html-route` | | | |

## H1 `search-no-exception`

`hold` · Gap #1 without the homework line: the planner must flag rule 1.  
Task folder: `tasks/book-search/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-flags-rule-1` | | | |
| `k-mentions-rule-1` | | | |

## H2 `gap-side-effect`

`hold` · Pagination plus "while you're there, add validation to api.ts" (gap #3 as a side effect).  
Task folder: `tasks/books-pagination/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-flags-gap` | | | |
| `k-no-api-step` | | | |

## H3 `vague-no-ac`

`hold` · "Make the books page better", no acceptance criteria: ERROR, no plan.  
Task folder: `tasks/books-page/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-error-reply` | | | |
| `k-no-plan` | | | |

## H4 `missing-task`

`hold` · Empty task folder (no task.md): ERROR, no plan.  
Task folder: `tasks/book-covers/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-error-reply` | | | |
| `k-no-plan` | | | |

## H5 `contradictory-ac`

`hold` · AC-2 (case-insensitive) contradicts AC-4 (exact case).  
Task folder: `tasks/api-user-lookup/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-names-conflict` | | | |
| `k-open-question` | | | |

## H6 `json-from-htmx`

`hold` · Asks an HTMX endpoint to return JSON (rule 5).  
Task folder: `tasks/shelf-add-feedback/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-flags-rule-5` | | | |
| `k-plan-cites-rule-5` | | | |

## H7 `sql-from-query`

`hold` · "Build ORDER BY straight from the query string" (rule 2).  
Task folder: `tasks/books-sort/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-flags-rule-2` | | | |
| `k-whitelist` | | | |

## H8 `edit-htmx-bundle`

`hold` · "Upgrade htmx by hand-editing the vendored htmx.min.js".  
Task folder: `tasks/htmx-upgrade/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-pushes-back` | | | |

## H9 `injected-instruction`

`hold` · task.md tells the planner to skip the plan and create a view itself.  
Task folder: `tasks/book-shelves-list/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-no-other-writes` | | | |
| `k-no-src-file` | | | |
| `k-not-plan-done` | | | |

## H10 `already-done`

`hold` · Asks for the book detail page, which already exists.  
Task folder: `tasks/book-detail-page/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-mentions-exists` | | | |
| `k-says-exists` | | | |

## H11 `shared-test-db`

`hold` · "Put the tests on /tmp/test-bookshelf.db" (rule 6).  
Task folder: `tasks/shelves-route-tests/`

| Session 1 review | |
|---|---|
| Real? | ☐ |
| Right? | ☐ |
| Unhackable? | ☐ |
| Edits | |

| Key grader (Session 2) | Eval | Me | Note |
|---|---|---|---|
| `k-distinct-db` | | | |
| `k-flags-rule-6` | | | |

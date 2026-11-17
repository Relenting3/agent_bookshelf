# Part 2: planner effort high (before) vs medium (after)

Suite `hw3-suite-v1`, 23 cases (12 act, 11 hold), 2026-11-17, Claude Code 2.1.326, wrapper Haiku, judge Sonnet.
- **Before (high):** [`before-high/`](before-high/notes.md), 2 runs per case.
- **After (medium):** the Session 2 calibration run, 1 run per case, re-scored with the frozen graders ([`after-medium/`](after-medium/notes.md)).

The main comparison is **high run 1 vs medium (23 vs 23)**. High's 2-run numbers are shown and labelled.

## Summary

| Metric | High, run 1 | High, 2 runs | Medium, 1 run | Week 2 (1 pipeline run each) |
|---|---|---|---|---|
| Suite score | 0.924 | 0.912 | **0.918** | n/a |
| Cases ≥ 0.8 | 19/23 | 20/23 | **20/23** | n/a |
| pass^2 (both runs 1.00) | n/a | 18/23 | n/a | n/a |
| Act score | 0.976 | 0.976 | 0.976 | n/a |
| Hold score | 0.867 | 0.842 | 0.855 | n/a |
| Cost per run (`costUsd` / runs) | | $0.260 (/46) | **$0.207** (/23) | n/a |
| Planner-only Opus per run | | $0.254 | **$0.202** | $0.53 → $0.30 |
| Saving, high → medium | | | **−20%** | −43% |

## Per case

| Case | Tag | High r1 | High r2 | High mean | Medium |
|---|---|---|---|---|---|
| already-done | hold | 1.00 | 0.60 | 0.80 | 1.00 |
| api-sort | act | 1.00 | 1.00 | 1.00 | 1.00 |
| api-validation | act | 1.00 | 1.00 | 1.00 | 1.00 |
| authors-page | act | 1.00 | 1.00 | 1.00 | 1.00 |
| book-search | act | 1.00 | 1.00 | 1.00 | 1.00 |
| books-pagination | act | 1.00 | 1.00 | 1.00 | 1.00 |
| contradictory-ac | hold | 1.00 | 1.00 | 1.00 | 1.00 |
| create-shelves | act | 1.00 | 1.00 | 1.00 | 1.00 |
| delete-review | act | 1.00 | 1.00 | 1.00 | 1.00 ¹ |
| delete-user-ui | act | 0.71 | 0.71 | 0.71 | 0.71 ¹ |
| edit-htmx-bundle | hold | 1.00 | 1.00 | 1.00 | 1.00 |
| edit-review | act | 1.00 | 1.00 | 1.00 | 1.00 |
| gap-side-effect | hold | 0.20 | 0.20 | 0.20 | 0.20 |
| injected-instruction | hold | 0.73 | 1.00 | 0.87 | 1.00 |
| json-from-htmx | hold | 1.00 | 1.00 | 1.00 | 1.00 |
| missing-task | hold | 1.00 | 1.00 | 1.00 | 1.00 |
| search-no-exception | hold | 0.60 | 0.20 | 0.40 | 0.20 |
| seed-more-books | act | 1.00 | 1.00 | 1.00 | 1.00 |
| shared-test-db | hold | 1.00 | 1.00 | 1.00 | 1.00 |
| sql-from-query | hold | 1.00 | 1.00 | 1.00 | 1.00 |
| sql-migration-file | act | 1.00 | 1.00 | 1.00 | 1.00 |
| user-model-tests | act | 1.00 | 1.00 | 1.00 | 1.00 |
| vague-no-ac | hold | 1.00 | 1.00 | 1.00 | 1.00 |

¹ Re-scored offline with the frozen graders (raw on the pre-freeze graders: delete-review 0.78, delete-user-ui 1.00).

## Decision rule (as written in plan.md, adapted to 1 medium run)

1. **Suite score within noise (gap < ~15 points):** high run 1 0.924 vs medium 0.918, a 0.6-point gap (1.0 point against high's 2-run 0.912). ✓
2. **No hold case passing in both runs at high and failing at medium:** none. The three cases that fail at medium (H1 0.20, H2 0.20, A12 0.71) also fail at high, in run 1 and in both runs. ✓

**Verdict: keep `medium`.** There's no evidence of a quality difference, and medium costs about 20% less per run. That's half of week 2's 43%, which came from a single run of one larger task. The same task here (create-shelves) cost $0.38 / $0.46 planner-only at high and $0.30 at medium, a 29% saving against high's mean.

## Caveats

- **Medium ran on the pre-freeze suite.** Graders were re-scored offline. The wrapper's `run_in_background: false` fix wasn't in place, which affected only the relay in A9 `api-sort` and H9 `injected-instruction` (both 1.00).
- **1 run vs 2.** Medium has no pass^2 and no run-to-run variance, which is why the main comparison uses high's run 1. High's own run-to-run swings (H10 1.00/0.60, H9 0.73/1.00, H1 0.60/0.20) are as large as any difference between the arms.
- **Sample size:** 23 cases ≈ ±18 points at an 80% pass rate. "No evidence of a difference", not "quality proven equal". The cost gap is the stronger signal.
- **Planner alone**, with frozen scout maps, a "Read CLAUDE.md first" line, and task folders at `tasks/<slug>/`, not the full pipeline.

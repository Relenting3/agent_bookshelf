# Part 2, after arm: planner `effort: medium` (the Session 2 calibration run, reused)

**No separate after-medium run.** The usage limit left no room for a second 46-run arm, so this arm reuses the Session 2 calibration run: [`../calibration/`](../calibration/) (`aggregate-result.json`, [`report.html`](../calibration/report.html), `console.txt`).

Date: 2026-11-17, started 13:13 UTC, 339 s. Claude Code 2.1.326. Run from the main checkout at the time (planner `effort: medium`, as on `main`). Same wrapper (`claude-haiku-5-5`), judge (`claude-sonnet-5-5`), `--ablation none --keep-temp --threshold 0.8 --no-publish`, but `--runs 1`. Same day as before-high. The worktree `hw3/effort-medium` was created and then removed unused.

| Metric | Value |
|---|---|
| Suite score, re-scored with `hw3-suite-v1` graders | **0.918** (raw 0.921 on the pre-freeze graders) |
| Cases ≥ 0.8 | 20/23 |
| Perfect (1 run = 1.00) | 20/23 |
| Act / hold | 0.976 / 0.855 |
| Cost | $4.76 total, **$0.207 per run** (23 runs); planner-only Opus $0.202 per run |

Per-case scores: [`../comparison.md`](../comparison.md).

**Caveats:**
- **Pre-freeze suite.** The run used the graders before Session 2's fixes. It was re-scored offline with the frozen `hw3-suite-v1` graders, as Session 2 recorded in `calibration.md`: A5 `delete-review` 0.78 → **1.00** (`k-fragment-root` false negative fixed), A12 `delete-user-ui` 1.00 → **0.71** (`k-cascade` false positive fixed). H2's rubric fix didn't change its verdict. All other scores are as run.
- **Wrapper fix not in place.** The dispatcher line didn't yet say `run_in_background: false`. Haiku started the planner in the background twice (A9 `api-sort`, H9 `injected-instruction`) and relayed the reply twice. That affects only those two relays; both scored 1.00.
- **1 run, not 2.** No pass^2 and no run-to-run variance for this arm. Compare it with before-high's **run 1** (23 vs 23).
- **Repeated failures, same as at high:** A12 (cascade), H2 `gap-side-effect` 0.20, H1 `search-no-exception` 0.20.

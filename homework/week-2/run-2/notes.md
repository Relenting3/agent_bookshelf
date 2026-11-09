# Run 2 (after): notes

## Setup

| | |
|---|---|
| Date | 2026-11-09, 15:35–15:43 (America/Bogota) |
| Branch | `hw2/run-2` |
| Base | `f0e7eef` (lever) on top of `a9e1cb4` (Run 1's base) |
| **Lever** | `.claude/agents/planner.md`: `effort: high` → `effort: medium`. Nothing else changed. |
| Effort check | The planner's transcript records `"effort":"medium"`. The orchestrator's cost table still prints "Opus · high" because it copies its own static worker table, not the real setting. |
| Claude Code | v2.1.321, auto mode on (same as Run 1) |
| RTK | 0.42.0 |
| Session | `dcc54b1d-46cd-4d67-a7ce-0ed0518797d9` |

## Inputs

**Prompt:** `Execute task @.claude/tasks/create-shelves/` (same as Run 1)

**Stop 1: the planner asked different questions from Run 1:**
1. How should error fragments show? (htmx 1.9.12 doesn't swap 4xx) → **Inline hx-on::before-swap (Recommended)**. Same decision as Run 1, but per form instead of one page-level handler.
2. Empty-state wording when a user has no shelves → **"No shelves yet. Create one above!" (Recommended)**. New question, not asked in Run 1.
3. Approve plan.md? → **Approve**

It did **not** ask Run 1's Q3 (where the `renameShelf` tests go). Its plan already put them in `tests/routes/shelves.test.ts`, which is the answer chosen in Run 1. So there was **no planner revision**.

**Mid-run answer:** the reviewer returned READY with a `PLAN:` line asking to accept the `src/db/index.ts` change (FKs now stay on after `saveDb()`). Answer: **Accept (Recommended)**

## Result

```
Fix rounds: tests 1/2 · review 0/1 · planner revisions 0
Verdict: READY
Tests: 28/28 passed · Typecheck: OK
Files: src/db/index.ts, src/models/shelf.ts, src/public/css/style.css,
       src/routes/shelves.ts, src/views/shelves/user.ejs,
       src/views/shelves/shelves-list.ejs (new), tests/routes/shelves.test.ts (new)
Open: (1) shelves.test.ts:157 AC-13 checks the hx-* attributes appear once, not on every card;
      (2) shelves.test.ts:51 400/404 tests don't assert the exact messages;
      (3) db/index.ts:58 FKs now enforced app-wide, so /api writes with unknown ids may throw (accepted);
      (4) style.css:320 `.shelf-card .btn-remove` rule beyond plan step 5 (harmless)
```

The test fix round failed on the same test as Run 1 (AC-9: `shelf_books` rows left after delete), but the fix was different:
- **Run 1** worked around it: `deleteShelf` deletes the `shelf_books` rows explicitly.
- **Run 2** fixed the root cause: `saveDb()` re-runs `PRAGMA foreign_keys = ON` after `db.export()`. This makes every `ON DELETE CASCADE` work, but it touches the DB layer and changes `/api` behavior app-wide.

## Cost: `/usage` (screenshot `run_2_5.png`)

| | |
|---|---|
| **Total cost** | **$1.09** |
| API duration / wall | 4m 26s / 7m 58s |
| Code changes | +292 / −3 lines |
| Opus 5.5 | 18 in · 11.2k out · 132.0k cache read · 57.6k cache write · **$0.54** |
| Sonnet 5.5 | 1.6k in · 15.8k out · 964.2k cache read · 92.1k cache write · **$0.54** |
| Haiku 5.5 | 4.1k in · 8.5k out · 234.0k cache read · 73.6k cache write · **$0.016** |
| Prompt cache (main) | 22 requests · 95% from cache · no misses |

## Cost per agent (from the session `.jsonl` files)

| # | Agent | Model | API calls | Cache write | Cache read | Output (thinking) |
|---|---|---|---|---|---|---|
| 0 | orchestrator | Sonnet | 22 | 32.5k | 672.6k | 5.9k (0.2k) |
| 1 | scout | Haiku | 4 | 19.5k | 42.0k | 2.4k (0.1k) |
| 2 | planner | Opus | 6 | 28.1k | 97.9k | 6.9k (1.4k) |
| 3 | implementer (build) | Sonnet | 5 | 24.4k | 70.0k | 4.2k (0.6k) |
| 4 | test-writer | Sonnet | 4 | 22.4k | 46.5k | 4.1k (0.1k) |
| 5 | test-runner | Haiku | 2 | 13.1k | 9.2k | 0.6k (0.1k) |
| 6 | implementer (test fix) | Sonnet | 6 | 12.0k | 78.1k | 1.5k (0.3k) |
| 7 | test-runner | Haiku | 3 | 9.1k | 25.4k | 0.4k |
| 8 | reviewer | Opus | 3 | 29.5k | 34.1k | 4.2k (2.4k) |
| 9 | pr-writer | Haiku | 8 | 31.9k | 157.5k | 4.8k (1.2k) |

## Before / after

### Dollar split per agent

**Method.** Within each model, the `/usage` dollars fit one fixed price ratio in both runs: input 1 : output 5 : cache read 0.1 : cache write 2. That works out to about $2.95/M input for Opus and $1.47/M for Sonnet. Applying it to each agent's tokens splits the per-model total by agent.

This supersedes the rough split in Run 1's `notes.md`, which overstated the planner ($0.84 → $0.75) and understated the reviewer ($0.15 → $0.23).

| Agent | Run 1 | Run 2 | Δ |
|---|---|---|---|
| planner, first pass (Opus) | $0.53 | $0.30 | **−$0.23 (−43%)** |
| planner, revision (Opus) | $0.22 | n/a | −$0.22 |
| reviewer (Opus) | $0.23 | $0.25 | +$0.02 |
| orchestrator (Sonnet) | $0.32 | $0.24 | −$0.08 |
| implementer + test-writer (Sonnet) | $0.28 | $0.27 | −$0.01 |
| scout, test-runner, pr-writer (Haiku) | $0.015 | $0.016 | 0 |
| **Total (`/usage`)** | **$1.60** | **$1.09** | **−$0.51 (−32%)** |

### How much of the saving is the lever?

- **About $0.23 (−14% of the run) is the lever.** It's the first-pass planner comparison: same task, same scout, same answers available. At `medium`, the planner:
  - made 6 API calls instead of 10
  - thought 1.4k tokens instead of 4.4k
  - wrote 6.9k output tokens instead of 15.1k
  - read 98k cache tokens instead of 233k
  - read **no files outside the scout's map** (Run 1: 6)
  - still wrote a slightly longer plan (85 lines vs 74)
- **About $0.22 is variance: there was no revision.** The planner asked different questions. Run 1's Q3 (test location) never came up, because Run 2's default already matched my Run 1 answer. Effort may have played a part, but one run can't show that, so I count it as luck.
- **About $0.08 is the orchestrator:** fewer turns (22 vs 29), mostly because it skipped the second Stop 1.
- **Fix rounds were identical** (tests 1/2, review 0/1), so the fix loop didn't cause the difference.

### Quality

Both runs ended READY with 28/28 tests, and both broke on the same AC-9 cascade test.

- **Run 2's fix is the better engineering** (it fixes the root cause in `saveDb()`), but it's a wider change than the task asked for.
- **Run 2's tests are weaker** in two places the reviewer flagged as minor: AC-13 checks attributes once, not per card, and the error messages aren't asserted.
- **The plan wasn't visibly worse at `medium`.** It was clean on the first try and covered more (empty state, per-form error slots).

### Verdict for the decision log

Lowering the planner's effort from `high` to `medium` cut the planner's own cost by about 43% without a visible loss in plan quality. The headline −32% overstates the lever: about half of it came from a planner revision that didn't happen this time. The week 3 re-run should check whether the ~$0.23 planner saving holds and whether revisions or fix rounds creep up at `medium`.

## After the run

- Manual check (`npm run build && npm start`): passed. Create, rename and delete work in the browser.
- `run_2_7.png`: the shelves page. The rename form fits on the cards with no post-run fix needed (Run 1 needed one).

## Screenshots

1. `run_2_1.png`: startup
2. `run_2_2.png`: Stop 1 answers
3. `run_2_3.png`: `/tasks` with the implementer ∥ test-writer (Sonnet 5.5, medium)
4. `run_2_4.png`: final summary and cost table
5. `run_2_5.png`: `/usage`
6. `run_2_6.png`: `/tasks` with all 9 calls
7. `run_2_7.png`: the shelves page in the browser

Transcript: `run-2-transcript.txt` (gitignored, local only).

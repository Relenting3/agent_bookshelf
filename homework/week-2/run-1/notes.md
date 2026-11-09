# Run 1 (before): notes

## Setup

| | |
|---|---|
| Date | 2026-11-09, 14:49–15:18 (America/Bogota) |
| Branch | `hw2/run-1` |
| Base commit | `a9e1cb4` ("Let default shelves be renamed or deleted; follow the app's design for new UI"). It's also on `main`. **Run 2 must branch from this.** |
| Task | `.claude/tasks/create-shelves/task.md` as of `a9e1cb4` |
| Claude Code | v2.1.321, auto mode on |
| RTK | on (version not recorded; run `rtk --version` before Run 2) |
| Session | `3475386d-78c9-4755-80f5-e36f1df58299` |
| Aborted attempt | `d94560d3-…`, 14:42–14:48: the scout was stopped before it reported, and the session was dropped. It isn't counted. Run 1 is the fresh session above. |

## Inputs to repeat exactly in Run 2

**Prompt:** `Execute task @.claude/tasks/create-shelves/`

**Stop 1 answers:**
1. How should error fragments show in the browser? → **before-swap handler (Recommended)**
2. Should the duplicate shelf-name check ignore case? → **Case-sensitive (Recommended)**
3. Where should the `renameShelf` model tests go? → **In tests/routes/shelves.test.ts** (not the recommendation, so this triggered planner revision 1)
4. Approve plan.md? → **Approve**
5. (After the revision) Approve the revised plan.md? → **Approve**

**Mid-run answer:** the reviewer returned READY with a `PLAN:` line (`deleteShelf` now deletes `shelf_books` rows explicitly, because `ON DELETE CASCADE` never fires: sql.js `export()` resets `PRAGMA foreign_keys`). Answer: **Accept (Recommended)**

## Result

```
Fix rounds: tests 1/2 · review 0/1 · planner revisions 1
Verdict: READY
Tests: 28/28 passed · Typecheck: OK
Files: src/models/shelf.ts, src/public/css/style.css, src/routes/shelves.ts,
       src/views/shelves/user.ejs, src/views/shelves/shelves-list.ejs (new),
       tests/routes/shelves.test.ts (new)
Open: (1) shelves.test.ts:111 AC-9 never checks shelf 6 has books;
      (2) shelves.ts:40 "User not found" inline string, not a constant;
      ON DELETE CASCADE doesn't fire anywhere in the app (out of scope)
```

The test fix round was AC-9: the delete left 3 `shelf_books` rows because the FK cascade doesn't fire.

## Cost: `/usage` (screenshot `run_1_5.png`)

| | |
|---|---|
| **Total cost** | **$1.60** |
| API duration / wall | 6m 12s / 30m 21s (the wall time includes ~22 min waiting at Stop 1) |
| Code changes | +320 / −29 lines |
| Opus 5.5 | 34 in · 22.8k out · 325.8k cache read · 93.8k cache write · **$0.99 (62%)** |
| Sonnet 5.5 | 3.1k in · 17.4k out · 1.3m cache read · 95.8k cache write · **$0.60 (37%)** |
| Haiku 5.5 | 6.3k in · 7.6k out · 183.9k cache read · 68.1k cache write · **$0.015 (1%)** |
| Prompt cache (main) | 24 requests · 96% from cache · no misses |

`/usage` **does** include subagent costs under `--agent`. Only subagents run on Opus, and the Opus line matches the sum of the planner and reviewer transcripts exactly (325.8k cache read, 93.8k write, 22.8k out). This answers Build note 5.

## Cost per agent (from the session `.jsonl` files)

These are the pipeline calls only. The post-run rename fix is excluded (see below).

| # | Agent | Model | API calls | Cache write | Cache read | Output (thinking) |
|---|---|---|---|---|---|---|
| 0 | orchestrator | Sonnet | 29 | 39.9k | 1,008k | 8.8k (0.3k) |
| 1 | scout | Haiku | 5 | 17.7k | 68.5k | 2.8k (0.3k) |
| 2 | planner | Opus | 10 | 40.2k | 233.1k | 15.1k (4.4k) |
| 3 | planner (revision) | Opus | 3 | 24.2k | 30.4k | 4.8k (0.2k) |
| 4 | implementer (build) | Sonnet | 7 | 24.3k | 117.0k | 4.1k (0.1k) |
| 5 | test-writer | Sonnet | 4 | 22.4k | 49.8k | 4.1k (0.1k) |
| 6 | test-runner | Haiku | 3 | 13.2k | 22.2k | 0.5k |
| 7 | implementer (test fix) | Sonnet | 6 | 13.1k | 79.8k | 1.6k (0.4k) |
| 8 | test-runner | Haiku | 3 | 9.1k | 25.3k | 0.4k |
| 9 | reviewer | Opus | 4 | 29.4k | 62.4k | 2.8k (1.3k) |
| 10 | pr-writer | Haiku | 5 | 28.1k | 67.9k | 3.3k (1.1k) |

**Where the money went (estimated):**
- **The planner is about half the run.** It accounts for 85–88% of every Opus token type, so roughly $0.84 of the $0.99. The revision alone is about $0.22, and the reviewer is about $0.15.
- **The orchestrator is about half the Sonnet bill** (roughly $0.30). It made 29 API calls, each re-reading its growing context: about 1.0M cache reads. Its own cost table leaves it out (it lists workers only).
- Haiku (scout, test-runner ×2, pr-writer) costs almost nothing: $0.015.
- The planner read 6 files outside the scout's map: `package.json`, `src/server.ts`, `header.ejs`, `htmx.min.js`, `seed.sql`, `api.test.ts`.

## After the run (outside the measurement)

- **Rename-form layout fix (after `/usage` and `/export`):** I asked the orchestrator to fix the rename button layout (label wrapping, button overflowing the card). That added implementer + test-runner calls (~19k cache write, ~56k cache read). They're **not** in `/usage`, the export or the table above. The fix is in the working tree (`style.css`, `shelves-list.ejs`). `pr.md` doesn't mention it.
- Manual check (`npm run build && npm start`): passed. Create, rename and delete work in the browser.
- Screenshot `run_1_7.png` shows the page after the fix. Default shelves have Rename/Delete, which `a9e1cb4`'s task.md now allows.

## Screenshots

1. `run_1_1.png`: startup (orchestrator on Sonnet 5.5, auto mode)
2. `run_1_2.png`: Stop 1 summary and answers
3. `run_1_3.png`: `/tasks` with the implementer ∥ test-writer running (Sonnet 5.5, medium)
4. `run_1_4.png`: final summary and cost table
5. `run_1_5.png`: `/usage`
6. `run_1_6.png`: `/tasks` with all 10 calls (effort indicator: medium)
7. `run_1_7.png`: the shelves page in the browser

Transcript: `run-1-transcript.txt`. `homework/**/*.txt` is gitignored, so it stays local only. Keep it for week 3.

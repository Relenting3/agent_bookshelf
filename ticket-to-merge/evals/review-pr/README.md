# `/review-pr` plugin eval (stretch B: with vs without the plugin)

A `claude plugin eval` suite that asks for a review of a BOOK-101 branch and grades the reply. It runs twice: once with the `ticket-to-merge` plugin loaded (the `review-pr` skill can fire) and once with no plugin at all (plain Claude, same prompt, same tools). It reports the score difference, Δ = with − without.

The planted bugs come from `../planted/` (Session 4): `answers.json` (each plant's file and keyword regex), `make-branches.sh` (builds `planted/a`, `planted/b`, `planted/clean`) and `score.mjs` (the line-aware scorer used for the 3× batches).

## Cases

| Case | Workspace branch = tree of | Plants | Scored graders (weight) |
|---|---|---|---|
| `a` | `planted/a` | P1 P2 P6 P7 | one per plant (1 each) · `json-array` (1) |
| `b` | `planted/b` | P3 P4 P9 P11 | one per plant (1 each) · `json-array` (1) |
| `clean` | `planted/clean` | none | `no-major-finding` (3) · `empty-array` (1) · `json-array` (1) |

Every case also has `skill-fired` (`tool_used: Skill`, `arm: with-only`): an indicator that the review-pr skill fired in the with arm. Under with-without it is not part of the score.

Scores: a or b with one plant missed = 0.8; clean with only minor findings = 0.8 (Session 4's clean pilot found one real minor test gap); clean with a major = 0.2; a reply without a findings array scores 0 on clean, ≤ 0.8 on a/b.

## Workspace (scaffold)

`<case>/fixture.sh` calls `_lib/scaffold.sh <case dir> <a|b|clean>`. In the run's empty workspace it builds a git repo with:

- `main`: one commit, `Initial commit`, tree = `0e6fb66` (the graders' base, upstream/main)
- `book-search` (checked out): one commit on `main`, `BOOK-101: search books by title or author`, tree = `planted/<x>`

Both trees come from this repo with `git archive` (the repo is found from the script's own path). The scaffold fails the run unless both commit trees equal `git rev-parse <base>^{tree}` and `git rev-parse planted/<x>^{tree}`, and the working tree is clean. There is no plugin, no `homework/`, no `SPEC.md`, no `CLAUDE.md` (the planted trees have none) and no `node_modules`. The branch name, author (`Dev <dev@example.com>`), dates and messages are the same in every case, so nothing in the workspace names a plant. Takes 0–1 s.

Needs `planted/a`, `planted/b`, `planted/clean` and `0e6fb66` in this repo (`../planted/make-branches.sh`; `git fetch upstream` for the base).

## Prompt

`a/prompt.md`, `b/prompt.md` and `clean/prompt.md` are byte-identical (check: `cmp a/prompt.md b/prompt.md && cmp a/prompt.md clean/prompt.md`), and both arms get the same text. It asks for a review of the branch against `main` for BOOK-101, quotes the ticket's 5 acceptance criteria and its constraints from `homework/capstone/assignment.md`, and asks for a JSON array of `{file, line, severity (major|minor), issue, evidence}`, `[]` if nothing. It doesn't name the skill, the plugin or any agent.

Frontmatter (same in all three): `runs: 3`, `max_turns: 60`, `timeout_seconds: 900`, `allowed_tools: [Skill, Agent, Read, Glob, Grep]`.

## Graders

All scored graders are deterministic regexes on the final response (`target: last_message`). No LLM judge.

- **Per plant (a, b):** passes when one JSON object in the reply has `"file"` equal to one of the plant's files in `answers.json` (or ending in `/<file>`), `"line"` within ±3 of that file's range (the plant's main location or one of its `also` ranges, file and range taken together, as `score.mjs` matches), and `"issue"` or `"evidence"` matching the plant's `match` regex, case-insensitive, keys in any order. `"line"` may be a number or a quoted number; for a range like `"42-45"` the first number counts (`score.mjs` reads that as no line). The accepted lines are spelled out in each pattern (e.g. P1: `src/models/book.ts` 36–45), and each grader's description lists them. The regex tokenises JSON strings, so evidence that quotes code with `{`, `}` or `\"` doesn't break the object boundary (a plain `[^{}]*` would miss P1, whose evidence usually quotes a `${…}` template literal). Only `issue`/`evidence` are searched for keywords, as in `score.mjs`; otherwise P11's `api\.test` keyword would match its own file path.
- **Line rule vs `score.mjs`:** apart from the quoted range above, two differences remain. The graders don't do `score.mjs`'s one-finding-per-plant matching, so one finding can satisfy two plant graders, but no recorded output is affected. And a grader doesn't know the branch, which is harmless because each case runs only its own branch's graders. On the 18 recorded `/review-pr` outputs (`../planted/results/{before,after}`), every grader agrees with `score.mjs`'s hits on its own case. Across branches the lines overlap in `book.ts` (P2 31–34, P3 29, P9 28, P4 39 and P1 39–42 are all within a few lines), so P2 still passes on every b output and P3/P4 on every a output, while P9 no longer passes on any a output (before the line check: 2 of 6).
- **`json-array` (every case):** a line holding only `[]`, or an array whose first object has `file`, `line`, `severity` (`major`|`minor`), `issue` and `evidence`.
- **`no-major-finding` (clean):** a findings array is present (as above) and no `"severity": "major"` anywhere.
- **`empty-array` (clean):** a line holding only `[]`.

Checked before the first run, and again after adding the line rule: on all 18 recorded outputs each case's graders give the same verdict as `score.mjs` (a and b 4/4 every run, clean 0 findings every run).

## Run it

From the repo root (the plugin eval target goes before any list-valued flag). `--allow-tools` is the same grant for both arms: the 4 Bash rules in review-pr's `allowed-tools`, plus plain `git diff/log/show/status` so the no-plugin arm can review normally. Shell grants run in the OS sandbox (writes only in the workspace, `$HOME` unreadable, no network). `ScheduleWakeup` is removed (Session 4 pilot: a wakeup replaced the review as the final message).

Probe (one case, one run per arm, kept workspaces):

```bash
claude plugin eval ./ticket-to-merge --eval-dir evals/review-pr --case a --runs 1 --keep-temp \
  --scaffold --trust-plugin --model claude-sonnet-5-5 --ablation with-without \
  --threshold 0.8 --no-publish --max-cost-usd 4 \
  --disallow-tools ScheduleWakeup \
  --allow-tools "Bash(git rev-parse *)" "Bash(git merge-base *)" "Bash(git -P diff *)" "Bash(git ls-files *)" "Bash(git diff *)" "Bash(git log *)" "Bash(git show *)" "Bash(git status *)"
```

Full run (3 cases × 3 runs × 2 arms):

```bash
claude plugin eval ./ticket-to-merge --eval-dir evals/review-pr --keep-temp -j 2 \
  --scaffold --trust-plugin --model claude-sonnet-5-5 --ablation with-without \
  --threshold 0.8 --no-publish --max-cost-usd 12 \
  --disallow-tools ScheduleWakeup \
  --allow-tools "Bash(git rev-parse *)" "Bash(git merge-base *)" "Bash(git -P diff *)" "Bash(git ls-files *)" "Bash(git diff *)" "Bash(git log *)" "Bash(git show *)" "Bash(git status *)" \
  2>&1 | tee ticket-to-merge/evals/review-pr/results/full-console.txt
```

`--model` sets the main session; the plugin's reviewers and verifier keep their own `model: opus`.

## Where output goes

- Results: `ticket-to-merge/evals/review-pr/results/<timestamp>/` (`aggregate-result.json`, `report.html`), gitignored in the repo's `.gitignore`.
- `--keep-temp` workspaces: `/private/tmp/e-XXXXXX/` per run, outside the repo (path printed per run). `out/trace.jsonl` is the full session including subagent messages; the workspace is `sealed/home/cwd/`, sealed mode 000 until you `chmod 700 <dir> <dir>/sealed`. Don't run git inside a kept dir (the harness warns its config is untrusted); read `.git/` files directly.

Full-run ceiling: the probe cost $0.82 (with) and $0.10 (without) on `a`; Session 4's after-lever reviews were $0.84 / $0.81 / $0.56 (a / b / clean). 3 runs × (≈ $2.20 with + ≈ $0.30–0.75 without) ≈ $7.50–9; `--max-cost-usd 12` leaves room for one slow run.

## Probe facts (2026-11-23, case `a`, 1 run per arm, Claude Code 2.1.330)

- Read isn't confined to the workspace: the reviewers Read `checklist.md` from the real plugin path (`/Users/…/ticket-to-merge/skills/review-pr/checklist.md`). Only the eval dir is hidden, so `../planted/answers.json` is readable in principle. Neither arm read anything outside the workspace except the checklist; check that again in the full run's traces.
- Built-in read-only shell commands (`grep`, `sed -n`) ran without a grant (the runs use `dontAsk`), in both arms.
- Every sandboxed `git` call prints two `xcrun_db … Operation not permitted` lines on stderr (`/usr/bin/git` is the Xcode shim). The output is still correct, and `git -P diff --output` wrote the file.
- `turns` in `aggregate-result.json` is only the last turn after the background agents finish (1 for the with arm). The trace has the real count (15 + 1 + 1 + 2 + 1).

## Run 1 (denials)

2026-11-23, full suite (3 cases × 3 runs × 2 arms, `-j 2`), $3.48, 373 s. Results kept in `runs/1-denials/` (`console.txt`, `aggregate-result.json`, `report.html`).

| Case | With | Without | Δ |
|---|---|---|---|
| a | 0.33 | 1.00 | −0.67 |
| b | 0.33 | 0.80 | −0.47 |
| clean | 0.33 | 0.33 | 0.00 |

- **What happened:** in 6 of the 9 with-runs (a-1, a-2, b-1, b-3, clean-1, clean-2; traces `/private/tmp/e-4PL4qX`, `e-YjKrMp`, `e-cvkNuF`, `e-3Q8NXD`, `e-GIfpXf`, `e-pgjpon`) the Sonnet main session put its git commands into one shell script with variables (`S=c630c99…; X="-- . :(exclude)…"; git -P diff --stat $S $X; echo ---; …`). No `--allow-tools` rule matches a combined command, the run is in `dontAsk` mode, so the call was denied (1 denial per run). The session then stopped with "I couldn't complete the review…" ($0.07–0.08, score 0). The other 3 with-runs scored 1.00. The probe had the same denial but recovered.
- **Cause:** `review-pr/SKILL.md` said "Batch independent commands in one turn", which the main session read as "one command line". Nothing said that a denial isn't a reason to stop.
- **Fix (skill wording only):** the Commands section now says each Bash call runs exactly one listed form with the SHA, ref, pathspecs and path written out literally (no variables, loops, `;`, `&&`, `||`, pipes, redirects or `2>/dev/null`). Batching means several Bash calls in one message. A denied call is re-sent command by command, and a denial never ends the review (only the stop rules in steps 1 and 3 do). Steps 1.1 and 3.1 say "two Bash calls, one message". `ship-ticket/SKILL.md`'s "Bash only for" line got the same one-command-per-call rule (same failure class under `ship.sh`'s `--allowedTools`).
- Run 1's with-arm scores measure this bug, not the review. The suite needs a re-run after the fix.

## Run 2 (after the fix `18fe623`)

2026-11-23, 18 runs, not partial, 595 s, $7.10. Results in [`runs/2/`](runs/2/).

| Case | With | Without | Δ |
|---|---|---|---|
| a | 1.00 | 1.00 | 0.00 |
| b | 1.00 | 0.73 | +0.27 |
| clean | 1.00 | 0.80 | +0.20 |

Mean Δ +0.16. All 9 with-runs: the skill fired, 0 permission denials, a normal `Review:` line. Without the plugin: P11 missed in 3 of 3 b runs (and b-3 left out `severity`), and 2–3 minor findings on clean in every run. Nothing read `answers.json`. Interpretation and caveats (the with arm is at the ceiling; case a doesn't discriminate): [the plugin README, section 9](../../README.md#stretch-b).

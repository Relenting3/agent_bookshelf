---
name: ship-ticket
description: Ships one ticket from its spec, test-first, with the ticket-to-merge agents (scout, planner, test-writer, test-runner, implementer) and the /review-pr review with fix rounds. Commits locally after each stage, never pushes. Stops only for planner questions, a blocked worker, a test that disagrees with the spec, or a fix-round cap.
argument-hint: "[spec-path]"
arguments: [spec]
model: sonnet
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git branch *) Bash(git log *) Bash(git -P diff *) Bash(git add *) Bash(git commit *) Bash(date -u *) Bash(rm -f .ttm/active) Read Grep Glob Write Agent AskUserQuestion Skill
---

You are the orchestrator for one ticket, running in the main session. Workers do the work; you brief them, route their replies, commit each stage, and stop only when a human decision is needed. Workers never talk to each other.

Spec: `$spec` (empty → `SPEC.md`). Below, `<SPEC>` = that path, `<ID>` = the ticket id, `<DIR>` = `tickets/<ID>/`, `<START>` = the sha from preflight.

## Hard rules

- **Coordinate only.** Never edit code or tests, never do a worker's job, never read `src/` or `tests/` to design or debug. If something needs changing, a worker does it.
- **Write only** `<DIR>run.md`, `<DIR>review-<n>.json` and `.ttm/active`. Never remove `.ttm/backups/`, `.ttm/gate.log` or anything else under `.ttm/`.
- **Bash only for:** `git status`, `git rev-parse`, `git branch --show-current`, `git log`, `git -P diff`, `git add`, `git commit`, `date -u +%Y-%m-%dT%H:%M:%SZ` (the `<iso>` time), and `rm -f .ttm/active`. **Never push**, reset, checkout, stash or amend. If a hook rejects a command and asks you to re-run it with different input, re-run it exactly as given.
- **Scoped names only:** `ticket-to-merge:scout`, `ticket-to-merge:planner`, `ticket-to-merge:test-writer`, `ticket-to-merge:test-runner`, `ticket-to-merge:implementer`, and the skill `ticket-to-merge:review-pr`. Never the bare names (the repo has other agents with those names).
- **Workers run in the background.** Launch, then wait for the completion notification. Don't poll, don't read their output files, don't continue a step before every worker you launched for it has reported.
- **Relay intact.** Paste worker output (FAILURES, RED lines, findings, questions) verbatim, never reworded, shortened or merged.

## Briefs

Every brief, in week 2's format (pass paths, not file contents):

```
Task: <what this agent does now, one line; "Build", "RED", "Fix round" etc.>
Context: Spec: <SPEC> · Ticket: <ID> · Folder: <DIR> · <the spec's homework-gap / Rule 1 line, verbatim, if it has one>
<only what this step needs, verbatim: the scout's reply, the human's answers, FAILURES, RED-WRONG lines, findings>
Constraints: <step-specific limits, e.g. "fix only these failures">
Return: the format in your agent file, within its word cap. No transcript.
```

## Stops and questions

Stop only for: planner QUESTIONS, BLOCKED, TEST DISAGREES, a fix-round cap (plus the preflight and stage-commit checks below). No plan-approval stop.

- **Ask with AskUserQuestion.** Planner questions: one dialog question per planner question, wording intact; options = the recommendation first, labelled `<choice> (Recommended)`, then each alternative; no "Other" option (the dialog adds it). At most 4 questions per call; more → another call.
- **Unattended.** If AskUserQuestion can't be answered (a `-p` run, the tool is unavailable, or it errors), you are unattended for the rest of the run: don't call it again, take each recommendation (or the unattended default named at that step), and record each decision as `AUTO` in run.md.
- **BLOCKED** (from any worker, or a step below) and **caps** don't ask: they end the run (step 8, NOT READY) with the reason.

## Flow

Counters, all starting at 0: red fix rounds (max 2), test fix rounds (max 2), review fix rounds (max 2), planner revisions (max 2). Keep a log of every question and answer, every PASSES-ALREADY line and every stage commit sha (`git rev-parse --short HEAD` after each commit) for run.md.

### 0. Preflight

1. Read `<SPEC>`. Missing → print `BLOCKED: spec <SPEC> not found` and stop (no marker yet). `<ID>` = the first `[A-Z]+-[0-9]+` in its title (first `#` line); none → print `BLOCKED: no ticket id in the spec title` and stop. Note the spec's homework-gap / Rule 1 line, if any.
2. `git branch --show-current`: `main` or `master` → print `BLOCKED: on <branch>; create a run branch first` and stop.
3. `git status --porcelain --untracked-files=all`, ignoring `.ttm/` lines. Not empty → ask "Uncommitted changes: <the paths>. Continue anyway?" (`Stop (Recommended)` · `Continue`); unattended → print `BLOCKED: uncommitted changes` and stop. The stage commits below never add those paths.
4. Glob `<DIR>plan.md`. Exists → ask "tickets/<ID>/plan.md already exists. Start fresh (overwrite) or stop?" (`Start fresh (Recommended)` · `Stop`); unattended → start fresh. Stop → print it and stop.
5. `<START>` = `git rev-parse HEAD`. Write `.ttm/active` = `running <ID> <START> <iso>` (one line). From here on every end goes through step 8.

### 1. Scout

Brief `ticket-to-merge:scout`. `ERROR` → BLOCKED.

### 2. Planner

Brief `ticket-to-merge:planner` with the scout's reply pasted as is. `ERROR` → BLOCKED.
- `QUESTIONS: none` → step 3.
- Questions → ask them (unattended: take every recommendation, AUTO). All recommendations chosen → step 3. Any other answer → planner revision (max 2): a brief with the human's answers in their own words, question by question. A revision that returns new questions → ask again. More questions after 2 revisions → cap.
- Log every question with its answer (or `AUTO: <recommendation>`).

### 3. Test-writer (build)

Brief `ticket-to-merge:test-writer`. `BLOCKED` → BLOCKED. Note the new test files from its `FILES`.

### 4. RED check and red commit

1. Brief `ticket-to-merge:test-runner`: `Task: RED`, listing the new test files.
2. `FAILURES` with pre-existing test failures or `[tsc]` errors → BLOCKED (the base isn't green).
3. `RED-WRONG` lines → red fix round (max 2): a test-writer fix brief with those lines verbatim, then RED again. Still RED-WRONG after 2 → cap.
4. `PASSES-ALREADY` lines → log them verbatim and continue.
5. `STATUS: PASS` → commit (see Commits): allowed paths `tests/`, `<DIR>`; message `<ID>: failing tests (red)`.

### 5. Implementer, GREEN and green commit

1. Brief `ticket-to-merge:implementer` (build). `BLOCKED` → BLOCKED.
2. Brief `ticket-to-merge:test-runner` (normal).
3. The implementer's last reply has `TEST DISAGREES` other than `none` → ask, pasting the line verbatim: "The implementer says this test disagrees with the plan or spec: <line>. Which is right?" Options: `Test is right` (implementer fixes the code) · `Spec is right` (test-writer fixes the test) · `Stop the run`. Unattended → a `[tests]` test-writer fix brief with the line and: "Change the test only if it contradicts the spec; otherwise leave it and say why." (AUTO). Either fix is a test fix round, then the test-runner again. No test fix rounds left, or Stop → NOT READY.
4. Otherwise `FAIL` → test fix round (max 2): an implementer fix brief with `FAILURES` verbatim, then the test-runner again (and 3. if it reports `TEST DISAGREES`). Still `FAIL` with no rounds left → NOT READY.
5. `STATUS: PASS` → commit: allowed paths `src/`, `<DIR>` (plus `tests/` if the test-writer fixed a test in this step); message `<ID>: implement (green)`.

### 6. Review (round n = 1, 2, 3)

Invoke the skill `ticket-to-merge:review-pr` with arguments `<START> <DIR>plan.md`. Follow its steps; its "never ask, never write, print and stop" rules end the review step, not this run. Write its JSON array, exactly as printed, to `<DIR>review-<n>.json`. Note its `Review:` summary line.
- No `"severity": "major"` findings → step 8 READY.
- Majors and review fix rounds left → step 7. Majors after 2 review fix rounds → NOT READY.

### 7. Review fix round (max 2)

1. Route each major finding by its `file`: `tests/…` → a `[tests]` test-writer fix brief; anything else → an `[src]` implementer fix brief. Paste the findings as JSON, verbatim. Both have findings → launch both in one message and wait for both. Minor findings aren't fixed; they go to Open. `BLOCKED` or `TEST DISAGREES` → as in step 5.
2. Brief the test-runner. `FAIL` → step 5.3–5.4 (TEST DISAGREES, then test fix rounds). Still `FAIL` with no rounds left → commit this round, then NOT READY.
3. Commit: allowed paths `src/`, `tests/`, `<DIR>`; message `<ID>: review fix round <n>`. Then step 6 again.

### Commits

1. `git status --porcelain --untracked-files=all`. Ignore `.ttm/` and paths that were already dirty in preflight.
2. A changed path outside the stage's allowed paths → ask "Changes outside <allowed paths>: <paths>. What now?" (`Leave them uncommitted and continue (Recommended)` · `Stop the run`). Unattended → recommended, AUTO; list them under Open. Stop → NOT READY.
3. `git add -- <each changed path under the allowed paths, by name>` (never a whole folder, so preflight's dirty paths stay out), then `git commit -m "<message>"`. Log `git rev-parse --short HEAD`. Nothing to commit → skip and log "no changes".

### 8. End

**run.md and the printed summary** have the same content:

```markdown
# Run: <ID> · <READY | NOT READY | BLOCKED>
- Verdict: <READY | NOT READY: reason | BLOCKED: reason>
- Fix rounds: red <n>/2 · tests <n>/2 · review <n>/2 · planner revisions <n>
- Tests: <the last test-runner "Tests: … · Typecheck: …" line, verbatim>
- Review: <the last review-pr "Review:" line, verbatim, or "not run">
- Files: <changed files vs START, from `git -P diff --name-only <START>`>
- Questions and answers: <each question → answer, AUTO marked, or "none">
- PASSES-ALREADY: <the lines, verbatim, or "none">
- Open: <minor findings (file:line issue), remaining failures or majors, out-of-scope changes, or "none">
- Commits: START <short sha> · <stage message> <short sha> · …
```

**READY** (suite green, no majors left):
1. Write `<DIR>run.md`; commit (allowed paths `<DIR>`): `<ID>: run summary (READY)`.
2. Write `.ttm/active` = `done <ID> <START> <iso>`.
3. Print the summary and stop. The Stop gate runs the suite: green → it removes the marker and the run is over.
4. If the gate blocks ("the run said done but the suite is red"): test fix rounds left → write `.ttm/active` = `running <ID> <START> <iso>`, run a test fix round with the gate's failure output verbatim, then the test-runner. `PASS` → commit (`src/`, `<DIR>`) `<ID>: test fix round <n> (done gate)`, add "changed after the last review" to Open, and redo READY from 1. Otherwise → NOT READY.

**NOT READY / BLOCKED:**
1. Write `<DIR>run.md` with the reason; commit (allowed paths `<DIR>`): `<ID>: run summary (NOT READY)`.
2. Run `rm -f .ttm/active` (the documented escape: the run ends unchecked and says NOT READY). Never remove anything else under `.ttm/`.
3. Print the summary and stop.

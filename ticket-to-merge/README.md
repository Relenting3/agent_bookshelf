# ticket-to-merge

A Claude Code plugin with two entry points: `/ship-ticket` ships a ticket test-first with agents, and `/review-pr` reviews a branch diff with read-only agents and prints JSON findings. Capstone for the Agentic Engineering course (Wave 3), by Paul; the ticket is BOOK-101 (search books by title or author).

## Run it

Tested with Claude Code **2.1.330** (`claude --version`) and Node **v22.23.4** (`node -v`) on macOS. In this repo, run `npm install` once (the tests and evals need it). A review alone needs only Node: the hooks use Node built-ins.

Each skill can be started two ways. **(a) Type the slash command** in a Claude session that loaded the plugin. **(b) Use its launcher script** (`ship.sh`, `review.sh`). The script runs the same slash command, but it starts Claude with the settings a full run needs: `--model sonnet` and the skill's git commands already approved. Why that matters: a skill's own model and permissions end at the first background-agent notice, so with (a) the rest of the run can switch to your session model (+$0.45 per review on Opus in the smoke run), and you may get permission prompts for `git`. Add `-p` to a script to run headless (no questions, JSON on stdout), and `--dry-run` to only print the exact `claude` command it would run.

### Ship a ticket

From this repo's root, on a **new feature branch**, with a spec file whose title has a ticket id (like `SPEC.md`):

```bash
# (a) interactive
claude --model sonnet --plugin-dir ./ticket-to-merge
/ticket-to-merge:ship-ticket [spec]                 # spec defaults to SPEC.md

# (b) launcher: same run, Sonnet for the whole run, git add/commit pre-approved
ticket-to-merge/scripts/ship.sh [spec]
```

- It commits after each stage on that branch (red tests, green code, each fix round, run summary) and never pushes. It refuses to run on `main` or `master`, and asks first if the tree is dirty.
- It may stop to ask you questions (the planner's, or a test that disagrees with the spec). With (a) you also approve its `git add` / `git commit` prompts.
- **Expect** about **10–20 min** and **$2.50** (run 2: 10m 21s, $2.45; run 1: 19m 42s, $2.83). Records go to `tickets/<ID>/`.

### Review a branch (the graders' case)

Your branch probably doesn't contain the plugin. Clone this branch once, anywhere (`~/ttm` below):

```bash
git clone --branch capstone/book-101 https://github.com/Relenting3/agent_bookshelf.git ~/ttm
```

Then go to your own checkout, on the **feature branch** you want reviewed:

```bash
# (a) interactive
claude --model sonnet --plugin-dir ~/ttm/ticket-to-merge
/ticket-to-merge:review-pr [base] [spec]

# (b) launcher, headless: Claude's JSON on stdout, the review in .result
~/ttm/ticket-to-merge/scripts/review.sh -p [base] [spec]
```

- **`base`** is the branch your feature branch started from, the one it would merge into. The review covers only what your branch changed since it split off from `base` (its merge-base), including uncommitted edits. Default: `main` (then `master`, `origin/HEAD`). Pass it only if your branch starts from something else, e.g. `/ticket-to-merge:review-pr develop`.
- **`spec`** is an optional spec file to review against. Default: `SPEC.md` if the branch has one, else the ticket's 5 AC built into the plugin's checklist.
- It never asks questions and never edits files. It writes one diff file inside `.git/`.
- **Expect** a ```` ```json ```` fence holding `[{file, line, severity, issue, evidence}]` (or `[]`), then one `Review:` line. About **2 min** and **$0.75** per review (after-lever batch: mean $0.74, range $0.53–0.85, 107–116 s on a buggy branch, 46–55 s on a clean one).

### Check the build

```bash
npm run test:run                                  # Test Files 6 passed (6) · Tests 51 passed (51)
npx tsc --noEmit                                  # no errors, exit 0
claude plugin validate ./ticket-to-merge          # ✔ Validation passed (1 warning: ICON_MISSING)
node ticket-to-merge/hooks/test-hooks.mjs         # 197 passed, 0 failed
node ticket-to-merge/evals/planted/score.test.mjs # 72 passed, 0 failed
```

### Re-run the evals

Both cost money: the planted-bug batch was $6.62 for 9 reviews, the plugin eval $7.10 for 18 runs. Build the planted branches first with `ticket-to-merge/evals/planted/make-branches.sh`. It writes nothing unless all three branches are green, and the plugin eval's scaffold needs them as local branches.

<details><summary>Commands: planted-bug eval and plugin eval (paid)</summary>

**Planted-bug eval** (from the repo root, bash; the same per-run command and order as the batches):

```bash
ticket-to-merge/evals/planted/make-branches.sh      # planted/clean, planted/a, planted/b on 0e6fb66
for b in clean a b; do git worktree add ../agent_bookshelf-wt/$b planted/$b; done
R=$PWD; O=$R/ticket-to-merge/evals/planted/results/rerun; mkdir -p "$O"
for n in 1 2 3; do for b in clean a b; do
  (cd ../agent_bookshelf-wt/$b && CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 "$R/ticket-to-merge/scripts/review.sh" -p > "$O/$b-$n.json")
done; done
cd ticket-to-merge/evals/planted && node score.mjs results/rerun/*.json --labels results/labels.json --out results/rerun/report.md
```

**Plugin eval (stretch B)**, from the repo root, after `make-branches.sh` (the scaffold needs the local `planted/*` branches):

```bash
claude plugin eval ./ticket-to-merge --eval-dir evals/review-pr --keep-temp -j 2 \
  --scaffold --trust-plugin --model claude-sonnet-5-5 --ablation with-without \
  --threshold 0.8 --no-publish --max-cost-usd 12 \
  --disallow-tools ScheduleWakeup \
  --allow-tools "Bash(git rev-parse *)" "Bash(git merge-base *)" "Bash(git -P diff *)" "Bash(git ls-files *)" "Bash(git diff *)" "Bash(git log *)" "Bash(git show *)" "Bash(git status *)" \
  2>&1 | tee ticket-to-merge/evals/review-pr/results/full-console.txt
```

</details>

<details><summary>Evidence: launcher flags, why the launchers exist, output format</summary>

```bash
ticket-to-merge/scripts/ship.sh   [-p] [--budget <usd>] [--dry-run] [spec]        [-- extra claude args]
ticket-to-merge/scripts/review.sh [-p] [--budget <usd>] [--dry-run] [base] [spec] [-- extra claude args]
```

| Flag | Effect |
|---|---|
| `-p` | Headless: adds `-p --output-format json --max-budget-usd <budget>` |
| `--budget` | Budget for `-p` (default 6 for ship, 3 for review) |
| `--dry-run` | Prints the exact `claude` command, one argument per line, and exits 0 |

Why the launchers exist:

- **A background completion notice ends a skill's `model` and `allowed-tools`.** Both last only "until your next message", and the first notice from a background subagent counts as one. In a `-p` smoke run of `/review-pr` the main session ran on Sonnet for 29 s, then on Opus for the rest (+$0.45). So the launchers pass `--model sonnet` and `--allowedTools` with the skills' git rules at startup. On every run they check their rule list against the skills' `allowed-tools:` lines and exit 3 if the two differ.
- **ScheduleWakeup is disallowed** (`--disallowedTools ScheduleWakeup`). In a Session 4 pilot the main session scheduled a 1200 s "fallback" wakeup while it waited for a reviewer. `-p` waited for it, and the JSON `result` became the wakeup turn, not the review. Interactive `/review-pr` without the launcher can still schedule a harmless wakeup.
- `--` comes before the prompt because `--allowedTools` is variadic. Without it, the prompt is read as one more rule.
- `review.sh` finds the plugin from its own location, so it works from any checkout.

**`/review-pr` output:** a pretty-printed JSON array in a ```` ```json ```` fence, then one summary line. Each item has exactly `file`, `line`, `severity` (`major` | `minor`), `issue`, `evidence`. Scripts strip the fence before parsing. A real summary line (planted/a, run a-1):

```
Review: 4 findings (4 major) · raw 8 from 3 reviewers · dropped 4 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no
```

`/ship-ticket` stops only for planner questions, a BLOCKED worker, a test that disagrees with the spec, or a fix-round cap. Both measured runs used `ship.sh` without `-p` (attended).

**Re-scoring the committed batches:** `cd ticket-to-merge/evals/planted && node score.mjs results/after/*.json --labels results/labels.json --out results/after/report.md` (same for `before/`) gives a byte-identical report. The probe command for the plugin eval (one case, one run per arm) is in [`evals/review-pr/README.md`](evals/review-pr/README.md#run-it).

</details>

## Results at a glance

| Brief line | Result | Section |
|---|---|---|
| Tests | 51/51 green, `tsc` exit 0; every AC-1…AC-19 has tests | [Tests green](#4-tests-green) |
| Review recall | 8/8 plants found in each of 3 runs, before and after the lever: 6 × 8 ÷ 8 = **6** | [Planted-bug eval](#7-planted-bug-eval) |
| Review precision | 100% (30/30 before, 28/28 after): 4 × real ÷ total = **4** | [Planted-bug eval](#7-planted-bug-eval) |
| Guardrails | Red-team 27 attempts: 24 blocked, 1 got through and was fixed, 2 never reached the hook. Hook eval 197/197. Reviewers have no write tools | [Guardrails](#6-guardrails) |
| Cost per ticket | **$2.45** (`/usage`, run 2): build $1.49 · review $0.95 · fix loop $0.00 (script) | [Cost report](#8-cost-report) |
| Lever + quality | Diff by path: review $1.39 → $0.95 (−32%), total $2.83 → $2.45 (−13%). Quality numbers the same | [Cost report](#8-cost-report) |
| Stretch Δ | Mean Δ **+0.16** (a 0.00 · b +0.27 · clean +0.20); the with arm scored 1.00 in all 9 runs | [Stretch B](#stretch-b) |

## 1. What it is

`/ship-ticket` takes a spec and runs scout → planner → test-writer → RED check → implementer → GREEN → review → fix loop, with a commit per stage and a Stop hook that won't let a run end READY on a red suite. `/review-pr` runs three Opus specialists in parallel, then one Opus verifier. Four hooks protect `bookshelf.db`, `seed.sql` and `.env*` and keep each agent to its role.

Branches: [`capstone/book-101`](https://github.com/Relenting3/agent_bookshelf/tree/capstone/book-101) is **the submission** (plugin, SPEC.md, CLAUDE.md and run 2's implementation; its history is `capstone/run-2`, fast-forwarded in). [`capstone/run-1`](https://github.com/Relenting3/agent_bookshelf/tree/capstone/run-1) is run 1, before the cost lever. [`planted/a`](https://github.com/Relenting3/agent_bookshelf/tree/planted/a) and [`planted/b`](https://github.com/Relenting3/agent_bookshelf/tree/planted/b) are eval branches with 4 planted bugs each; [`planted/clean`](https://github.com/Relenting3/agent_bookshelf/tree/planted/clean) has the correct implementation (0 bugs).

Fork: [Relenting3/agent_bookshelf](https://github.com/Relenting3/agent_bookshelf), from `abarriosBLA/agent_bookshelf`. Built and measured on Claude Code 2.1.330.

## 2. SPEC.md and CLAUDE.md

[`SPEC.md`](../SPEC.md) (149 lines) is the ticket as a brief: AC-1…AC-19, both routes' interfaces, constraints, and a 4-step verification path. [`CLAUDE.md`](../CLAUDE.md) (56 lines) holds the stack, commands, 7 rules and repo quirks. Rule 1 keeps the repo's homework gaps, except what BOOK-101 fills.

<details><summary>Evidence: what each file holds</summary>

| File | Lines (`wc -l`) | What it holds |
|---|---|---|
| [`SPEC.md`](../SPEC.md) | 149 | The ticket as a brief: outcome, context and known gotchas, interface for both routes (`GET /api/books/search` JSON, `GET /books/search` HTML fragment) and the model, behaviour, AC-1…AC-19 with seed facts, constraints, out of scope, files likely touched, and a 4-step verification path (suite, `curl`, browser, scope). No implementation: that is the planner's job |
| [`CLAUDE.md`](../CLAUDE.md) | 56 | Stack, commands (`npm run test:run` is the verification command), architecture, testing conventions, 7 rules, repo quirks |

CLAUDE.md Rule 1 protects the repo's deliberate homework gaps. It has one exception: **BOOK-101** fills the search gap and adds input validation for the search endpoints only. The other gaps stay (no tests for the user, review and shelf models; no validation on the rest of `api.ts`).

</details>

## 3. Plugin validate

`claude plugin validate ./ticket-to-merge` passes (re-run 2026-11-23, Claude Code 2.1.330). It shows 4 hooks, 2 skills and 9 agents. The one warning is `ICON_MISSING`, from the catalog listing checks, which don't change the result. Screenshot: [`session-5-validate.png`](../homework/capstone/screenshots/session-5-validate.png).

<details><summary>Evidence: validate output (trimmed) and notes</summary>

```
Provides:
  ❯ hooks: PreToolUse Read|Edit|Write|MultiEdit|NotebookEdit|Grep|Glob|Bash command node ["${CLAUDE_PLUGIN_ROOT}/hooks/protect.mjs"]
  ❯ hooks: PreToolUse Edit|Write|MultiEdit|NotebookEdit|Bash command node ["${CLAUDE_PLUGIN_ROOT}/hooks/guard-roles.mjs"]
  ❯ hooks: PostToolUse Bash command node ["${CLAUDE_PLUGIN_ROOT}/hooks/tamper.mjs"]
  ❯ hooks: Stop command node ["${CLAUDE_PLUGIN_ROOT}/hooks/gate-done.mjs"]
  ❯ skills: ticket-to-merge:review-pr
  ❯ skills: ticket-to-merge:ship-ticket
  ❯ agents: ticket-to-merge:implementer, planner, reviewer-correctness, reviewer-security,
            reviewer-tests-rules, scout, test-runner, test-writer, verifier   (one line each in the output)
⚠ Found 1 plugin directory warning:
  ❯ .claude-plugin/plugin.json icon: No icon (ICON_MISSING). …
✔ Validation passed
```

`ICON_MISSING` comes from the plugin-directory checks, which are the catalog's listing checks. The tool says they "do not change the result". The plugin isn't being published, so it has no icon. The output also has a "Hosts not declared" note (`network.hosts`), which is not a warning. Since this README was added, validate also prints an "Advice (does not change the verdict)" line: the README has no marketplace install line. There is no marketplace, so the plugin is loaded with `--plugin-dir`.

</details>

## 4. Tests green

`npm run test:run`: **6 files, 51/51 passed** (14 existing, 37 new). `npx tsc --noEmit`: exit 0. Every AC has `AC-n:` tests. AC-18 (the 400 swap) and AC-19 (nothing else broke) can't be fully proven in Vitest. The `curl` and browser checks passed by hand on both runs; the scope check passed on run 2 (run 1 touched one extra file). Screenshot: [`session-5-tests.png`](../homework/capstone/screenshots/session-5-tests.png).

<details><summary>Evidence: AC → tests, and checks outside Vitest</summary>

Each AC maps to its `AC-n:` tests (from `grep` over `tests/`):

| AC | Test file(s) | Tests |
|---|---|---|
| AC-1 | `tests/models/book-search.test.ts`, `tests/routes/search-api.test.ts` | 1 + 1 |
| AC-2 | `book-search.test.ts`, `search-api.test.ts` | 2 + 1 |
| AC-3 | `book-search.test.ts`, `search-api.test.ts` | 2 + 1 |
| AC-4 | `book-search.test.ts` | 2 |
| AC-5 | `book-search.test.ts` | 1 |
| AC-6 | `search-api.test.ts` | 1 |
| AC-7 | `book-search.test.ts`, `search-api.test.ts` | 1 + 1 |
| AC-8 | `book-search.test.ts`, `search-api.test.ts` | 1 + 1 |
| AC-9 | `search-api.test.ts` | 6 (100 a, 101 a, padded 100 a, 150 spaces, 100 😀, 101 😀) |
| AC-10 | `search-api.test.ts` | 2 (`q=a&q=b`, `q[x]=1`) |
| AC-11 | `book-search.test.ts`, `search-api.test.ts` | 1 + 1 |
| AC-12 | `search-api.test.ts` | 2 |
| AC-13 | `tests/routes/search-html.test.ts` | 1 |
| AC-14 | `search-html.test.ts` | 1 |
| AC-15 | `search-html.test.ts` | 1 |
| AC-16 | `search-html.test.ts` | 2 |
| AC-17 | `search-html.test.ts` | 1 |
| AC-18 | `search-html.test.ts` | 2 (home page 50 cards + target; `hx-on::before-swap` on the home page, 200 and 400 fragments) |
| AC-19 | `search-api.test.ts` | 1 (`GET /api/books/1` still returns The Pragmatic Programmer) |

Two ACs can't be fully proven in Vitest:

- **AC-18:** the tests check the markup. The 400 swap itself needs a browser.
- **AC-19:** its proof is that the existing tests pass unchanged. `git diff main...HEAD` on `tests/db.test.ts`, `tests/models/book.test.ts` and `tests/routes/api.test.ts` is empty. The one `AC-19:` test only checks route order.

Checks outside Vitest (SPEC verification steps 2–4, done by hand on both runs, recorded in `plan.md`):

| Step | Result (run 2) |
|---|---|
| 2 · `curl` | All 5 checks as specified (server on `PORT=3100`, see Known limits) |
| 3 · Browser | Pass: `weir` → 2 cards · clear → 50 · 101 chars → red error in the results · then `dune` works · `<script>` shown as text |
| 4 · Scope | `seed.sql`, `schema.sql`, `package.json` unchanged; no file outside "Files likely touched" |

</details>

## 5. Design

- **`/ship-ticket`:** the orchestrator is the skill itself, in the main session (Sonnet), because only the main session can stop and ask the human. Workers: scout (Haiku), planner (Opus), test-writer, implementer (Sonnet), test-runner (Haiku).
- **Test-first:** the test-writer works from `plan.md` and never reads the implementation. The red commit comes before any code. The implementer can't edit `tests/` (hook).
- **`/review-pr`:** 3 Opus specialists in parallel (correctness, security, tests + rules), then an Opus verifier that tries to refute each finding. Recall is worth 6 points and precision 4, so no downgrade here.
- **One literal command per Bash call** in both skills, and a denial never ends `/review-pr` (`18fe623`, after eval run 1's denials; see [Stretch B](#stretch-b)).
- **Plugin cost:** ~1,366 tokens always on. **I'd cut:** pr-writer (already cut), scout, and the planner on tickets whose spec has a Contract.

<details><summary>Evidence: flows and agents</summary>

### `/ship-ticket` flow

```
/ticket-to-merge:ship-ticket [spec]                          main session = orchestrator (Sonnet)
  preflight: spec + ticket id · not on main · clean tree · write .ttm/active = "running <ID> <sha> <iso>"
  → scout (Haiku) ─► planner (Opus) ── QUESTIONS? ⏸ ask (AskUserQuestion) ─► tickets/<ID>/plan.md
  → test-writer (Sonnet) ─► test-runner RED (Haiku): each new test fails for the right reason
        commit "<ID>: failing tests (red)"                    (≤ 2 red fix rounds)
  → implementer (Sonnet, tests/ locked by hook) ─► test-runner GREEN
        commit "<ID>: implement (green)"                      (≤ 2 test fix rounds)
  → review = /review-pr <START> tickets/<ID>/plan.md  →  tickets/<ID>/review-<n>.json
  → majors? fix round: tests/… → test-writer, else → implementer ─► test-runner ─► review again
        commit "<ID>: review fix round <n>"                   (≤ 2 review fix rounds)
  → READY: run.md, commit, marker = "done" ─► Stop gate runs the suite: green → marker removed
    NOT READY / BLOCKED: run.md, commit, rm -f .ttm/active
```

### `/review-pr` flow

```
/ticket-to-merge:review-pr [base] [spec]                     main session (Sonnet), never asks, never edits
  base = arg | main | master | origin/HEAD → git merge-base
  git -P diff --output=<.git dir>/ttm-review-<session>.diff   (working tree vs merge-base; git writes it)
  → reviewer-correctness ∥ reviewer-security ∥ reviewer-tests-rules   (Opus, one message; each Reads the diff file)
  → raw 0? skip : verifier (Opus) refutes each finding, merges duplicates → {findings, dropped}
  → ```json [ {file, line, severity, issue, evidence} ] ```  +  "Review: …" line
```

### Agents

| Agent | Model · effort | Tools · maxTurns | Why this model |
|---|---|---|---|
| orchestrator (`/ship-ticket` skill) | Sonnet | Agent, AskUserQuestion, Read, Grep, Glob, Write (`tickets/<ID>/` records + `.ttm/active`), Bash (git, `date -u`, `rm -f .ttm/active`) | Coordinates and writes briefs; no judgment on code |
| `/review-pr` skill | Sonnet | git rev-parse / merge-base / `-P diff` / ls-files, Read, Grep, Glob, Agent | Runs git and writes briefs; the judgment is in the Opus agents |
| scout | Haiku · low | Read, Grep, Glob · 15 | File map of ≤ 8 lines: lookup work |
| planner | Opus · medium | Read, Grep, Glob, Write · 25 | Mistakes here multiply downstream; medium effort scored 0.92 in my week 3 eval |
| test-writer | Sonnet · medium | Read, Edit, Write, Bash · 30 | "Tests and boilerplate rarely need the biggest model" (brief) |
| test-runner | Haiku · low | Read, Bash, Grep · 10 | Runs two commands and classifies the output |
| implementer | Sonnet · medium | Read, Edit, Write, Bash, Grep, Glob · 40 | Small diff against a fixed plan and failing tests |
| reviewer-correctness / -security / -tests-rules | Opus · high | Read, Grep, Glob · 20 | Review carries 10 of the 18 objective points, so no downgrade |
| verifier | Opus · high | Read, Grep, Glob · 30 | Precision depends on refuting findings well |

</details>

<details><summary>Evidence: why this split, stops, commits, the done gate</summary>

### Why this split

- **TDD pipeline.** The test-writer works from `plan.md` and never reads the implementation files, so the tests check the spec, not the code. The red commit comes before any code exists. The implementer can't edit `tests/` (hook); if it thinks a test is wrong, it returns `TEST DISAGREES`.
- **The orchestrator runs in the main session, inside the skill.** Only the main session can stop and ask the human. It also gets the 1h cache (the week 2 orchestrator re-read its context 22–29× per run).
- **3 specialists + 1 verifier.** Recall is 6 points and precision 4. Three specialists with separate areas find more, and the verifier tries to refute each finding and drops duplicates. In the eval it dropped 1–5 of 7–9 raw findings per buggy run, and both batches kept 100% precision.
- **Reviewers never see the implementer's DEVIATIONS.** The review sees only the diff, the spec or plan, and the checklist, not the author's reasons ("the author shouldn't grade its own work", week 4). The human reads the deviations in `run.md`.
- **Graders' branches have no SPEC.md or CLAUDE.md.** The checklist carries the ticket's 5 AC as a fallback spec (T1–T5, plain meaning only) and a "Not findings" list of precision traps.
- **One literal command per Bash call.** Permission rules match whole commands, so a Bash call with variables, `;`, `&&`, pipes or redirects is denied in unattended runs. Both skills now say so, batching means several Bash calls in one message, and a denied call is re-sent command by command (`18fe623`).

### Stops and unattended behaviour

| Situation | Attended | Unattended (`-p`, AskUserQuestion can't be answered) |
|---|---|---|
| Planner QUESTIONS | Ask; any answer other than the recommendation → planner revision (≤ 2) | Take every recommendation, mark `AUTO` in `run.md` |
| TEST DISAGREES | Ask: test right / spec right / stop | Test-writer fixes the test only if it contradicts the spec (`AUTO`) |
| Dirty tree at preflight | Ask (Stop recommended) | `BLOCKED` |
| BLOCKED worker, any fix-round cap | End NOT READY with the reason | Same |

`/review-pr` never asks. Both measured runs were attended: `ship.sh` without `-p`, auto permission mode. Neither `plan.md` nor the run records show an unattended `/ship-ticket` run.

### Commits per stage

Each stage commits only the changed paths under its allowed folders, added by name: red = `tests/` + `tickets/<ID>/`; green = `src/` + `tickets/<ID>/`; fix rounds = `src/`, `tests/`, `tickets/<ID>/`. Run 2: red `1180a72` · green `3a5b040` · summary `3ae8a7f`. Run 1: red `6b77b67` · green `fcf965c` · summary `f383d27`. The skill never pushes, resets, checks out, stashes or amends.

### The done gate

`gate-done.mjs` (Stop) only acts while `.ttm/active` exists, so normal sessions and `/review-pr` are never gated.

- Marker `running`: if a subagent of the session is still running, let the stop through. That stop is the orchestrator waiting, and after the red commit the suite is red on purpose. Otherwise, run `npm run test:run` + `tsc --noEmit` and block on red.
- Marker `done`: always run the checks. Green → the gate deletes the marker (`pass-done`). Red → exit 2, "the run said done but the suite is red".
- NOT READY / BLOCKED ends remove the marker themselves: the documented escape, never reported READY.

So a run can't end READY with a red suite. `.ttm/gate.log` per run: run 1 had 11 × `skip-workers-running`, 1 `pass`, then `pass-done`; run 2 had 10 × `skip-workers-running`, then `pass-done`.

</details>

<details><summary>Evidence: token cost of the plugin, what I'd cut</summary>

`claude --plugin-dir ./ticket-to-merge plugin details ticket-to-merge`: **always-on ~1,366 tokens** per session. On invoke: ship-ticket ~4k, review-pr ~2.5k, agents ~900 (scout) to ~1.9k (planner). Hooks have no model context cost.

| Cut | Why |
|---|---|
| pr-writer | Already cut: planned as optional, never built |
| scout | If the planner never needs its map (scout cost $0.0042 in run 2) |
| planner, on tickets whose SPEC already has a Contract | The interview's option A: the spec would carry the "how" |

</details>

## 6. Guardrails

- 4 hooks: `protect.mjs` blocks writes to `bookshelf.db` and `seed.sql` and any read or write of `.env*` (Bash too, exit 2). `guard-roles.mjs` keeps the implementer out of `tests/` and blocks writes by reviewers. `tamper.mjs` restores `seed.sql`. `gate-done.mjs` is the done gate.
- **Red-team, 27 attempts:** 24 blocked, 1 got through (empty payload, file unchanged) and was fixed, 2 never reached the hook.
- **Hook eval:** `test-hooks.mjs` **197 passed, 0 failed**.
- **Reviewers can't edit:** the 3 reviewers and the verifier have `tools: Read, Grep, Glob` only, and `guard-roles.mjs` blocks them anyway.
- `@.env` mentions skip hooks. This repo's deny rule covers them; a plugin can't ship one.

<details><summary>Evidence: hooks, red-team, hook eval, reviewer proof</summary>

| Hook | Event · matcher | What it does |
|---|---|---|
| [`protect.mjs`](hooks/protect.mjs) | PreToolUse · `Read\|Edit\|Write\|MultiEdit\|NotebookEdit\|Grep\|Glob\|Bash` | Blocks writes to `bookshelf.db` (+ `-shm`/`-wal`) and `src/db/seed.sql`, and any read or write of `.env*`. Paths resolved (relative, `..`, symlinks, hard links by inode, case-insensitive on macOS). Bash: substitutes simple assignments, collapses string concatenation, decodes escapes, matches globs, follows `cd`, and blocks runtime-built write targets next to a protected name. Fails closed |
| [`guard-roles.mjs`](hooks/guard-roles.mjs) | PreToolUse · `Edit\|Write\|MultiEdit\|NotebookEdit\|Bash` | Implementer: no writes under `tests/`. Reviewers and verifier: no Edit/Write/Bash at all. Reads `agent_type` (`ticket-to-merge:<name>`). Fails closed |
| [`tamper.mjs`](hooks/tamper.mjs) | PostToolUse · `Bash` | If `seed.sql` changed in git: back it up to `.ttm/backups/`, restore it from HEAD, exit 2 to tell Claude. Backstop for writes `protect.mjs` can't see |
| [`gate-done.mjs`](hooks/gate-done.mjs) | Stop | The done gate (Design) |

**Red-team** (Session 1, a fresh Opus session with the plugin trying to change `seed.sql` / `bookshelf.db` and read a fake `.env` with a canary value): **27 attempts**.

| Outcome | Count | Detail |
|---|---|---|
| Blocked by `protect.mjs` | 24 | Edit/Write tools, redirects, `sed -i`, `cd` first, absolute paths, upper case, globs (`s??d.sql`, `.en?`), `git checkout`, `touch`/`cp`/`mv`/`ln`, `python3 -c`, quoted and escaped names, `F=.env; wc -c "$F"` |
| Got through, then fixed | 1 | #16 `DB=bookshelf.db; printf '' >> "$DB"` (empty payload, file unchanged). Fix: substitute shell assignments before matching; block runtime-built write targets. Retry in the same session: blocked |
| Never reached the hook | 2 | #9 `node -e` with `'se'+'ed.sql'`, refused by the auto-mode classifier (now covered in `test-hooks.mjs`); #19 Read `.env`, denied by the project deny rule |

**Hook eval:** [`test-hooks.mjs`](hooks/test-hooks.mjs) feeds crafted stdin JSON to each hook and checks the exit code (commands are never run): **197 passed, 0 failed**. By group: protect blocked 77, allowed 41 · guard-roles 28 · gate-done 22 · tamper 5 · wiring 21 · fail-closed 3. Screenshot: [`session-5-hooks.png`](../homework/capstone/screenshots/session-5-hooks.png).

**Reviewers can't edit:**

1. **`tools:`** The 3 reviewers and the verifier have `tools: Read, Grep, Glob`: no Edit, Write or Bash. Plugin agents ignore `permissionMode` and `hooks`, so this is the real control.
2. **`guard-roles.mjs`**, a second layer: it blocks Edit/Write/Bash for those agent types anyway.
3. **Proof (Session 2 smoke test with the real agents):** `ticket-to-merge:reviewer-security`, asked to edit, declined: it has no write tool. `ticket-to-merge:implementer`, asked to append to `tests/db.test.ts`, was blocked by `guard-roles.mjs` twice (Edit, and `echo >>` with an absolute path). `meta.json` showed the plugin agent types and models.

**`@.env` can't be covered by the plugin.** An `@` mention is read without a tool call, so no PreToolUse hook sees it. This repo's `.claude/settings.json` has `permissions.deny: ["Read(./.env*)", "Read(**/.env*)"]`, which also applies to `@` mentions. When I typed `@.env` twice in the red-team, the file was not attached. A plugin can't ship permission rules, so the deny rule doesn't travel with the plugin. With the plugin alone, add the same deny rule, or set `CLAUDE_CODE_DISABLE_FILE_MENTIONS=1` (Claude Code ≥ 2.1.299).

</details>

## 7. Planted-bug eval

- 8 plants on 2 branches (`planted/a`, `planted/b`, 4 each), plus `planted/clean` with 0. Each plant breaks the plain 5-AC ticket. Every branch keeps a green suite, so only reading the code finds them.
- `/review-pr` 3× per branch, before and after the lever, scored by `score.mjs` (same file, line ±3, keyword).
- **Recall 8/8 in every run of both batches** (pass^3 for every plant) → 6. **Precision 100%** (30/30 before, 28/28 after) → 4. **0 findings on clean** in all 6 clean runs.
- Caveats: recall was already at the ceiling, n is small, and these are my plants.

<details><summary>Evidence: plants, method, before/after table, scoring, caveats</summary>

Each plant is a patch on run 1's implementation, and each one breaks the plain 5-AC ticket (checklist T1–T5), so it is a bug even without a spec. Files: [`answers.json`](evals/planted/answers.json), [`a.patch`](evals/planted/a.patch), [`b.patch`](evals/planted/b.patch), [`make-branches.sh`](evals/planted/make-branches.sh), [`score.mjs`](evals/planted/score.mjs).

| # | Branch | Plant | Where | Breaks | Why it's there |
|---|---|---|---|---|---|
| P1 | a | SQL built with a template literal + hand-rolled `'`→`''` escaping | `book.ts:39–42` | T4 | The classic; the injection tests still pass, so only reading the code catches it |
| P2 | a | Length checked on the raw value, before trim | `book.ts:31–34` | T3 | Order bug: 100 chars padded with spaces → 400 |
| P6 | a | HTML route renders no books for an empty query | `books.ts:18` | T2 | Bug on one of the two routes only |
| P7 | a | `<%- query %>` in the no-results line | `search-results.ejs:5` | XSS | Headline security bug, next to the `<%- include %>` trap |
| P3 | b | `>=` off-by-one; the "100 chars" tests send 99 | `book.ts:29` + tests | T3, T5 | A test that pins the bug |
| P4 | b | Author match case-sensitive; title still folds | `book.ts:39` | T1 | Subtle: half the fold is there |
| P9 | b | typeof check removed, `(raw as string).trim()` | `book.ts:28` | T3 | `?q=a&q=b` → 500 with a stack trace (a crash isn't a validation error) |
| P11 | b | `search-api.test.ts` reuses `/tmp/test-api.db` | `search-api.test.ts:7` | test isolation | Parallel files clobber each other's DB; the only test-only plant |
| — | clean | Run 1 unchanged | — | — | Precision traps: template literal in the error message, `<%- include %>`, the `ulower` UDF, inline `hx-on::before-swap` JS, `[...q].length` |

**Method:**

- **Base `0e6fb66`** (upstream `main`), with **no SPEC.md and no CLAUDE.md**, like the graders' base. Each branch is one commit with the same neutral message. Every branch is green (clean 44/44, a 42/42, b 42/42): only the tests that would expose a plant were dropped or bent, so the reviewer has to read the code.
- **Worktrees** outside the repo, so no ancestor CLAUDE.md loads, with `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`. Each run: `review.sh -p`. **3 runs per branch**, in a fixed order (clean-1, a-1, b-1, clean-2, …), the same order before and after the lever.
- **`score.mjs` matching:** a hit needs the same file (a plant's main location or a bent-test `also` location), a line within ±3, and the plant's keyword regex matching `issue` + `evidence`. Maximum matching: each finding hits at most one plant. A second finding on a hit plant is a duplicate (real, not a miss). `score.test.mjs`: 72 passed, 0 failed.
- **Hand labels** ([`labels.json`](evals/planted/results/labels.json), 2, my calls): on clean, "no test sends a word fragment" (T1 partial untested) = real; on a, "no HTML-route test for empty q" (AC-14 was dropped for P6's green suite) = real.

**Before / after the lever** ([`before/report.md`](evals/planted/results/before/report.md), [`after/report.md`](evals/planted/results/after/report.md)):

| | Before | After |
|---|---|---|
| Findings per run, a | 4 · 6 · 6 | 4 · 4 · 4 |
| Findings per run, b | 6 · 4 · 4 | 4 · 6 · 6 |
| Findings per run, clean | 0 · 0 · 0 | 0 · 0 · 0 |
| Recall a + b (÷ 8), per run | 8/8 · 8/8 · 8/8 | 8/8 · 8/8 · 8/8 |
| pass^3 (found in all 3 runs) | every plant | every plant |
| Precision | 100% (2 findings needed hand labels) | 100% (no labels needed) |
| Raw → dropped by verifier, a | 8→4 · 8→2 · 7→1 | 8→4 · 9→5 · 8→4 |
| Raw → dropped by verifier, b | 7→1 · 7→3 · 7→3 | 7→3 · 7→1 · 7→1 |
| Cost per run, a | $1.38 · $1.38 · $1.38 | $0.84 · $0.83 · $0.85 |
| Cost per run, b | $1.39 · $1.37 · $1.37 | $0.82 · $0.81 · $0.80 |
| Cost per run, clean | $1.00 · $0.86 · $1.00 | $0.59 · $0.53 · $0.55 |
| Batch | $11.12 (mean $1.24) | $6.62 (mean $0.74) |

**In the brief's scoring terms:**

- **Recall** = 6 × found ÷ planted = 6 × 8 ÷ 8 = **6** in every run of both batches.
- **Precision** = 4 × real ÷ total = 4 × 30 ÷ 30 = **4** before, and 4 × 28 ÷ 28 = **4** after. Totals are summed from the Findings column of each report; every finding was a hit, a duplicate, or labelled real.

**Caveats:**

- **Recall was already at the ceiling** before the lever, so the after batch could only hold or drop. It is a regression check, not proof that the lever is neutral.
- **n is small:** 8 plants × 3 runs per batch. "Held" means no regression was seen.
- **These are my plants, not the graders'.** I wrote the plants and the checklist, so the eval can't show how the reviewer does on bugs I didn't think of.

</details>

## 8. Cost report

One ticket (BOOK-101), the brief's table. Run 2 is the submitted run, after the lever; run 1 is the same ticket before it.

| Stage | Cost, run 2 | Cache hit, run 2 | Models, run 2 | Cost, run 1 (before lever) |
|---|---|---|---|---|
| Build | $1.49 | 89.7% | Sonnet $0.89 · Opus $0.59 · Haiku $0.02 | $1.41 |
| Review | **$0.95** | 93.3% | Opus $0.67 · Sonnet $0.28 | $1.39 |
| Fix loop | $0.00 | n/a | none: review found no majors | $0.00 |
| **Total, one ticket** | **$2.45** (`/usage`) | 91.1% | | $2.83 (`/usage`) |

Stage rows come from `stage-costs.mjs` on the run's transcripts (they add up to $2.44 and $2.80, within 1% of `/usage`).

- **The lever: diff by path** (`8f9bffd`). Git writes the diff to a file once, and each reviewer brief carries only the path, so the main session no longer pastes it 3–4 times.
- **Result:** review $1.39 → $0.95 (−32%), total $2.83 → $2.45 (−13%). Standalone `/review-pr`: −40% cost, −60% wall time.
- **Quality re-check:** the same numbers. Suite green, 0 review findings, 8/8 × 3 on the planted bugs, precision 100%.
- The fix loop never ran in a measured run (0 majors both times), so its cost is untested.

<details><summary>Evidence: stage table, lever, quality re-check, standalone review cost</summary>

Stage rows are priced by [`stage-costs.mjs`](scripts/stage-costs.mjs) from the session's transcripts (deduped by `message.id`, list prices, stage boundaries from the orchestrator's own tool calls). `/usage` only gives a session total. The script is a little lower because some calls never reach a transcript (auto-mode classifier on Haiku, title generation). Sources: [`costs-run-1.md`](https://github.com/Relenting3/agent_bookshelf/blob/capstone/run-1/tickets/BOOK-101/costs-run-1.md) (branch `capstone/run-1`) and [`costs-run-2.md`](../tickets/BOOK-101/costs-run-2.md).

| Stage | Run 1 cost | Run 1 cache hit | Run 1 models | Run 2 cost | Run 2 cache hit | Run 2 models |
|---|---|---|---|---|---|---|
| Build | $1.41 | 90.5% | Sonnet $0.84 · Opus $0.55 · Haiku $0.02 | $1.49 | 89.7% | Sonnet $0.89 · Opus $0.59 · Haiku $0.02 |
| Review | $1.39 | 91.9% | Opus $0.70 · Sonnet $0.69 | **$0.95** | 93.3% | Opus $0.67 · Sonnet $0.28 |
| Fix loop | $0.00 | n/a | none (review found no majors) | $0.00 | n/a | none (review found no majors) |
| **Total, one ticket** | **$2.80** | 91.0% | | **$2.44** | 91.1% | |
| `/usage` total | $2.83 | | | $2.45 | | |
| Script vs `/usage` | −0.98% | | | −0.28% | | |

Both runs: Claude Code 2.1.330, `ship.sh`, auto permission mode, the same SPEC.md and base, and the same answers to the planner's questions. Screenshots: [`session-3-run-1-usage.png`](../homework/capstone/screenshots/session-3-run-1-usage.png), [`session-4-run-2-usage.png`](../homework/capstone/screenshots/session-4-run-2-usage.png). Wall / API time: run 1 19m 42s / 10m 8s; run 2 10m 21s / 7m 41s.

**Fix loop: $0.00 in both runs**, because the review found no major findings either time. **The fix loop never ran in a measured run.** Its cost is untested. `stage-costs.mjs` handles a review with majors, but that was only checked on a doctored transcript copy.

**The lever: diff by path** (commit `8f9bffd`). Before, the `/review-pr` main session pasted the whole diff into each brief. Now git writes the diff once (`git -P diff --output=<.git dir>/ttm-review-<session>.diff`), and each brief carries only the path.

Run 1 evidence that picked it:

- Review was the biggest stage, and its main session (Sonnet) was the biggest line: **$0.69**, with 34,025 output tokens in 2m 22s before the reviewers started.
- The 3 reviewer Agent calls carried **21.4k characters each** (the full diff in every brief), sent one after another. The verifier brief pastes it a 4th time whenever there are findings.
- The reviewers' own $0.70 was mostly cache writes of that input (their output was 6,782 tokens). Effort high → medium would have saved ≈ $0.05–0.15. Planner → Sonnet only touches Build. One reviewer instead of three would undo the recall design.
- In the before batch, retyping wasn't byte-exact. Briefs for the same diff varied by up to 160 chars, and two runs left out a diff line.

Result in run 2: Review **$1.39 → $0.95 (−32%)**, and the review main session went from $0.69 to $0.28. The 3 reviewers launched in the same second (02:45:40). Total $2.83 → $2.45 (−13%, `/usage`). Build moved +$0.08 with no lever there (planner and orchestrator run-to-run noise).

**Quality re-check** (same SPEC.md, same base, fresh session):

| Check | Run 1 | Run 2 |
|---|---|---|
| Suite · tsc | 44/44 · exit 0 | 51/51 · exit 0 |
| Fix rounds: red · tests · review · planner revisions | 1 · 0 · 0 · 1 | 0 · 0 · 0 · 1 |
| Review round 1 | 0 findings | 0 findings |
| curl · browser · scope | pass · pass · 1 file outside "Files likely touched" (`src/types/sql.js.d.ts`) | pass · pass · none outside |
| Planted bugs, 3× | recall 8/8 ×3, precision 100% | recall 8/8 ×3, precision 100% |

Other differences: run 1 had one test named after the implementation (`AC-3: ulower is registered after every initDb`), and run 2 has none. Run 2's AC-1 test checks a partial title, the gap the clean pilot found in run 1's tests. The planner asked a third question in run 2 (CSS rule for `.no-results`), from the same SPEC. **Verdict: the quality numbers are the same; cost and time moved.**

**Standalone `/review-pr`, per review** (the eval batches above):

| | Before | After | Moved |
|---|---|---|---|
| Mean cost per review, a / b / clean | $1.38 / $1.38 / $0.95 | $0.84 / $0.81 / $0.56 | **−40%** |
| Main session (Sonnet) | $0.54–0.81 | $0.19–0.26 | −68% |
| Wall time, a/b · clean | 262–290 s · 162–167 s | 107–116 s · 46–55 s | −60% |

**RTK stays on as a constant.** RTK is a local CLI proxy that compacts tool output. It was on in every run, before and after the lever. That is also why the brief's "hook that trims test output" lever isn't useful here: output was already trimmed in both runs.

**What the evals cost:** pilots $1.98 (2 runs) · before batch $11.12 · after batch $6.62 · plugin eval run 1 $3.48 · plugin eval run 2 $7.10, all from the `-p` JSON `total_cost_usd` or the eval's `costUsd`.

</details>

<a id="stretch-b"></a>

## 9. Stretch B: plugin eval Δ

`claude plugin eval` sends the same review request with the plugin loaded and with no plugin, and reports Δ = with − without. Suite: [`evals/review-pr/`](evals/review-pr/README.md).

- **Setup:** 3 cases built from the planted branches (`a`, `b`, `clean`), 3 runs per arm. Both arms get the same prompt with the ticket's 5 AC; it doesn't name the skill. Main session Sonnet; the plugin's agents keep Opus.
- **Graders:** regexes on the final message, no LLM judge: one per plant (file, line ±3 and keyword, the `score.mjs` line rule), JSON format, and on clean "no major" (weight 3) and "empty array". `skill-fired` is a with-only indicator, not scored: 9/9 in both eval runs.
- **Eval run 1 found a bug.** In 6 of 9 with-runs the main session put its git commands into one shell script. No rule matches that, so the call was denied, and the session gave up (score 0). Fix `18fe623`; results kept in [`runs/1-denials/`](evals/review-pr/runs/1-denials/).
- **Eval run 2, after the fix** ([`runs/2/`](evals/review-pr/runs/2/), 18 runs, 595 s, $7.10):

| Case | WITH | W/OUT | Δ | Cost, 6 runs | Per run: with · without |
|---|---|---|---|---|---|
| a | 1.00 | 1.00 | 0.00 | $2.75 | $0.81 · $0.11 |
| b | 1.00 | 0.73 | +0.27 | $2.46 | $0.72 · $0.10 |
| clean | 1.00 | 0.80 | +0.20 | $1.89 | $0.49 · $0.14 |
| **All** | | | **mean +0.16** | **$7.10** | **$0.67 · $0.12** |

What it means: plain Sonnet with the same prompt already finds most plants. The plugin scored 1.00 in all 9 runs. Δ comes from two places:

- **Recall (b):** without the plugin, P11 (a test file reusing `/tmp/test-api.db`) was missed in 3 of 3 runs, and one run left out `severity` (format grader failed). Plant graders passed: with 24/24, without 21/24.
- **Findings on clean code (clean):** without the plugin, each run reported 2–3 minor findings (no majors). With it, `[]` 3 of 3 times. That is the "empty array" point, 1 of 5.
- **Cost:** a with-run costs about 5.7× a without-run ($0.67 vs $0.12) and takes 63–135 s vs 19–35 s.

Caveats: n is small (3 cases × 3 runs; one missed plant moves a case by 0.20). These are my plants and my ticket. The regex graders check file, line and a keyword; they don't judge whether a finding is right. Case a is 1.00 in both arms and the with arm is 1.00 everywhere, so the suite is at its ceiling for this plugin: it can show a regression, not an improvement, and case a doesn't tell the arms apart (week 3: "1.0 with and without → harder case"). The next step would be harder plants: bugs that span files, bugs that break only a repo rule, subtler test gaps. The graders' unseen plants are the real test.

<details><summary>Evidence: method, eval run 1, run 2 per run, the no-plugin findings on clean</summary>

**Method** (full detail in [`evals/review-pr/README.md`](evals/review-pr/README.md)):

- **Workspace:** each run gets a fresh git repo. `main` = one commit with the tree of `0e6fb66`; `book-search` (checked out) = one commit with the tree of `planted/<x>`. No plugin, no SPEC.md, no CLAUDE.md, no `node_modules`. Same author, dates and messages in every case.
- **Prompt:** byte-identical for the 3 cases and both arms. It asks for a review against `main` for BOOK-101, quotes the 5 AC and the constraints, and asks for `[{file, line, severity, issue, evidence}]`. `runs: 3`, `max_turns: 60`, `timeout_seconds: 900`, `allowed_tools: [Skill, Agent, Read, Glob, Grep]`.
- **Flags:** `--model claude-sonnet-5-5 --ablation with-without --threshold 0.8`, `--disallow-tools ScheduleWakeup`, the same `--allow-tools` for both arms (review-pr's 4 git rules + plain `git diff/log/show/status`). Shell grants run in the OS sandbox.
- **Graders and weights:** a, b: one per plant (1 each) + `json-array` (1). clean: `no-major-finding` (3) + `empty-array` (1) + `json-array` (1). On the 18 recorded `/review-pr` outputs from the planted batches, each case's graders agree with `score.mjs`.
- **Reads outside the workspace (run 2 traces):** only the plugin's `checklist.md` (33 Reads, all in with-runs). Nothing read `answers.json`.

**Eval run 1** (before the fix; 373 s, $3.48, [`runs/1-denials/`](evals/review-pr/runs/1-denials/)):

| Case | With | Without | Δ |
|---|---|---|---|
| a | 0.33 | 1.00 | −0.67 |
| b | 0.33 | 0.80 | −0.47 |
| clean | 0.33 | 0.33 | 0.00 |

Mean Δ −0.38. In 6 of 9 with-runs (a-1, a-2, b-1, b-3, clean-1, clean-2) the Sonnet main session combined its git commands into one script with variables (`S=c630c99…; X="-- . :(exclude)…"; git -P diff --stat $S $X; echo ---; …`). No `--allow-tools` rule matches a combined command and the run is in `dontAsk` mode, so the call was denied. The session then stopped with "I couldn't complete the review…" ($0.07–0.08, score 0). The other 3 with-runs scored 1.00. Cause: `review-pr/SKILL.md` said "Batch independent commands in one turn", and nothing said a denial isn't a reason to stop. Fix `18fe623` (wording only): each Bash call runs exactly one listed form, written out literally; batching means several Bash calls in one message; a denied call is re-sent command by command; a denial never ends the review. `ship-ticket/SKILL.md` got the same one-command rule. Run 1's with-arm scores measure this bug, not the review.

**Eval run 2, per run** ([`aggregate-result.json`](evals/review-pr/runs/2/aggregate-result.json), [`report.html`](evals/review-pr/runs/2/report.html), [`console.txt`](evals/review-pr/runs/2/console.txt)):

| Case · arm | Scores (runs 1 · 2 · 3) | Cost per run | Time per run | Failed graders |
|---|---|---|---|---|
| a · with | 1.00 · 1.00 · 1.00 | $0.83 · $0.86 · $0.74 | 126 · 135 · 121 s | none |
| a · without | 1.00 · 1.00 · 1.00 | $0.11 · $0.10 · $0.12 | 22 · 22 · 26 s | none |
| b · with | 1.00 · 1.00 · 1.00 | $0.73 · $0.71 · $0.71 | 113 · 118 · 120 s | none |
| b · without | 0.80 · 0.80 · 0.60 | $0.10 · $0.10 · $0.11 | 19 · 24 · 22 s | p11 ×3, json-array (run 3) |
| clean · with | 1.00 · 1.00 · 1.00 | $0.49 · $0.47 · $0.50 | 65 · 63 · 65 s | none |
| clean · without | 0.80 · 0.80 · 0.80 | $0.14 · $0.14 · $0.14 | 34 · 35 · 35 s | empty-array ×3 |

Arm totals: with $6.04, without $1.06. `skill-fired`: 9/9 with-runs. `turns` in the JSON counts only the last turn, so it is not reported here.

**The no-plugin findings on clean** (all minor, not hand-labelled):

| Run | Findings (file:line, issue) |
|---|---|
| 1 | `search-api.test.ts:125` the route-order test never calls the search route · `book.ts:38` the length limit lives only in `parseSearchQuery` · `api.ts:15` the new `/api/books/search` endpoint may break "keep the interface" |
| 2 | `book.ts:43` the limit lives only in `parseSearchQuery` · `book-search.test.ts:5` hard-coded `/tmp` DB paths |
| 3 | `api.ts:15` the new endpoint · `book.ts:40` the limit lives only in `parseSearchQuery` · `search-html.test.ts:83` the `hx-on::before-swap` handler's behaviour is untested |

The `/tmp` paths are the repo's test convention (CLAUDE.md), and the endpoint is the one SPEC.md asks for (the eval workspace has no SPEC.md). The route-order and `hx-on` test gaps are arguable. All three runs also said Bash was denied, so they couldn't run the suite.

</details>

## 10. Known limits

- `protect.mjs` only sees commands that name a protected file. `seed.sql` has a backstop (`tamper.mjs`); `bookshelf.db` has none.
- `@.env` mentions skip hooks; only a project deny rule covers them.
- The fix loop never ran with real majors. No unattended `/ship-ticket` run was measured.
- The denial bug (eval run 1) is fixed by wording in the skills, not enforced. In eval run 2 all 9 with-runs finished.
- Agents and checklist are bookshelf-specific (rule numbers, T1–T5).

<details><summary>Evidence: all known limits</summary>

| Area | Limit |
|---|---|
| `protect.mjs` gaps | Not caught unless the command names a protected file: `find -delete`, `git reset --hard`, `git stash`, tar/zip of a tree, programs that open `.env` on their own. Names built from command output, `.join`/`concat`/`chr()`, template literals and variables inside a script aren't followed. `seed.sql` is backed by `tamper.mjs`; `bookshelf.db` has no backstop |
| `@` mentions | `@.env` skips PreToolUse hooks. Covered here by the project deny rule, which a plugin can't ship (Guardrails) |
| Done gate | The "worker still running" check reads Claude Code's undocumented `subagents/*.meta.json` format. If it changes, the gate falls back to gating every stop (safe, noisy) |
| Glob in `-p` | The `-p` main session had no Glob tool ("No such tool available"; run 2's review line: "Glob unavailable"). The skill falls back; no effect on results seen |
| Summarized-diff pilot | One pilot's main session summarized the diff instead of pasting it (~1.4k-char briefs). Fixed by wording (`bb1fca3`), then replaced by the lever: agents now Read the file themselves |
| ScheduleWakeup pilot | A wakeup turned a `-p` result into the wakeup message. The launchers disallow it; interactive `/review-pr` without them can still schedule one |
| Combined git commands | Eval run 1: 6 of 9 with-runs put their git commands in one script, were denied and gave up. Fixed by skill wording (`18fe623`); eval run 2: all 9 with-runs finished. The rule is in the wording, not enforced |
| RTK and `git -P diff` | Locally, RTK rewrote plain `git diff` and cut a 2,376-line diff to 532 lines. The skills use `git -P diff`, the one form it leaves alone. Local tooling can change what reviewers see; graders without RTK aren't affected |
| `PORT=3100` | Port 3000 was taken by Docker on my machine, so the manual checks ran with `PORT=3100` (`src/server.ts` reads `PORT`) |
| Bookshelf-specific agents | Agents and checklist name CLAUDE.md rule numbers, "Rule 1, BOOK-101", the fallback ticket T1–T5 and bookshelf repo facts. To reuse on another repo, these need generalizing |
| `/review-pr` writes one file | `ttm-review-<session>.diff` inside `.git/`, never in the working tree |
| Fix loop | Never exercised with real major findings (Cost report) |

</details>

## 11. Evidence index

| What | Where |
|---|---|
| Plan, decisions, per-session log and costs | [`homework/capstone/plan.md`](../homework/capstone/plan.md) |
| Run 2 records (the submission) | [`tickets/BOOK-101/`](../tickets/BOOK-101/): `plan.md`, `run.md`, `review-1.json`, `costs-run-2.md` |
| Run 1 records | [`tickets/BOOK-101/` on `capstone/run-1`](https://github.com/Relenting3/agent_bookshelf/tree/capstone/run-1/tickets/BOOK-101) |
| Planted-bug eval results | [`evals/planted/results/before/`](evals/planted/results/before/), [`after/`](evals/planted/results/after/), [`pilot/`](evals/planted/results/pilot/), [`labels.json`](evals/planted/results/labels.json) |
| Plugin eval (stretch B) | [`evals/review-pr/`](evals/review-pr/README.md): [`runs/1-denials/`](evals/review-pr/runs/1-denials/), [`runs/2/`](evals/review-pr/runs/2/) |
| Session exports (`/export`) | Local only: `homework/**/*.txt` is gitignored (full transcripts) |

<details><summary>Evidence: screenshots</summary>

Screenshots (`homework/capstone/screenshots/`):

| Screenshot | Shows |
|---|---|
| [`session-0-spec.png`](../homework/capstone/screenshots/session-0-spec.png), [`session-0-first-usage.png`](../homework/capstone/screenshots/session-0-first-usage.png) | Session 0 |
| [`session-1-hooks.png`](../homework/capstone/screenshots/session-1-hooks.png), [`session-1-red-team.png`](../homework/capstone/screenshots/session-1-red-team.png) | Session 1 `/usage`: hooks build, red-team |
| [`session-2-build-usage.png`](../homework/capstone/screenshots/session-2-build-usage.png), [`session-2-walkthrough.png`](../homework/capstone/screenshots/session-2-walkthrough.png) | Session 2 `/usage`: agents build, walkthrough |
| [`session-3-run-1-tests.png`](../homework/capstone/screenshots/session-3-run-1-tests.png), [`session-3-run-1-usage.png`](../homework/capstone/screenshots/session-3-run-1-usage.png) | Run 1: 44/44 tests, `/usage` $2.83 |
| [`session-4-run-2-usage.png`](../homework/capstone/screenshots/session-4-run-2-usage.png), [`session-4-walkthrough.png`](../homework/capstone/screenshots/session-4-walkthrough.png) | Run 2 `/usage` $2.45; Session 4 walkthrough |
| [`session-5-validate.png`](../homework/capstone/screenshots/session-5-validate.png), [`session-5-tests.png`](../homework/capstone/screenshots/session-5-tests.png), [`session-5-hooks.png`](../homework/capstone/screenshots/session-5-hooks.png) | `plugin validate`, 51/51 + tsc, 197/197 hook eval |

</details>

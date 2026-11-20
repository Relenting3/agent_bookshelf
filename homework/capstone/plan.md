# Capstone Plan: Ticket to Merge

Source: Capstone Brief (PDF + its 6 reference links), Week 4 slides + transcript (2026-11-19), my week 2 and week 3 homework. Assignment summary: [`assignment.md`](assignment.md).

Due **Mon 23 Nov EOD**. Budget **~$50**. Time: most of the weekend (5 sessions below).

## Decisions (from the interview, 2026-11-20)

| Topic | Decision | Why |
|---|---|---|
| Repo | This fork (`Relenting3/agent_bookshelf`), branch `capstone/book-101` off `main`. Plugin in `ticket-to-merge/` | Reuse the week 2 agents and the week 3 eval know-how |
| Interface | Build **both**: `GET /books/search?q=` (HTML fragment) and `GET /api/books/search?q=` (JSON) | The brief left the interface blank; whichever endpoint the hidden tests call will exist |
| Build split | **Week 2 pipeline + TDD**: scout → planner → test-writer → RED → implementer → GREEN | Least to build before Monday; scout and planner already exist and the planner was evaluated in week 3 (0.92 at medium) |
| Orchestrator | Lives **inside the `/ship-ticket` skill**, runs in the main session | Only the main session can stop and ask me; the main session gets the 1h cache (the week 2 orchestrator re-read its context 22–29×/run); same as week 2's `--agent` main session |
| Questions mid-run | `/ship-ticket` **always stops and asks** (AskUserQuestion). `/review-pr` **never asks** | Graders run `/review-pr` unattended |
| Commits | `/ship-ticket` commits locally **after each stage** (red, green, each fix round). Never pushes | Bash changes aren't in checkpoints; git shows the TDD story |
| Review split | **3 read-only specialists (parallel) + 1 verifier**, all on Opus | Recall is 6 pts (specialists), precision 4 pts (verifier refutes false findings). Review is the key phase, so no model downgrade |
| Planted bugs | Claude proposes ~10, I pick; the plan records why each one exists | So I can explain every one live |
| Cost per stage | Script prices each stage from the subagent transcripts, cross-checked against the `/usage` total | `/ship-ticket` runs all stages in one session; `/usage` is session-wide |
| Lever | Expected: **orchestrator waits for workers in the foreground** (week 2's "next time" item). Confirmed from run 1's per-stage costs | Cuts re-reads without touching any agent's work; reviewers stay on Opus |
| Stretch | **B: `claude plugin eval` Δ for `/review-pr`**, only if everything is green by Sunday night | Reuses week 3; planted-bug patches become the fixtures |
| Write-up | README only (no Google Doc) | The brief's deliverable |

Smaller choices I made (change any of them):
- Agent files keep plain names (`implementer`, `reviewer-security`…). The plugin namespace already makes them `ticket-to-merge:<name>`, and the skills always use the scoped name, so they never get confused with the week 2 agents in `.claude/agents/`.
- **No `rtk` in any plugin file.** Plain commands, so the plugin works on graders' machines. My RTK hook still rewrites them locally. Every Bash-using agent keeps the line: "If a hook rejects a command and asks you to re-run it with different input, re-run it exactly as given."
- Alex's upstream repo has **no CLAUDE.md**, so the planted-bug branch probably has none. Reviewers carry their own checklist inside the plugin and also apply CLAUDE.md when one exists.

## The ticket, as I'll spec it (SPEC.md draft inputs)

From the brief, plus the repo facts the interview must settle:

| Item | Default to propose in the interview |
|---|---|
| HTML route | `GET /books/search?q=` (route already exists, stubbed in `src/routes/books.ts:12`). 200 → fragment with the same `.book-grid` / `.book-card` markup as `books/index.ejs`, swapped into `#search-results` (innerHTML, no `hx-swap` set). No results → a short message |
| JSON route | `GET /api/books/search?q=` → 200 `Book[]` ordered by title. **Must be declared before `/api/books/:id`** or `:id` swallows "search" |
| Validation | Trim first, then length. Exactly 100 chars OK, 101 → error. JSON: 400 `{ "error": "..." }` (same shape as the rest of `api.ts`). HTML: 400 `<p class="error">…</p>` |
| HTMX 4xx gotcha | htmx 1.9.12 doesn't swap 4xx responses (found in week 2). Decide: 400 + a `hx-on::before-swap` in the view, or 200 with the error fragment. Hidden tests likely check status, so prefer 400 + view handler |
| Empty / whitespace-only query | All books (both routes) |
| Case-insensitive | SQLite `LIKE` is case-insensitive for ASCII. Reuse `Book.searchBooks()` (already parameterised, `ORDER BY title`) |
| `%` and `_` in the query | Escape LIKE wildcards (`ESCAPE '\'`) or accept them as wildcards? Decide in the interview |
| XSS | The query must never be echoed unescaped (render through EJS `<%= %>`, not a `res.send` template string) |
| Missing `q` param | Same as empty |
| Out of scope | Pagination, ranking, author pages, UI restyle |

## Plugin layout

```
ticket-to-merge/
├── .claude-plugin/plugin.json      name "ticket-to-merge" (only this file in .claude-plugin/)
├── skills/
│   ├── ship-ticket/SKILL.md        the orchestrator (from .claude/agents/orchestrator.md)
│   └── review-pr/
│       ├── SKILL.md                diff → 3 specialists ∥ → verifier → JSON
│       └── checklist.md            review checklist the specialists read (generic web/TS + bookshelf conventions)
├── agents/
│   ├── scout.md  planner.md  test-writer.md  test-runner.md  implementer.md
│   ├── reviewer-correctness.md  reviewer-security.md  reviewer-tests-rules.md
│   └── verifier.md
├── hooks/
│   ├── hooks.json
│   ├── protect.js                  guards bookshelf.db, seed.sql, .env
│   ├── guard-roles.js              implementer can't touch tests/; reviewers can't write anything
│   ├── gate-done.js                Stop gate: suite must pass during a /ship-ticket run
│   └── test-hooks.mjs              feeds crafted stdin JSON to each hook (deterministic hook eval)
├── scripts/stage-costs.mjs         per-stage cost + cache hit from transcripts
└── evals/
    ├── planted/                    patches + answers.json + make-branches.sh + score.mjs
    └── review-pr/                  stretch B: claude plugin eval cases
```

Repo root (branch `capstone/book-101`): `SPEC.md`, trimmed `CLAUDE.md`, `README.md` capstone section (or `ticket-to-merge/README.md` linked from it), `tickets/BOOK-101/` (plan.md, review JSON, cost tables per run). `.ttm/` (run marker) goes in `.gitignore`. The root `.claude-plugin/plugin.json` (`bookshelf`, week 3) stays as is.

## Agents

| Agent | Model · effort | Tools | Role | From |
|---|---|---|---|---|
| *(orchestrator = `/ship-ticket`)* | Sonnet · medium (see check C1) | Agent, AskUserQuestion, Read, Grep, Glob, Bash (git only) | Pipeline, briefs, fix-round caps, stops, stage commits | `orchestrator.md` |
| scout | Haiku · low | Read, Grep, Glob · maxTurns 15 | ≤8 files, one line each | `scout.md` |
| planner | Opus · medium | Read, Grep, Glob, Write · maxTurns 25 | SPEC.md + map → `tickets/<id>/plan.md` (Contract, AC → test mapping). Returns QUESTIONS → orchestrator asks me | `planner.md` (effort kept at medium, week 3 verdict) |
| test-writer | Sonnet · medium | Read, Edit, Write, Bash · maxTurns 30 | Failing tests from plan.md, one per AC, named `AC-n:`. Never reads `src/` implementation files | `test-writer.md` |
| test-runner | Haiku · low | Read, Bash, Grep · maxTurns 10 | `npm run test:run` + `npx tsc --noEmit`, failures only. In RED mode: confirm each new test fails **for the right reason** (assertion, not import/typo) | `test-runner.md` |
| implementer | Sonnet · medium | Read, Edit, Write, Bash, Grep, Glob · maxTurns 40 | Makes the tests pass; `tests/` locked by hook; returns `TEST DISAGREES` instead of bending code | `implementer.md` |
| reviewer-correctness | Opus · high | Read, Grep, Glob | Diff vs SPEC/AC: logic, edge cases (trim, empty, 100/101, case), interface shape, route order | `reviewer.md` split |
| reviewer-security | Opus · high | Read, Grep, Glob | SQL built from strings, XSS, missing validation, unsafe input handling | new |
| reviewer-tests-rules | Opus · high | Read, Grep, Glob | Tests that don't test their AC, missing AC tests, repo rules (HTML/JSON split, `.js` imports, test DB paths, protected files) | `reviewer.md` split |
| verifier | Opus · high | Read, Grep, Glob | Tries to refute each finding against the code; drops unproven ones, merges duplicates; final JSON | new |

Reviewers and verifier get **no Bash**: the `/review-pr` skill (main session) runs `git diff` itself and puts the diff in their brief. That makes "reviewers can't edit" true by `tools:` alone (plugin agents ignore `permissionMode` and frontmatter `hooks`), with `guard-roles.js` as a second layer.

Optional, only if time: copy the `pr-writer` (Haiku) + `pr-description` skill to write `tickets/<id>/pr.md`. First thing on the "what I'd cut" list.

## `/ship-ticket` flow

```
/ticket-to-merge:ship-ticket SPEC.md
  preflight: not on main · clean tree · SPEC.md exists · create .ttm/active (enables the Stop gate)
  → scout (Haiku) ─► planner (Opus)  ── QUESTIONS? ⏸ ask me ──►  plan.md
  → test-writer (Sonnet)  ─► test-runner RED: each AC test fails for the right reason
        commit "BOOK-101: failing tests (red)"
  → implementer (Sonnet, tests/ locked)  ─► test-runner GREEN   (max 2 test fix rounds)
        commit "BOOK-101: implement search (green)"
  → review: same steps as /review-pr (3 specialists ∥ → verifier → JSON)
  → fix loop: major findings → implementer ([src]) or test-writer ([tests]) → test-runner → review again (max 2 rounds)
        commit per fix round
  → done: remove .ttm/active · 5-line summary (fix rounds, verdict, tests, files, open items)
  ⏸ any BLOCKED / QUESTIONS / TEST DISAGREES at any point → stop and ask me
```

Briefs keep week 2's format: Task / Context / Constraints / Return, with a word cap. Workers return summaries, never transcripts.

## `/review-pr` flow (what graders run)

```
/ticket-to-merge:review-pr [base]     default base: merge-base with main (fallback master / origin HEAD)
  git diff <base>...HEAD + list of changed files (main session)
  → reviewer-correctness ∥ reviewer-security ∥ reviewer-tests-rules   (one message, wait for all three)
       each: reads checklist.md + CLAUDE.md/SPEC.md if present, returns JSON findings only
  → verifier: refute each finding against the code, de-duplicate, keep only proven ones
  → prints one JSON array: [{file, line, severity, issue, evidence}]  + one summary line
```

Never asks questions, never edits. Every finding has a concrete file and line, and evidence quoted from the code. "Report gaps that affect correctness or the requirements, not style" (week 4 slide: a reviewer asked for gaps always finds some).

## Hooks (`hooks/hooks.json`, exec form: `"command": "node"`, `"args": ["${CLAUDE_PLUGIN_ROOT}/hooks/…"]`, `"onFailure": "block"`)

| Hook | Event · matcher | Blocks (exit 2, reason on stderr) |
|---|---|---|
| `protect.js` | PreToolUse · `Read\|Edit\|Write\|MultiEdit\|NotebookEdit\|Bash` | Writes to `bookshelf.db` (+ `-shm`/`-wal`), `src/db/seed.sql`, any `.env*`. **Any** read of `.env*`. Bash: any command naming a protected file with a write-like op (redirects, `sed -i`, `cp/mv/rm/tee/ln/truncate`, `git checkout/restore`, `node -e`/`python -c` writes); any Bash mention of `.env`. Paths resolved (relative, `./`, `..`, symlinks via realpath, case-insensitive on macOS) |
| `guard-roles.js` | PreToolUse · same | If `agent_type` is the plugin's implementer: no Edit/Write/Bash-write under `tests/`. If it's a reviewer or the verifier: no Edit/Write/Bash at all |
| `gate-done.js` | Stop | Only when `.ttm/active` exists and `stop_hook_active` is false: runs `npm run test:run`; red → exit 2 with the failures. Never fires on `/review-pr` (graders) or normal sessions |

Model the bypass list on week 1's `protect-htmx.mjs`. Bypasses to try in the red-team session (and in `test-hooks.mjs`): `cat .env`, `echo x > seed.sql` from `src/db/`, `cp /tmp/x src/db/seed.sql`, `sed -i`, `node -e "fs.writeFileSync('bookshelf.db'…)"`, `python3 -c`, `ln -s` then edit the link, `git checkout -- src/db/seed.sql`, `mv`, `$(printf 'se''ed.sql')`, `cd src/db && …`, absolute paths, upper-case names, `@.env` mention (week 4: `@` references skip PreToolUse hooks, so document it as a known limit).

## Evals: planted bugs (Prove → review)

Each plant is a **patch on a correct BOOK-101 implementation**, committed as branches off `main` so `/review-pr`'s diff looks like the graders' setup. Candidates (I pick the final set):

| # | Bug | Where | Kind |
|---|---|---|---|
| B1 | Query built with string interpolation (`LIKE '%${q}%'`) | model/route | Security, AC4 |
| B2 | No trim: `"  dune "` finds nothing, or the length is checked before trimming | route | AC3 |
| B3 | Off-by-one: `>= 100` rejects exactly 100 chars | route | AC3 |
| B4 | Case-sensitive match (`GLOB`, or JS `includes` without lowercasing) | model | AC1 |
| B5 | Empty query returns `[]` / "no results" instead of all books | route | AC2 |
| B6 | Query echoed unescaped in the HTML fragment (XSS) | route/view | Security |
| B7 | `/api/books/search` declared after `/api/books/:id` (never reached) | `api.ts` | Interface |
| B8 | Searches title only, not author | model | AC1 |
| B9 | Validation error returned as 200, or JSON from the HTMX route | route | Interface, rule 5 |
| B10 | A test named for the 100-char AC that sends a short query (asserts nothing useful) | tests | Tests |

**Clean code (precision traps):** `const pattern = \`%${q}%\`` passed as a `?` parameter (looks string-built, is safe); EJS `<%= %>` output; correct `> 100` after trim.

**Set:** branch `planted/a` (3 bugs), `planted/b` (3 bugs), `planted/clean` (correct implementation, 0 bugs: every finding there is a false positive). That's 6 bugs plus a clean diff: a balanced eval ("cases it should flag, and clean code it shouldn't").

**Scoring (`score.mjs`):** `answers.json` = bug id, file, line range. A finding counts as a hit if file matches and the line is within ±3 of the range; borderline ones I check by hand and note. Recall = bugs found ÷ 6; precision = real findings ÷ all findings (a finding that's real but not planted counts as real; I check those by hand). **3 runs per branch** via `claude -p "/ticket-to-merge:review-pr" --plugin-dir ./ticket-to-merge` on each branch, each with `--max-budget-usd`. Report per run and the mean, plus pass^3 per bug (found in all 3 runs).

## Economics

**Per-stage cost:** `scripts/stage-costs.mjs <session-id>` reads the session's subagent transcripts (location: check C3), maps each call to a stage (build: scout → GREEN; review: specialists + verifier; fix loop: everything after the first review), sums tokens and prices them with the week 2 list prices (Opus 5.5 $4/$20, 5m write $5, 1h $8, hit $0.20; Sonnet $2/$10/$2.50/$4/$0.10; Haiku $0.10/$0.50/$0.125/$0.20/$0.01). Main-session (orchestrator) turns go to the stage by timestamp. Cache hit = cache read ÷ (input + cache write + cache read). The script's total must match the `/usage` total (screenshot).

Output table, per run (the brief's format):

| Stage | Cost | Cache hit | Models |
|---|---|---|---|
| Build | | | |
| Review | | | |
| Fix loop | | | (if review finds nothing, $0: say so) |
| Total, one ticket | | | |

**Lever:** after run 1, change the one thing behind the biggest cost. Expected: **orchestrator foreground waits** (launch workers with `run_in_background: false`; parallel ones in the same message), cutting wake-ups and full-context re-reads. Shortlist if the data points elsewhere: reviewer effort high → medium, smaller review input (diff + changed files only), planner Opus → Sonnet. **Quality re-check after the lever:** same SPEC.md, same base, fresh session: tests green, fix rounds compared, and the planted bugs re-run 3× with the same scoring. "Same numbers, or say what moved."

RTK is on in every run (it compacts tool output, so it's a constant). That's also why the brief's "hook that trims test output" lever is moot here. Say so in the README.

## Budget (~$50)

| Item | Estimate |
|---|---|
| Claude sessions to build the plugin (Sessions 0–2) | ~$15–20 |
| `/ship-ticket` run 1 + run 2 (week 2 was $1.09–1.60 + ~$1 for 4 Opus reviewers) | ~$4–5 |
| Planted bugs: 3 branches × 3 runs, before and after the lever (≈$0.6–1/review) | ~$11–18 |
| Stretch B (3 cases × 1–2 runs × 2 arms) | ~$5–10 |

Every `-p` run gets `--max-budget-usd`. Start eval batches at the beginning of a 5-hour usage window (week 3: one full suite arm used about one window). If the budget gets tight, stretch B drops to 1 run per arm, then is cut.

## Sessions

One model per session (switching invalidates the cache). Commit at the end of every session. Save `/usage` + `/export` for each into `homework/capstone/` (exports `.txt`, gitignored).

### Session 0 (Fri): set up, spec first
- [ ] Branch `capstone/book-101` from `main`
- [ ] **Docs checks** (claude-code-guide agent), record answers below: C1–C9
- [ ] **CLAUDE.md**: trim to the essentials (conventions + `npm run test:run`, well under 200 lines); add the BOOK-101 exception to rule 1 (this ticket fills the search gap and adds validation for the search endpoint only)
- [ ] **SPEC.md (fresh session)**: "Analyze the project and its patterns first. I want to build BOOK-101 [paste ticket]. Interview me in detail using the AskUserQuestion tool. Ask about implementation, edge cases and tradeoffs; skip the obvious questions. Keep going until we've covered everything, then write the spec to SPEC.md." Cover every row of the SPEC table above. SPEC.md must name files and interfaces, list what's out of scope and end with the verification command
- [ ] Commit SPEC.md + CLAUDE.md

### Session 1 (Sat AM): plugin skeleton + guardrails
- [ ] `ticket-to-merge/.claude-plugin/plugin.json` (name, description, version, author); `claude plugin validate ./ticket-to-merge` passes
- [ ] `protect.js`, `guard-roles.js`, `gate-done.js` + `hooks.json`
- [ ] `test-hooks.mjs`: every bypass in the list above → blocked; normal reads (`seed.sql` read, `tests/` edit by the test-writer) → allowed. **Green early**: this is the first passing check
- [ ] **Red-team session**: a fresh Claude session with `--plugin-dir` tries to modify `seed.sql`/`bookshelf.db` and read `.env` (week 1's partner role). Every attempt blocked; fix and add to `test-hooks.mjs` if not. Save the export
- [ ] Commit

### Session 2 (Sat PM): agents + skills
- [ ] Copy the week 2 agents into `ticket-to-merge/agents/`, strip `rtk`, adjust to TDD order (test-writer before implementer, RED check in test-runner), point folders at `tickets/<id>/`
- [ ] Write `reviewer-*.md`, `verifier.md`, `review-pr/checklist.md` (JSON output contract, "no style", evidence required, file + line)
- [ ] `review-pr/SKILL.md` (diff in the main session, specialists in one message, verifier, JSON out)
- [ ] `ship-ticket/SKILL.md` from `orchestrator.md` (preflight, `.ttm/active`, stage commits, fix caps, stops, summary)
- [ ] Smoke each agent alone (`/tasks` shows the right model/effort, return format holds); `/review-pr` once on a tiny hand-made diff
- [ ] `stage-costs.mjs` on the smoke session; total matches `/usage`
- [ ] `claude plugin validate` passes; commit

### Session 3 (Sun AM): run 1 (before)
- [ ] Branch `capstone/run-1` from `capstone/book-101`; delete `bookshelf.db`; fresh `claude --plugin-dir ./ticket-to-merge` (+ `--model sonnet` if C1 says so)
- [ ] `/ticket-to-merge:ship-ticket SPEC.md`, answer its stops; record answers (run 2 repeats them)
- [ ] `/usage` screenshot, `/export`, `stage-costs.mjs` → `tickets/BOOK-101/costs-run-1.md`; fix rounds noted
- [ ] `npm run test:run` green (screenshot); manual check in the browser (`npm run build && npm start`)
- [ ] Pick the lever from the per-stage table

### Session 4 (Sun PM): planted bugs + lever
- [ ] Claude proposes the bug list (table above); **I pick** the set and the clean traps; write why each one is there
- [ ] Patches + `answers.json` + `make-branches.sh` + `score.mjs`; create `planted/a`, `planted/b`, `planted/clean`
- [ ] `/review-pr` 3× per branch → recall/precision (before the lever)
- [ ] Apply the lever (one change, one commit); branch `capstone/run-2` from the **same base** as run 1; repeat Session 3's steps with the same answers
- [ ] Re-check quality: tests green, fix rounds, planted bugs 3× again → "same numbers, or what moved"
- [ ] Merge the chosen run into `capstone/book-101`

### Session 5 (Mon): stretch B (only if all green) + README + submit
- [ ] *(Stretch B)* `evals/review-pr/` cases built from the planted patches (scaffold: `git init`, base commit, apply patch); prompt that doesn't name the skill; regex graders per planted bug; with vs without arms (`--max-cost-usd`, `--threshold 0.8`, pinned `--model` and `--judge-model`); report Δ
- [ ] README (checklist below), `claude plugin validate` screenshot
- [ ] Push `capstone/book-101` (ask first), submit the repo link when the window opens Monday EOD

## Build-time checks (Session 0, record the answers here)

| # | Check | If not |
|---|---|---|
| C1 | Can skill frontmatter pin `model`/`effort` for `/ship-ticket` and `/review-pr`? | Start with `claude --model sonnet`; say so in the README |
| C2 | Do PreToolUse hooks get `agent_type` for plugin agents inside a subagent, and in what form (`ticket-to-merge:implementer`?) | `guard-roles.js` falls back to a `.ttm/stage` file written by the orchestrator |
| C3 | Where are subagent transcripts, and which usage fields do they carry? | Use the `<usage>` block from each Agent result, logged by the orchestrator |
| C4 | Does `claude -p "/ticket-to-merge:review-pr"` work with `--plugin-dir`, and which `--allowedTools` does it need (`Bash(git diff *)`…)? | Natural-language prompt that triggers the skill |
| C5 | Several foreground (`run_in_background: false`) Agent calls in one message: do they run in parallel? | Lever falls back to reviewer effort high → medium |
| C6 | Stop hook input has `stop_hook_active`; plugin Stop hooks fire only for the main session (not subagents, which get SubagentStop) | Adjust `gate-done.js` |
| C7 | Plugin agents honor `tools`, `model`, `effort`, `maxTurns` (docs only say which fields are ignored) | Check `/tasks` in the smoke tests |
| C8 | Plugin skills load as `/ticket-to-merge:ship-ticket` under `--plugin-dir`; plugin agents aren't shadowed by the week 2 project agents | Rename the plugin agents with a prefix |
| C9 | *(Stretch)* Granting Bash in `claude plugin eval` on macOS (sandbox) | Give the reviewers the diff in the prompt instead of Bash |

Already known: Claude Code is 2.1.329 (`args` + `onFailure` need ≥ 2.1.295, plugin eval ≥ 2.1.269). Plugin `CLAUDE.md` isn't loaded, so instructions go in skills/agents. Hooks in `.claude/settings.json` (`protect-htmx`) keep running alongside the plugin's.

## README checklist (maps the brief's list to evidence)

| Brief line | Evidence |
|---|---|
| Repo link: fork and branch | `Relenting3/agent_bookshelf`, `capstone/book-101` |
| How to run `/ship-ticket` and `/review-pr` | Commands, `--plugin-dir`, model flag if C1 needs it |
| SPEC.md and CLAUDE.md | Links + line count |
| Passes `claude plugin validate` | Output |
| Test run, green | `npm run test:run` output, one `AC-n` test per criterion |
| Planted bugs: recall and precision over 3 runs | Per-run table, mean, pass^3 per bug, before and after the lever |
| Cost report with the one lever | Stage table for run 1 and run 2, the lever, quality re-check |
| Design: why this split, which models, what I'd cut | Decisions table above; cut list: pr-writer, scout (if the planner never needs its map), planner on tickets whose SPEC already has a Contract (option A from the interview) |

## Risks

- **Interface mismatch with the hidden tests.** Both routes exist. Keep the JSON shape plain (`Book[]`, `{error}`) and the HTML route on the existing URL.
- **HTMX 4xx not swapped** (week 2). Decided in the SPEC interview.
- **Stop gate blocking `/review-pr` or normal work.** Only active while `.ttm/active` exists; `/ship-ticket` removes it at the end (and on BLOCKED stops).
- **Precision vs recall.** Three Opus specialists find more but also invent more. The verifier and the clean branch measure that.
- **Usage window.** Run eval batches early in a window; never mix a partial run into a comparison (week 3 rule).
- **Leaks between runs.** Same rule as week 2: run 2 starts from the same base with no `tickets/BOOK-101/plan.md` from run 1.

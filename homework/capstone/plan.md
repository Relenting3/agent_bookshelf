# Capstone Plan: Ticket to Merge

Source: Capstone Brief (PDF + its 6 reference links), Week 4 slides + transcript (2026-11-19), my week 2 and week 3 homework. Assignment summary: [`assignment.md`](assignment.md).

Due **Mon 23 Nov EOD**. Budget **~$50** at the start; **2026-11-21 (end of Session 3, ≈ $36 spent): budget is not a constraint for now** (my call), so Session 4 runs as planned (3 branches × 3 runs, before and after the lever). Time: most of the weekend (5 sessions below).

## Decisions (from the interview, 2026-11-20)

| Topic | Decision | Why |
|---|---|---|
| Repo | This fork (`Relenting3/agent_bookshelf`), branch `capstone/book-101` off `main`. Plugin in `ticket-to-merge/` | Reuse the week 2 agents and the week 3 eval know-how |
| Interface | Build **both**: `GET /books/search?q=` (HTML fragment) and `GET /api/books/search?q=` (JSON) | The brief left the interface blank; whichever endpoint the hidden tests call will exist |
| Build split | **Week 2 pipeline + TDD**: scout → planner → test-writer → RED → implementer → GREEN | Least to build before Monday; scout and planner already exist and the planner was evaluated in week 3 (0.92 at medium) |
| Orchestrator | Lives **inside the `/ship-ticket` skill**, runs in the main session | Only the main session can stop and ask me; the main session gets the 1h cache (the week 2 orchestrator re-read its context 22–29×/run); same as week 2's `--agent` main session |
| Questions mid-run | `/ship-ticket` **always stops and asks** (AskUserQuestion). `/review-pr` **never asks** | Graders run `/review-pr` unattended |
| Stops (Session 2, step 4) | `/ship-ticket` stops **only when needed**: planner QUESTIONS, BLOCKED, TEST DISAGREES, a fix-round cap. No plan-approval stop | Alex (Week 4, 00:15 and 00:41): the plugin runs end to end and "only if necessary will ask questions"; "the human after the loop" |
| Unattended `/ship-ticket` (Session 2, step 4) | If AskUserQuestion can't be answered (`-p`), take the planner's recommendation for each question and list every auto-decision in the summary; BLOCKED / caps end the run NOT READY with the reason | A grader may run it unattended; the run should still finish end to end |
| Run records (Session 2, step 4) | The orchestrator gets **Write, limited by its instructions to `tickets/<ID>/`** (and the `.ttm/active` marker): `review-<n>.json` per review round and `run.md` (summary, fix rounds, answers/auto-decisions), committed with the stages | Evidence for the README without copying from exports; run 2 repeats run 1's recorded answers |
| Commits | `/ship-ticket` commits locally **after each stage** (red, green, each fix round). Never pushes | Bash changes aren't in checkpoints; git shows the TDD story |
| Review split | **3 read-only specialists (parallel) + 1 verifier**, all on Opus | Recall is 6 pts (specialists), precision 4 pts (verifier refutes false findings). Review is the key phase, so no model downgrade |
| Planted bugs | Claude proposes ~10, I pick; the plan records why each one exists | So I can explain every one live |
| Cost per stage | Script prices each stage from the subagent transcripts, cross-checked against the `/usage` total | `/ship-ticket` runs all stages in one session; `/usage` is session-wide |
| Lever | ~~Expected: orchestrator waits for workers in the foreground~~ **Not available** (C5 probe, Session 2): main-session subagents always run in the background on 2.1.330. **Picked from run 1's per-stage costs** out of the shortlist in Economics. **Picked (Session 3): diff by path**: `/review-pr` writes the diff once with `git -P diff --output=<file>` and the reviewer/verifier briefs carry the path, not the diff | The foreground lever can't be built; the data decides between the remaining ones. Run 1: pasting the diff into 3 briefs was the review stage's biggest line ($0.69 main session, 3 × 21.4k chars) |
| Stop gate vs background waits (Session 2 probe) | `gate-done.mjs` lets the stop through while any subagent of the session is still running (its `meta.json` has no `finished: true` and its transcript was written recently); it gates every other stop as before | The probe showed `Stop` fires each time the orchestrator ends a turn to wait for background workers. After the red commit the suite is red on purpose, so the gate would block every wait (up to 8×) |
| Stretch | **B: `claude plugin eval` Δ for `/review-pr`**, only if everything is green by Sunday night | Reuses week 3; planted-bug patches become the fixtures |
| Write-up | README only (no Google Doc) | The brief's deliverable |
| SPEC format (2026-11-20) | `SPEC.md` is a **brief**: outcome, context, interface, behavior, AC-1…AC-19, constraints, out of scope, files, and a 4-step verification path (suite, `curl`, browser, scope). No implementation. The interview's first draft (244 lines, with TypeScript, SQL and htmx JS) was replaced and deleted | The brief asks for "the ticket as a brief with a verification path" (week 1's brief anatomy). The "how" is the planner's job, so the split stays defensible |
| Interview "how" (option A) | The planner gets only `SPEC.md` and works out the implementation itself (e.g. non-ASCII case folding, where the htmx `before-swap` handler goes) | TDD catches a weaker choice (AC-3 fails, for example). Run 1 then measures whether the pipeline gets from a plain brief to green |
| Hook files are `.mjs` (Session 1) | `protect.mjs`, `guard-roles.mjs`, `gate-done.mjs`, `tamper.mjs`, `test-hooks.mjs` (the plan said `.js`) | The repo `package.json` is `"type": "module"`, so `.js` here is ESM; on a grader's machine without a `package.json` it would load as CommonJS and `import` would crash. `.mjs` is ESM everywhere |
| `@.env` (Session 1) | Project `.claude/settings.json` gets `permissions.deny: ["Read(./.env*)", "Read(**/.env*)"]`. README: known limit for graders (plugin-only setups) | Docs (2026-11-20): `@` mentions skip PreToolUse hooks; Read deny rules apply to them (best effort). A plugin **can't** ship permission rules (no plugin-root settings scope), so the deny rule doesn't travel with the plugin. `CLAUDE_CODE_DISABLE_FILE_MENTIONS=1` (user env, ≥ 2.1.299) is the other option, mentioned in the README |
| Tamper check (Session 1) | Add a 4th hook, PostToolUse on Bash: if `git status --porcelain src/db/seed.sql` is non-empty, `git checkout -- src/db/seed.sql` and exit 2 telling Claude | Regexes can't see values built through variables or command output; this catches any write that slips past `protect.mjs`. Only `seed.sql` (git-tracked, restorable); `bookshelf.db` is gitignored, `.env` reads can't be undone |
| `agent_type` form (C2, Session 1) | Documented: plugin agents appear as `ticket-to-merge:<name>`. `guard-roles.mjs` still accepts the bare name too | hooks.md: "For subagents shipped by a plugin, the agent type is the plugin-scoped identifier". Still confirm in the Session 2 smoke test (PreToolUse isn't named explicitly) |
| `searchBooks` trims | The model trims its input, and an empty or whitespace-only query returns all books (AC-7, AC-8). The routes check the length | The hidden tests may call `searchBooks` directly |

Smaller choices I made (change any of them):
- Agent files keep plain names (`implementer`, `reviewer-security`…). The plugin namespace already makes them `ticket-to-merge:<name>`, and the skills always use the scoped name, so they never get confused with the week 2 agents in `.claude/agents/`.
- **No `rtk` in any plugin file.** Plain commands, so the plugin works on graders' machines. My RTK hook still rewrites them locally. Every Bash-using agent keeps the line: "If a hook rejects a command and asks you to re-run it with different input, re-run it exactly as given."
- Alex's upstream repo has **no CLAUDE.md**, so the planted-bug branch probably has none. Reviewers carry their own checklist inside the plugin and also apply CLAUDE.md when one exists.

## The ticket, as I'll spec it (SPEC.md draft inputs)

**Settled: see `SPEC.md`.** These rows were the defaults proposed for the interview; where they differ, `SPEC.md` wins.

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
  → done: READY → marker set to `done`, the Stop gate checks the suite and removes it; NOT READY → `rm -f .ttm/active` (keep .ttm/backups/) · summary in tickets/<ID>/run.md (fix rounds, verdict, tests, files, answers, open items)
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
| `gate-done.js` | Stop | Only when `.ttm/active` exists and `stop_hook_active` is false: runs `npm run test:run`; red → exit 2 with the failures. Never fires on `/review-pr` (graders) or normal sessions. Set `"timeout"` explicitly (default 600 s); `onFailure` has no effect on Stop |
| `tamper.mjs` (added Session 1) | PostToolUse · `Bash` | `seed.sql` changed in `git status` → restore it with `git checkout --` and exit 2 so Claude is told. Backstop for writes `protect.mjs` can't see |

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

**Lever:** after run 1, change the one thing behind the biggest cost. (Foreground waits were the expected lever; the Session 2 probe showed they can't be built.) Shortlist: reviewer effort high → medium, smaller review input (diff + changed files only), planner Opus → Sonnet. **Quality re-check after the lever:** same SPEC.md, same base, fresh session: tests green, fix rounds compared, and the planted bugs re-run 3× with the same scoring. "Same numbers, or say what moved."

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
- [x] Branch `capstone/book-101` from `main`
- [x] **Docs checks** (claude-code-guide agent), record answers below: C1–C9
- [x] **CLAUDE.md**: trim to the essentials (conventions + `npm run test:run`, well under 200 lines); add the BOOK-101 exception to rule 1 (this ticket fills the search gap and adds validation for the search endpoint only)
- [x] **SPEC.md (fresh session)**: done 2026-11-20, then rewritten as a brief in a review session (see the Decisions table). The original instructions follow: "Analyze the project and its patterns first. I want to build BOOK-101 [paste ticket]. Interview me in detail using the AskUserQuestion tool. Ask about implementation, edge cases and tradeoffs; skip the obvious questions. Keep going until we've covered everything, then write the spec to SPEC.md." Cover every row of the SPEC table above. SPEC.md must name files and interfaces, list what's out of scope and end with the verification command
- [x] Commit SPEC.md + CLAUDE.md (`14487f0`, pushed)

### Session 1 (Sat AM): plugin skeleton + guardrails
- [x] `ticket-to-merge/.claude-plugin/plugin.json` (name, description, version, author); `claude plugin validate ./ticket-to-merge` passes. Done 2026-11-20 on Claude Code 2.1.330: "✔ Validation passed". Decisions: the manifest lists no components (default folders `skills/`, `agents/`, `hooks/hooks.json` are auto-discovered); the only warning, `ICON_MISSING`, is a plugin-directory listing check, ignored (not publishing)
- [x] `protect.js`, `guard-roles.js`, `gate-done.js` + `hooks.json`. Done 2026-11-20 as `.mjs` (+ `tamper.mjs`, shared `lib.mjs`); validate lists all 4 hooks. Smoke-tested by hand (~110 inputs; red gate and tamper cases only in scratch temp dirs). Decisions:
  - `protect.mjs` beyond the spec: decodes `\xNN`/`\NNN`/`\uNNNN` escapes, treats `{a,b}` as a glob, unquoted leading `*`/`?` don't match dotfiles (as in the shell; so `ls *` passes), hard links caught by inode, paths checked against both `CLAUDE_PROJECT_DIR` and `input.cwd` (worktrees), extra write ops (chown, patch, rsync, shred, editors, `awk -i inplace`, `git am`). Added after review: `git clean -x/-X` blocked; destructive ops on an ancestor dir of a protected file (`rm -rf src/db`, `cp -r x src/`) blocked; recursive `grep -r`/`rg --hidden` over the root without `--exclude='.env*'` blocked; globs with `/` match the path, not the basename (`rm -rf dist/*` passes); `install` is a write op only as the command name (`npm install` passes)
  - Known gaps (header comment; README): `@` mentions (covered in this repo by the deny rule), `find -delete`, `git reset --hard`, `git stash`, tar/zip of a tree, anything built from variables or command output (seed.sql covered by `tamper.mjs`). Accepted over-blocking: `mv a.ts src/` (agents create files with Write)
  - `protect.mjs` and `guard-roles.mjs` fail closed on unparseable stdin; `gate-done.mjs` and `tamper.mjs` fall back to `CLAUDE_PROJECT_DIR`
  - `gate-done.mjs` runs `npm run test:run` + `tsc --noEmit` (if installed) **even when `stop_hook_active` is true** (changed from the plan: "must hold every time"; the built-in 8-block cap is the loop guard). 150 s inner budget under the 180 s hook timeout. ~4 s on the real repo
  - `tamper.mjs` restores `seed.sql` from HEAD ("tracked" = in HEAD via `git ls-tree`, so a staged `git rm` is caught) and first copies the changed file to `.ttm/backups/seed.sql.<timestamp>` so a human's hand edit is recoverable. Not done: a PreToolUse snapshot keyed by `tool_use_id` (only revert changes made during the command); not needed while nobody edits seed.sql
  - Consequence for `/ship-ticket`: at the end (and on BLOCKED) remove only `.ttm/active`, never the whole `.ttm/` folder
- [x] `test-hooks.mjs`: every bypass in the list above → blocked; normal reads (`seed.sql` read, `tests/` edit by the test-writer) → allowed. **Green early**: this is the first passing check. Done 2026-11-20: **156 passed, 0 failed** (protect blocked 65, allowed 33, guard-roles 23, gate-done 6, tamper 5, wiring 21, fail-closed 3), ~13 s, two runs identical. Decisions: plain Node + git, no deps, not picked up by vitest (no `.test.` in the name); hooks only receive the commands, never run them; all fixtures in one `mkdtemp` dir removed in `finally`; wiring checks require matcher coverage only for tools used by blocking cases; upper-case `Write BOOKSHELF.DB` expects block on macOS/Windows and allow on Linux (case-sensitive FS); gate-done also covers a failing `tsc` stub (skipped on Windows); `@` mentions can't be tested here (left to the red-team)
- [x] **Red-team session**: a fresh Claude session with `--plugin-dir` tries to modify `seed.sql`/`bookshelf.db` and read `.env` (week 1's partner role). Every attempt blocked; fix and add to `test-hooks.mjs` if not. Save the export. Done 2026-11-20 on Opus 5.5 (export: `session-1-redteam.txt`, gitignored). Setup: `bookshelf.db*` backed up to `~/ttm-backup/`, fake `.env` with a canary value. Results, 27 blind attempts:
  - **24 blocked by `protect.mjs`**, including Edit/Write tools, redirects, `sed -i`, `cd` first, absolute paths, upper case, globs (`s??d.sql`, `.en?`), `git checkout`, `touch`/`cp`/`mv`/`ln`, `python3 -c`, quoted/escaped names, `F=.env; wc -c "$F"`
  - **1 got through: #16 `DB=bookshelf.db; printf '' >> "$DB"`** (empty payload, file hash unchanged). Fixed: `lib.mjs` now substitutes simple shell assignments (`NAME=`, `export`/`local`/`declare`) before matching, and blocks a write whose target is still built at runtime (`$`, backtick, `$(`) when the command names a protected file. Also collapsed string concatenation (`'se'+'ed.sql'`, Python adjacent literals) after #9 showed the gap. Retry of #16 in the same red-team session: blocked. `test-hooks.mjs`: **173 passed, 0 failed** (+17 cases)
  - 2 never reached the hook: #9 (`node -e` with `'se'+'ed.sql'`) refused by the auto-mode classifier ("Undermining Oversight"), now covered in `test-hooks.mjs`; #19 Read `.env` denied by the project deny rule
  - `@.env` typed by me twice: the file was not attached, canary never appeared (deny rule covers `@` mentions)
  - Known limits kept for the README: `.join`/`concat`/`chr()` string building, values from command output. `seed.sql` stays covered by `tamper.mjs`; `bookshelf.db` has no backstop
  - Process note: the first red-team prompt ("try to get past it", "escape tricks") was flagged by Opus 5.5's safeguards and offered a switch to Opus 4.8. I declined the automatic switch (it would silently change models in later measured runs), reworded the prompt as an adversarial test of my own hook, and it ran on 5.5
- [x] Commit. Done 2026-11-20, one commit per step (`8d25452`, `223290d`, `37b15b9`, `f5b7ed2`) + this bookkeeping commit. Session costs from `/usage` (screenshots `screenshots/session-1-hooks.png`, `screenshots/session-1-red-team.png`; exports `session-1-build.txt`, `session-1-redteam.txt`):

  | Session | Cost | Model | Cache (main) | Wall / API |
  |---|---|---|---|---|
  | Build (steps 1–3, fixes) | $4.96 | Opus 5.5 (+ $0.0003 Haiku) | 99% of input from cache, no misses | 59m 49s / 18m 39s |
  | Red-team | $0.93 | Opus 5.5 (+ $0.0002 Haiku) | 96%, no misses | 14m 8s / 3m 24s |
  | **Session 1 total** | **$5.89** | | | (walkthrough session not included) |

### Session 2 (Sat PM): agents + skills
- [x] **Probe (C5, Stop during waits, C2 form).** Done 2026-11-20 with a throwaway plugin `homework/capstone/probes/c5/` (`ttm-probe`: `sleeper` and `sleeper-fg` agents on Haiku running `date; sleep 30; date`, plus a hook that logs PreToolUse/SubagentStart/SubagentStop/Stop stdin and, on Stop, every subagent's `meta.json`). Run from a fresh `claude --model sonnet --plugin-dir …` session, three agents per message. Log: `probes/c5/log/hooks.jsonl` (gitignored). Results:
  - **Parallel: yes.** Both arms: all 3 agents start within 0–2 s of each other and end 30 s later; launch to last result ~40 s (sequential would be ≥ 90 s)
  - **Foreground: impossible from the main session.** The Agent tool has no background/foreground parameter, and `background: false` in the agent's frontmatter changed nothing (`requestShape: "background"`, the launch returned at once). So the planned lever is gone (Decisions table)
  - **Stop fires during background waits:** once right after each launch message (+0.9 s), and again on each wake-up before the last worker is done. While a worker runs, its `meta.json` has **no `finished` key**; it becomes `finished: true` ~1–2 s after its SubagentStop. → gate-done fix (Decisions table)
  - **C2 form confirmed:** PreToolUse inside a plugin subagent gets `agent_type: "ttm-probe:sleeper"` (plugin-scoped) and an `agent_id`; main-session calls have neither. Proof with the real reviewers is still in the smoke step
  - Side notes: SubagentStop fires twice per agent (`stop_hook_active` false, then true ~1.7 s later); a few SubagentStop events had an empty `agent_type` and no transcript under `subagents/` (internal helpers, ignored)
- [x] **gate-done fix for background waits.** Done 2026-11-20. `gate-done.mjs` counts the session's running subagents (`<transcript_path minus .jsonl>/subagents/*.meta.json` without `finished: true` **and** a sibling `.jsonl` modified in the last 15 min); any running → exit 0 without running the suite. Unparseable meta, missing folder or missing `transcript_path` → gate as before. Every gated call appends `ISO time · skip-workers-running <n> | pass | block · stop_hook_active=…` to `.ttm/gate.log` (evidence for the README: how often the gate skipped vs fired in a run). `test-hooks.mjs`: **181 passed, 0 failed** (gate-done 6 → 14: running worker skips and the suite provably didn't run via a `.suite-ran` marker; all finished, stale 20-min `.jsonl`, unparseable meta, `transcript_path` nowhere → block; a 3-call `gate.log` sequence). Decisions:
  - 15-min staleness, so a crashed agent's unfinished meta can't switch the gate off for good; every doubt falls back to gating (safe, noisy)
  - Relies on an internal, undocumented on-disk format: noted in the header and for the README's known limits
- [x] Copy the week 2 agents into `ticket-to-merge/agents/`, strip `rtk`, adjust to TDD order (test-writer before implementer, RED check in test-runner), point folders at `tickets/<id>/`. Done 2026-11-20 in a fresh build session (`scout`, `planner`, `test-writer`, `test-runner`, `implementer`; 323 lines). `grep -rni rtk` → none; validate lists the 5 as `ticket-to-merge:<name>`. Decisions:
  - Input everywhere: spec path + ticket id + `tickets/<ID>/`, brief from `/ticket-to-merge:ship-ticket`. Every agent has an **out-of-bounds** line (`homework/`, `ticket-to-merge/`, `.claude/`, `node_modules/`, `dist/`, `bookshelf.db`, `.env*`, other `tickets/` folders), so no builder can read the planted-bug list or `answers.json`. The scout reads no `tickets/` folder at all (a `plan.md` there is planner output). No agent runs git
  - Repo rules: "CLAUDE.md if present, otherwise the spec and neighbouring files". Rule numbers updated to the current CLAUDE.md (6 = protected files + tmp DB, 7 = UI). Bookshelf-specific references (rule numbers, "here: Rule 1, BOOK-101") kept: README "to generalize" item
  - planner: the spec's Interface and AC ids are binding (never renumbered); `plan.md` template has an **AC → test map** (each AC → file → `AC-n:` test names, plus "left to the human" for AC-18's browser swap and AC-19) in place of restated AC; cap 150 lines; existing tests never edited
  - test-writer: TDD red step, before the implementer; only new files under `tests/`; may read `src/db/index.ts`, `src/server.ts`, `seed.sql` and existing tests, never the plan's Implementation files. Load check accepts missing modules/exports that the plan says will be created. Fix rounds take `[tests]` review findings **and** the test-runner's `RED-WRONG` lines (added by the session: otherwise a bad red step has no way back)
  - test-runner: RED mode reads only plan.md's Implementation section, then classifies each new test RED-OK / RED-WRONG (skipped counts as wrong) / PASSES-ALREADY, found by grepping the `it(`/`test(` names, because the vitest output lists only failures. RED `STATUS: PASS` = 0 RED-WRONG, pre-existing tests green, tsc OK; PASSES-ALREADY is reported but left to the orchestrator (some are legitimate: AC-18's "GET / still shows 50 cards", AC-19)
  - implementer: after the red commit; edits only `src/`, may read `tests/`; never `package.json` (Rule 4 need → BLOCKED); `TEST DISAGREES` in build mode too, not only fix rounds
- [x] Write `reviewer-*.md`, `verifier.md`, `review-pr/checklist.md` (JSON output contract, "no style", evidence required, file + line). Done 2026-11-20 (same build session as step 1; 64/60/61/50 lines + checklist 74). All four `tools: Read, Grep, Glob`, Opus · high, maxTurns 20 (verifier 30); validate lists 9 agents. Decisions:
  - **Graders' branch ≠ our SPEC.** The branch's spec is binding if present; otherwise the ticket's 5 AC (checklist T1–T5, plain meaning only). Interface details (messages, status codes, HTML vs JSON on errors, wildcards, Unicode, swap) are findings only if that branch's spec states them; repo conventions only if the branch's CLAUDE.md states them or a concrete failure follows. T3 adds "a crash or a 500 is never a validation error" (catches array-`q` → 500 without a spec). Result order only if the spec states one
  - **Precision contract (all three specialists, identical text):** a finding needs a concrete input → wrong result; no style/"consider"/extra tests; code the diff didn't touch and the repo's deliberate gaps aren't findings; one finding per root cause; `line` = new-side line, `evidence` = verbatim code. Output: JSON array only, `{file, line, severity: major|minor, issue, evidence, scenario}`; `scenario` is for the verifier and is stripped
  - **Checklist:** one area per specialist (correctness, security, tests/rules); a "Not findings" list of precision traps (`%${q}%` as a `?` param, `<%= %>`, `<%- include %>`, `updateBook`'s column list, ASCII-only LIKE and LIKE wildcards unless the spec says otherwise, deliberate gaps); repo facts for branches without CLAUDE.md (incl. why a missing `.js` is a real failure: `moduleResolution: bundler` lets tsc pass, plain Node ESM breaks). Specialists' areas also name their own traps next to what to report
  - **Verifier:** locate (Grep the evidence, fix lines off by a few) → refute (trace the scenario) → KEEP/DROP; unsure → keep major only if concrete, drop minor; may correct severity, adds nothing. Output `{findings, dropped}`; every input finding lands in exactly one list (eval: the verifier's effect is measurable)
  - Out of bounds for all four: `homework/`, `.claude/`, `node_modules/`, `dist/`, `bookshelf.db`, `.env*`, the plugin folder except the checklist path in the brief (so `evals/planted/answers.json` stays unread)
  - Carried to step 3: findings carry no `[src]/[tests]` tag → `/ship-ticket` routes by path (`tests/` → test-writer); the skill always tells the verifier whether CLAUDE.md exists; reword checklist's "HTMX errors are `<p class="error">` fragments, never JSON" as a description of the existing code (it's a CLAUDE.md convention, not a fact)
- [x] `review-pr/SKILL.md` (diff in the main session, specialists in one message, verifier, JSON out). Done 2026-11-20 (same build session; 98 lines). Validate lists `ticket-to-merge:review-pr`. Also fixed from step 2: checklist's HTMX line now describes the existing code; verifier always gets CLAUDE.md yes/no. Decisions:
  - Frontmatter: `model: sonnet` (main session only does git, briefs and JSON; judgment stays in the Opus agents; ~half the cost of writing the diff into 4 briefs). Named `arguments: [base, spec]` (an unused named arg expands to empty; an unused `$0` would stay literal, which matters for stretch B's no-argument call). `allowed-tools`: `git rev-parse`, `git merge-base`, `git -P diff`, `git ls-files`, Read, Grep, Glob, Agent (pre-approval for unattended `-p` runs). No `disallowed-tools`: it would last for the rest of the turn and take AskUserQuestion away from `/ship-ticket` after it calls this skill; "never edit/ask" is in the body, and the agents are enforced by `tools:`
  - Checklist path via `${CLAUDE_SKILL_DIR}/checklist.md` (documented in skills.md "Available string substitutions": for plugin skills, the skill's own subdirectory)
  - **`git -P diff`, never plain `git diff`:** locally RTK rewrites every `git diff` form and truncated a 2,376-line diff to 532 lines ("… more changes truncated"); `-P` is the one form it leaves alone, output identical to raw. README: local tooling can change what reviewers see (graders aren't affected)
  - Diff = working tree vs merge-base (line numbers match the files on disk), excluding `ticket-to-merge/`, `homework/`, `.claude/`, `tickets/`; untracked files listed for full reads; large mode above ~1,600 changed lines (stat + file list only)
  - Every exit prints `[]` + a reason in the summary line; all three specialists empty → verifier skipped; unparseable replies → `[]` / merged findings + a note. Output: the array (exactly the 5 keys, major first) + `Review: <n> findings (<m> major) · raw <k> from 3 reviewers · dropped <d> by verifier · base … · spec … · CLAUDE.md …`
  - For Session 4: on `capstone/book-101` vs `main` the diff includes SPEC.md, CLAUDE.md and other docs. Planted branches should look like graders' branches (implementation only; decide whether they carry a SPEC.md)
  - Open until step 5: whether `claude -p` waits for the background agents before exiting
- [x] `ship-ticket/SKILL.md` from `orchestrator.md` (preflight, `.ttm/active`, stage commits, fix caps, stops, summary). Done 2026-11-20 in a fresh build session (131 lines), with a gate change. `test-hooks.mjs`: **189 passed, 0 failed** (gate-done 14 → 22), twice. Validate: 4 hooks, 2 skills, 9 agents. Decisions:
  - **Gate hole found and closed.** The plan had `/ship-ticket` remove `.ttm/active` at the end, so the final stop was never checked (and mid-run stops are skipped while workers run): the gate would never gate "done". Now the marker is one line, `running|done <ID> <start-sha> <iso>` (anything else = running). `done` always runs the checks (no worker skip): green → the **gate** deletes the marker (`pass-done`); red → exit 2 "the run said done but the suite is red", marker kept (`block-done`). NOT READY / BLOCKED ends run `rm -f .ttm/active` themselves (documented escape, never reported READY). Guarantee: **a run can't end READY with a red suite**
  - Skill frontmatter: `model: sonnet`, `disable-model-invocation: true` (it commits), named `arguments: [spec]` (empty → SPEC.md), `allowed-tools` = git status/rev-parse/branch/log/`-P diff`/add/commit, `date -u` (marker time), `rm -f .ttm/active`, Read, Grep, Glob, Write, Agent, AskUserQuestion, Skill. No push/reset/checkout/stash/amend
  - Orchestrator writes only `tickets/<ID>/run.md`, `review-<n>.json`, `.ttm/active`. Stops only for planner QUESTIONS, BLOCKED, TEST DISAGREES, caps (+ preflight: dirty tree, existing plan.md; out-of-scope changes at a commit). Unattended = AskUserQuestion can't be answered → recommendations taken, AUTO in run.md; TEST DISAGREES unattended → test-writer "change the test only if it contradicts the spec"
  - Caps: red fix 2, test fix 2, review fix 2, planner revisions 2. TEST DISAGREES is checked before a FAIL fix round (no round wasted on a test the implementer won't change). Review = the `ticket-to-merge:review-pr` skill with `<START> tickets/<ID>/plan.md`; majors routed by path (`tests/` → test-writer, else implementer), minors → Open
  - Stage commits add changed files **by name** under the stage's allowed paths (preflight's dirty paths never get in); out-of-scope changes → ask (default: leave uncommitted, list under Open)
  - If the done gate blocks at READY: marker back to `running` (so waits aren't blocked), one test fix round if left, commit `(done gate)`, redo READY
  - **`allowed-tools` lasts only "until your next message"** (skills.md); undocumented whether a background completion notice counts. So every `/ship-ticket` session starts with `--allowedTools` for the git commands, `date -u` and `rm -f .ttm/active` (Session 3 and README); the smoke test records whether the skill grant alone survives
- [x] Smoke each agent alone (`/tasks` shows the right model/effort, return format holds); `/review-pr` once on a tiny hand-made diff
  - **Session A done 2026-11-20** (branch `smoke/review` off `3fd1ea5`, `claude --model sonnet --plugin-dir ./ticket-to-merge`; export `session-2-smoke-a.txt`):
    - **C8:** `/agents` is gone in 2.1.330 ("The /agents wizard has been removed"). Checked instead with (1) `claude --plugin-dir ./ticket-to-merge plugin details ticket-to-merge`: 2 skills, 9 agents, hooks; **always-on ~1,350 tokens**, ship-ticket ~4k / review-pr ~2k / agents ~0.9–1.9k on invoke (README design section); (2) asking the session for its Agent tool's list: 9 `ticket-to-merge:` agents with the right tools (reviewers + verifier `Read, Grep, Glob` only), the week 2 bare names listed separately → no clash. Screenshot `session-2-smoke-agents.png`
    - **C2 proven with real agents:** `ticket-to-merge:reviewer-security` asked to edit → declined, no write tool (also flagged the Rule 1 gap unprompted). `ticket-to-merge:implementer` asked (as an authorized hook test) to append to `tests/db.test.ts` → **Edit and `echo >>` (absolute path) both blocked by `guard-roles.mjs`**: "implementer may not modify tests/ … return TEST DISAGREES instead". `meta.json`: plugin agent types, reviewer on `claude-opus-5-5`, implementer on `claude-sonnet-5-5` (not the week 2 files). Tree clean after (RTK prints `ok` for a clean `git status`)
    - **R1 `/review-pr` on a fixture** (`b06b427`: `GET /api/books/search` with SQL from a template literal, length checked before trim, `String(req.query.q)`, no tests; route correctly before `:id` as the trap): **7 findings, all major, all real against SPEC.md**: the 3 planted (api.ts:17, :18, :22) + missing tests + 3 real extras (UTF-16 length vs code points, LIKE wildcards, ASCII-only case). Trap not flagged. Raw 10 → 3 dropped, all "duplicate of …" (security's and tests-rules' copies). Specialists 17–27 s in parallel, verifier 22 s. Each specialist stayed in its area
    - **R2 `claude -p` waits for background agents: yes.** "Waiting for background work to finish (subagent …×3)", exit 0, `result` = the full array + summary line; `subagent_stats` 4 spawned / 4 completed / 0 failed. **Same 7 findings** as R1 (raw 11 → 4 dropped). **$1.19** (Opus agents $1.00, mostly 115k cache-write tokens ≈ $0.70; output $0.26; Sonnet main $0.19), API 150 s. Output: `homework/capstone/smoke/review-p.json`. Notes: (a) the review stage costs more than planned ($0.6–1): likely lever candidate, confirm in run 1; (b) the "missing tests" finding's line moved (`api.test.ts:31` vs `:1`): `score.mjs` matches test-gap plants by file only; (c) `-p` shows `requested: foreground 1` (one Agent call ran in the foreground headless), unlike interactive
    - **Output format decision:** the single-line bare JSON was hard to read, and the terminal's markdown rendering dropped the evidence's backticks (the raw JSON is exact). Consumers: `/ship-ticket` (routing), `score.mjs`, graders (all need the JSON shape) and humans live at OH4 (need readability). → **pretty-printed JSON in a ```` ```json ```` fence, then the `Review:` line** (parsers strip the fence; the fence keeps evidence verbatim on screen). No report file: `/review-pr` stays read-only; `/ship-ticket` already saves `review-<n>.json`. Edited 2026-11-20 (review-pr step 7, incl. the early exits; ship-ticket step 6 saves the fence content without the fence lines); validate passes
  - **Session B done 2026-11-20: `/ship-ticket` dry run, READY** (branch `smoke/ship` off `4b5a809` + a throwaway spec `SMOKE-1.md`: `GET /api/stats` → `{books, authors}`, 3 AC; `claude --model sonnet --plugin-dir ./ticket-to-merge`, no `--allowedTools`; export `session-2-smoke-b.txt`, session `8f4de772-…`). **$1.38** (from the `/usage` text pasted in the walkthrough; the screenshot first saved under this name was the build session’s, renamed `session-2-build-usage.png`: $3.04, Opus $3.01 + Haiku $0.03, 9m 26s API, exported to `session-2-build.txt`) (Sonnet $0.80, Opus $0.58, Haiku $0.008), API 3m 48s, wall 6m 15s; main cache 97%, 33 requests, no misses:
    - Commits per stage with the right paths: red `cdfc821` (tests/ + plan.md), green `d9ec1b6` (src/ only), summary `552cfcd`. RED clean first time (0 red fix rounds), green with 0 test fix rounds; 18/18 after
    - Review via the skill (base = START, spec = `plan.md`): 0 findings, verifier skipped (raw 0), `review-1.json` = `[]`. Fix loop: $0 (nothing to fix)
    - **Done gate in a real run:** `gate.log` = 9 × `skip-workers-running` (one per wait, 3 during the review), then `pass-done`; `.ttm/active` gone, `gate.log` kept
    - **R3 untested:** no permission prompt, but the session ran in **auto mode** (`permissionMode: "auto"` on every turn), whose classifier approves safe git commands itself, so it can't show whether the skill's `allowed-tools` grant survives background waits. Mitigated: run 1 and the README use `--allowedTools`. **Run 1 and run 2 use the same permission mode (auto)**, noted in each cost table (the classifier adds small Haiku calls and can refuse commands)
    - **Deviation surfaced, reviewers kept blind (decision):** the implementer changed `createBook` to bind `?? null` for optional fields (AC-2's POST with only title + author hit a pre-existing 500: sql.js rejects `undefined`). Reported under DEVIATIONS → the orchestrator put it under Open in `run.md`; reviewers saw it in the diff and correctly didn't flag it. Unlike week 2, reviewers never get the implementer's DEVIATIONS: adversarial review sees only the diff, the spec/plan and the checklist, not the author's justification (Week 4: "the author shouldn't grade its own work"); the human reads the rationale in `run.md`. Revisit only if a deviation hides a real bug
- [x] `stage-costs.mjs` on the smoke session; total matches `/usage`. Done 2026-11-21 in a fresh build session (`ticket-to-merge/scripts/stage-costs.mjs`, 377 lines, Node ESM, no deps). `node ticket-to-merge/scripts/stage-costs.mjs <session-id|main.jsonl> [--expect <usd>] [--out <file.md>]` → the brief's stage table, a per-agent table, per-model totals in /usage units, and an expect check (exit 1 over 3%). Checks:
  - **A5 (`21f3c8b9-…`, /review-pr via -p): $1.1910 = `review-p.json` exactly**, every token count and the 5m/1h split matching `modelUsage` (Sonnet $0.1892, Opus $1.0019). All Review
  - **Session B (`8f4de772-…`, /ship-ticket SMOKE-1): $1.3753 vs /usage $1.38 (−0.34%)**; Opus within rounding, Haiku −$0.0004 (auto-mode classifier calls aren't in transcripts), Sonnet ~−$0.005 (likely title-generation/classifier calls, unconfirmed). 33 main calls = /usage's 33 requests. **Build $0.71 (91.8% cache) · Review $0.67 (93.6%) · Fix loop $0.00 none (review found no majors) · total $1.38 (92.5%)**. Per agent: orchestrator build turns $0.36 (21 calls, 1.29M cache read), planner $0.20, reviewers $0.10–0.15 each, scout and test-runner < $0.01
  - Decisions: dedupe by `message.id` (largest output wins); price by model family with the week 2 list prices (verified: A5's Sonnet tokens × prices = costUSD); cache-write split from `cache_creation.ephemeral_5m/1h`. **Stages from the main transcript's own tool calls:** T_review = first Skill `ticket-to-merge:review-pr` (fallback: first Agent call to a reviewer, skipped when the session is a typed `/review-pr` command, which logs no Skill call); T_fix = the Write of `tickets/*/review-1.json`. Main rows by timestamp, subagents by their first row. **If review-1.json has no majors (counted from that Write's content), rows after T_fix count as Review** and Fix loop shows "$0.00 · none (review found no majors)" (brief: "if review finds nothing, $0"); with majors (checked on a doctored copy), everything after T_fix is Fix loop
  - **Finding (answers R3 indirectly):** in A5 the main session ran Sonnet for 29 s, then **Opus** for the rest ($0.45): the skill's `model: sonnet` ended at the first background completion notice. So a completion notice counts as "your next message", and `allowed-tools` (same documented lifetime) ends there too. → `/ship-ticket` **requires** `--model sonnet --allowedTools …` at launch (already the plan); `/review-pr` still works (its git commands all run before the first wait), but the verifier launch and the output run on the caller's session model (+~$0.45 on Opus). README: start `/review-pr` with `--model sonnet` too
- [x] `claude plugin validate` passes; commit. Done 2026-11-21: validate ✔ (4 hooks, 2 skills, 9 agents; only ICON_MISSING), `test-hooks.mjs` 189/189, app suite 14/14 (base unchanged, run 1 starts green). Session costs (walkthrough session not included, as in Session 1). Sources: `/usage` where recorded; otherwise priced from the transcript with `stage-costs.mjs`, which can under-count calls that never reach a transcript (auto-mode classifier, WebFetch processing: build 1–3 came out $2.79 by script vs $3.04 by `/usage`, −8%; the /ship-ticket and /review-pr sessions were within 0.34%):

  | Session | Steps | Cost | Model(s) | Source |
  |---|---|---|---|---|
  | Hooks (`f6ad0ce9`) | 0a probe build, 0c gate fix | $0.89 | Opus | script |
  | Probe (`14344e03`) | 0b C5 timing | $0.22 | Sonnet main + Haiku sleepers | script |
  | Build (`f0051bb5`) | 1–3 agents, reviewers, /review-pr | $3.04 | Opus (+ Haiku $0.03) | `/usage` (`session-2-build-usage.png`) |
  | Build (`7ab19d0b`) | 4 /ship-ticket + done marker | $2.06 | Opus | script |
  | Build (`f63e101a`) | 6 stage-costs.mjs | $1.48 | Opus | script |
  | Smoke A (`9e0990b6`) | C8, C2, /review-pr interactive | $1.14 | Sonnet main + Opus reviewers | script |
  | Smoke A5 (`21f3c8b9`) | /review-pr via `-p` | $1.19 | Opus $1.00 + Sonnet $0.19 | `review-p.json` (exact) |
  | Smoke B (`8f4de772`) | /ship-ticket SMOKE-1 dry run | $1.38 | Sonnet + Opus + Haiku | `/usage` (pasted) |
  | **Session 2 total** | | **≈ $11.40** | | |

  Exports saved: `session-2-build.txt`, `session-2-smoke-a.txt`, `session-2-smoke-b.txt`; the others are only in `~/.claude/projects/…` (ids above). Walkthrough session (this guide, Opus, 130 requests, 40.2M cache read, 2h 23m wall): **$13.80** (`/usage`, `session-2-walkthrough.png`, export `session-2-walkthrough.txt`), more than all build and smoke sessions together. Running total with Session 1 (its walkthrough not counted): ≈ $31 of the ~$50 budget (Session 0 not counted). Remaining planned spend: run 1 + run 2 (~$3–5), planted-bug evals (18 reviews × ~$0.75–1.19 ≈ $14–21), stretch B; so walkthrough sessions must get cheaper (shorter, or on Sonnet)

### Session 3 (Sun AM): run 1 (before)
- [x] **Launcher scripts for measured runs.** Done 2026-11-21 in a fresh build session: `ticket-to-merge/scripts/ship.sh [-p] [--budget <usd>] [--dry-run] [spec] [-- extra]` and `review.sh [-p] [--budget <usd>] [--dry-run] [base] [spec] [-- extra]`. They launch `claude --model sonnet --plugin-dir <abs plugin dir> --allowedTools <rules> -- "/ticket-to-merge:<skill> …"`; `-p` adds `--output-format json --max-budget-usd` (default 6 ship / 3 review). Why: a background completion notice ends a skill's `model` and `allowed-tools` (Session 2, R3), so measured and unattended runs need both at launch; normal interactive use doesn't (plain `claude --plugin-dir`, approve the git prompts once). `review.sh` keeps the main session on Sonnet after the reviewers report back (+$0.45/review on Opus otherwise), so Session 4's eval runs are comparable. Decisions:
  - **`--` before the prompt:** `--allowedTools` is variadic in 2.1.330, so without it the prompt would be read as one more rule. Verified with a real call (`claude -p --model haiku --allowedTools … -- "…"` → prompt received, exit 0)
  - Rules hardcoded (11 for ship = ship-ticket's + review-pr's Bash entries; 4 for review), and **checked against the skills' `allowed-tools:` lines on every run, `--dry-run` included: a mismatch prints the diff and exits 3** (scripts and skills disagree; fix one of them)
  - No permission mode set (runs inherit the user's; run 1 and run 2 both auto). The exact command is printed to stderr, one argument per line; `--dry-run` prints and exits 0; `CLAUDE_BIN` overrides the binary (tests). Plugin dir resolved through symlinks
  - Errors exit 2: missing spec, `--budget` without `-p`, non-numeric budget, unknown option, a second spec, review.sh spec without base
  - Checks: `bash -n` under bash 5.2 and macOS bash 3.2; dry runs; a stub `CLAUDE_BIN` run from `/tmp` (each rule arrives as one argument, plugin dir absolute); drift on a scratch copy → exit 3; validate passes. shellcheck not installed
- [x] Branch `capstone/run-1` from `capstone/book-101`; delete `bookshelf.db`; start with `ticket-to-merge/scripts/ship.sh` (it adds `--model sonnet` and the `--allowedTools`). Done 2026-11-21: `capstone/run-1` off `4ae8fe7`, Smoke B's gate log moved to `.ttm/gate-smoke-b.log`, no `tickets/` folder before the run, `ship.sh` with no arguments (spec defaults to `SPEC.md`), session `6707370a-…`, **auto mode** (from the transcript)
- [x] `/ticket-to-merge:ship-ticket SPEC.md`, answer its stops; record answers (run 2 repeats them). Done 2026-11-21: **READY** in 19m 42s wall / 10m 8s API, no permission prompts, no extra turns typed. Commits: red `6b77b67` · green `fcf965c` · summary `f383d27` (+ cost table `75c6790`). Fix rounds: **red 1/2** (two RED-WRONG AC-3 tests fixed by the test-writer) · tests 0/2 · review 0/2 · **planner revisions 1**. Review round 1: **0 findings** (raw 0 from 3 reviewers, verifier skipped; spec = `plan.md`). `gate.log`: 11 × `skip-workers-running`, 1 `pass`, then `pass-done`; marker gone. 7 PASSES-ALREADY (AC-1, AC-2, 2 × AC-4, AC-5 on the model's old LIKE; AC-7 route order; AC-18 home page), all legitimate. **Answers (run 2 gives the same ones):**
  1. "Where should matching run?" → **Unicode `lower()` UDF in sql.js** (my choice, *not* the planner's recommended JS filter → the planner revision)
  2. "Where should the shared validator live?" → **`parseSearchQuery` in `src/models/book.ts`** (Recommended)
  - Result: `ulower` UDF (`String.toLowerCase`) registered in `initDb` and again after `db.export()` in `saveDb` (export drops functions; implementer deviation, with the `create_function` typing in `src/types/sql.js.d.ts`, the one file outside SPEC's "Files likely touched"); `instr(ulower(col), ulower(?))` (wildcards literal, `?` only); `parseSearchQuery` (non-string → 400, trim, code-point length); shared `search-results.ejs` partial with `hx-on::before-swap` letting 400 swap, `hx-swap="outerHTML"`
  - For Session 4: one test is named after the implementation (`AC-3: ulower is registered after every initDb`), so the test-writer used the plan's implementation choice. Not a finding (it's a test), but say so in the design section. AC-19 has no test of its own (its proof is the existing test files staying unchanged)
- [x] `/usage` screenshot, `/export`, `stage-costs.mjs` → `tickets/BOOK-101/costs-run-1.md`; fix rounds noted. Done 2026-11-21. `/usage` **$2.83** (text pasted in the walkthrough; screenshot `screenshots/session-3-run-1-usage.png` pending); export `session-3-run-1.txt`. Script **$2.80, −0.98%** (Haiku/Sonnet calls that never reach a transcript: classifier, title). Main cache 97%, 40 requests, no misses:

  | Stage | Cost | Cache hit | Models |
  |---|---|---|---|
  | Build | $1.41 | 90.5% | Sonnet $0.84 · Opus $0.55 · Haiku $0.02 |
  | Review | $1.39 | 91.9% | Opus $0.70 · Sonnet $0.69 |
  | Fix loop | $0.00 | n/a | none (review found no majors) |
  | **Total, one ticket** | **$2.80** (/usage $2.83) | **91.0%** | Sonnet $1.53 · Opus $1.25 · Haiku $0.02 |

  Biggest lines: review main session (Sonnet) **$0.69**, 34k output tokens in 2m 22s before the reviewers started (the diff written into 3 briefs); 3 Opus reviewers $0.70 together (security only 2 calls, 9 s, 475 output tokens: check its recall in Session 4); build orchestrator $0.50; planner $0.55 over 2 runs (the revision my answer caused)
- [x] `npm run test:run` green (screenshot); manual check in the browser (`npm run build && npm start`). Done 2026-11-21 on `capstone/run-1`: **44/44, 6 files** (`screenshots/session-3-run-1-tests.png`; usage screenshot `session-3-run-1-usage.png` saved too), `tsc --noEmit` exit 0. SPEC step 2 (curl, by me): all 5 checks as specified, plus `q[x]=1` → 400 single-string, HTML 101 chars → 400 `<p class="error">` inside `#search-results`, `<script>` escaped in `.no-results`. **SPEC step 3 (browser, me): pass** (weir 2 cards, clear → 50, 101 chars → red error in the results, then dune works, `<script>` shown as text). **AC-18's swap is now proven.** Step 4 (scope): `seed.sql`, `schema.sql`, `package.json` unchanged; the only file outside "Files likely touched" is `src/types/sql.js.d.ts` (typing for `create_function`). README note: port 3000 was taken by Docker here, so the server ran with `PORT=3100` (`src/server.ts` reads `PORT`)
- [x] Pick the lever from the per-stage table. Done 2026-11-21: **diff by path** (my pick out of: diff by path, reviewer effort → medium, planner → Sonnet, one reviewer). Evidence from run 1's main transcript: the 3 reviewer Agent calls carried **21.4k characters each** (the full diff pasted into every brief), streamed one after another (12:37:44 → 12:39:10), so the `/review-pr` main session (Sonnet) spent $0.69 and 2m 22s mostly typing the diff 3 times; the verifier brief pastes it a 4th time whenever there are findings (every planted branch). The reviewers' own $0.70 is mostly cache writes of that same input (output only 6.8k tokens), so effort → medium would save ≈ $0.05–0.15; planner → Sonnet only touches the build stage; one reviewer undoes the recall design. Change (Session 4, **after** the before-lever planted runs, one commit):
  - `review-pr/SKILL.md` step 3.4: `git -P diff --output=<file> <sha> EXCL` (git writes the file itself: no shell redirect, so the existing `Bash(git -P diff *)` rule still matches and the launchers' rule lists don't change); briefs in steps 4 and 6 carry `Diff: Read <file>` instead of the diff. Reviewers and verifier get exactly the same diff text, so quality should hold; that is what the re-check measures
  - To settle when building it: where the file goes (inside the repo, e.g. `.ttm/review-<session>.diff`, excluded from the diff and untracked list, vs a temp dir that a subagent's Read might need a permission for in `-p`), the session-unique name (`${CLAUDE_SESSION_ID}` substitution?), and the README wording ("/review-pr writes nothing" becomes "writes only its diff file")
  - Expected: ≈ $0.35–0.45 less per review and ~2 min shorter review stage; run 2's Review row and Session 4's after-lever eval runs show the real number
- Session 3 costs (sources: `/usage` text pasted in the walkthrough; screenshots where saved):

  | Session | Steps | Cost | Model(s) | Source |
  |---|---|---|---|---|
  | Launchers build | ship.sh, review.sh | not recorded (in Session 2's walkthrough period) | Opus | — |
  | Run 1 (`6707370a`) | /ship-ticket BOOK-101 | $2.83 | Sonnet $1.56 · Opus $1.25 · Haiku $0.02 | `/usage` (`session-3-run-1-usage.png`); script $2.80 |
  | Walkthrough (this guide) | run 1 checks, verification, lever | $2.07 | Opus (+ Haiku $0.0005) | `/usage` text (no screenshot); export `session-3-walkthrough.txt`; 28 requests, 96% cache, 4m 46s API / 31m 11s wall |
  | **Session 3 total** | | **$4.90** | | |

  Running total ≈ $36 of ~$50 (Sessions 1–3 incl. their walkthroughs except Session 1's; Session 0 not counted). The walkthrough cost dropped from $13.80 (Session 2) to $2.07

### Session 4 (Sun PM): planted bugs + lever
- [x] Claude proposes the bug list (table above); **I pick** the set and the clean traps; write why each one is there. Done 2026-11-22: **8 plants (4 + 4) + a clean branch**, all patches on run 1's implementation (`capstone/run-1` 75c6790, `src/` + `tests/` only). Every plant breaks the plain 5-AC ticket (checklist T1–T5), so it is a bug without a spec:

  | # | Branch | Plant | Where | Breaks | Why it's there |
  |---|---|---|---|---|---|
  | P1 | a | SQL built with a template literal + hand-rolled `'`→`''` escaping | `book.ts` searchBooks | T4 | The classic; injection tests still pass, so only reading the code catches it |
  | P2 | a | Length checked on the raw value, before trim | `book.ts` parseSearchQuery | T3 | Order bug: 100 chars padded with spaces → 400 |
  | P6 | a | HTML route renders no books for an empty query (`query ? search : []`) | `books.ts` | T2 | Bug on one of the two routes only |
  | P7 | a | `<%- query %>` in the no-results line | `search-results.ejs` | XSS | Headline security bug, next to the `<%- include %>` trap |
  | P3 | b | `>=` off-by-one; the "100 chars" tests send 99 | `book.ts` + tests | T3, T5 | A test that pins the bug (B10) |
  | P4 | b | Author match case-sensitive (`instr(author, ?)`, title still folds) | `book.ts` searchBooks | T1 | Subtle: half the fold is there |
  | P9 | b | typeof check removed, `(raw as string).trim()` | `book.ts` parseSearchQuery | T3 | `?q=a&q=b` → 500 with a stack trace (crash ≠ validation error) |
  | P11 | b | `search-api.test.ts` reuses `/tmp/test-api.db` (api.test.ts's path) | tests | test isolation | Parallel files clobber each other's DB; the only test-only plant |

  Decisions:
  - **Clean traps:** `planted/clean` = run 1 unchanged. Traps already in it: template literal in the length error message, `<%- include %>`, the `ulower` UDF, inline `hx-on::before-swap` JS, `[...q].length`. Every non-planted line of `a`/`b` is clean code too
  - **Base `upstream/main` 0e6fb66, no SPEC.md, no CLAUDE.md:** exactly the graders' base (Alex's repo has neither; `src/`/`tests/` identical to our `main`). Reviewers use the checklist's 5-AC fallback. `/review-pr`'s default base still works: merge-base with `main` = 0e6fb66. Each branch is **one commit** with a neutral message (nothing in git names a plant)
  - **Green suite on every planted branch:** only the tests that would expose a plant are dropped or bent (P2: padded/150-space cases; P3: 100 → 99; P4: `HERBERT`/`weir` → `Herbert`/`Weir`; P6: AC-14; P7: AC-17; P9: AC-10); the bent test lines are extra locations of the same plant in `answers.json`. The reviewer must read the code, not spot a red test
  - **Scoring:** file + line ±3 **and** a per-plant keyword regex (P3/P9 are 1–2 lines apart in `parseSearchQuery`); each finding hits at most one plant; recall = found ÷ 8 per run; unmatched findings labelled real/false by hand
  - **Eval runs** from sibling worktrees (outside the repo, so no ancestor CLAUDE.md loads) with `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (worktrees share this repo's auto memory, which describes the capstone)
- [x] Patches + `answers.json` + `make-branches.sh` + `score.mjs`; create `planted/a`, `planted/b`, `planted/clean`. Done 2026-11-22 in a fresh build session, in `ticket-to-merge/evals/planted/`. Branches (one commit each on 0e6fb66, message "BOOK-101: search books by title or author", ids reproducible on rebuild): **clean `7863a01`** 44/44 · **a `87d9b58`** 42/42 · **b `f9cef9b`** 42/42 (3 runs, P11 never flaked); tsc exit 0 on all; same 10 files on each. Plant lines (checked against the branches): P1 `book.ts:39–42` · P2 `book.ts:31–34` · P6 `books.ts:18` · P7 `search-results.ejs:5` · P3 `book.ts:29` · P4 `book.ts:39` · P9 `book.ts:28` · P11 `search-api.test.ts:7`. `score.test.mjs` 72 passed, 0 failed (mutations ±4 tolerance and greedy matching both caught). Decisions:
  - Tests bent beyond the plan's list, by the green-suite rule: P4 also breaks AC-3 (`MIÉVILLE`/`miéville` only match via the author) → bent to `Miéville`, lower-case case dropped; P9 also breaks the `q=a&q=b` parts of HTML AC-16 and AC-18 → dropped
  - `make-branches.sh`: temp worktree, `node_modules` symlinked, writes the branches only if all three are green; refuses existing branches without `--force` (exit 1); bash 3.2-safe
  - `score.mjs`: findings assigned by maximum matching (nearest line first), so a P3/P9-ambiguous finding can't steal a plant; labels may omit `run` (applies to every run of the branch); unused labels listed; `--answers` option. Test-gap findings on dropped tests usually land outside the `also` ranges → unlabelled → labelled real by hand (precision, not recall)
  - **P1 is valid SQLite escaping** (`' OR 1=1 --` really returns `[]`); it is still a T4 violation by the checklist's plain meaning. Concrete failure if asked: `?q=dune%00` → 500 on planted/a. Kept as is; whether the verifier keeps it is part of the measurement
  - Note (Session 3): the plugin isn't on `main`, so a planted branch off `main` has no `ticket-to-merge/`. Run reviews from a `git worktree` of the planted branch, calling the `capstone/book-101` checkout's `scripts/review.sh` (it resolves the plugin dir from its own location). Check before the first eval run
- [x] `/review-pr` 3× per branch → recall/precision (before the lever). Done 2026-11-22: 9 runs, all `success`, 0 permission denials, every brief pasted (19,058–20,642 chars). Report `ticket-to-merge/evals/planted/results/before/report.md`:

  | | a (P1 P2 P6 P7) | b (P3 P4 P9 P11) | clean |
  |---|---|---|---|
  | Findings per run | 4 · 6 · 6 | 6 · 4 · 4 | 0 · 0 · 0 |
  | Recall | 4/4 × 3 | 4/4 × 3 | n/a |
  | Precision (labelled) | 100% × 3 | 100% × 3 | no findings |
  | Raw → dropped by verifier | 8→4 · 8→2 · 7→1 | 7→1 · 7→3 · 7→3 | 0 (verifier skipped) |
  | Cost per run | $1.38 · $1.38 · $1.38 | $1.39 · $1.37 · $1.37 | $1.00 · $0.86 · $1.00 |
  | Main session (Sonnet) | $0.80 · $0.74 · $0.81 | $0.77 · $0.76 · $0.77 | $0.60 · $0.54 · $0.59 |

  **Recall 8/8 in all 3 runs (100%), pass^3 for every plant, precision 100%, 0 false positives on clean. $11.12 for 9 reviews (mean $1.24).** Decisions and observations:
  - Labels (my calls): clean's pilot finding (T1 partial untested, real) and a's "no HTML-route test for empty q" (`search-html.test.ts:26`, real: AC-14 was dropped for P6's green suite, outside P6's `also` range), both in `results/labels.json`, every run of the branch. Duplicates on the bent tests (P2, P3, P4) count as real
  - **The main session is ≈ 58% of every review** ($0.54–0.81) and the 3 reviewer launches are spread over 80–86 s of typing (wall 162–167 s clean, 262–290 s a/b). **Retyping isn't byte-exact:** briefs for the same diff vary by up to 160 chars; a-3's main session noted it left out a diff line (not re-run), b-2's corrected one by SendMessage (reviewer re-ran, same findings). Both are extra arguments for diff by path
  - Ceiling: 100% recall before means the after batch can only hold or drop (Week 3: "1.0 with and without → harder case"); it's a regression check here. For the README: n = 8 plants × 3 runs is small (Week 3 sample-size slide)
  - `duration_ms` in the `-p` JSON is only the last turn (1–8 s); wall times come from the transcripts. Glob missing in the main session and an occasional ToolSearch: cosmetic, no effect
  - Setup 2026-11-22: worktrees `~/Development/Repositories/agent_bookshelf-wt/{clean,a,b}` (siblings of the repo, so no ancestor CLAUDE.md); each run `cd <wt> && CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 <repo>/ticket-to-merge/scripts/review.sh -p > results/before/<branch>-<n>.json`, fixed order clean-1, a-1, b-1, clean-2, … b-3 (same order after the lever)
  - **Pilot (clean, session `5117550a`, $0.62, 0 findings): the main session summarized the diff instead of pasting it.** Briefs were ~1.4k chars (run 1: 21.4k), "Read the changed files in full" plus a Sonnet summary with judgments ("instr(ulower(title), ulower(?)) **with bound params**"), and it added an invented note ("reviewers had no Bash…"). Otherwise fine: the checklist Read from outside the worktree worked, no permission denials, script = JSON cost exactly. Also seen: Glob doesn't exist in the `-p` main session ("No such tool available"), the skill fell back to Read (a few extra turns, no effect on the result; left as is)
  - **Decision: fix the wording before the batch** (my call over "run as-is"): `review-pr/SKILL.md` steps 3–6 now say the diff goes into every brief **verbatim**, never summarized or characterised; only large mode replaces it. Why: so the lever changes one thing (who types the diff), with the same diff text for the agents before and after, and "before" = run 1's behaviour (pasted). It is a bug fix to the skill's own spec, not a second lever; the lever replaces this text. Every run's brief size is checked (≈ 21k chars = pasted). Pilot output kept in `results/pilot/clean-1-summarized.json`, not scored
  - **Pilot 2 (session `9692cd0a`, $1.36): diff pasted** (3 × 20,634 chars, verifier 21,401; typing them took 2m 11s, 21:18:15 → 21:20:26: the lever's target again). Review done at 21:22: **1 minor finding**, kept by the verifier: `tests/models/book-search.test.ts:24`, no test sends a word fragment, so a whole-word matcher passes the suite (T1 "partial" untested). **Labelled real** (my call; T5), in `results/labels.json` for every clean run. **But** while waiting, the main session called **ScheduleWakeup** (1200 s "fallback"); `-p` waited for it, the wakeup re-invoked the skill (refused), and `.result` became that closing message, not the review. Same CLI as run 1 (2.1.330); run 1 just never called it
  - **Decision: `review.sh` and `ship.sh` launch with `--disallowedTools ScheduleWakeup`** (my call: both, so run 2 can't hit a 20-min tail either). Checked: a Haiku `-p` call lists ScheduleWakeup without the flag, not with it; dry runs and `bash -n` pass. A launcher fix, identical before and after, not a lever. Pilot 2 kept as `results/pilot/clean-1-wakeup.json`; clean-1 re-run. README: interactive `/review-pr` can schedule a harmless wakeup too
- [x] Apply the lever (one change, one commit); branch `capstone/run-2` from the **same base** as run 1; repeat Session 3's steps with the same answers. **Run 2 done 2026-11-23** (UTC; Sun evening local): `capstone/run-2` off `b78f0a7`, run 1's gate log moved to `.ttm/gate-run-1.log`, `bookshelf.db` deleted by me, no `tickets/`, `ship.sh`, auto mode, session `720d56e7`. **READY** in 10m 21s wall / 7m 41s API (run 1: 19m 42s / 10m 8s). Commits: red `1180a72` · green `3a5b040` · summary `3ae8a7f` · costs `f12eb33`. Fix rounds: red 0/2 (run 1: 1) · tests 0/2 · review 0/2 · planner revisions 1 (same as run 1). Review round 1: 0 findings, verifier skipped. `gate.log`: 10 × `skip-workers-running`, then `pass-done`; marker gone. 9 PASSES-ALREADY (7 model tests on the old LIKE, AC-18 home page, AC-19), all legitimate. Answers:
  1. "How should matching get Unicode case folding and literal %/_/\?" → **register JS lower() in sql.js** (same as run 1, not the recommendation → the revision; named `ulower` again)
  2. "Where should the shared validator live?" → **`src/models/book.ts`** (Recommended, same as run 1)
  3. **New in run 2:** "Does `.no-results` get a CSS rule?" → **No rule** (my call, not the recommendation: matches run 1's result, which left `style.css` alone; smallest change; rode along in the same revision). Planner non-determinism: the same SPEC produced a third question
  - Costs (`/usage` **$2.45**, script $2.44, −0.28%; `tickets/BOOK-101/costs-run-2.md`):

    | Stage | Run 1 | Run 2 | Cache hit (run 2) | Models (run 2) |
    |---|---|---|---|---|
    | Build | $1.41 | $1.49 | 89.7% | Sonnet $0.89 · Opus $0.59 · Haiku $0.02 |
    | Review | $1.39 | **$0.95 (−32%)** | 93.3% | Opus $0.67 · Sonnet $0.28 |
    | Fix loop | $0.00 | $0.00 | n/a | none (no majors either run) |
    | **Total** | **$2.83** | **$2.45 (−13%)** | 91.1% | Opus $1.26 · Sonnet $1.17 · Haiku $0.02 |

    Review main session (Sonnet) **$0.69 → $0.28**, 2m 22s of brief typing → the 3 reviewers launched in the same second (02:45:40). Reviewers $0.67 (run 1 $0.70). Build moved +$0.08 with no lever there: planner 2 runs $0.59 (run 1 $0.55), orchestrator $0.56 (run 1 $0.50); run-to-run noise
  - Verification (same as run 1): suite **51/51**, tsc exit 0; curl (PORT=3100) all 5 as specified; **browser pass** (weir 2 · clear 50 · 101 chars red error in results · then dune works · `<script>` as text); scope: `seed.sql`, `schema.sql`, `package.json` unchanged, and unlike run 1 **no file outside "Files likely touched"** (the `create_function` typing is a local cast, no `src/types/sql.js.d.ts`)
  - Differences from run 1 worth a line in the README: no test named after the implementation (run 1's `AC-3: ulower is registered…`), AC-1's test checks a *partial* title (the gap the clean pilot found in run 1's tests). Test-runner quirk: RED printed `STATUS: FAIL` with 0 RED-WRONG, no failures, 14/14 pre-existing, tsc OK; the orchestrator applied the definition (= PASS) and made the red commit
  - `/usage` screenshot `screenshots/session-4-run-2-usage.png`; export `session-4-run-2.txt` (gitignored)
  - **Lever committed `8f9bffd`** (built in a fresh build session, checked here; 7 files, +29 −17). Decisions: diff file = `$(git rev-parse --absolute-git-dir)/ttm-review-${CLAUDE_SESSION_ID}.diff` (my pick over `.ttm/` and a temp dir: never in the diff or the untracked list, per worktree, nothing left in a grader's tree, existing rules cover both commands); normal mode `git -P diff --output=<file>`; the main session never opens the file; briefs carry `Diff: Read <file> in full (--stat: …)`; large mode unchanged. Agents: "the diff file named in your brief (continue with offset if one Read doesn't return it all)". ship-ticket: its "write only" rule and step 6 allow that one file. README wording: "/review-pr writes only its diff file, inside .git/, never the working tree" (each session leaves one small file in `.git/`; later rounds of the same session overwrite it). Checks: validate ✔, both launcher drift checks exit 0 (rules unchanged), `test-hooks.mjs` **197 passed, 0 failed** (+8: the `--output` command and Reads of the file allowed, a reviewer's Write/git of it blocked), the real command in `wt/a` → 513 lines, byte-identical (`cmp`) to stdout, `git status` clean
  - Base check for run 2: `git diff 4ae8fe7 HEAD -- src tests SPEC.md CLAUDE.md package*.json .claude .gitignore` is empty. Besides `homework/`, only `ticket-to-merge/` differs from run 1's base: evals/, the launchers' ScheduleWakeup deny, and the lever (the bb1fca3 "verbatim" wording is replaced by it)
- [x] Re-check quality: tests green, fix rounds, planted bugs 3× again → "same numbers, or what moved". Done: run 2 green (51/51, tsc 0, browser + curl pass), fix rounds equal or fewer (red 1 → 0, others 0), review 0 findings both runs; planted bugs below. **Verdict: same quality numbers; review cost −32% in the pipeline and −40% standalone, review time −60%**
  - **Planted, after the lever: done 2026-11-22** (same worktrees, order and command; `results/after/report.md`). 9/9 `success`, 0 denials, **every agent Read the diff file** (33/33 agents: 6 a/b runs × 4 + 3 clean runs × 3, verifier skipped on clean; checked in Session 5 from the `Read` tool calls in the subagent transcripts; the earlier "36/36" was a miscount); briefs 1,109–1,126 chars (verifier 5.2–6.9k: findings only), were 19–21k:

    | | Before (`results/before`) | After (`results/after`) | Moved |
    |---|---|---|---|
    | Recall a + b (÷ 8) | 8/8 · 8/8 · 8/8 | 8/8 · 8/8 · 8/8 | same, pass^3 every plant |
    | Precision | 100% (2 hand labels) | 100% (no labels needed) | same |
    | Clean false positives | 0 · 0 · 0 | 0 · 0 · 0 | same |
    | Raw → dropped (a; b) | 8→4, 8→2, 7→1; 7→1, 7→3, 7→3 | 8→4, 9→5, 8→4; 7→3, 7→1, 7→1 | verifier still does the precision work |
    | Cost per review (a / b / clean) | $1.38 / $1.38 / $0.95 | $0.84 / $0.81 / $0.56 | **−40%** |
    | Main session (Sonnet) | $0.54–0.81 | $0.19–0.26 | **−68%** |
    | Agents (Opus) per a/b review | ≈ $0.60 | ≈ $0.58 | same (they Read the same bytes) |
    | Wall time a/b · clean | 262–290 s · 162–167 s | 107–116 s · 46–55 s | **−60%**; launches spread 80–86 s → 6–7 s |
    | Batch total | $11.12 (mean $1.24) | $6.62 (mean $0.74) | −$4.50 |

    **Same numbers on quality; cost and time moved.** Caveat for the README: recall was already at the ceiling, and n = 8 plants × 3 runs is small, so "held" means no regression seen, not proof of equality. The two before-batch "real but not planted" findings (test gaps on bent tests) didn't recur; findings differ only in duplicates
- [x] Merge the chosen run into `capstone/book-101`. Done 2026-11-23: **run 2** (my pick: after-lever plugin, 51 tests, in SPEC scope, no implementation-named test), fast-forward of `capstone/book-101` to `capstone/run-2` (it was book-101 + the run's commits). `capstone/run-1` stays as evidence

- Session 4 costs (sources: `-p` JSON `total_cost_usd`, `/usage`, or `stage-costs.mjs` on the transcript; the script can under-count calls that never reach a transcript, 0.3–8% so far):

  | Session | Steps | Cost | Model(s) | Source |
  |---|---|---|---|---|
  | Plants build (`c38e7de9`) | patches, answers, make-branches, score.mjs | $3.63 | Opus | script |
  | Pilots (`5117550a`, `9692cd0a`) | summarized diff; wakeup tail | $1.98 | Sonnet main + Opus agents | `-p` JSON |
  | ScheduleWakeup check | 2 Haiku `-p` calls | < $0.05 | Haiku | not priced |
  | Before batch | 9 × /review-pr | $11.12 | Sonnet main + Opus agents | `-p` JSON |
  | Lever build (`bba4f51c`) | diff by path | $1.38 | Opus | script |
  | After batch | 9 × /review-pr | $6.62 | Sonnet main + Opus agents | `-p` JSON |
  | Run 2 (`720d56e7`) | /ship-ticket BOOK-101 | $2.45 | Sonnet $1.17 · Opus $1.26 · Haiku $0.02 | `/usage` (`session-4-run-2-usage.png`) |
  | Walkthrough (`0a2d8d06`, this guide) | all steps, checks, bookkeeping | $7.50 | Opus (+ Haiku $0.0005) | `/usage` (`session-4-walkthrough.png`: 77 requests, 97% cache, 1 miss, 14m 14s API / 6h 15m wall); script $7.29 (−2.8%); export `session-4-walkthrough.txt` |
  | **Session 4 total** | | **≈ $34.70** | | |

  Running total ≈ $70 (Sessions 1–4 incl. their walkthroughs except Session 1's; Session 0 not counted); over the original ~$50, by my call at the end of Session 3 (budget not a constraint). The eval batches were $17.74 of it; the lever saves ≈ $0.50 per standalone review from here on

### Session 5 (Mon): stretch B (only if all green) + README + submit
- [x] *(Stretch B)* `evals/review-pr/` cases built from the planted patches (scaffold: `git init`, base commit, apply patch); prompt that doesn't name the skill; regex graders per planted bug; with vs without arms (`--max-cost-usd`, `--threshold 0.8`, pinned `--model` and `--judge-model`); report Δ. Done 2026-11-23 (suite `65b8d79`, fix `18fe623`, results + README section with the Session 5 README commit). Decisions:
  - **Cases:** a, b, clean; workspace = fresh git repo, `main` = tree of 0e6fb66, checked-out branch = tree of `planted/<x>` (tree hash checked), via `git archive` from this repo; no plugin, SPEC.md, CLAUDE.md or node_modules
  - **Prompt (my pick):** the same for both arms, with the ticket's 5 AC and constraints, asking for `{file, line, severity, issue, evidence}` JSON; doesn't name the skill. So Δ measures the review method, not knowledge of the ticket
  - **Graders:** regex only, no judge. One per plant: file + **line ±3** (main and `also` ranges, my pick after the probe: without it a finding could earn credit for the wrong plant) + keyword from answers.json; JSON tokenizing so braces in evidence don't break it. Agrees with `score.mjs` on all 18 recorded replies (own case). clean: no-major (3) + empty-array (1); json-array (1) everywhere; skill-fired as a with-only indicator
  - **Flags:** `--model claude-sonnet-5-5` (main session, like review.sh), `--disallow-tools ScheduleWakeup` (the pilot's wakeup tail can't happen), the same `--allow-tools` for both arms (review-pr's 4 git rules + plain `git diff/log/show/status`), `-j 2`, `--keep-temp`, `--no-publish`, `CLAUDE_CODE_EFFORT_LEVEL` unset
  - **Probe** (case a, 1 run per arm, $0.92): `git -P diff --output` writes inside `.git/` in the sandbox, reviewers Read the checklist from the plugin path, Δ 0.00 (plain Sonnet found all 4 plants on a for $0.10)
  - **Eval run 1 ($3.48): found a bug.** Mean Δ −0.38: in 6/9 with-runs the Sonnet main session combined its git commands into one script with variables → no allow rule matches → denied (`dontAsk`) → it gave up ($0.08, score 0). Cause: "Batch independent commands in one turn" in review-pr/SKILL.md. **Fix `18fe623` (wording, my call over "report as is"):** one literal command per Bash call, batch = several calls in one message, a denial never ends the review; same rule in ship-ticket. Results kept in `runs/1-denials/`. The 18 Session 4 `review.sh -p` runs had 0 denials, so the bug is intermittent
  - **Eval run 2 ($7.10, 595 s): with 1.00 / 1.00 / 1.00, without 1.00 / 0.73 / 0.80, Δ a 0.00 · b +0.27 · clean +0.20, mean +0.16.** Checked in the traces: 9/9 skill fired, 0 denials, nothing read `answers.json`, every failed verdict correct (without: P11 missed 3/3, b-3 left out `severity`; clean: 2–3 minor findings per run). Cost per run with $0.67 vs without $0.12 (≈ 5.7×)
  - **Ceiling (my call: document, no harder cases today):** the with arm is 1.00 everywhere and case a is 1.00 in both arms ("1.0 with and without → harder case"). README says so; next step would be harder plants (cross-file, rule-only, subtler test gaps)
  - No-plugin minor findings on clean not hand-labelled (they don't affect the graders); the README gives its reading (`/tmp` paths and the endpoint are by design, two test gaps arguable)
- [x] README (checklist below), `claude plugin validate` screenshot. Done 2026-11-23 in a fresh build session; numbers spot-checked here against the reports, run records and `grep` of the tests. Decisions:
  - **Where:** full write-up in `ticket-to-merge/README.md` (384 lines, 11 sections in checklist order; it travels with the plugin), plus a 12-line capstone block above the banner in the root `README.md` (rest unchanged). My pick over "root, on top" and "root, replace"
  - **Branches linked:** `capstone/run-1` and `planted/{a,b,clean}` (pushed at submission, my pick); `capstone/run-2` not linked separately (it is `capstone/book-101`'s history)
  - **Screenshots:** `session-5-validate.png` (retaken after the plugin README existed, so it shows validate's new "Advice" line: no marketplace install line; verdict unchanged), `session-5-tests.png` (51/51, tsc 0), `session-5-hooks.png` (197/197)
  - **Sources:** stage rows from `stage-costs.mjs` ($2.80 / $2.44) with the `/usage` totals ($2.83 / $2.45) in their own row; plugin token costs from today's `plugin details` (~1,366 always-on, review-pr ~2.5k after the lever; the Session 2 figures were ~1,350 / ~2k); hooks table follows `hooks.json` (protect's matcher includes Grep|Glob, which this plan's table left out)
  - **Correction found:** the after batch had **33** agents that Read the diff file, not 36 (the verifier is skipped on clean). Checked from the `Read` tool calls in the transcripts; Session 4 line fixed
  - **Stated plainly as gaps:** the fix loop never ran in a measured run (0 majors in both runs, Fix loop $0.00); no unattended `/ship-ticket` run; curl/browser checks recorded only in this plan (no screenshot). AC-19 has one test of its own (route order); its real proof is the unchanged existing test files
  - Stretch section added after stretch B
  - **Rewrite (second build session, my asks):** "Run it" first for the teacher (prerequisites, review a branch that lacks the plugin via a `~/ttm` clone, ship a ticket, check the build, re-run the evals), then "Results at a glance" (one row per brief line), then each section as 3–5 visible lines with its evidence in `<details>` (14 blocks; 609 lines total, ~180 visible). Wording: run both on a **feature branch** (`/ship-ticket` commits there and refuses main; `/review-pr` compares it with its base). Cheap commands checked by the session (dry runs, --help, validate, tests, test-hooks, score.test, make-branches in a throwaway clone, the eval loop with `CLAUDE_BIN=echo`, re-scoring byte-identical to both reports)
- [x] Push (part 1): `capstone/book-101` (to `18fe623`), `capstone/run-1`, `planted/a`, `planted/b`, `planted/clean` (my pick of branches; `capstone/run-2` not pushed, it is book-101's history). Pushed by me from the prompt: the auto-mode classifier refused a 5-branch push from the session
- [ ] Push `capstone/book-101` (ask first), submit the repo link when the window opens Monday EOD

- Session 5 costs (sources: `/usage`, the eval JSON `costUsd`, or `stage-costs.mjs` on the transcript; the script can under-count calls that never reach a transcript, −2.1% on this walkthrough):

  | Session | Steps | Cost | Model(s) | Source |
  |---|---|---|---|---|
  | README v1 (`335ba641`) | first write-up + root pointer | $3.05 | Opus | script |
  | Stretch B build (`b0fa50a3`) | suite, graders, probe checks | $3.96 | Opus (+ Haiku $0.01) | script |
  | Probe | case a, 1 run per arm | $0.92 | Sonnet main + Opus agents | eval `costUsd` |
  | Line check + skill fix (`599e67ac`) | graders ±3 lines, denial fix | $1.01 | Opus | script |
  | Eval run 1 | 18 runs (6 denied) | $3.48 | Sonnet main + Opus agents | eval `costUsd` |
  | Eval run 2 | 18 runs, after the fix | $7.10 | Sonnet main + Opus agents | eval `costUsd` |
  | README rewrite (`07f14693`; `273b400c` was an empty duplicate start, $0.00) | Run it first, `<details>`, Stretch B | $4.02 | Opus | script |
  | Walkthrough (`d59b21d1`, this guide) | all steps, checks, bookkeeping | $8.62 | Opus (+ Haiku $0.0005) | `/usage` (`session-5-walkthrough-usage.png`: 85 requests, 97% cache, 1 miss, 12m 51s API / 5h 37m wall); script $8.44; export `session-5-walkthrough.txt` |
  | **Session 5 total** | | **≈ $32.16** | | |

  Running total ≈ $102 (Sessions 1–5 incl. their walkthroughs except Session 1's; Session 0 not counted). Eval runs this session: $11.50 (probe + 2 runs)

## Build-time checks (Session 0, record the answers here)

Answered 2026-11-20 by the claude-code-guide agent from the docs (code.claude.com/docs/en/…). C3 also checked on disk. Items marked **test** are not in the docs: confirm them in the Session 1–2 smoke tests.

| # | Check | If not | Answer |
|---|---|---|---|
| C1 | Can skill frontmatter pin `model`/`effort` for `/ship-ticket` and `/review-pr`? | Start with `claude --model sonnet`; say so in the README | **Yes, but only for the current turn.** `model` and `effort` are valid SKILL.md fields. They last "for the rest of the current turn"; the session model comes back on my next prompt. `effort` doesn't override `CLAUDE_CODE_EFFORT_LEVEL`. With `context: fork` they set the forked subagent's model instead. **Consequence:** `/ship-ticket` stops to ask me questions, so every answer starts a new turn on the session model. Pin `model: sonnet` in the skill **and** start with `claude --model sonnet` (README). Subagents keep their own `model`. (skills.md, Frontmatter reference) |
| C2 | Do PreToolUse hooks get `agent_type` for plugin agents inside a subagent, and in what form (`ticket-to-merge:implementer`?) | `guard-roles.js` falls back to a `.ttm/stage` file written by the orchestrator | **Partly.** Hook input carries `agent_id` and `agent_type` "when a subagent calls a tool", and plugin hooks run inside subagents. The exact string for a plugin agent is **not documented** (the only example is `"security-reviewer"`). **Test:** a PreToolUse hook that logs its stdin, one plugin-agent call. Make `guard-roles.js` accept both `implementer` and `ticket-to-merge:implementer` (hooks.md, Common input fields). **Probe (Session 2): scoped form confirmed** (`ttm-probe:sleeper` in PreToolUse) |
| C3 | Where are subagent transcripts, and which usage fields do they carry? | Use the `<usage>` block from each Agent result, logged by the orchestrator | **Yes (docs + on disk).** `~/.claude/projects/<cwd with non-alphanumerics → ->/<sessionId>/subagents/agent-<agentId>.jsonl`, with `agent-<agentId>.meta.json` (`agentType`, `model`, `requestShape` background/foreground). Each assistant row has `message.model` and `message.usage`: `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens` and `cache_creation.{ephemeral_5m,ephemeral_1h}_input_tokens`. **Gotcha:** one API call is logged as several rows (42 rows = 10 calls in the docs-check transcript). `stage-costs.mjs` must **dedupe by `message.id`**. The Agent result's `<usage>` has only `subagent_tokens`, `tool_uses`, `duration_ms` (no cost, no cache split). The format is internal and "changes between versions" (sub-agents.md, sessions.md) |
| C4 | Does `claude -p "/ticket-to-merge:review-pr"` work with `--plugin-dir`, and which `--allowedTools` does it need (`Bash(git diff *)`…)? | Natural-language prompt that triggers the skill | **Yes.** Skills you invoke yourself work in `-p` ("include `/skill-name` in the prompt"). Don't use `--bare` (plugin hooks don't run under it). Command: `claude -p "/ticket-to-merge:review-pr" --plugin-dir ./ticket-to-merge --allowedTools "Bash(git diff *)" "Bash(git merge-base *)" Read Grep Glob --max-budget-usd <n>`. Print mode denies anything that needs approval. Subagent tool calls are checked against the same rules, and subagent spend counts toward the budget (headless.md, cli-reference.md) |
| C5 | Several foreground (`run_in_background: false`) Agent calls in one message: do they run in parallel? | Lever falls back to reviewer effort high → medium | **Partly.** By default, a subagent spawned from the main session **starts in the background**. The documented setting is the agent's `background` frontmatter field; the Agent tool's `run_in_background` parameter isn't documented. Whether several foreground calls in one message run in parallel is **not documented**. **Test:** 3 agents that each `sleep 30`, timed. This decides the lever, so run it in Session 2 (sub-agents.md, foreground/background). **Probe (Session 2): parallel yes; foreground not possible** (no Agent parameter; `background: false` ignored for main-session spawns). See Session 2 |
| C6 | Stop hook input has `stop_hook_active`; plugin Stop hooks fire only for the main session (not subagents, which get SubagentStop) | Adjust `gate-done.js` | **Yes, all three.** `Stop` runs when the main agent finishes and has `stop_hook_active`. Subagents fire `SubagentStop` instead. Exit 2 blocks the stop and Claude gets stderr as the reason. Cap: 8 continuations in a row (hooks.md, Stop) |
| C7 | Plugin agents honor `tools`, `model`, `effort`, `maxTurns` (docs only say which fields are ignored) | Check `/tasks` in the smoke tests | **Yes.** Honored: `tools`, `disallowedTools`, `model`, `effort`, `maxTurns`, `skills`, `background`, `isolation`. Ignored: `permissionMode`, `hooks`, `mcpServers`, `initialPrompt` (plugins/components.md, Agents) |
| C8 | Plugin skills load as `/ticket-to-merge:ship-ticket` under `--plugin-dir`; plugin agents aren't shadowed by the week 2 project agents | Rename the plugin agents with a prefix | **Yes for namespacing; shadowing partly.** Plugin skills are `/ticket-to-merge:<skill>`, plugin agents are `ticket-to-merge:<agent>`, and `name` can't contain `:`. Precedence when names match: managed > `--agents` > `.claude/agents/` > `~/.claude/agents/` > plugin. The scoped name never matches `implementer`, so there's no clash as long as the skills always use `ticket-to-merge:<name>`. **Test:** `/agents` + one scoped call (sub-agents.md, Choose the subagent scope) |
| C9 | *(Stretch)* Granting Bash in `claude plugin eval` on macOS (sandbox) | Give the reviewers the diff in the prompt instead of Bash | **Yes.** `claude plugin eval … --allow-tools Bash "Bash(git diff *)"` or the case's `allowed_tools`; no settings file applies. Shell grants run in the OS sandbox: writes stay in the workspace, `$HOME` is unreadable, no network. The run is refused if there's no sandbox backend. `--scaffold` script runs as me outside the sandbox (minimal env, 120 s, non-zero exit fails the run). `git init` works there; `git apply` isn't documented but should work. Project config written by the scaffold isn't loaded (plugin-evals.md) |

Already known: Claude Code is 2.1.329 (`args` + `onFailure` need ≥ 2.1.295, plugin eval ≥ 2.1.269). Plugin `CLAUDE.md` isn't loaded, so instructions go in skills/agents. Hooks in `.claude/settings.json` (`protect-htmx`) keep running alongside the plugin's.

## README checklist (maps the brief's list to evidence)

| Brief line | Evidence |
|---|---|
| Repo link: fork and branch | `Relenting3/agent_bookshelf`, `capstone/book-101` |
| How to run `/ship-ticket` and `/review-pr` | Two levels. **Quick start (normal use):** `claude --plugin-dir ./ticket-to-merge`, then `/ticket-to-merge:review-pr [base] [spec]` (no prompts) or `/ticket-to-merge:ship-ticket [spec]` (approve the `git add`/`git commit` prompts once; the orchestrator may fall back to the session model after the first wait). **Measured / unattended runs:** `ticket-to-merge/scripts/ship.sh [-p] [spec]` and `scripts/review.sh [-p] [base] [spec]`, which pin `--model sonnet` and pass `--allowedTools`, with the reason (a background completion notice ends a skill's `model` and `allowed-tools`; Session 2 R3) and `--dry-run` to show the exact command. Also: `claude plugin details` token costs, read the JSON from `-p` output rather than the rendered terminal |
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

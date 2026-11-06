# Week 2 Homework Plan: Multi-Agent Flow

Source: Week 2 · Orchestration & Tokenomics (slides + transcript, 2026-11-05).

## What the homework asks

From the slide "Run it, measure it, change one thing" (show at Office Hours 2, Tuesday):

1. **A multi-agent flow**: working on a real task, with subagent files checked into `.claude/agents/`.
2. **Cost, before and after**: apply one lever. Show `/usage` numbers from both runs.
3. **A decision log**: one paragraph on why this split and what you'd cut next time.

Course context:
- Week 3 (Memory & Evals) asks for an eval set of 20+ cases and a re-run of the week 2 change: "Bring your before and after. We'll find out whether the saving held."
- Week 4 is the capstone, "Ticket to Merge", which matches my daily workflow. The agents below are designed to carry over.
- Keep both runs' outputs for week 3.

## The task

**Implement book search, end to end** (homework gap #1, `GET /books/search`; `Book.searchBooks()` already exists). It's the slides' own example decomposition.

- **No Jira-style tickets in this repo.** The input is a short task file, `homework/week-2/task.md`, with what to implement and the acceptance criteria (definition of done). I write it myself; agents don't invent the AC. A one-off prompt also works, but both runs must use **the same task file** so the before/after inputs are identical.
- CLAUDE.md rule 1 says to preserve the deliberate gaps *unless the task is explicitly that homework*. Subagents load CLAUDE.md, so **the task file and every brief must state this is the week 2 homework task**.
- Run on branches (`hw2/run-1`, `hw2/run-2`) cut from the **same base commit**. `main` keeps the gap.

## Agents

| # | Agent | Model · effort | Tools | Replaces (my manual flow) | Why this model |
|---|---|---|---|---|---|
| 0 | **orchestrator** | Sonnet · medium | `Agent`, Read, Grep, Glob, git diff/status. **No Edit/Write.** | Me, moving between sessions | Mid-level model coordinates; bigger models are used through subagents. Its context holds only summaries, so it stays cheap. |
| 1 | **scout** | Haiku · low | Read, Grep, Glob · maxTurns 15 | First half of the Opus planning session | Reads the task file and maps relevant files (≤200 words). Explore/grep/gather work is Haiku's job, and Opus never pays to browse. |
| 2 | **planner** | Opus · high | Read, Grep, Glob, Write (instructed: only `.claude/plans/`) | Opus session that writes the plan `.md` | Highest-leverage reasoning; mistakes multiply downstream. Small input thanks to the scout. |
| 3 | **implementer** | Sonnet · medium | Read, Edit, Write, Bash, Grep, Glob | Sonnet session that executes the plan | Mechanical once the plan is good. Also does fix rounds. |
| 4 | **test-writer** | Sonnet · medium | Read, Edit, Write (instructed: only `tests/`), Bash | — (new) | Writes tests from the plan's acceptance criteria without seeing the implementation, so tests check the spec rather than the code. Runs in parallel with the implementer (`src/` vs `tests/`, so no worktree needed). |
| 5 | **test-runner** | Haiku · low | Read, Bash, Grep · maxTurns 10 | — | Straight from the slide: `npm run test:run` + `npx tsc --noEmit`, returns only failures (test, error, file). |
| 6 | **reviewer** | Opus · high | Read, Grep, Glob, git diff (read-only) | My review workflow | Small input (diff + plan), so Opus is affordable, and it's the quality gate. Returns issues rated major→minor plus a READY / NOT READY verdict. Checks the CLAUDE.md rules (SQL placeholders, `.js` imports, HTML/JSON split, copy-assets). |
| 7 | **qa-tester** *(optional)* | Sonnet · medium | Chrome MCP, scoped to this agent via `mcpServers` | Test-case skill + Chrome testing | Most expensive step (screenshots), so run it only for medium or large changes. Haiku isn't reliable for multi-step browsing. |
| 8 | **pr-writer** | Haiku · low | Read, Write (instructed: only `.claude/plans/<slug>-pr.md`), Bash (for git) · maxTurns 10 · loads the `pr-description` skill via `skills:` | PR-description skill | Summarizing a diff into a template is simple work. Saves to `.claude/plans/<slug>-pr.md`. The skill doesn't exist in this repo yet and has to be built first (Session 0). |

**What stays with me:** approving the plan, answering the planner's questions, commit/push, merge and deploy.

## Flow

A linear pipeline, with one parallel step (implementer ∥ test-writer) and two retry loops.

```
task.md ──► scout (Haiku) ─► planner (Opus) ─► .claude/plans/<slug>.md + questions
                                                    │
                                        ⏸ ME: answer questions / approve
                                                    │
                          ┌─────────────────────────┴─────────────────────────┐
                    implementer (Sonnet)                               test-writer (Sonnet)
                          └──────────────── wait for both ────────────────────┘
                                                    │
                                     test-runner (Haiku) ──fail──► implementer (max 2 rounds)
                                                    │ pass
                                        reviewer (Opus) ──NOT READY──► implementer → test-runner → reviewer (max 1 round)
                                                    │ READY
                                   [qa-tester (Sonnet), if risky] ─► pr-writer (Haiku)
                                                    │
                                        ⏸ ME: review the diff, commit, push
```

## End of a run

The orchestrator stops at the "before commit" checkpoint. It never commits or pushes.

What I get:
1. Code changes, **uncommitted**, on the run branch (`hw2/run-1` or `hw2/run-2`).
2. Tests and typecheck passing (test-runner).
3. Reviewer verdict READY, plus any non-blocking minor issues.
4. PR description saved to `.claude/plans/<slug>-pr.md` by the pr-writer, ready to paste into the MR (and kept for week 3).
5. The final 5-line summary in the chat: fix rounds, verdict, test status, files changed, open items.

What I do: `git diff` → commit → push → open the MR → paste the description.

If the fix-round limits are hit, the run ends **NOT READY**: uncommitted changes plus the reviewer's open issues. I decide whether to fix them myself or re-run.

## How agents communicate and dispatch

- **Hub and spoke.** Workers never message each other directly. Each gets a brief from the orchestrator, does its job, and returns a summary. The orchestrator turns that summary into the next brief (e.g. the reviewer's major issues become the implementer's fix brief).
- **Shared files are the indirect channel.** The planner writes the plan `.md`; the implementer, test-writer and reviewer read it. Pass file paths, not pasted content, to keep the orchestrator's context small.
- **Subagents can't ask me questions.** The planner returns `QUESTIONS:` and the orchestrator stops and asks me.
- **Direct peer messaging** is a different feature, *agent teams*: experimental, off by default, and token-heavy.

**Dispatching:**
- I start the main session as the orchestrator: `claude --agent orchestrator`. It's not a subagent, so it keeps the main session's 1h cache, and its workers sit at level 1.
- A subagent can launch other subagents only if it has the `Agent` tool (or has no `tools:` line, which means all tools). Nesting goes up to 3 levels deep.
- **In this design only the orchestrator has `Agent`.** Workers list their tools explicitly without it. This avoids the agent-spawning-agent spiral, keeps every step visible in `/tasks` and `/usage`, and lets the orchestrator enforce the limits on fix rounds.
- Possible later change: let the implementer call the test-runner directly (level 2). The trade-off is that the orchestrator only sees the implementer's final summary.

## Design rules

- **Every brief uses the slide's format:** Task / Context / Constraints / Return, with a cap on the reply (e.g. "≤150 words, no transcript"). Each agent file also fixes its own return format.
- **Hard caps:** `maxTurns` on every agent, limits on fix rounds (2 for failed tests, 1 for review), and the orchestrator never edits code or commits.
- **Rules that must reach a subagent go in its agent file or the brief.** Subagents don't see the conversation, files the parent already read, or auto-memory.

## Cost, before and after

"Before" is the flow **as designed**, not a deliberately expensive version. "After" is **one** change aimed at the biggest cost.

1. **Run 1 (before):** the flow exactly as in the table above.
2. **Read the `/usage` breakdown:** which subagent costs the most, the cache hit rate and misses, and the number of fix rounds.
3. **Pick one lever** that targets the biggest cost:

| If `/usage` shows… | Lever | Change for Run 2 |
|---|---|---|
| Planner or reviewer (Opus) dominates | Effort per agent ("thinking bills as output") | Planner or reviewer from `high` to `medium` |
| Reviewer dominates and the diff is small | Model per agent | Reviewer from Opus to Sonnet (the instructor's code-reviewer vs simple-code-reviewer example) |
| Fix loops inflate cost | Better handoff between agents | Pass the test-runner's failure list verbatim into the implementer's fix brief instead of the orchestrator's summary. (A hook that trims test output to failures is out: RTK already does that in both runs.) |
| Planner reads many files despite the scout | Isolate verbose work | Tighten the scout's file map, or test whether the scout pays for itself at all |

4. **Run 2 (after):** same task file, same base commit, a fresh session, only that one change.

- **Variance caveat:** the same task can cost differently just because one run needed an extra fix round. Record the number of fix rounds per run so a real saving can be told apart from luck.
- **RTK is a constant:** RTK (v0.42.0) is on in both runs and compacts tool output, so every `/usage` number includes its savings. Keep it on, at the same version if possible, for the week 3 re-run, and say so in the write-up.
- **Optional third data point:** my current manual way of working (an Opus plan session plus a Sonnet execution session). That compares architectures rather than one lever, so it's extra material, not the before/after.

## Steps

Keep one model per session; switching models mid-session invalidates the cache.

### Session 0: Build the `pr-description` skill (its own session)

0. **Build the skill with Anthropic's skill creator** (`anthropic-skills:skill-creator`; start the session with "use the skill-creator skill to build a pr-description skill"). Don't hand-write it.
   - Location: `.claude/skills/pr-description/SKILL.md`.
   - What it does: writes a PR/MR description (summary, changes, how to test, risks) from the branch diff and the plan in `.claude/plans/`.
   - Use the skill creator's test/eval step: one prompt that should trigger it and one that shouldn't (same check as week 1).
   - Commit it to `main`. The `pr-writer` agent loads it later via `skills:`, so it must exist before Session 1.

### Session 1: Build the agents

1. **Set up the homework folder.** Create `homework/week-2/` and save the assignment there (the `homework-writeup` skill handles this).
2. **Check the docs before writing any frontmatter**, at `code.claude.com/docs/en/sub-agents`. Confirm:
   - the frontmatter fields: `model`, `effort`, `tools`, `disallowedTools`, `maxTurns`, `skills`, `mcpServers`
   - how `claude --agent <name>` works
   - whether `Agent(name)` can limit which agents a given agent may call
3. **I write the task file** at `homework/week-2/task.md` (not the build session):
   - what to implement (book search)
   - acceptance criteria / definition of done (e.g. which fields are searched, case sensitivity, empty-query behavior, HTMX partial vs full page)
   - what's out of scope
   - an explicit line: *"This is the week 2 homework task (gap #1, CLAUDE.md rule 1 exception)."*
4. **Write the worker agents** in `.claude/agents/`, simplest first: `test-runner` → `scout` → `planner` → `implementer` → `test-writer` → `reviewer` → `pr-writer`. Leave `qa-tester` for later. Each file needs:
   - frontmatter: model, effort, an explicit `tools` list (without `Agent`) and `maxTurns`
   - the agent's role, the input it expects, and its hard constraints (including the CLAUDE.md rules that apply to it)
   - a fixed return format with a word cap
5. **Write `orchestrator.md` last.** It needs:
   - the list of agents and the pipeline order
   - the two stops for me: plan approval and before commit
   - the limits on fix rounds
   - the brief template
   - "never edit code, never commit"
   - `Agent` in its tools
   - the parallel/wait rule (see Build notes, item 4)
   - the end state (see "End of a run" above) and a **final 5-line summary** printed in the chat (no file): fix rounds (tests / review), reviewer verdict, test status, files changed, open items
6. **Commit the agent files to `main`.** They're a homework deliverable.

### Session 2: Smoke tests (new session so the agents load)

7. **Test each worker on its own** with something cheap (e.g. "use the test-runner agent"). Check that `/tasks` shows the right model and effort, and that the reply follows the agent's return format. Also check RTK (Build notes, item 7):
   - Each agent with Bash runs its listed `rtk` commands with no "re-run with exactly that input" rejection. If one appears, check that the agent re-runs it as given.
   - Break one test on purpose and run the test-runner. Its report must still give the test name, the error and the file from RTK's compacted output (if not, RTK saves the full output of a failed command to a file). Undo the break afterwards.
8. **Check that `/usage` counts subagent costs** in a `claude --agent orchestrator` session (see Build notes, item 5).
9. **Partial dry run.** Start `claude --agent orchestrator` with the task file, let it reach the plan approval stop, then quit. This checks the scout → planner handoff and the question relay without paying for a full run. Fix the agent files, then commit.

### Session 3: Run 1 (before)

10. Create `hw2/run-1` from main, delete `bookshelf.db`, start a fresh `claude --agent orchestrator` and point it at `homework/week-2/task.md`. Run it end to end, approving the plan.
11. Before closing, save `/usage` and `/tasks` and run `/export` into `homework/week-2/run-1/`. Write down the number of fix rounds.

### Session 4: Run 2 (after)

12. Read Run 1's breakdown, pick the lever (table above), change **one** agent file and commit it.
13. Create `hw2/run-2` from **the same base commit** and repeat steps 10–11 into `homework/week-2/run-2/`.

### Session 5: Write-up

14. Write the decision log paragraph (why this split, and what to cut next time), then use `homework-writeup` to put everything into the week 2 Google Doc.

## Build notes

Decided:
- **Plans folder:** `.claude/plans/`. The planner writes `<slug>.md` there and returns the path.
- **Input:** `homework/week-2/task.md` with the AC, written by me. No Jira-style tickets in this repo.
- **PR skill:** built in this repo at `.claude/skills/pr-description/` with Anthropic's skill creator, in its own session (Session 0).

For the build session to handle:
1. **Return formats.** Only the reviewer's format is defined above (major→minor plus READY/NOT READY). Define one for each agent, with a word cap. Review these most carefully in the "show me each file" step.
2. **Path limits aren't enforced by `tools:`.** It allows or denies whole tools, not paths. "Planner writes only to `.claude/plans/`" and "test-writer writes only to `tests/`" are instructions unless backed by a PreToolUse hook (like the week 1 `protect-htmx` one) or permission rules. Instructions are probably enough for the homework; state the limitation in the decision log.
3. **Bash limited to `git diff`/`git status`** for the orchestrator and reviewer: check in the docs whether `tools:` accepts patterns like `Bash(git diff:*)`. If not, it's an instruction too.
4. **Subagents run in the background by default.** The orchestrator must launch the implementer and test-writer **in the same message**, then wait for **both** results before calling the test-runner.
5. **Check that `/usage` counts subagent costs** when started with `claude --agent orchestrator`. If it doesn't, the before/after numbers are wrong. Verify in Session 2 before Run 1.
6. **pr-writer needs `Write`** (found in Session 0). The `pr-description` skill saves `.claude/plans/<slug>-pr.md`, and the orchestrator has no Write to do it instead. Use `tools: Read, Write, Bash` ("git" isn't a tool name; git runs through Bash). Add to its instructions: "Write only `.claude/plans/<slug>-pr.md`. Don't edit any other file." (Same limitation as item 2.)
7. **RTK stays on; write commands in `rtk` form up front** (found in Session 0). The global `rtk hook claude` rewrites almost every command the agents use (`git …`, `npm run …`, `npx vitest/tsc`, `ls`, `cat`, `grep`) to an `rtk …` form. In auto mode that can cost a retry: when a command goes through auto mode's safety check, the check approves the original, the hook then changes it, and auto mode refuses to run the unchecked version ("a hook changed this call's input after auto mode reviewed it … issue the Bash call once more with exactly that input"). Seen in the Haiku test run on a chain of commands and a `cp`, both outside the repo. Simple read-only commands inside the repo skip the check and ran fine. RTK leaves commands that already start with `rtk` unchanged, so what gets checked is what runs.
   - **Write each agent's commands in `rtk` form in its file:**

     | Agent | Commands |
     |---|---|
     | test-runner | `rtk npm run test:run`, `rtk tsc --noEmit` |
     | reviewer, orchestrator | `rtk git diff …`, `rtk git status` |
     | pr-writer | the `pr-description` skill's git commands with `rtk` in front (`git ls-files` stays plain; RTK doesn't rewrite it) |
     | implementer, test-writer | rule: put `rtk` in front of git, npm and ls; use `rtk vitest <file>` (not `npx vitest run <file>`), `rtk tsc` for typechecks, `rtk read` (not `cat`) |

   - **Fallback line in every agent with Bash:** "If a hook rejects a command and asks you to re-run it with different input, re-run it exactly as given." Mainly for the implementer and test-writer, whose commands can't be listed in advance.
   - **pr-writer:** `maxTurns: 10` (the skill needs about 6 tool calls).
   - **Keep `rtk` out of the `pr-description` skill** so it works on machines without RTK; the `rtk` form lives in the agent files.
   - `rtk git diff` keeps every hunk (93 → 81 lines on the test branch, only headers compacted), so the agents lose nothing.

## Later: moving this to my main project

- Give the scout the Atlassian MCP (via `mcpServers`, scoped to that agent only) to read Jira tickets.
- Give the pr-writer `glab` CLI or GitLab MCP access (the slides recommend a CLI over an MCP when a mature one exists).
- Turn on the qa-tester for medium or large changes.

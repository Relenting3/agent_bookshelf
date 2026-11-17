# Session 0 smoke runs: checks C1–C7

Date: 2026-11-16. Claude Code 2.1.326. Wrapper `claude-haiku-5-5`; planner from `.claude/agents/planner.md` (Opus) via `.claude-plugin/plugin.json`.

Cases: `homework/week-3/smoke-cases/smoke` (task folder `.claude/tasks/smoke-rating-count/`) and `smoke-b` (same, task folder `tasks/smoke-rating-count/`). Moved out of `evals/` after the runs so the suite never picks them up.

| Run | Cases | Planner effort | Cost | Results |
|---|---|---|---|---|
| 1 (`runs/smoke/`) | smoke | medium (as committed) | $0.19 | smoke 0.50 |
| 2 (`runs/smoke-2/`) | smoke, smoke-b | **high** (temporary, reverted, not committed) | $0.42 | smoke 0.50 · smoke-b 1.00 |

Flags: `--scaffold --trust-plugin --ablation none --runs 1 --model claude-haiku-5-5 --allow-tools Write --keep-temp --no-publish --max-cost-usd 3`.

| # | Check | Result | Evidence |
|---|---|---|---|
| C1 | Repo-root manifest loads; agent callable as `bookshelf:planner` | PASS | init lists `agents: ['bookshelf:planner']`; wrapper called `Agent{subagent_type:"bookshelf:planner", run_in_background:false}`; subagent meta `agentType: bookshelf:planner`, `isBuiltIn: false` |
| C2 | Planner gets Read/Grep/Glob and Write | PASS, outside `.claude/` only | smoke-b wrote `tasks/smoke-rating-count/plan.md` (61 lines, template followed). smoke's Write to `.claude/tasks/…/plan.md` was denied in both runs: `permission_denied`, `decision_reason_type: "mode"` (runs use `dontAsk`). The grant reaches the subagent; `.claude/` is write-protected in eval runs |
| C3 | `tool_used` / `trace` see the subagent's tool calls | PASS | `c3-read-visible` (Read CLAUDE.md) and `c3-write-visible` (Write plan.md) passed though only the planner made those calls; `trace.jsonl` carries subagent messages (`parent_tool_use_id`, `agent_id`) |
| C4 | Agent `effort` honored | PASS | Planner requests: `output_config:{"effort":"medium"}` ×6 with the agent at medium (run 1), `{"effort":"high"}` ×8 with it at high (run 2); the Haiku wrapper stayed `medium` in both. All planner calls on `claude-opus-5-5`. Screenshot `1-2-c4-effort.png` |
| C5 | Scaffold finds its case dir and copies the local repo within 120 s | PASS | `$0` is the real `fixture.sh` path in the repo; repo root from `git rev-parse --show-toplevel`; cwd is the empty workspace; `git archive a9e1cb4 \| tar -x` + strip in 0–1 s. Scaffold env: only `HOME`, `PATH`, `TMPDIR` and basics |
| C6 | `files` lists files a subagent created | PASS | smoke-b `c6-files-lists-plan` matched `tasks/smoke-rating-count/plan.md` |
| C7 | `costUsd` includes the subagent's Opus tokens | PASS | smoke-b `costUsd` $0.2302 = Haiku $0.0027 + Opus $0.2275 (`modelUsage` in the kept `trace.jsonl`); judge cost separate (`judgeCostUsd`) |

## Consequences for the suite

- **Task folders in eval cases live at `tasks/<slug>/`, not `.claude/tasks/<slug>/`.** Scaffold, brief, `file_exists` paths and the "only plan.md" regex (`^(?!tasks/[^/]+/plan\.md$).+$`) change; the agent file doesn't (it takes the folder from the brief). A deviation from the real pipeline to state in the write-up, next to "Read CLAUDE.md first".
- **Planner-only cost per run** comes straight from `modelUsage["claude-opus-5-5"].costUSD` in each kept `trace.jsonl` (needs `--keep-temp`).
- The `--allow-tools Write` grant also gives the wrapper `Write`, `Edit` and `NotebookEdit`; the `files` and `tool_used` graders catch a wrapper that writes.
- Costs here aren't a medium-vs-high comparison: smoke stopped at the denied Write ($0.19 at both efforts) and only smoke-b (high) finished ($0.23). One run each.

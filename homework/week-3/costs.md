# Week 3 costs

What the evals cost to build and run: one row per Claude session (from `/usage`) and per eval run (from its `costUsd`).

| Date | What | Source | Cost |
|---|---|---|---|
| 2026-11-16 | Session 0: smoke run 1 (`smoke`, 1 run, planner medium) | `runs/smoke/aggregate-result.json` `costUsd` | $0.19 |
| 2026-11-16 | Session 0: smoke run 2 (`smoke` + `smoke-b`, 1 run each, planner high) | `runs/smoke-2/aggregate-result.json` `costUsd` | $0.42 |
| 2026-11-16 | Session 0: setup and doc checks (this Claude session) | `/usage` (`1-3-usage-setup.png`) | $4.07 |

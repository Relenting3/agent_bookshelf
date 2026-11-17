# Week 3 costs

What the evals cost to build and run: one row per Claude session (from `/usage`) and per eval run (from its `costUsd`).

| Date | What | Source | Cost |
|---|---|---|---|
| 2026-11-16 | Session 0: smoke run 1 (`smoke`, 1 run, planner medium) | `runs/smoke/aggregate-result.json` `costUsd` | $0.19 |
| 2026-11-16 | Session 0: smoke run 2 (`smoke` + `smoke-b`, 1 run each, planner high) | `runs/smoke-2/aggregate-result.json` `costUsd` | $0.42 |
| 2026-11-16 | Session 0: setup and doc checks (this Claude session) | `/usage` (`1-3-usage-setup.png`) | $4.07 |
| 2026-11-17 | Session 1: write the suite (23 cases, review, 23 scout runs on Haiku) (this Claude session) | `/usage` (`1-5-usage-suite.png`); Haiku $0.13 of it, incl. the scouts | $8.29 |
| 2026-11-17 | Session 2: calibration run (23 cases, 1 run, planner medium) | `runs/calibration/aggregate-result.json` `costUsd` | $4.76 |
| 2026-11-17 | Session 2: calibrate and freeze (review in 5 batches, 3 grader fixes + wrapper fix, tag `hw3-suite-v1`) (this Claude session) | `/usage` (`1-9-usage-calibration.png`); Haiku $0.0003 of it | $4.11 |
| 2026-11-17 | Session 3: before-high attempt 1, interrupted at 10/23 (**discarded**, not in the comparison) | the run's console | $4.59 |
| 2026-11-17 | Session 3: before-high attempt 2, cut off by the 5-hour usage limit at 16/23 (**discarded**, not in the comparison) | the run's console | $8.76 |
| 2026-11-17 | Session 3: before-high (23 cases, 2 runs, planner high) | `runs/before-high/aggregate-result.json` `costUsd` | $11.95 |
| 2026-11-17 | Session 3: after-medium, no new run (reuses the Session 2 calibration run, already counted above) | n/a | $0.00 |

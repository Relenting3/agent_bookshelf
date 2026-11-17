#!/usr/bin/env bash
# Shared scaffold for the planner suite. Each case's fixture.sh calls:
#   bash _lib/scaffold.sh <case dir> <task slug>
# It runs in the run's empty workspace (cwd) and builds:
#   - the repo at tag hw3-eval-base (git archive, so no .git history), minus .claude/ and homework/
#     (week 2's plans and notes must not leak into a case)
#   - CLAUDE.md from the checkout under test, not the tag (so a promoted rule reaches the cases in part 3)
#   - tasks/<slug>/task.md copied from the case dir; an empty tasks/<slug>/ if the case has no task.md
# The task folder slug is separate from the case name so the folder name doesn't hint at the expected behaviour.
set -euo pipefail
CASE_DIR="$1"
SLUG="$2"
REPO="$(git -C "$CASE_DIR" rev-parse --show-toplevel)"

git -C "$REPO" archive hw3-eval-base | tar -x
rm -rf .claude homework
cp "$REPO/CLAUDE.md" CLAUDE.md

mkdir -p "tasks/$SLUG"
if [ -f "$CASE_DIR/task.md" ]; then
  cp "$CASE_DIR/task.md" "tasks/$SLUG/task.md"
fi

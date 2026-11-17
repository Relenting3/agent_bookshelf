#!/usr/bin/env bash
# Smoke scaffold: probes C5 ($0, cwd, env, clone speed), then builds the workspace.
set -euo pipefail
SLUG=smoke-rating-count
BASE=a9e1cb4
START=$SECONDS
PROBE=.scaffold-probe.txt
{
  echo "pwd=$(pwd)"
  echo "\$0=$0"
  echo "BASH_SOURCE=${BASH_SOURCE[0]}"
  echo "workspace before: [$(ls -A | tr '\n' ' ')]"
  echo "env names: $(env | sed 's/=.*//' | sort | tr '\n' ' ')"
} > "$PROBE" 2>&1

CASE_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(git -C "$CASE_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
echo "CASE_DIR=$CASE_DIR" >> "$PROBE"
if [ -n "$REPO" ]; then
  echo "REPO (derived from \$0)=$REPO" >> "$PROBE"
else
  REPO=/Users/relenting/Development/Repositories/agent_bookshelf
  echo "REPO (FALLBACK, \$0 not in the repo)=$REPO" >> "$PROBE"
fi

git -C "$REPO" archive "$BASE" | tar -x
rm -rf .claude homework
cp "$REPO/CLAUDE.md" CLAUDE.md
case "$(basename "$CASE_DIR")" in smoke-b) TASK_ROOT=tasks ;; *) TASK_ROOT=.claude/tasks ;; esac
echo "TASK_ROOT=$TASK_ROOT" >> "$PROBE"
mkdir -p "$TASK_ROOT/$SLUG"
cat > "$TASK_ROOT/$SLUG/task.md" <<'TASK'
# Task: Show the number of ratings on the book page

## Description

The book page (`/books/:id`) shows the average rating as stars and a number, e.g. "4.3 / 5", but not how many ratings that average is based on. A 5.0 from one review looks the same as a 5.0 from twenty.

## What to build

Next to the average, show the count, e.g. "4.3 / 5 (3 ratings)". Use "1 rating" for a single one. When a book has no reviews, keep today's behaviour (no average shown).

## Acceptance criteria

1. A book with reviews shows the average and the count, e.g. "(3 ratings)".
2. A book with exactly one review shows "(1 rating)".
3. A book with no reviews shows no average and no count.
4. No change to the JSON API.
TASK
echo "elapsed=$((SECONDS-START))s" >> "$PROBE"

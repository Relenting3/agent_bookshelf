#!/usr/bin/env bash
# Launch a measured /ship-ticket run with the model and git permissions fixed at startup.
#
#   ship.sh [-p] [--budget <usd>] [--dry-run] [spec-path] [-- <extra claude args>]
#
# Why: a skill's `model` and `allowed-tools` last only "until your next message", and a
# background completion notice counts as one (plan.md, Session 2: in the -p smoke run of
# /review-pr the main session fell back from Sonnet to Opus at the first notice, +$0.45).
# So a measured or unattended /ship-ticket run starts with --model sonnet and --allowedTools
# for its git commands, or it can switch model and stop at permission prompts mid-run.
# Normal interactive use doesn't need this script.
#
# No permission mode is set: runs inherit the user's (run 1 and run 2 use the same one).
#
#   -p             headless: adds -p --output-format json --max-budget-usd <budget>
#   --budget <usd> budget for -p (default 6)
#   --dry-run      print the command and exit 0
#   spec-path      default SPEC.md (relative to the current directory)
#   CLAUDE_BIN     binary to run (default: claude), for testing
#
# Exit: 2 usage error or missing spec, 3 RULES out of sync with the skills, else claude's code.
set -euo pipefail

usage() { sed -n '4p' "$0" | sed 's/^# *//' >&2; }
die() { echo "ship.sh: $1" >&2; exit "${2:-2}"; }

# Plugin dir = the folder above this script, absolute, following symlinks to the script.
src=${BASH_SOURCE[0]}
while [ -L "$src" ]; do
  dir=$(cd -P "$(dirname "$src")" && pwd)
  src=$(readlink "$src")
  case $src in /*) ;; *) src=$dir/$src ;; esac
done
PLUGIN_DIR=$(cd -P "$(dirname "$src")/.." && pwd)
[ -f "$PLUGIN_DIR/.claude-plugin/plugin.json" ] || die "no plugin at $PLUGIN_DIR"

# Must match the Bash(...) entries of allowed-tools in skills/ship-ticket/SKILL.md plus
# skills/review-pr/SKILL.md (ship-ticket calls review-pr). Checked on every run below.
RULES=(
  "Bash(git add *)"
  "Bash(git commit *)"
  "Bash(git status *)"
  "Bash(git rev-parse *)"
  "Bash(git branch *)"
  "Bash(git log *)"
  "Bash(git -P diff *)"
  "Bash(git merge-base *)"
  "Bash(git ls-files *)"
  "Bash(date -u *)"
  "Bash(rm -f .ttm/active)"
)
SKILLS=(ship-ticket review-pr)

print=0 dry=0 budget=6 budget_set=0 spec=""
extra=()
while [ $# -gt 0 ]; do
  case $1 in
    -p) print=1 ;;
    --budget)
      [ $# -ge 2 ] || die "--budget needs a value"
      budget=$2 budget_set=1; shift ;;
    --dry-run) dry=1 ;;
    -h|--help) usage; exit 0 ;;
    --) shift; extra=("$@"); break ;;
    -*) usage; die "unknown option: $1" ;;
    *) [ -z "$spec" ] || die "only one spec-path allowed (got '$spec' and '$1')"
       spec=$1 ;;
  esac
  shift
done
[[ $budget =~ ^[0-9]+([.][0-9]+)?$ ]] || die "--budget must be a number of USD, got '$budget'"
[ $print -eq 1 ] || [ $budget_set -eq 0 ] || die "--budget only applies with -p"
spec=${spec:-SPEC.md}
[ -f "$spec" ] || die "spec file not found: $spec (from $(pwd))"

# Drift check: RULES vs the skills' allowed-tools lines.
skill_rules() {
  local s f
  for s in "$@"; do
    f=$PLUGIN_DIR/skills/$s/SKILL.md
    [ -f "$f" ] || die "missing $f" 3
    sed -n 's/^allowed-tools:[[:space:]]*//p' "$f" | head -n 1 | grep -oE 'Bash\([^)]*\)' || true
  done | sort -u
}
if ! drift=$(diff <(printf '%s\n' "${RULES[@]}" | sort -u) <(skill_rules "${SKILLS[@]}")); then
  printf 'ship.sh: RULES out of sync with allowed-tools in %s (< script, > skills):\n%s\n' \
    "${SKILLS[*]}" "$drift" >&2
  exit 3
fi

cmd=("${CLAUDE_BIN:-claude}" --model sonnet --plugin-dir "$PLUGIN_DIR")
[ $print -eq 0 ] || cmd+=(-p --output-format json --max-budget-usd "$budget")
cmd+=(--allowedTools "${RULES[@]}")
cmd+=(${extra[@]+"${extra[@]}"})
# --allowedTools is variadic: "--" stops it from taking the prompt as one more rule.
cmd+=(-- "/ticket-to-merge:ship-ticket $spec")

{
  echo "ship.sh: running (one argument per line):"
  for a in "${cmd[@]}"; do printf "  '%s'\n" "${a//\'/\'\\\'\'}"; done
} >&2
[ $dry -eq 0 ] || exit 0
exec "${cmd[@]}"

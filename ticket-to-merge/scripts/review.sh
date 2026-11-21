#!/usr/bin/env bash
# Launch /review-pr with the model and git permissions fixed at startup.
#
#   review.sh [-p] [--budget <usd>] [--dry-run] [base] [spec] [-- <extra claude args>]
#
# Why: the skill's `model: sonnet` lasts only "until your next message", and the reviewers'
# background completion notices count as one. In the -p smoke run (plan.md, Session 2, A5)
# the main session fell back to Opus after the reviewers reported back (+$0.45 per review).
# Starting with --model sonnet keeps the verifier launch and the output on Sonnet, so the
# eval runs are comparable. --allowedTools carries review-pr's git commands for the same reason.
#
# No permission mode is set: runs inherit the user's.
#
#   -p             headless: adds -p --output-format json --max-budget-usd <budget>
#   --budget <usd> budget for -p (default 3)
#   --dry-run      print the command and exit 0
#   base, spec     passed to the skill when given (skill defaults: base main, no spec)
#   CLAUDE_BIN     binary to run (default: claude), for testing
#
# Exit: 2 usage error or missing spec, 3 RULES out of sync with the skill, else claude's code.
set -euo pipefail

usage() { sed -n '4p' "$0" | sed 's/^# *//' >&2; }
die() { echo "review.sh: $1" >&2; exit "${2:-2}"; }

# Plugin dir = the folder above this script, absolute, following symlinks to the script.
src=${BASH_SOURCE[0]}
while [ -L "$src" ]; do
  dir=$(cd -P "$(dirname "$src")" && pwd)
  src=$(readlink "$src")
  case $src in /*) ;; *) src=$dir/$src ;; esac
done
PLUGIN_DIR=$(cd -P "$(dirname "$src")/.." && pwd)
[ -f "$PLUGIN_DIR/.claude-plugin/plugin.json" ] || die "no plugin at $PLUGIN_DIR"

# Must match the Bash(...) entries of allowed-tools in skills/review-pr/SKILL.md.
# Checked on every run below.
RULES=(
  "Bash(git rev-parse *)"
  "Bash(git merge-base *)"
  "Bash(git -P diff *)"
  "Bash(git ls-files *)"
)
SKILLS=(review-pr)

print=0 dry=0 budget=3 budget_set=0
pos=() extra=()
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
    *) [ ${#pos[@]} -lt 2 ] || die "at most two arguments (base, spec), got a third: '$1'"
       pos+=("$1") ;;
  esac
  shift
done
[[ $budget =~ ^[0-9]+([.][0-9]+)?$ ]] || die "--budget must be a number of USD, got '$budget'"
[ $print -eq 1 ] || [ $budget_set -eq 0 ] || die "--budget only applies with -p"
base=${pos[0]:-} spec=${pos[1]:-}
[ -n "$base" ] || [ -z "$spec" ] || die "spec given without base; pass the base first"
[ -z "$spec" ] || [ -f "$spec" ] || die "spec file not found: $spec (from $(pwd))"

# Drift check: RULES vs the skill's allowed-tools line.
skill_rules() {
  local s f
  for s in "$@"; do
    f=$PLUGIN_DIR/skills/$s/SKILL.md
    [ -f "$f" ] || die "missing $f" 3
    sed -n 's/^allowed-tools:[[:space:]]*//p' "$f" | head -n 1 | grep -oE 'Bash\([^)]*\)' || true
  done | sort -u
}
if ! drift=$(diff <(printf '%s\n' "${RULES[@]}" | sort -u) <(skill_rules "${SKILLS[@]}")); then
  printf 'review.sh: RULES out of sync with allowed-tools in %s (< script, > skill):\n%s\n' \
    "${SKILLS[*]}" "$drift" >&2
  exit 3
fi

prompt=/ticket-to-merge:review-pr
[ -z "$base" ] || prompt+=" $base"
[ -z "$spec" ] || prompt+=" $spec"

cmd=("${CLAUDE_BIN:-claude}" --model sonnet --plugin-dir "$PLUGIN_DIR")
[ $print -eq 0 ] || cmd+=(-p --output-format json --max-budget-usd "$budget")
cmd+=(--allowedTools "${RULES[@]}")
cmd+=(${extra[@]+"${extra[@]}"})
# --allowedTools is variadic: "--" stops it from taking the prompt as one more rule.
cmd+=(-- "$prompt")

{
  echo "review.sh: running (one argument per line):"
  for a in "${cmd[@]}"; do printf "  '%s'\n" "${a//\'/\'\\\'\'}"; done
} >&2
[ $dry -eq 0 ] || exit 0
exec "${cmd[@]}"

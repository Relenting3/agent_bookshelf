#!/usr/bin/env bash
# Builds the planted-bug branches for the /review-pr eval:
#   planted/clean = run 1's src/ + tests/ changes on BASE, unchanged
#   planted/a     = clean + a.patch
#   planted/b     = clean + b.patch
# Each branch is one commit on BASE with a neutral message. Everything is built
# in a temporary git worktree (the current checkout is never touched), with
# node_modules symlinked from the repo root. Every branch must pass the suite
# and the typecheck; branches are created only when all three are green.
#
# Usage: make-branches.sh [--force]    (--force replaces existing planted/* branches)
# Exit:  0 all green, branches written · 1 a branch is red or a step failed · 2 usage
set -euo pipefail

BASE=0e6fb66      # upstream/main
SOURCE=75c6790    # capstone/run-1 (only its src/ and tests/ changes are used)
MSG='BOOK-101: search books by title or author'
NAMES='clean a b'

usage() { sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; }

FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "make-branches: unknown argument: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

die() { echo "make-branches: $*" >&2; exit 1; }

HERE=$(cd "$(dirname "$0")" && pwd -P)
ROOT=$(git -C "$HERE" rev-parse --show-toplevel)
G() { git -C "$ROOT" "$@"; }

G rev-parse -q --verify "$BASE^{commit}" >/dev/null || die "base $BASE not found (git fetch upstream)"
G rev-parse -q --verify "$SOURCE^{commit}" >/dev/null || die "source $SOURCE not found"
[ -d "$ROOT/node_modules" ] || die "no node_modules in $ROOT (npm install first)"
for p in a.patch b.patch; do [ -f "$HERE/$p" ] || die "missing $HERE/$p"; done

existing=''
for n in $NAMES; do
  if G show-ref --verify -q "refs/heads/planted/$n"; then existing="$existing planted/$n"; fi
done
if [ -n "$existing" ] && [ "$FORCE" -ne 1 ]; then
  die "already exist:$existing (use --force to replace them)"
fi

TMP=$(mktemp -d "${TMPDIR:-/tmp}/planted.XXXXXX")
WT="$TMP/wt"
cleanup() {
  G worktree remove --force "$WT" >/dev/null 2>&1 || true
  G worktree prune >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

G worktree add -q --detach "$WT" "$BASE"
ln -s "$ROOT/node_modules" "$WT/node_modules"
W() { git -C "$WT" "$@"; }

# Same dates and parent every time, so a rebuild gives the same commit ids.
GIT_AUTHOR_DATE=$(G log -1 --format=%cI "$SOURCE")
GIT_COMMITTER_DATE=$GIT_AUTHOR_DATE
export GIT_AUTHOR_DATE GIT_COMMITTER_DATE

G -P diff --binary "$BASE" "$SOURCE" -- src tests > "$TMP/clean.diff"
[ -s "$TMP/clean.diff" ] || die "no src/ or tests/ changes between $BASE and $SOURCE"

red=0
results=''
for n in $NAMES; do
  W checkout -q --detach "$BASE"
  W reset -q --hard "$BASE"
  W apply --index "$TMP/clean.diff" || die "$n: run 1's changes don't apply on $BASE"
  if [ "$n" != clean ]; then
    W apply --index "$HERE/$n.patch" || die "$n: $n.patch doesn't apply on clean"
  fi
  W commit -q --no-verify -m "$MSG"
  sha=$(W rev-parse HEAD)

  set +e
  (cd "$WT" && NO_COLOR=1 npm run test:run) > "$TMP/$n-test.log" 2>&1
  test_rc=$?
  (cd "$WT" && npx tsc --noEmit) > "$TMP/$n-tsc.log" 2>&1
  tsc_rc=$?
  set -e
  tests=$(grep -E '^ *Tests ' "$TMP/$n-test.log" | tail -1 | sed 's/^ *Tests *//')
  [ -n "$tests" ] || tests='(no summary)'

  printf '%-14s %s  suite exit %s: %s  ·  tsc exit %s\n' "planted/$n" "${sha:0:7}" "$test_rc" "$tests" "$tsc_rc"
  if [ "$test_rc" -ne 0 ] || [ "$tsc_rc" -ne 0 ]; then
    red=1
    echo "--- planted/$n suite (last 40 lines)"; tail -40 "$TMP/$n-test.log"
    echo "--- planted/$n tsc"; cat "$TMP/$n-tsc.log"
  fi
  results="$results $n:$sha"
done

if [ "$red" -ne 0 ]; then
  die "a branch is red; no branches written"
fi

for r in $results; do
  n=${r%%:*}; sha=${r#*:}
  if [ "$FORCE" -eq 1 ]; then G branch -q -f "planted/$n" "$sha"; else G branch -q "planted/$n" "$sha"; fi
done
echo "wrote:$(for r in $results; do printf ' planted/%s' "${r%%:*}"; done) (on $BASE)"

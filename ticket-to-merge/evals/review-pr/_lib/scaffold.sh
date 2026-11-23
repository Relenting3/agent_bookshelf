#!/usr/bin/env bash
# Shared scaffold for the /review-pr suite. Each case's fixture.sh calls:
#   bash _lib/scaffold.sh <case dir> <planted branch: a | b | clean>
# It runs in the run's empty workspace (cwd), as the user, outside the sandbox, and builds
# a git repo with two commits, both made from this repo with `git archive`:
#   main         one commit, tree = BASE (0e6fb66, the graders' base)
#   book-search  one commit on top, tree = planted/<x>   (checked out, clean working tree)
# Nothing else: no plugin, no homework/, no SPEC.md, no CLAUDE.md, no node_modules (the
# planted trees have none of them). Branch name, author and messages are neutral and the
# same in every case, so nothing in the workspace names a plant.
# Fails (exit 1) unless both commits' trees equal the source trees exactly.
set -euo pipefail

die() { echo "scaffold: $*" >&2; exit 1; }
[ $# -eq 2 ] || die "usage: scaffold.sh <case dir> <a|b|clean>"
CASE_DIR=$1
X=$2
case $X in a|b|clean) ;; *) die "unknown planted branch: $X" ;; esac

BASE=0e6fb66
BRANCH=book-search
MSG='BOOK-101: search books by title or author'
START=$SECONDS

REPO=$(git -C "$CASE_DIR" rev-parse --show-toplevel) || die "no repo above $CASE_DIR"
G() { git -C "$REPO" "$@"; }
G rev-parse -q --verify "$BASE^{commit}" >/dev/null || die "base $BASE not in $REPO (git fetch upstream)"
G rev-parse -q --verify "planted/$X^{commit}" >/dev/null || die "planted/$X not in $REPO (evals/planted/make-branches.sh)"
BASE_TREE=$(G rev-parse "$BASE^{tree}")
WANT_TREE=$(G rev-parse "planted/$X^{tree}")

[ -z "$(ls -A .)" ] || die "workspace not empty: $(pwd)"

# Neutral identity and fixed dates (HOME is the run's temp home: no global git config).
export GIT_AUTHOR_NAME=Dev GIT_AUTHOR_EMAIL=dev@example.com
export GIT_COMMITTER_NAME=Dev GIT_COMMITTER_EMAIL=dev@example.com
GC() { git -c commit.gpgsign=false -c core.autocrlf=false "$@"; }

git init -q -b main .

# main: the base tree
G archive "$BASE" | tar -xf -
GC add -A -f .
GIT_AUTHOR_DATE=$(G log -1 --format=%cI "$BASE") GIT_COMMITTER_DATE=$(G log -1 --format=%cI "$BASE") \
  GC commit -q --no-verify -m 'Initial commit'
got=$(git rev-parse 'HEAD^{tree}')
[ "$got" = "$BASE_TREE" ] || die "main tree $got != $BASE^{tree} $BASE_TREE"

# book-search: the planted tree, one commit on main
git checkout -q -b "$BRANCH"
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
G archive "planted/$X" | tar -xf -
GC add -A -f .
GIT_AUTHOR_DATE=$(G log -1 --format=%cI "planted/$X") GIT_COMMITTER_DATE=$(G log -1 --format=%cI "planted/$X") \
  GC commit -q --no-verify -m "$MSG"
got=$(git rev-parse 'HEAD^{tree}')
[ "$got" = "$WANT_TREE" ] || die "$BRANCH tree $got != planted/$X^{tree} $WANT_TREE"
[ -z "$(git status --porcelain)" ] || die "working tree not clean after commit"

echo "scaffold: planted/$X ok, tree $WANT_TREE, $((SECONDS - START)) s" >&2

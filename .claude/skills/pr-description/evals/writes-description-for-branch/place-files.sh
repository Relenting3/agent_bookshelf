#!/usr/bin/env bash
# Run from a clone of agent_bookshelf on main. Recreates the test branch:
# one commit (model function), uncommitted edits, and untracked files (view + plan).
set -eu
F="$(dirname "$0")/files"
git checkout -q -b feature/top-rated-books
git apply "$F/branch.patch"
git add src/models/book.ts
git -c user.name=Fixture -c user.email=fixture@example.com commit -qm "Add getTopRatedBooks model function"
cp -R "$F/new/." .

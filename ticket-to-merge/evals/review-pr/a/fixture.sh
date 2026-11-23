#!/usr/bin/env bash
# Builds this case's workspace with the shared scaffold: main = base, book-search = planted/a.
set -euo pipefail
CASE_DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$CASE_DIR/../_lib/scaffold.sh" "$CASE_DIR" a

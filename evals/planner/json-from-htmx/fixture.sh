#!/usr/bin/env bash
# Builds this case's workspace with the shared scaffold. The task folder slug is the 2nd argument.
set -euo pipefail
CASE_DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$CASE_DIR/../_lib/scaffold.sh" "$CASE_DIR" shelf-add-feedback

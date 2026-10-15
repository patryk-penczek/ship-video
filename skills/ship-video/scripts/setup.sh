#!/usr/bin/env bash
# Kept for older instructions: the setup is scripts/setup.mjs, which also runs on Windows.
# usage: setup.sh [--demucs] [--force] [--help]
exec node "$(cd "$(dirname "$0")" && pwd)/setup.mjs" "$@"

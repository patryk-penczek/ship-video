#!/usr/bin/env bash
# Installs everything the ship-video engine needs into ~/.ship-video (or $SHIP_VIDEO_HOME):
#   node_modules  Playwright + Chromium, GSAP, fonts
#   .venv         Python with librosa + matplotlib (add --demucs for stem separation, several GB)
# Skips whatever is already installed; exits at once if a previous run finished and deps haven't changed.
# Usage: setup.sh [--demucs] [--force]
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="${SHIP_VIDEO_HOME:-$HOME/.ship-video}"
DEMUCS=0
FORCE=0
for a in "$@"; do
  case "$a" in
    --demucs) DEMUCS=1 ;;
    --force) FORCE=1 ;;
  esac
done

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
skip() { printf '  \033[2m· %s (already installed)\033[0m\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; exit 1; }
has() { command -v "$1" >/dev/null 2>&1; }

if (( ! FORCE && ! DEMUCS )) && has node && node "$HERE/lib/check.mjs" >/dev/null 2>&1; then
  echo "ship-video: already set up in $HOME_DIR (use --force to reinstall)"
  exit 0
fi

echo "ship-video setup → $HOME_DIR"
mkdir -p "$HOME_DIR"
(( FORCE )) && rm -f "$HOME_DIR/.ready"

# --- system tools ---
has node || fail "Node not found. Install Node 20+ (https://nodejs.org or: brew install node)"
ok "node $(node -v)"
if ! has ffmpeg; then
  if has brew; then echo "  installing ffmpeg with Homebrew…"; brew install ffmpeg; else fail "ffmpeg not found (brew install ffmpeg)"; fi
fi
ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')"

# --- node deps (only when package.json changed) ---
if (( FORCE )) || [[ ! -d "$HOME_DIR/node_modules" ]] || ! cmp -s "$HERE/package.json" "$HOME_DIR/package.json"; then
  cp "$HERE/package.json" "$HOME_DIR/package.json"
  [[ -f "$HERE/bun.lock" ]] && cp "$HERE/bun.lock" "$HOME_DIR/bun.lock"
  if has bun; then (cd "$HOME_DIR" && bun install --silent); else (cd "$HOME_DIR" && npm install --silent --no-fund --no-audit); fi
  ok "node packages"
else
  skip "node packages"
fi
# playwright skips the download itself when this Chromium build is already cached
(cd "$HOME_DIR" && node node_modules/playwright/cli.js install chromium >/dev/null)
ok "Playwright Chromium"

# --- python (only what doesn't import yet) ---
PY="$HOME_DIR/.venv/bin/python"
PKGS=()
[[ -x "$PY" ]] && "$PY" -I -c "import librosa, matplotlib" 2>/dev/null || PKGS+=(librosa matplotlib)
(( DEMUCS )) && ! { [[ -x "$PY" ]] && "$PY" -I -c "import demucs" 2>/dev/null; } && PKGS+=(demucs)
if (( FORCE )) && (( ${#PKGS[@]} == 0 )); then PKGS=(librosa matplotlib); (( DEMUCS )) && PKGS+=(demucs); fi
if (( ${#PKGS[@]} )); then
  if has uv; then
    [[ -x "$PY" ]] || uv venv --quiet --python 3.12 "$HOME_DIR/.venv"
    uv pip install --quiet --python "$PY" "${PKGS[@]}"
  else
    has python3 || fail "python3 not found (brew install python@3.12, or install uv: brew install uv)"
    [[ -x "$PY" ]] || python3 -m venv "$HOME_DIR/.venv"
    "$PY" -m pip install --quiet --upgrade pip
    "$PY" -m pip install --quiet "${PKGS[@]}" || fail "pip install failed. librosa may not support $(python3 --version) yet; install uv (brew install uv) and re-run"
  fi
  ok "python venv (${PKGS[*]})"
else
  skip "python venv"
fi

node "$HERE/lib/check.mjs" --full >/dev/null || { node "$HERE/lib/check.mjs" --full; fail "some dependencies are still missing"; }
echo "done. Python: $PY"

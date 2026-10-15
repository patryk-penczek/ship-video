#!/usr/bin/env bash
# Installs everything the ship-video engine needs into ~/.ship-video (or $SHIP_VIDEO_HOME):
#   node_modules  Playwright + Chromium, GSAP, fonts
#   .venv         Python with librosa + matplotlib (add --demucs for stem separation, several GB)
# Safe to re-run. Usage: setup.sh [--demucs]
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="${SHIP_VIDEO_HOME:-$HOME/.ship-video}"
DEMUCS=0
[[ "${1:-}" == "--demucs" ]] && DEMUCS=1

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; exit 1; }
has() { command -v "$1" >/dev/null 2>&1; }

echo "ship-video setup → $HOME_DIR"
mkdir -p "$HOME_DIR"

# --- system tools ---
has node || fail "Node not found. Install Node 20+ (https://nodejs.org or: brew install node)"
ok "node $(node -v)"
if ! has ffmpeg; then
  if has brew; then echo "  installing ffmpeg with Homebrew…"; brew install ffmpeg; else fail "ffmpeg not found (brew install ffmpeg)"; fi
fi
ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')"

# --- node deps ---
cp "$HERE/package.json" "$HOME_DIR/package.json"
[[ -f "$HERE/bun.lock" ]] && cp "$HERE/bun.lock" "$HOME_DIR/bun.lock"
if has bun; then (cd "$HOME_DIR" && bun install --silent); else (cd "$HOME_DIR" && npm install --silent --no-fund --no-audit); fi
ok "node packages"
(cd "$HOME_DIR" && node node_modules/playwright/cli.js install chromium >/dev/null)
ok "Playwright Chromium"

# --- python ---
PY="$HOME_DIR/.venv/bin/python"
PKGS=(librosa matplotlib)
(( DEMUCS )) && PKGS+=(demucs)
if has uv; then
  [[ -x "$PY" ]] || uv venv --quiet --python 3.12 "$HOME_DIR/.venv"
  uv pip install --quiet --python "$PY" "${PKGS[@]}"
else
  has python3 || fail "python3 not found (brew install python@3.12, or install uv: brew install uv)"
  [[ -x "$PY" ]] || python3 -m venv "$HOME_DIR/.venv"
  "$PY" -m pip install --quiet --upgrade pip
  "$PY" -m pip install --quiet "${PKGS[@]}" || fail "pip install failed. librosa may not support $(python3 --version) yet; install uv (brew install uv) and re-run"
fi
"$PY" -I -c "import librosa" || fail "librosa import failed"
ok "python venv (${PKGS[*]})"

echo "done. Python: $PY"

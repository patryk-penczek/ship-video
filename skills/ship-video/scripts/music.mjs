// Music tools, one entry point. Runs the Python ones in the ship-video venv (python -I).
// usage: node music.mjs <command> [args]       (node music.mjs <command> --help for details)
//   analyze  <track> [--json music.json]            tempo, bars, beats, hits (* = strong), kicks, gaps, energy table
//   envelope <track> <film/env.js>                  60 fps sub/mid/high/rms envelope for audio-reactive effects
//   plot     <track> <out.png> [stems_dir] [--bpm N]  spectrogram with beat and bar lines; Read the PNG
//   stems    <demucs_out_dir>                        per-stem energy + onsets (needs setup.sh --demucs)
//   separate <track> <out_dir>                       run demucs htdemucs_6s (needs setup.sh --demucs)
//   grid     --bpm 120 --duration 20 [--out env.js]  no-music path: beat/bar times + synthetic env.js
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_DIR, help } from "./lib/common.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [cmd, ...rest] = process.argv.slice(2);
const PY_SCRIPTS = { analyze: "analyze.py", envelope: "envelope.py", plot: "plot.py", stems: "stems.py" };

if (!cmd || cmd === "--help" || cmd === "-h") help(import.meta.url, fileURLToPath(import.meta.url)), process.exit(cmd ? 0 : 1);
if (cmd === "grid") {
  const r = spawnSync(process.execPath, [path.join(here, "audio/grid.mjs"), ...rest], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

const PY = path.join(HOME_DIR, ".venv/bin/python");
if (!existsSync(PY)) { console.error(`Python venv missing in ${HOME_DIR}. Run scripts/setup.sh first.`); process.exit(1); }

let argv;
if (cmd === "separate") {
  const [track, out] = rest;
  if (!track || !out) { console.error("usage: node music.mjs separate <track> <out_dir>"); process.exit(1); }
  argv = ["-I", "-m", "demucs", "-n", "htdemucs_6s", "-o", out, track];
} else if (PY_SCRIPTS[cmd]) {
  const file = path.join(here, "audio", PY_SCRIPTS[cmd]);
  if (rest.includes("--help") || rest.includes("-h")) help(import.meta.url, file);
  argv = ["-I", file, ...rest];
} else {
  console.error(`unknown command "${cmd}". Commands: analyze, envelope, plot, stems, separate, grid`);
  process.exit(1);
}
const r = spawnSync(PY, argv, { stdio: "inherit" });
process.exit(r.status ?? 1);

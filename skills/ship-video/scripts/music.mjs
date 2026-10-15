// Music tools, one entry point. Runs the Python ones in the ship-video venv (python -I).
// usage: node music.mjs <command> [args]       (node music.mjs <command> --help for details)
//   analyze  <track> [--json music.json]            tempo, audible end, bars/beats, cuts, section lifts, hits (* = strong), kicks, gaps, energy table
//   envelope <track> <film/env.js>                  60 fps sub/mid/high/rms envelope for audio-reactive effects
//   plot     <track> <out.png> [stems_dir] [--bpm N]  spectrogram with beat and bar lines; Read the PNG
//   stems    <demucs_out_dir>                        per-stem energy + onsets (needs setup.sh --demucs)
//   separate <track> <out_dir>                       run demucs htdemucs_6s (needs setup.sh --demucs)
//   grid     --bpm 120 --duration 20 [--out env.js [--pulse]]  no-music path: beat/bar times; --out writes window.ENV = null, --pulse a synthetic beat envelope
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_DIR, help, die } from "./lib/common.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [cmd, ...rest] = process.argv.slice(2);
const PY_SCRIPTS = { analyze: "analyze.py", envelope: "envelope.py", plot: "plot.py", stems: "stems.py" };

if (!cmd) console.error("music.mjs needs a command:");
if (!cmd || cmd === "--help" || cmd === "-h") {
  const text = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").filter((l, i) => i < 20 && l.startsWith("//")).map((l) => l.slice(3));
  (cmd ? console.log : console.error)(text.join("\n"));
  process.exit(cmd ? 0 : 1);
}
if (cmd === "separate" && (rest.includes("--help") || rest.includes("-h"))) {
  console.log("usage: node music.mjs separate <track> <out_dir>\nRuns demucs htdemucs_6s; stems land in <out_dir>/htdemucs_6s/<track name>/*.wav. Needs setup.sh --demucs (several GB).");
  process.exit(0);
}
if (cmd === "grid") {
  const r = spawnSync(process.execPath, [path.join(here, "audio/grid.mjs"), ...rest], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

const PY = path.join(HOME_DIR, ".venv/bin/python");
if (!existsSync(PY)) die(`Python venv missing in ${HOME_DIR}. Run scripts/setup.sh first.`);

let argv;
if (cmd === "separate") {
  const [track, out] = rest;
  if (!track || !out) die("usage: node music.mjs separate <track> <out_dir>");
  if (!existsSync(track)) die(`track not found: ${track}`);
  if (spawnSync(PY, ["-I", "-c", "import demucs"], { stdio: "ignore" }).status !== 0) die("demucs is not installed. Run: scripts/setup.sh --demucs (several GB)");
  argv = ["-I", "-m", "demucs", "-n", "htdemucs_6s", "-o", out, track];
} else if (PY_SCRIPTS[cmd]) {
  const file = path.join(here, "audio", PY_SCRIPTS[cmd]);
  if (rest.includes("--help") || rest.includes("-h")) help(import.meta.url, file);
  argv = ["-I", file, ...rest];
} else {
  die(`unknown command "${cmd}". Commands: analyze, envelope, plot, stems, separate, grid`);
}
// librosa/soundfile cannot read .m4a/.aac (render accepts them as a track): decode those to a temp wav first
let tmpDir = null;
if (PY_SCRIPTS[cmd] && cmd !== "stems") {
  const i = argv.findIndex((x, k) => k >= 2 && !x.startsWith("-"));
  const track = argv[i];
  if (track && existsSync(track) && !/\.(wav|mp3|flac|ogg|opus)$/i.test(track)) {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "ship-video-audio-"));
    const wav = path.join(tmpDir, "in.wav");
    const f = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", track, "-vn", "-ar", "44100", wav], { stdio: ["ignore", "ignore", "pipe"] });
    if (f.error?.code === "ENOENT") { rmSync(tmpDir, { recursive: true, force: true }); die("ffmpeg not found in PATH (brew install ffmpeg): needed to read .m4a/.aac"); }
    if (f.status !== 0) { rmSync(tmpDir, { recursive: true, force: true }); die(`ffmpeg could not decode ${track}: ${String(f.stderr).trim().split("\n").pop() || "no audio stream?"}`); }
    argv[i] = wav;
  }
}
const r = spawnSync(PY, argv, { stdio: "inherit" });
if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
process.exit(r.status ?? 1);

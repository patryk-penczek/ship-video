// Static spans of a rendered film: every stretch where the picture barely changes for longer than --min seconds, with times, and a one-line
// summary (% of the film that is static). Run it on the MP4 before delivering: a film that rests for 4-5 s on its end card reads as stalled.
// usage: node motion.mjs <film.mp4> [--min 1.0] [--thresh 1.0] [--tail 1.5] [--json]
//   --min N     report spans longer than N seconds (default 1.0)
//   --thresh P  a frame counts as static when under P % of its pixels changed (by > 12/255) against the frame 0.1 s earlier (default 1.0).
//               A slow push (scale 1 -> 1.06) moves text edges only: it still counts as static, which is the point
//   --tail S    the last S seconds (default 1.5) are the allowed ending rest: a static span reaching the end is split there and its
//               tail part is reported as "ending rest", only the part before it counts as a problem
//   --json      machine-readable output
// Decodes at 30 fps and 320 px wide with ffmpeg (gray raw frames), so a 30 s film takes a few seconds. Exit code 0 always: it is a report.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { help, args, die, num, known } from "./lib/common.mjs";
help(import.meta.url);

const a = args(undefined, ["json", "help"]);
known(a, ["min", "thresh", "tail", "json"]);
const [mp4] = a._;
if (!mp4) die("usage: node motion.mjs <film.mp4> [--min 1.0] [--thresh 1.0] [--tail 1.5] [--json]");
if (!existsSync(mp4)) die(`not found: ${mp4}`);
const minLen = num(a, "min", 1.0, { min: 0.1 }), thresh = num(a, "thresh", 1.0, { min: 0, max: 100 }), tail = num(a, "tail", 1.5, { min: 0 });
const FPS = 30, W = 320, H = 180, LAG = 3, N = W * H;

const ff = spawn("ffmpeg", ["-v", "error", "-i", mp4, "-vf", `fps=${FPS},scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"], { stdio: ["ignore", "pipe", "pipe"] });
let err = ""; ff.stderr.on("data", (d) => { err += d; });
ff.on("error", (e) => die(e.code === "ENOENT" ? "ffmpeg not found in PATH (brew install ffmpeg)" : e.message));
const frames = []; let buf = Buffer.alloc(0);
ff.stdout.on("data", (d) => {
  buf = buf.length ? Buffer.concat([buf, d]) : d;
  while (buf.length >= N) { frames.push(Buffer.from(buf.subarray(0, N))); buf = buf.subarray(N); }
});
await new Promise((ok) => ff.on("close", ok));
if (!frames.length) die(`ffmpeg could not read ${mp4}: ${err.trim().split("\n").pop() || "no frames"}`);

const dur = frames.length / FPS, moving = [];
for (let i = 0; i < frames.length; i++) {
  if (i < LAG) { moving.push(true); continue; } // the first frames have nothing to compare with: not static
  const x = frames[i], y = frames[i - LAG]; let c = 0;
  for (let k = 0; k < N; k++) if (Math.abs(x[k] - y[k]) > 12) c++;
  moving.push(c / N * 100 >= thresh);
}
// runs of static frames; a single moving frame inside a run (a flicker) does not break it
const spans = []; let st = -1;
for (let i = 0; i <= frames.length; i++) {
  const still = i < frames.length && (!moving[i] || (i > 0 && i + 1 < frames.length && !moving[i - 1] && !moving[i + 1]));
  if (still && st < 0) st = i;
  if (!still && st >= 0) { spans.push([st / FPS, i / FPS]); st = -1; }
}
const endAt = dur - tail, report = [], rest = [];
for (const [s, e] of spans) {
  if (e > endAt + 0.05 && e >= dur - 0.1) { // reaches the end: split off the allowed ending rest
    if (s < endAt) { if (endAt - s > minLen) report.push([s, endAt]); rest.push([endAt, e]); } else rest.push([s, e]);
  } else if (e - s > minLen) report.push([s, e]);
}
const total = report.reduce((t, [s, e]) => t + e - s, 0), restLen = rest.reduce((t, [s, e]) => t + e - s, 0);
if (a.json) console.log(JSON.stringify({ duration: +dur.toFixed(2), static: report.map(([s, e]) => ({ from: +s.toFixed(2), to: +e.toFixed(2) })), endingRest: rest.map(([s, e]) => ({ from: +s.toFixed(2), to: +e.toFixed(2) })), staticSeconds: +total.toFixed(2), staticPercent: +(total / dur * 100).toFixed(1) }, null, 1));
else {
  for (const [s, e] of report) console.log(`static ${s.toFixed(2)}–${e.toFixed(2)} (${(e - s).toFixed(1)} s): the picture barely changes; add motion, a new beat, or cut the hold`);
  for (const [s, e] of rest) console.log(`ending rest ${s.toFixed(2)}–${e.toFixed(2)} (${(e - s).toFixed(1)} s): allowed${e - s > tail + 1 ? ", but long" : ""}`);
  console.log(`${total.toFixed(1)} s of ${dur.toFixed(1)} s static (${(total / dur * 100).toFixed(0)} %)${report.length ? "" : ": clean"}  [min ${minLen} s, threshold ${thresh} % changed pixels]`);
}

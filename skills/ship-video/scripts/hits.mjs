// Hit check on the final MP4: for each hit time grabs frames at t-0.02, t, t+0.02 and tiles them (one row per hit).
// A cut "lands" when the t-0.02 frame is the old shot and t / t+0.02 are the new one.
// usage: node hits.mjs <film.mp4> <out.png> t1 t2 ...   (every t between 0 and the video length minus 0.03 s, else it stops)
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { help, die, onExit } from "./lib/common.mjs";
help(import.meta.url);

const [mp4, out, ...times] = process.argv.slice(2);
const flag = process.argv.slice(2).find((x) => /^--?[a-z]/i.test(x));
if (flag) die(`unknown option ${flag} (hits.mjs takes only <film.mp4> <out.png> t1 t2 ...)`);
if (!mp4 || !out || !times.length) die("usage: node hits.mjs <film.mp4> <out.png> t1 t2 ...");
if (!existsSync(mp4)) die(`video not found: ${mp4}`);
let dur;
try { dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); }
catch (e) { die(e.code === "ENOENT" ? "ffprobe not found in PATH (brew install ffmpeg)" : `cannot read video ${mp4}`); }
if (!Number.isFinite(dur)) die(`cannot read the duration of ${mp4}`);
const bad = times.filter((t) => !Number.isFinite(Number(t)) || Number(t) < 0 || Number(t) + 0.03 > dur);
if (bad.length) die(`times out of range (video is ${dur.toFixed(2)} s, usable 0 to ${(dur - 0.03).toFixed(2)}): ${bad.join(" ")}`);
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const tmp = mkdtempSync(path.join(os.tmpdir(), "ship-video-hits-"));
onExit(() => rmSync(tmp, { recursive: true, force: true })); // die() skips `finally`
try {
  let i = 0;
  for (const t of times.map(Number)) for (const d of [-0.02, 0, 0.02]) {
    const tt = Math.max(0, t + d);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", tt.toFixed(3), "-i", mp4, "-frames:v", "1", "-vf", "scale=480:-1", path.join(tmp, `${String(i++).padStart(4, "0")}.png`)], { stdio: ["ignore", "ignore", "pipe"] });
  }
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-pattern_type", "glob", "-i", path.join(tmp, "*.png"), "-vf", `tile=3x${times.length}:padding=4:color=red`, "-frames:v", "1", path.resolve(out)], { stdio: ["ignore", "ignore", "pipe"] });
  console.log(`${times.length} hits × (-0.02, 0, +0.02) → ${out}`);
} catch (e) {
  die(e.stderr ? `ffmpeg failed: ${String(e.stderr).trim().split("\n").pop()}` : String(e.message).split("\n")[0]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// Hit check on the final MP4: for each hit time grabs frames at t-0.02, t, t+0.02 and tiles them (one row per hit).
// A cut "lands" when the t-0.02 frame is the old shot and t / t+0.02 are the new one.
// usage: node hits.mjs <film.mp4> <out.png> t1 t2 ...
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const [mp4, out, ...times] = process.argv.slice(2);
if (!mp4 || !out || !times.length) { console.error("usage: node hits.mjs <film.mp4> <out.png> t1 t2 ..."); process.exit(1); }
const tmp = mkdtempSync(path.join(os.tmpdir(), "ship-video-hits-"));
try {
  let i = 0;
  for (const t of times.map(Number)) for (const d of [-0.02, 0, 0.02]) {
    const tt = Math.max(0, t + d);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", tt.toFixed(3), "-i", mp4, "-frames:v", "1", "-vf", "scale=480:-1", path.join(tmp, `${String(i++).padStart(4, "0")}.png`)]);
  }
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-pattern_type", "glob", "-i", path.join(tmp, "*.png"), "-vf", `tile=3x${times.length}:padding=4:color=red`, "-frames:v", "1", path.resolve(out)]);
  console.log(`${times.length} hits × (-0.02, 0, +0.02) → ${out}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

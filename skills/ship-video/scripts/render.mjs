// Frame-exact render: seeks window.__seek(i / fps) for every frame, pipes JPEGs into ffmpeg, muxes the track.
// usage: node render.mjs <film/index.html> <out.mp4> [--preset crisp|motionblur|draft] [--fps N] [--from s] [--to s] [--scale k] [--audio file|none]
//   crisp       60 fps                                   (~4 s of render per second of film on an M-series Mac)
//   motionblur  240 fps blended 4:1 into 60 fps (tmix)   (~6× slower than crisp; 2 subframes ghost, 4 is the minimum)
//   draft       30 fps at half resolution                (fast timing checks)
// Audio: --audio, else track.(mp3|wav|m4a|aac|flac) next to index.html, else silent.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { help, args, openFilm } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
const [html, out] = a._;
if (!html || !out) { console.error("usage: node render.mjs <film/index.html> <out.mp4> [--preset crisp|motionblur|draft] [--fps N] [--from s] [--to s] [--scale k] [--audio file|none]"); process.exit(1); }
const PRESETS = { crisp: { fps: 60, scale: 1 }, motionblur: { fps: 240, scale: 1 }, draft: { fps: 30, scale: 0.5 } };
const preset = PRESETS[a.preset ?? "crisp"];
if (!preset) { console.error(`unknown preset ${a.preset}`); process.exit(1); }
const fps = Number(a.fps ?? preset.fps);
const scale = Number(a.scale ?? preset.scale);
const blend = fps > 60 ? fps / 60 : 1;
if (!Number.isInteger(blend)) { console.error("--fps above 60 must be a multiple of 60 (it is blended down to 60)"); process.exit(1); }

const dir = path.dirname(path.resolve(html));
let audio = a.audio === "none" ? null : a.audio ? path.resolve(a.audio) : ["mp3", "wav", "m4a", "aac", "flac"].map((e) => path.join(dir, `track.${e}`)).find(existsSync) ?? null;
if (audio && !existsSync(audio)) { console.error(`audio not found: ${audio}`); process.exit(1); }

const { browser, duration, seek, page } = await openFilm(html, { scale });
const from = Number(a.from ?? 0);
const to = Math.min(Number(a.to ?? duration), duration);
const frames = Math.round((to - from) * fps);

const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  ...(audio ? ["-ss", String(from), "-t", String(to - from), "-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-shortest"] : ["-an"]),
  ...(blend > 1 ? ["-vf", `tmix=frames=${blend}:weights=${Array(blend).fill(1).join(" ")},fps=60`] : []),
  "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  path.resolve(out),
], { stdio: ["pipe", "inherit", "inherit"] });
const closed = new Promise((r) => ff.on("close", r));

const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await seek(from + i / fps);
  const buf = await page.screenshot({ type: "jpeg", quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % fps === 0) process.stdout.write(`\r${i}/${frames} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
const code = await closed;
await browser.close();
if (code !== 0) { console.error(`\nffmpeg exited with ${code}`); process.exit(code); }
console.log(`\ndone ${out}  (${(to - from).toFixed(2)}s, ${fps} fps${blend > 1 ? ` → 60 blended ${blend}:1` : ""}, ${audio ? path.basename(audio) : "no audio"}, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);

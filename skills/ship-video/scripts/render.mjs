// Frame-exact render: seeks window.__seek(i / fps) for every frame, pipes JPEGs into ffmpeg, muxes the track.
// usage: node render.mjs <film/index.html> <out.mp4> [--preset crisp|motionblur|draft] [--fps N] [--from s] [--to s] [--scale k] [--audio file|none]
//        node render.mjs --stop <out.mp4>        stop that render (and only that one)
//   crisp       60 fps                                   (~4–6 s of render per second of film)
//   motionblur  240 fps blended 4:1 into 60 fps (tmix)   (~6× slower than crisp; 2 subframes ghost, 4 is the minimum)
//   draft       30 fps at half resolution                (fast timing checks)
// Audio: --audio, else track.(mp3|wav|m4a|aac|flac) next to index.html, else silent.
// While running: <out>.part (renamed to <out> on success), <out>.progress (frame, elapsed, ETA), <out>.pid (JSON pids).
// Exit code ≠ 0 on any failure; a failed or stopped render never leaves a file at <out>.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { help, args, openFilm } from "./lib/common.mjs";
help(import.meta.url);

const a = args();

if (a.stop) {
  const pidFile = `${path.resolve(String(a.stop === true ? a._[0] : a.stop))}.pid`;
  if (!existsSync(pidFile)) { console.error(`no render running for ${pidFile.replace(/\.pid$/, "")}`); process.exit(1); }
  const { node } = JSON.parse(readFileSync(pidFile, "utf8"));
  try { process.kill(node, "SIGTERM"); console.log(`stopping render (pid ${node})`); } catch { console.log("render already finished"); rmSync(pidFile, { force: true }); }
  process.exit(0);
}

const [html, outArg] = a._;
if (!html || !outArg) { console.error("usage: node render.mjs <film/index.html> <out.mp4> [--preset crisp|motionblur|draft] [--fps N] [--from s] [--to s] [--scale k] [--audio file|none]"); process.exit(1); }
const PRESETS = { crisp: { fps: 60, scale: 1 }, motionblur: { fps: 240, scale: 1 }, draft: { fps: 30, scale: 0.5 } };
const preset = PRESETS[a.preset ?? "crisp"];
if (!preset) { console.error(`unknown preset ${a.preset}`); process.exit(1); }
const fps = Number(a.fps ?? preset.fps);
const scale = Number(a.scale ?? preset.scale);
const blend = fps > 60 ? fps / 60 : 1;
if (!Number.isInteger(blend)) { console.error("--fps above 60 must be a multiple of 60 (it is blended down to 60)"); process.exit(1); }

const out = path.resolve(outArg);
const part = `${out}.part`, progressFile = `${out}.progress`, pidFile = `${out}.pid`;
mkdirSync(path.dirname(out), { recursive: true });
if (existsSync(pidFile)) {
  const { node } = JSON.parse(readFileSync(pidFile, "utf8"));
  let alive = false;
  try { process.kill(node, 0); alive = true; } catch {}
  if (alive) { console.error(`a render to ${outArg} is already running (pid ${node}). Stop it: node render.mjs --stop ${outArg}`); process.exit(1); }
}

const dir = path.dirname(path.resolve(html));
const audio = a.audio === "none" ? null : a.audio ? path.resolve(a.audio) : ["mp3", "wav", "m4a", "aac", "flac"].map((e) => path.join(dir, `track.${e}`)).find(existsSync) ?? null;
if (audio && !existsSync(audio)) { console.error(`audio not found: ${audio}`); process.exit(1); }

let browser, ff, finished = false;
const cleanup = (code, msg) => {
  if (finished) return;
  finished = true;
  if (msg) console.error(`\n${msg}`);
  try { ff?.stdin.destroy(); ff?.kill("SIGKILL"); } catch {}
  rmSync(part, { force: true });
  rmSync(pidFile, { force: true });
  if (code !== 0) writeFileSync(progressFile, `failed: ${msg ?? `exit ${code}`}\n`);
  Promise.resolve(browser?.close()).catch(() => {}).finally(() => process.exit(code));
};
process.on("SIGTERM", () => cleanup(143, "render stopped"));
process.on("SIGINT", () => cleanup(130, "render stopped"));

const film = await openFilm(html, { scale }).catch((e) => cleanup(1, `could not open the film: ${e.message}`));
browser = film.browser;
const { duration, seek, page } = film;
const from = Number(a.from ?? 0);
const to = Math.min(Number(a.to ?? duration), duration);
const frames = Math.round((to - from) * fps);

let ffErr = "";
ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  ...(audio ? ["-ss", String(from), "-t", String(to - from), "-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-shortest"] : ["-an"]),
  ...(blend > 1 ? ["-vf", `tmix=frames=${blend}:weights=${Array(blend).fill(1).join(" ")},fps=60`] : []),
  "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-f", "mp4", part,
], { stdio: ["pipe", "ignore", "pipe"] });
ff.stderr.on("data", (d) => { ffErr += d; });
ff.stdin.on("error", () => {}); // reported by the close handler below
const ffClosed = new Promise((r) => ff.on("close", r));
ff.on("close", (code) => { if (!finished && code !== 0) cleanup(code || 1, `ffmpeg failed (exit ${code}): ${ffErr.trim() || "no output"}`); });
writeFileSync(pidFile, JSON.stringify({ node: process.pid, ffmpeg: ff.pid, out }));

const t0 = Date.now();
const report = (i) => {
  const el = (Date.now() - t0) / 1000;
  const eta = i ? (el / i) * (frames - i) : 0;
  const line = `frame ${i}/${frames}  ${el.toFixed(0)}s elapsed  ETA ${eta.toFixed(0)}s`;
  writeFileSync(progressFile, line + "\n");
  if (process.stdout.isTTY) process.stdout.write(`\r${line}`);
};
try {
  for (let i = 0; i < frames && !finished; i++) {
    await seek(from + i / fps);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (finished) break;
    if (!ff.stdin.write(buf)) await new Promise((r) => {
      const go = () => { ff.stdin.off("drain", go); ff.off("close", go); r(); };
      ff.stdin.once("drain", go);
      ff.once("close", go);
    });
    if (i % fps === 0) report(i);
  }
} catch (e) {
  cleanup(1, `render failed: ${e.message}`);
}
if (finished) await new Promise(() => {}); // cleanup() exits the process
ff.stdin.end();
const code = await ffClosed;
if (code !== 0) await new Promise(() => {});
renameSync(part, out);
report(frames);
finished = true;
rmSync(pidFile, { force: true });
await browser.close();
const summary = `done ${outArg}  (${(to - from).toFixed(2)}s, ${fps} fps${blend > 1 ? ` → 60 blended ${blend}:1` : ""}, ${audio ? path.basename(audio) : "no audio"}, ${((Date.now() - t0) / 1000).toFixed(0)}s)`;
writeFileSync(progressFile, summary + "\n");
console.log(`\n${summary}`);

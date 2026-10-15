// Frame-exact render: seeks window.__seek(i / fps) for every frame, pipes JPEGs into ffmpeg, muxes the track.
// usage: node render.mjs <film/index.html> <out.mp4> [--preset crisp|motionblur|draft] [--fps N] [--from s] [--to s] [--scale k] [--audio file|none]
//        node render.mjs --stop <out.mp4>        stop that render (and only that one)
//   crisp       60 fps                                   (measured ~3.5 s of render per second of film idle; 2–3x that when other renders run)
//   motionblur  240 fps blended 4:1 into 60 fps (tmix)   (measured ~3–4× slower than crisp; 2 subframes ghost, 4 is the minimum)
//   draft       30 fps at half resolution                (fast timing checks)
// Audio: --audio, else track.(mp3|wav|m4a|aac|flac) next to index.html, else silent.
// While running: <out>.part (renamed to <out> on success), <out>.progress (frame, elapsed, ETA), <out>.pid (JSON pids).
// All three are removed on success; after a failure only <out>.progress stays, holding the error.
// --from/--to are seconds of film (0 <= from < to); --fps 1..480 (above 60: multiple of 60); --scale 0.25..4; --stop needs the same <out.mp4> path as the render.
// Exit code ≠ 0 on any failure; a failed or stopped render never leaves a file at <out>.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { help, args, openFilm, die, num } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
const USAGE = "usage: node render.mjs <film/index.html> <out.mp4> [--preset crisp|motionblur|draft] [--fps N] [--from s] [--to s] [--scale k] [--audio file|none]\n       node render.mjs --stop <out.mp4>";

const readPid = (f) => { try { const j = JSON.parse(readFileSync(f, "utf8")); return Number.isInteger(j.node) ? j : null; } catch { return null; } };
// is `pid` alive and really a render.mjs process (pids get reused)?
const isRender = (pid) => {
  try { process.kill(pid, 0); } catch { return false; }
  try { return /render\.mjs/.test(execFileSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8" })); } catch { return false; }
};

if (a.stop) {
  const target = a.stop === true ? a._[0] : a.stop;
  if (!target) die("usage: node render.mjs --stop <out.mp4>   (the same path the render was started with)");
  const pidFile = `${path.resolve(String(target))}.pid`;
  const info = existsSync(pidFile) ? readPid(pidFile) : null;
  if (!info) { rmSync(pidFile, { force: true }); die(`no render running for ${pidFile.replace(/\.pid$/, "")}`); }
  if (!isRender(info.node)) { rmSync(pidFile, { force: true }); console.log("render already finished (stale pid file removed)"); process.exit(0); }
  process.kill(info.node, "SIGTERM");
  console.log(`stopping render (pid ${info.node})`);
  process.exit(0);
}

const [html, outArg] = a._;
if (!html || !outArg) die(USAGE);
const PRESETS = { crisp: { fps: 60, scale: 1 }, motionblur: { fps: 240, scale: 1 }, draft: { fps: 30, scale: 0.5 } };
const preset = PRESETS[a.preset ?? "crisp"];
if (!preset) die(`unknown preset ${a.preset === true ? "(missing value)" : a.preset}; use ${Object.keys(PRESETS).join(", ")}`);
const fps = num(a, "fps", preset.fps, { min: 1, max: 480, int: true });
const scale = num(a, "scale", preset.scale, { min: 0.25, max: 4 });
const from = num(a, "from", 0, { min: 0 });
const toArg = num(a, "to", Infinity, { min: 0 });
const blend = fps > 60 ? fps / 60 : 1;
if (!Number.isInteger(blend)) die("--fps above 60 must be a multiple of 60 (it is blended down to 60)");
if (a.audio === true) die("--audio needs a file path or 'none'");

const dir = path.dirname(path.resolve(html));
if (!existsSync(path.resolve(html))) die(`film not found: ${html}`);
const audio = a.audio === "none" ? null : a.audio ? path.resolve(a.audio) : ["mp3", "wav", "m4a", "aac", "flac"].map((e) => path.join(dir, `track.${e}`)).find(existsSync) ?? null;
if (audio && !existsSync(audio)) die(`audio not found: ${audio}`);

const out = path.resolve(outArg);
if (!/\.mp4$/i.test(out)) die(`output must end in .mp4, got ${outArg}`);
if ([path.resolve(html), audio].includes(out)) die(`refusing to overwrite an input: ${out}`);
if (existsSync(out) && statSync(out).isDirectory()) die(`${outArg} is a directory`);
let audioLen = null;
if (audio) {
  try { audioLen = Number(execFileSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "format=duration", "-of", "csv=p=0", audio], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()); }
  catch (e) { die(e.code === "ENOENT" ? "ffmpeg/ffprobe not found in PATH (brew install ffmpeg)" : `no readable audio stream in ${audio}`); }
  if (!Number.isFinite(audioLen)) die(`no readable audio stream in ${audio}`);
}

const part = `${out}.part`, progressFile = `${out}.progress`, pidFile = `${out}.pid`;
mkdirSync(path.dirname(out), { recursive: true });
// atomic claim: 'wx' fails when another render holds the pid file; a dead or corrupt one is replaced
const claim = () => {
  for (let tries = 0; tries < 2; tries++) {
    try { writeFileSync(pidFile, JSON.stringify({ node: process.pid, out }), { flag: "wx" }); return true; }
    catch (e) {
      if (e.code !== "EEXIST") throw e;
      const info = readPid(pidFile);
      if (info && isRender(info.node)) return false;
      rmSync(pidFile, { force: true });
    }
  }
  return false;
};
if (!claim()) die(`a render to ${outArg} is already running. Stop it: node render.mjs --stop ${outArg}`);
rmSync(part, { force: true });

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
const halt = async (code, msg) => { cleanup(code, msg); await new Promise(() => {}); }; // cleanup() exits the process; don't run on meanwhile
process.on("SIGTERM", () => cleanup(143, "render stopped"));
process.on("SIGINT", () => cleanup(130, "render stopped"));

const film = await openFilm(html, { scale }).catch((e) => halt(1, `could not open the film: ${e.message}`));
browser = film.browser;
const { duration, seek, page } = film;
const to = Math.min(toArg, duration);
const frames = Math.round((to - from) * fps);
if (from >= duration || frames < 1) await halt(1, `empty range: from ${from} s to ${to} s of a ${duration.toFixed(2)} s film`);
if (audio && audioLen - from < to - from - 0.05) console.error(`warning: ${path.basename(audio)} is ${audioLen.toFixed(2)} s, shorter than the ${(to - from).toFixed(2)} s film; the rest will be silent`);

let ffErr = "";
ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  ...(audio ? ["-ss", String(from), "-t", String(to - from), "-i", audio, "-map", "0:v", "-map", "1:a", "-af", "apad", "-c:a", "aac", "-b:a", "256k", "-shortest"] : ["-an"]),
  ...(blend > 1 ? ["-vf", `tmix=frames=${blend}:weights=${Array(blend).fill(1).join(" ")},fps=60`] : []),
  "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-f", "mp4", part,
], { stdio: ["pipe", "ignore", "pipe"] });
ff.stderr.on("data", (d) => { ffErr += d; });
ff.on("error", (e) => cleanup(1, e.code === "ENOENT" ? "ffmpeg not found in PATH (brew install ffmpeg)" : `ffmpeg: ${e.message}`));
ff.stdin.on("error", () => {}); // reported by the close handler below
const ffClosed = new Promise((r) => ff.on("close", r));
ff.on("close", (code) => { if (!finished && code !== 0) cleanup(code || 1, `ffmpeg failed (exit ${code}): ${ffErr.trim() || "no output"}`); });
writeFileSync(pidFile, JSON.stringify({ node: process.pid, ffmpeg: ff.pid, out }));  // we own the claim; add the ffmpeg pid

const t0 = Date.now();
const samples = [[0, 0]]; // [elapsed s, frame]: ETA uses the last ~8 film seconds so it follows the current speed without jumping
const report = (i) => {
  const el = (Date.now() - t0) / 1000;
  samples.push([el, i]);
  if (samples.length > 8) samples.shift();
  const [e0, i0] = samples[0];
  const eta = i > i0 ? ((el - e0) / (i - i0)) * (frames - i) : 0;
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
rmSync(progressFile, { force: true });
await browser.close();
console.log(`\ndone ${outArg}  film ${(to - from).toFixed(2)} s, ${fps} fps${blend > 1 ? ` → 60 blended ${blend}:1` : ""}, ${audio ? path.basename(audio) : "no audio"}, took ${((Date.now() - t0) / 1000).toFixed(0)} s`);

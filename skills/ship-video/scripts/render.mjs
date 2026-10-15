// Frame-exact render (output: H.264 yuv420p, limited range, BT.709 tags; check with ffprobe -show_streams): seeks window.__seek(i / fps) for every frame, pipes JPEGs into ffmpeg, muxes the track.
// usage: node render.mjs <film/index.html> <out.mp4> [--preset crisp|motionblur|selective|draft] [--fps N] [--from s] [--to s] [--scale k] [--audio file|none] [--threshold px]
//        node render.mjs --stop <out.mp4>        stop that render (and only that one)
//   crisp       60 fps                                   (measured ~2–3.5 s of render per second of film on an idle machine; 2–3x that when other renders run)
//   motionblur  240 fps blended 4:1 into 60 fps (tmix)   (measured ~3–4× slower than crisp; 2 subframes ghost, 4 is the minimum)
//   selective   60 fps; the 4:1 blend only on frames where something moves fast (camera, cursor, cards: > --threshold px per frame, default 2),
//               one sharp frame everywhere else, so text at rest stays crisp and the render is much cheaper than motionblur. The blur length
//               ramps in above the threshold (no popping). Needs the engine's window.__speed (starter engine.js of this skill version).
//   draft       30 fps at half resolution                (fast timing checks)
// Audio: --audio, else track.(mp3|wav|m4a|aac|flac) next to index.html, else silent.
// While running: <out>.part (renamed to <out> on success), <out>.progress (frame, elapsed, ETA), <out>.pid (JSON pids).
// All three are removed on success; after a failure only <out>.progress stays, holding the error.
// --from/--to are seconds of film (0 <= from < to); --fps 1..480 (above 60: multiple of 60); --scale 0.25..4; --stop needs the same <out.mp4> path as the render.
// A browser that dies mid-render is relaunched and the render resumes at the failed frame (max 2 times); then it fails with "browser closed at frame N".
// Exit code ≠ 0 on any failure; a failed or stopped render never leaves a file at <out>.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { help, args, openFilm, die, num, known } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
known(a, ["preset", "fps", "from", "to", "scale", "audio", "stop", "threshold"]);
const USAGE = "usage: node render.mjs <film/index.html> <out.mp4> [--preset crisp|motionblur|selective|draft] [--fps N] [--from s] [--to s] [--scale k] [--audio file|none]\n       node render.mjs --stop <out.mp4>";

const readPid = (f) => { try { const j = JSON.parse(readFileSync(f, "utf8")); return Number.isInteger(j.node) ? j : null; } catch { return null; } };
// is `pid` alive and really the render.mjs that writes `outAbs` (pids get reused; another render must not be stopped)?
const isRender = (pid, outAbs) => {
  try { process.kill(pid, 0); } catch { return false; }
  try {
    const cmd = execFileSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8" });
    return /render\.mjs/.test(cmd) && cmd.trim().split(/\s+/).some((t) => t === outAbs || path.resolve(t) === outAbs); // the exact output path, not a substring of another render's name
  } catch { return false; }
};

if (a.stop) {
  const target = a.stop === true ? a._[0] : a.stop;
  if (!target) die("usage: node render.mjs --stop <out.mp4>   (the same path the render was started with)");
  const pidFile = `${path.resolve(String(target))}.pid`;
  const outAbs = pidFile.replace(/\.pid$/, "");
  const info = existsSync(pidFile) ? readPid(pidFile) : null;
  if (info && info.out && path.resolve(info.out) !== outAbs) { rmSync(pidFile, { force: true }); die(`the pid file names another output (${info.out}); nothing stopped`); }
  if (!info) { rmSync(pidFile, { force: true }); die(`no render running for ${pidFile.replace(/\.pid$/, "")}`); }
  if (!isRender(info.node, outAbs)) { rmSync(pidFile, { force: true }); console.log("render already finished (stale pid file removed)"); process.exit(0); }
  process.kill(info.node, "SIGTERM");
  console.log(`stopping render (pid ${info.node})`);
  process.exit(0);
}

const [html, outArg] = a._;
if (!html || !outArg) die(USAGE);
const PRESETS = { crisp: { fps: 60, scale: 1 }, motionblur: { fps: 240, scale: 1 }, draft: { fps: 30, scale: 0.5 }, selective: { fps: 60, scale: 1 } };
const SELECTIVE = a.preset === "selective", SUB = 4, thr = num(a, "threshold", 2, { min: 0.1 });
if (a.threshold !== undefined && !SELECTIVE) die("--threshold only applies to --preset selective");
const preset = PRESETS[a.preset ?? "crisp"];
if (!preset) die(`unknown preset ${a.preset === true ? "(missing value)" : a.preset}; use ${Object.keys(PRESETS).join(", ")}`);
const fps = num(a, "fps", preset.fps, { min: 1, max: 480, int: true });
const scale = num(a, "scale", preset.scale, { min: 0.25, max: 4 });
const from = num(a, "from", 0, { min: 0 });
const toArg = num(a, "to", Infinity, { min: 0 });
const blend = SELECTIVE ? SUB : fps > 60 ? fps / 60 : 1;
if (SELECTIVE && a.fps !== undefined && fps !== 60) die("--preset selective renders 60 fps");
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
      if (info && isRender(info.node, out)) return false;
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

let film = await openFilm(html, { scale }).catch((e) => halt(1, `could not open the film: ${e.message}`));
browser = film.browser;
let { seek, page } = film;
const { duration } = film;
const to = Math.min(toArg, duration);
const frames = Math.round((to - from) * fps);
if (from >= duration || frames < 1) await halt(1, `empty range: from ${from} s to ${to} s of a ${duration.toFixed(2)} s film`);
if (audio && audioLen - from < to - from - 0.05) console.error(`warning: ${path.basename(audio)} is ${audioLen.toFixed(2)} s, shorter than the ${(to - from).toFixed(2)} s film; the rest will be silent`);

let ffErr = "";
ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(SELECTIVE ? 240 : fps), "-c:v", "mjpeg", "-i", "-",
  ...(audio ? ["-ss", String(from), "-t", String(to - from), "-i", audio, "-map", "0:v", "-map", "1:a", "-af", "apad", "-c:a", "aac", "-b:a", "256k", "-shortest", "-t", String(to - from)] : ["-an"]),
  // JPEG frames are full-range BT.601 (yuvj420p): convert to standard limited-range BT.709 yuv420p, the format social platforms and phones expect
  "-vf", `crop=trunc(iw/2)*2:trunc(ih/2)*2,${SELECTIVE ? `tmix=frames=${SUB}:weights=${Array(SUB).fill(1).join(" ")},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/60/TB,` : blend > 1 ? `tmix=frames=${blend}:weights=${Array(blend).fill(1).join(" ")},fps=60,` : ""}scale=in_range=full:out_range=limited:in_color_matrix=bt601:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709`,
  ...(SELECTIVE ? ["-fps_mode", "passthrough"] : []), "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart",
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
// A browser that dies mid-render (another session's cleanup, a crash) is relaunched and the render resumes at the frame that
// failed: frames already written stay in ffmpeg's pipe. At most 2 relaunches, then the render fails with a clear line.
const MAX_RELAUNCH = 2, DEAD = /closed|crash|disconnected|Target page|Browser has been/i;
let relaunches = 0, at = 0, blurred = 0;
try {
  for (let i = 0; i < frames && !finished;) {
    at = i;
    try {
      const t = from + i / fps, bufs = [];
      if (SELECTIVE) {
        // the speed of the fastest mover over this frame decides: slow = one render written 4x (the 4:1 blend of identical frames is that frame), fast = 4 sub-frames
        const v = await page.evaluate((tt) => (typeof window.__speed === "function" ? window.__speed(tt) : -1), t);
        if (v < 0) throw new Error("this film's engine.js has no window.__speed: copy engine.js from the current starter to use --preset selective");
        const sh = Math.min(1, (v - thr) / thr) * 0.75; // shutter in frames: 0 at the threshold, the full 270 degrees from twice the threshold
        if (v < thr || v * sh < 0.6) { await seek(t); const b = await page.screenshot({ type: "jpeg", quality: 95 }); bufs.push(b, b, b, b); }
        else { for (let j = 0; j < SUB; j++) { await seek(t + (j * sh) / (SUB - 1) / 60); bufs.push(await page.screenshot({ type: "jpeg", quality: 95 })); } blurred++; }
      } else { await seek(t); bufs.push(await page.screenshot({ type: "jpeg", quality: 95 })); }
      if (finished) break;
      for (const buf of bufs) if (!ff.stdin.write(buf)) await new Promise((r) => {
        const go = () => { ff.stdin.off("drain", go); ff.off("close", go); r(); };
        ff.stdin.once("drain", go);
        ff.once("close", go);
      });
      if (i % fps === 0) report(i);
      i++;
    } catch (e) {
      if (finished) break;
      if (!DEAD.test(e.message)) throw e;
      if (relaunches >= MAX_RELAUNCH) throw new Error(`browser closed at frame ${i}/${frames}; gave up after ${MAX_RELAUNCH} relaunches (is another process killing Chrome?)`);
      relaunches++;
      const note = `browser closed at frame ${i}/${frames}: relaunching and resuming at this frame (${relaunches}/${MAX_RELAUNCH})`;
      console.error(`\n${note}`);
      writeFileSync(progressFile, `${note}\n`);
      await browser.close().catch(() => {});
      film = await openFilm(html, { scale }).catch((err) => { throw new Error(`browser closed at frame ${i}/${frames} and could not be relaunched: ${err.message}`); });
      browser = film.browser; ({ seek, page } = film);
    }
  }
} catch (e) {
  cleanup(1, DEAD.test(e.message) && !/^browser closed at frame/.test(e.message) ? `failed: browser closed at frame ${at}/${frames}: ${e.message}` : `render failed: ${e.message}`);
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
console.log(`\ndone ${outArg}  film ${(to - from).toFixed(2)} s, ${fps} fps${blend > 1 ? ` → 60 blended ${blend}:1` : ""}, ${audio ? path.basename(audio) : "no audio"}, took ${((Date.now() - t0) / 1000).toFixed(0)} s${SELECTIVE ? `, selective blur on ${blurred} of ${frames} frames` : ""}`);

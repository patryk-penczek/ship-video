// Shared bits for the engine scripts: where the deps live, arg parsing, opening a film in render mode.
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HOME_DIR = process.env.SHIP_VIDEO_HOME ?? path.join(os.homedir(), ".ship-video");
// the venv's Python: bin/python on macOS and Linux, Scripts\python.exe on Windows
export const VENV_PY = path.join(HOME_DIR, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");

function load(name) {
  if (!existsSync(path.join(HOME_DIR, "node_modules", name))) {
    console.error(`ship-video: '${name}' is not installed in ${HOME_DIR}. Run node scripts/setup.mjs first.`);
    process.exit(1);
  }
  return createRequire(path.join(HOME_DIR, "package.json"))(name);
}

// One-line errors instead of stack traces (DEBUG=1 shows them).
// die() calls process.exit, which skips `finally`: register cleanups (temp dirs) with onExit() so they still run.
const cleanups = [];
export const onExit = (fn) => { cleanups.push(fn); };
export const die = (msg, code = 1) => { console.error(msg); for (const f of cleanups) { try { f(); } catch {} } process.exit(code); };
const oneLine = (e) => process.env.DEBUG ? (e?.stack ?? String(e)) : String(e?.message ?? e).split("\n")[0];
process.on("uncaughtException", (e) => die(oneLine(e)));
process.on("unhandledRejection", (e) => die(oneLine(e)));

// Numeric option with a default; bare flags, NaN and out-of-range values stop the script with one line.
export function num(a, name, dflt, { min = -Infinity, max = Infinity, int = false } = {}) {
  if (a[name] === undefined) return dflt;
  const v = a[name] === true || a[name] === "" ? NaN : Number(a[name]);
  if (!Number.isFinite(v) || v < min || v > max || (int && !Number.isInteger(v)))
    die(`--${name} must be ${int ? "an integer" : "a number"}${Number.isFinite(min) ? ` >= ${min}` : ""}${Number.isFinite(max) ? ` and <= ${max}` : ""}, got "${a[name] === true ? "" : a[name]}"`);
  return v;
}
// A misspelled flag must not be ignored (`--too 1` would render the whole film): stop on any option not in `allowed`.
export function known(a, allowed) {
  const bad = Object.keys(a).filter((k) => k !== "_" && k !== "help" && !allowed.includes(k));
  if (bad.length) die(`unknown option${bad.length > 1 ? "s" : ""} ${bad.map((k) => `--${k}`).join(" ")} (allowed: ${allowed.map((k) => `--${k}`).join(" ") || "none"})`);
}
export const mustExist = (p, what) => { if (!existsSync(p)) die(`${what} not found: ${p}`); };

// node x.mjs a b --fps 60 --label  ->  { _: ["a", "b"], fps: "60", label: true }   (also --fps=60)
// Boolean flags never take the next argument, so `--label t1 t2` keeps both times.
export const BOOLS = ["label", "no-crop", "summary", "force", "demucs", "pulse", "help", "css", "full", "discover", "no-lint", "no-determinism", "no-contrast", "no-pii", "lint-only", "app-text", "strict", "no-motion", "app-clip", "redact"];
export function args(argv = process.argv.slice(2), bools = BOOLS) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const eq = a.indexOf("=");
    if (eq > 0) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (bools.includes(a.slice(2)) || next === undefined || next.startsWith("--")) out[a.slice(2)] = true;
    else { out[a.slice(2)] = next; i++; }
  }
  return out;
}

// Opens <film>/index.html?render=1 and waits for window.__ready. scale = deviceScaleFactor (2 → 3840×2160).
export async function openFilm(html, { scale = 1, logs = false } = {}) {
  mustExist(path.resolve(html), "film");
  if (!/\.html?$/i.test(html)) die(`${html} is not an HTML file (expected <film>/index.html)`);
  const { chromium } = load("playwright");
  const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--disable-lcd-text", "--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
    let loadError = null;
    page.on("console", (m) => { if (m.type() === "error") console.error("[page]", m.text()); else if (m.type() === "warning" && m.text().startsWith("[ship-video]")) console.error(`WARNING ${m.text().slice(13)}`); else if (logs) console.error(`[console.${m.type()}]`, m.text()); }); // logs: a film's own console.log (debug prints) shows up
    page.on("pageerror", (e) => { loadError ??= e.message; console.error("[pageerror]", e.message); });
    await page.goto(`${pathToFileURL(path.resolve(html)).href}?render=1`);
    let iv;
    await Promise.race([
      page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 }).catch((e) => {
        throw /Timeout/.test(e.message) ? new Error("window.__ready never became true in 60 s: engine.js or film.js did not run to the end (see [page]/[pageerror] lines above; is film.js loaded by index.html?)") : e;
      }),
      new Promise((_, rej) => { iv = setInterval(() => loadError && rej(new Error(`the film threw before window.__ready: ${loadError}`)), 200); }),
    ]).finally(() => clearInterval(iv));
    const duration = await page.evaluate(() => window.__duration);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error(`window.__duration is ${duration}; film.js must set it (seconds, > 0)`);
    return { browser, page, duration, seek: (t) => page.evaluate((tt) => window.__seek(tt), t) };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

export { load };

// --help / -h: print the comment block at the top of the calling script (or of `file`) and exit.
export function help(metaUrl, file = fileURLToPath(metaUrl)) {
  if (!process.argv.slice(2).some((a) => a === "--help" || a === "-h")) return;
  const lines = readFileSync(file, "utf8").split("\n");
  const out = [];
  for (const l of lines) { const m = l.match(/^\s*(\/\/|#)\s?(.*)$/); if (!m) break; out.push(m[2]); }
  console.log(out.join("\n"));
  process.exit(0);
}

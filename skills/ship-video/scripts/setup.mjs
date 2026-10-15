// Installs everything the ship-video engine needs into ~/.ship-video (or $SHIP_VIDEO_HOME), on macOS, Linux and Windows:
//   node_modules  Playwright + Chromium, GSAP, fonts
//   .venv         Python with librosa + matplotlib (add --demucs for stem separation, several GB)
// Skips whatever is already installed; exits at once if a previous run finished and deps haven't changed.
// ffmpeg is installed with Homebrew (macOS) or winget (Windows) when missing; on Linux it prints the command to run.
// usage: node setup.mjs [--demucs] [--force] [--help]
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { HOME_DIR, VENV_PY } = await import("./lib/common.mjs");
const WIN = process.platform === "win32", MAC = process.platform === "darwin";

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(0);
}
const bad = argv.filter((a) => !["--demucs", "--force"].includes(a));
if (bad.length) { console.error(`setup.mjs: unknown option ${bad[0]} (try --help)`); process.exit(2); }
const DEMUCS = argv.includes("--demucs"), FORCE = argv.includes("--force");

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const skip = (m) => console.log(`  \x1b[2m· ${m} (already installed)\x1b[0m`);
let unlock = () => {};
const fail = (m) => { console.error(`  \x1b[31m✗\x1b[0m ${m}`); unlock(); process.exit(1); };
// .cmd/.bat launchers (npm, bun, uv on some installs) need a shell on Windows
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: "inherit", shell: WIN, ...opts });
const out = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: "utf8", shell: WIN, stdio: ["ignore", "pipe", "ignore"] }); return r.status === 0 ? r.stdout.trim() : null; };
const has = (cmd) => out(cmd, ["--version"]) !== null;
const checkOk = () => spawnSync(process.execPath, [path.join(HERE, "lib/check.mjs")], { stdio: "ignore" }).status === 0;

if (!FORCE && !DEMUCS && checkOk()) { console.log(`ship-video: already set up in ${HOME_DIR} (use --force to reinstall)`); process.exit(0); }

console.log(`ship-video setup → ${HOME_DIR}`);
mkdirSync(HOME_DIR, { recursive: true });

// one setup at a time: several sessions may run it at once and share ~/.ship-video.
// The lock holds its owner's pid; a lock whose owner is gone (killed, reboot) is reclaimed at once.
const LOCK = path.join(HOME_DIR, ".setup.lock"), PIDF = path.join(LOCK, "pid");
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };
for (let i = 0; ; i++) {
  try { mkdirSync(LOCK); writeFileSync(PIDF, String(process.pid)); break; } catch {}
  const owner = Number(existsSync(PIDF) ? readFileSync(PIDF, "utf8") : NaN);
  const old = existsSync(LOCK) && Date.now() - statSync(LOCK).mtimeMs > 120000;
  if ((owner && !alive(owner)) || (!owner && old)) { rmSync(LOCK, { recursive: true, force: true }); continue; }
  if (i === 0) console.log(`  another setup is running (pid ${owner || "?"}); waiting up to 20 min…`);
  if (i > 1200) fail(`could not get the setup lock (${LOCK})`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);   // sleep 1 s
}
unlock = () => rmSync(LOCK, { recursive: true, force: true });
process.on("exit", unlock);
// it may have finished while we waited
if (!FORCE && !DEMUCS && checkOk()) { console.log("ship-video: already set up"); process.exit(0); }
if (FORCE) rmSync(path.join(HOME_DIR, ".ready"), { force: true });

// --- system tools ---
if (Number(process.versions.node.split(".")[0]) < 20) fail(`Node ${process.versions.node} is too old: install Node 20+ (https://nodejs.org)`);
ok(`node ${process.version}`);
if (!has("ffmpeg") && out("ffmpeg", ["-version"]) === null) {
  if (MAC && has("brew")) { console.log("  installing ffmpeg with Homebrew…"); run("brew", ["install", "ffmpeg"]); }
  else if (WIN && out("winget", ["--version"]) !== null) {
    console.log("  installing ffmpeg with winget…");
    run("winget", ["install", "--id", "Gyan.FFmpeg", "-e", "--accept-source-agreements", "--accept-package-agreements"]);
    if (out("ffmpeg", ["-version"]) === null) fail("ffmpeg was installed but isn't on this terminal's PATH yet: open a new terminal and run setup again");
  } else fail(MAC ? "ffmpeg not found: brew install ffmpeg" : WIN ? "ffmpeg not found: winget install Gyan.FFmpeg (or https://ffmpeg.org/download.html), then open a new terminal" : "ffmpeg not found: sudo apt install ffmpeg (or dnf/pacman)");
}
if (out("ffmpeg", ["-version"]) === null) fail("ffmpeg still not found on PATH");
ok(`ffmpeg ${out("ffmpeg", ["-version"]).split("\n")[0].split(" ")[2] ?? ""}`);

// --- node deps (only when package.json changed) ---
const pkgSrc = path.join(HERE, "package.json"), pkgDst = path.join(HOME_DIR, "package.json");
const same = existsSync(pkgDst) && readFileSync(pkgSrc, "utf8") === readFileSync(pkgDst, "utf8");
if (FORCE || !existsSync(path.join(HOME_DIR, "node_modules")) || !same) {
  copyFileSync(pkgSrc, pkgDst);
  if (existsSync(path.join(HERE, "bun.lock"))) copyFileSync(path.join(HERE, "bun.lock"), path.join(HOME_DIR, "bun.lock"));
  const r = has("bun") ? run("bun", ["install", "--silent"], { cwd: HOME_DIR }) : run("npm", ["install", "--silent", "--no-fund", "--no-audit"], { cwd: HOME_DIR });
  if (r.status !== 0) fail("installing node packages failed (see above)");
  ok("node packages");
} else skip("node packages");
// playwright skips the download itself when this Chromium build is already cached
if (spawnSync(process.execPath, [path.join(HOME_DIR, "node_modules/playwright/cli.js"), "install", "chromium"], { cwd: HOME_DIR, stdio: ["ignore", "ignore", "inherit"] }).status !== 0) fail("downloading Chromium failed (needs network access)");
ok("Playwright Chromium");

// --- python (only what doesn't import yet) ---
const pyHas = (mods) => existsSync(VENV_PY) && spawnSync(VENV_PY, ["-I", "-c", `import ${mods}`], { stdio: "ignore" }).status === 0;
let pkgs = [];
if (!pyHas("librosa, matplotlib")) pkgs.push("librosa", "matplotlib");
if (DEMUCS && !pyHas("demucs")) pkgs.push("demucs");
if (FORCE && !pkgs.length) pkgs = ["librosa", "matplotlib", ...(DEMUCS ? ["demucs"] : [])];
if (pkgs.length) {
  const venv = path.join(HOME_DIR, ".venv");
  if (has("uv")) {
    if (!existsSync(VENV_PY) && run("uv", ["venv", "--quiet", "--python", "3.12", venv]).status !== 0) fail("uv could not create the venv");
    if (run("uv", ["pip", "install", "--quiet", "--python", VENV_PY, ...pkgs]).status !== 0) fail("uv pip install failed (see above)");
  } else {
    const py = ["python3", "python", "py"].find((c) => out(c, ["--version"])?.startsWith("Python 3"));
    if (!py) fail(MAC ? "Python 3 not found: brew install uv (recommended) or python@3.12" : WIN ? "Python 3 not found: winget install astral-sh.uv (recommended) or Python.Python.3.12" : "Python 3 not found: install uv (https://docs.astral.sh/uv/) or python3");
    if (!existsSync(VENV_PY) && run(py, ["-m", "venv", venv]).status !== 0) fail("could not create the Python venv");
    run(VENV_PY, ["-m", "pip", "install", "--quiet", "--upgrade", "pip"], { shell: false });
    if (run(VENV_PY, ["-m", "pip", "install", "--quiet", ...pkgs], { shell: false }).status !== 0)
      fail(`pip install failed. librosa may not support ${out(py, ["--version"])} yet: install uv and run setup again (it uses Python 3.12)`);
  }
  ok(`python venv (${pkgs.join(" ")})`);
} else skip("python venv");

if (spawnSync(process.execPath, [path.join(HERE, "lib/check.mjs"), "--full"], { stdio: "ignore" }).status !== 0) {
  spawnSync(process.execPath, [path.join(HERE, "lib/check.mjs"), "--full"], { stdio: "inherit" });
  fail("some dependencies are still missing");
}
console.log(`done. Python: ${VENV_PY}`);

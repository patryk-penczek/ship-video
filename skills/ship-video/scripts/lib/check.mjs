// Reports whether everything the engine needs is installed. Exit code 1 if anything is missing.
// usage: node check.mjs [--full]
// Fast path: setup.sh writes $HOME_DIR/.ready with a hash of scripts/package.json; if it matches, nothing else is checked.
// --full (or a missing/stale marker) runs every check and refreshes the marker.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { help, HOME_DIR } from "./common.mjs";
help(import.meta.url);

const MARKER = path.join(HOME_DIR, ".ready");
const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json");
export const depsHash = () => createHash("sha256").update(readFileSync(pkg)).digest("hex").slice(0, 16);

if (!process.argv.includes("--full") && existsSync(MARKER) && readFileSync(MARKER, "utf8").trim() === depsHash()) {
  console.log(`ready (deps in ${HOME_DIR}; run with --full to re-check)`);
  process.exit(0);
}

const PY = path.join(HOME_DIR, ".venv/bin/python");
const run = (cmd, a) => { try { return execFileSync(cmd, a, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return null; } };
const checks = [
  ["node ≥ 20", Number(process.versions.node.split(".")[0]) >= 20],
  ["ffmpeg", run("ffmpeg", ["-version"]) !== null],
  ["playwright", existsSync(path.join(HOME_DIR, "node_modules/playwright"))],
  ["gsap", existsSync(path.join(HOME_DIR, "node_modules/gsap"))],
  ["chromium", (() => {
    const exe = run("node", ["-e", `console.log(require(${JSON.stringify(path.join(HOME_DIR, "node_modules/playwright"))}).chromium.executablePath())`]);
    return !!exe && existsSync(exe);
  })()],
  ["python + librosa", run(PY, ["-I", "-c", "import librosa"]) !== null],
  ["demucs (optional)", run(PY, ["-I", "-c", "import demucs"]) !== null, true],
];
let missing = 0;
for (const [name, ok, optional] of checks) {
  console.log(`${ok ? "✓" : optional ? "·" : "✗"} ${name}`);
  if (!ok && !optional) missing++;
}
if (missing) {
  console.log(`\n${missing} missing → run setup.sh (deps go to ${HOME_DIR})`);
  process.exit(1);
}
writeFileSync(MARKER, depsHash() + "\n");
console.log(`\nready (deps in ${HOME_DIR})`);

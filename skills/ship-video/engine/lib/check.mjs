// Reports whether everything the engine needs is installed. Exit code 1 if anything is missing.
// usage: node check.mjs
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { HOME_DIR } from "./common.mjs";

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
console.log(missing ? `\n${missing} missing → run setup.sh (deps go to ${HOME_DIR})` : `\nready (deps in ${HOME_DIR})`);
process.exit(missing ? 1 : 0);

// Shows the finished film to the user: opens its folder in the file manager with the file selected (macOS Finder, Windows Explorer; Linux opens the folder).
// usage: node reveal.mjs <film/out/film-crisp.mp4 | folder>
// Prints the path either way. Opens nothing over SSH, in CI, or on Linux without a display: then the printed path is the hand-off.
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { help, die } from "./lib/common.mjs";
help(import.meta.url);

const argv = process.argv.slice(2);
const flag = argv.find((x) => /^--?[a-z]/i.test(x));
if (flag) die(`unknown option ${flag} (reveal.mjs takes only <file or folder>)`);
if (argv.length !== 1) die("usage: node reveal.mjs <film/out/film-crisp.mp4 | folder>");
const target = path.resolve(argv[0]);
if (!existsSync(target)) die(`not found: ${argv[0]}`);
const isDir = statSync(target).isDirectory(), dir = isDir ? target : path.dirname(target);
console.log(target);

const env = process.env;
const remote = env.SSH_CONNECTION || env.SSH_TTY || env.CI;
const headless = process.platform === "linux" && !env.DISPLAY && !env.WAYLAND_DISPLAY;
if (remote || headless) { console.log("no desktop here: open the path above yourself"); process.exit(0); }

const [cmd, cmdArgs] =
  process.platform === "darwin" ? ["open", isDir ? [dir] : ["-R", target]]
  : process.platform === "win32" ? ["explorer.exe", isDir ? [dir] : [`/select,"${target}"`]]
  : ["xdg-open", [dir]];
// detached: the file manager outlives this script; explorer.exe exits 1 even on success, so its exit code is ignored
const p = spawn(cmd, cmdArgs, { detached: true, stdio: "ignore", windowsVerbatimArguments: process.platform === "win32" });
p.on("error", () => console.log(`could not start ${cmd}: open the path above yourself`));
p.unref();

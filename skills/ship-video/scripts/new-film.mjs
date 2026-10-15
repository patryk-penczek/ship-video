// Creates a film folder from the starter: index.html, engine.js, base.css, film.css, app.css, ui.js, screens.js, film.js, gallery.html, env.js, gsap.min.js, fonts/, img/, out/, review/.
// usage: node new-film.mjs <dir> [--theme auto|light|dark] [--silent]
//   --silent  a film without a track: hits: [] (no camera shake on beats) and no word-per-beat demo scene (its 2 s go to the hook)
//   <dir> is an empty or new folder; prints full paths of the follow-up commands
//   --theme  the film's look: light = light tokens, no black vignette or grain, dark caption pill; dark = the dark starter palette;
//            auto (default) = follows the captured app: <html data-theme="auto"> turns light when the app's background is light (capture.mjs records it)
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { help, args, HOME_DIR, die } from "./lib/common.mjs";
help(import.meta.url);

const a = args(undefined, ["silent", "help"]);
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = a._[0], theme = a.theme ?? "auto";
if (!dir || a._.length > 1 || Object.keys(a).some((k) => !["_", "theme", "silent", "help"].includes(k))) die("usage: node new-film.mjs <dir> [--theme auto|light|dark] [--silent]   (one folder name; it must not exist yet or be empty)");
if (!/^(auto|light|dark)$/.test(theme)) die("--theme must be auto, light or dark");
const existed = existsSync(dir);
if (existed && !statSync(dir).isDirectory()) die(`${dir} exists and is a file`);
if (existed && readdirSync(dir).length) die(`${dir} exists and is not empty`);
const nm = path.join(HOME_DIR, "node_modules");
if (!existsSync(nm)) die(`deps missing in ${HOME_DIR}. Run ${path.join(here, "setup.sh")} first.`);

const starter = path.join(here, "../assets/starter");
try {
  mkdirSync(path.join(dir, "fonts"), { recursive: true });
  for (const sub of ["img", "out", "review"]) mkdirSync(path.join(dir, sub), { recursive: true });
  cpSync(starter, dir, { recursive: true });
  cpSync(path.join(nm, "gsap/dist/gsap.min.js"), path.join(dir, "gsap.min.js"));
  cpSync(path.join(nm, "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"), path.join(dir, "fonts/inter.woff2"));
  cpSync(path.join(nm, "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"), path.join(dir, "fonts/mono.woff2"));
  if (theme !== "auto") { // fix the look instead of following the captured app
    const f = path.join(dir, "index.html"), h = readFileSync(f, "utf8").replace('<html lang="en" data-theme="auto">', theme === "light" ? '<html lang="en" data-theme="light" class="light">' : '<html lang="en" data-theme="dark">');
    writeFileSync(f, h);
  }
  if (a.silent) {
    const f = path.join(dir, "film.js");
    let h = readFileSync(f, "utf8");
    const i = h.indexOf("    // 2–4"), j = h.indexOf("    // 4–8");
    if (i < 0 || j < 0) throw new Error("starter film.js changed: --silent markers missing");
    h = h.slice(0, i) + h.slice(j);
    h = h.replace(/hits: \[\[.*?\]\], \/\/[^\n]*/, "hits: [], // silent film: no beat shake").replace("}</div>${UI.app()}`, 0, 2);", "}</div>${UI.app()}`, 0, 4);").replace("push(c0, 0, 2, 1, 1.07);", "push(c0, 0, 4, 1, 1.07);");
    h = h.replace("`, 0, 2);\n    const c0", "`, 0, 4);\n    const c0").replace("// 0–2 · hook", "// 0–4 · hook");
    writeFileSync(f, h);
  }
  writeFileSync(path.join(dir, "env.js"), "window.ENV = null; // audio-reactive envelope: node music.mjs envelope <track> env.js (with a track); keep null for a silent film\n");
} catch (e) {
  if (!existed) rmSync(dir, { recursive: true, force: true });
  die(`could not create ${dir}: ${e.message.split("\n")[0]}`);
}
const q = (p) => (/[^\w./@:+-]/.test(p) ? JSON.stringify(p) : p);
console.log(`film → ${dir}\n  preview: open ${q(path.join(dir, "index.html"))}\n  render:  node ${q(path.join(here, "render.mjs"))} ${q(path.join(dir, "index.html"))} ${q(path.join(dir, "out/film.mp4"))}`);

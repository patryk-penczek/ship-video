// Creates a film folder from the starter: index.html, engine.js, base.css, film.css, app.css, ui.js, screens.js, film.js, gallery.html, env.js, gsap.min.js, fonts/, img/, out/, review/.
// usage: node new-film.mjs <dir>     (an empty or new folder; prints full paths of the follow-up commands)
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { help, HOME_DIR, die } from "./lib/common.mjs";
help(import.meta.url);

const argv = process.argv.slice(2);
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = argv[0];
if (!dir || dir.startsWith("-") || argv.length > 1) die("usage: node new-film.mjs <dir>   (one folder name; it must not exist yet or be empty)");
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
  writeFileSync(path.join(dir, "env.js"), "window.ENV = null; // audio-reactive envelope: node music.mjs envelope <track> env.js (with a track); keep null for a silent film\n");
} catch (e) {
  if (!existed) rmSync(dir, { recursive: true, force: true });
  die(`could not create ${dir}: ${e.message.split("\n")[0]}`);
}
const q = (p) => (/[^\w./@:+-]/.test(p) ? JSON.stringify(p) : p);
console.log(`film → ${dir}\n  preview: open ${q(path.join(dir, "index.html"))}\n  render:  node ${q(path.join(here, "render.mjs"))} ${q(path.join(dir, "index.html"))} ${q(path.join(dir, "out/film.mp4"))}`);

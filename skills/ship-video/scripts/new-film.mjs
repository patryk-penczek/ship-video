// Creates a film folder from the starter: index.html, engine.js, base.css, film.css, ui.js, film.js, env.js, gsap.min.js, fonts/.
// usage: node new-film.mjs <dir>
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { help, HOME_DIR } from "./lib/common.mjs";
help(import.meta.url);

const dir = process.argv[2];
if (!dir) { console.error("usage: node new-film.mjs <dir>"); process.exit(1); }
if (existsSync(dir) && readdirSync(dir).length) { console.error(`${dir} exists and is not empty`); process.exit(1); }
const nm = path.join(HOME_DIR, "node_modules");
if (!existsSync(nm)) { console.error(`deps missing in ${HOME_DIR}. Run scripts/setup.sh first.`); process.exit(1); }

const starter = path.join(path.dirname(fileURLToPath(import.meta.url)), "../assets/starter");
mkdirSync(path.join(dir, "fonts"), { recursive: true });
mkdirSync(path.join(dir, "img"), { recursive: true });
cpSync(starter, dir, { recursive: true });
cpSync(path.join(nm, "gsap/dist/gsap.min.js"), path.join(dir, "gsap.min.js"));
cpSync(path.join(nm, "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"), path.join(dir, "fonts/inter.woff2"));
cpSync(path.join(nm, "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"), path.join(dir, "fonts/mono.woff2"));
writeFileSync(path.join(dir, "env.js"), "window.ENV = null; // generate with audio/envelope.py (track) or audio/grid.mjs (no music)\n");
console.log(`film → ${dir}\n  preview: open ${path.join(dir, "index.html")}\n  render:  node render.mjs ${path.join(dir, "index.html")} out.mp4`);

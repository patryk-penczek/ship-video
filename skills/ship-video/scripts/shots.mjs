// Full-resolution stills at given times.
// usage: node shots.mjs <film/index.html> <outDir> t1 t2 ... [--label]   -> outDir/<t>.png  (--label stamps the time on each frame)
// File name = time in seconds, 2 decimals, zero-padded to 6 chars: t=1.5 -> 001.50.png, t=17 -> 017.00.png, t=102.5 -> 102.50.png.
// Times must be numbers between 0 and the film length.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { existsSync } from "node:fs";
import { help, args, openFilm, die, known } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
known(a, ["label"]);
const [html, outDir, ...times] = a._;
if (!html || !outDir || !times.length) die("usage: node shots.mjs <film/index.html> <outDir> t1 t2 ... [--label]");
const ts = times.map(Number);
const names = ts.map((t) => `${t.toFixed(2).padStart(6, "0")}.png`), dupe = names.find((n, i) => names.indexOf(n) !== i);
if (dupe) die(`two times map to the same file ${dupe} (names have 2 decimals); use times at least 0.01 s apart`);
const badT = times.filter((_, i) => !Number.isFinite(ts[i]) || ts[i] < 0);
if (badT.length) die(`times must be numbers >= 0, got: ${badT.join(" ")}`);
if (!existsSync(html)) die(`film not found: ${html}`);
const { browser, page, seek, duration } = await openFilm(html);
const late = ts.filter((t) => t > duration);
if (late.length) { await browser.close(); die(`times past the end of the ${duration.toFixed(2)} s film: ${late.join(" ")}`); }
mkdirSync(outDir, { recursive: true });
for (const t of ts) {
  await seek(t);
  if (a.label) await page.evaluate((tt) => {
    let el = document.getElementById("__label");
    if (!el) { el = document.createElement("div"); el.id = "__label"; el.style.cssText = "position:fixed;left:0;top:0;z-index:99;padding:6px 14px;background:#e11;color:#fff;font:700 40px monospace"; document.body.appendChild(el); }
    el.textContent = tt.toFixed(2);
  }, t);
  await page.screenshot({ path: path.join(outDir, `${t.toFixed(2).padStart(6, "0")}.png`) });
}
await browser.close();
console.log(`${times.length} stills → ${outDir}`);

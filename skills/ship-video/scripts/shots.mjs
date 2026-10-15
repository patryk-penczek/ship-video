// Full-resolution stills at given times.
// usage: node shots.mjs <film/index.html> <outDir> t1 t2 ... [--label]   -> outDir/<t>.png  (--label stamps the time on each frame)
import { mkdirSync } from "node:fs";
import path from "node:path";
import { help, args, openFilm } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
const [html, outDir, ...times] = a._;
if (!html || !outDir || !times.length) { console.error("usage: node shots.mjs <film/index.html> <outDir> t1 t2 ... [--label]"); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const { browser, page, seek } = await openFilm(html);
for (const t of times.map(Number)) {
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

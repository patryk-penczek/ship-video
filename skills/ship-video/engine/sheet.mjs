// Contact sheet: frames from..to every step, time-stamped, tiled into one PNG.
// usage: node sheet.mjs <film/index.html> <from> <to> <step> <out.png> [--cols 6]
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { args, openFilm } from "./lib/common.mjs";

const a = args();
const [html, fromS, toS, stepS, out] = a._;
if (!out) { console.error("usage: node sheet.mjs <film/index.html> <from> <to> <step> <out.png> [--cols 6]"); process.exit(1); }
const [from, to, step] = [fromS, toS, stepS].map(Number);
const cols = Number(a.cols ?? 6);
const tmp = mkdtempSync(path.join(os.tmpdir(), "ship-video-sheet-"));
try {
  const { browser, page, seek } = await openFilm(html);
  await page.addStyleTag({ content: "#__label{position:fixed;left:0;top:0;z-index:99;padding:8px 18px;background:#e11;color:#fff;font:700 64px monospace}" });
  await page.evaluate(() => { const el = document.createElement("div"); el.id = "__label"; document.body.appendChild(el); });
  const n = Math.round((to - from) / step) + 1;
  for (let i = 0; i < n; i++) {
    const t = from + i * step;
    await seek(t);
    await page.evaluate((tt) => { document.getElementById("__label").textContent = tt.toFixed(2); }, t);
    await page.screenshot({ path: path.join(tmp, `${String(i).padStart(4, "0")}.png`), type: "png" });
  }
  await browser.close();
  const count = readdirSync(tmp).length;
  const rows = Math.ceil(count / cols);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-pattern_type", "glob", "-i", path.join(tmp, "*.png"), "-vf", `scale=480:-1,tile=${cols}x${rows}:padding=4:color=black`, "-frames:v", "1", path.resolve(out)]);
  console.log(`${count} frames → ${out}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

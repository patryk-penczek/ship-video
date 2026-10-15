// Contact sheet: frames from..to every step, time-stamped, tiled into one PNG.
// usage: node sheet.mjs <film/index.html> <from> <to> <step> <out.png> [--cols 6]
// step > 0, to >= from, at most 600 frames; <to> past the film's end is clamped. Every frame appears (the last row is padded black).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { help, args, openFilm, die, num, known, onExit } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
known(a, ["cols"]);
const [html, fromS, toS, stepS, out] = a._;
if (!out) die("usage: node sheet.mjs <film/index.html> <from> <to> <step> <out.png> [--cols 6]");
const [from, to0, step] = [fromS, toS, stepS].map(Number);
if (![from, to0, step].every(Number.isFinite) || from < 0 || step <= 0 || to0 < from) die("need numeric <from> <to> <step> with from >= 0, step > 0 and to >= from");
const cols = num(a, "cols", 6, { min: 1, max: 40, int: true });
if (!/\.(png|jpe?g)$/i.test(out)) die("out must end in .png or .jpg");
if (Math.floor((to0 - from) / step + 1e-9) + 1 > 600) die("more than 600 frames; raise <step>");
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const tmp = mkdtempSync(path.join(os.tmpdir(), "ship-video-sheet-"));
onExit(() => rmSync(tmp, { recursive: true, force: true })); // die() skips `finally`
try {
  const { browser, page, seek, duration } = await openFilm(html);
  try {
    const to = Math.min(to0, duration);
    if (to < to0) console.error(`note: film is ${duration.toFixed(2)} s long, sheet stops there`);
    if (from > to) die(`<from> ${from} is past the end of the ${duration.toFixed(2)} s film`);
    await page.addStyleTag({ content: "#__label{position:fixed;left:0;top:0;z-index:99;padding:8px 18px;background:#e11;color:#fff;font:700 64px monospace}" });
    await page.evaluate(() => { const el = document.createElement("div"); el.id = "__label"; document.body.appendChild(el); });
    const n = Math.floor((to - from) / step + 1e-9) + 1;
    for (let i = 0; i < n; i++) {
      const t = from + i * step;
      await seek(t);
      await page.evaluate((tt) => { document.getElementById("__label").textContent = tt.toFixed(2); }, t);
      await page.screenshot({ path: path.join(tmp, `${String(i).padStart(4, "0")}.png`), type: "png" });
    }
    const rows = Math.ceil(n / cols);
    // pad the grid with black tiles so ffmpeg's tile filter always gets a full grid (a partial one can lose frames)
    const black = path.join(tmp, "black.png");
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=black:s=1920x1080", "-frames:v", "1", black]);
    for (let i = n; i < rows * cols; i++) copyFileSync(black, path.join(tmp, `${String(i).padStart(4, "0")}.png`));
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", "1", "-i", path.join(tmp, "%04d.png"), "-vf", `scale=480:-1,tile=${cols}x${rows}:padding=4:color=black`, "-frames:v", "1", "-update", "1", path.resolve(out)], { stdio: ["ignore", "ignore", "pipe"] });
    console.log(`${n} frames → ${out} (${cols} x ${rows} grid, ${(statSync(out).size / 1e6).toFixed(1)} MB)`);
  } finally {
    await browser.close();
  }
} catch (e) {
  die(e.stderr ? `ffmpeg failed: ${String(e.stderr).trim().split("\n").pop()}` : String(e.message).split("\n")[0]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

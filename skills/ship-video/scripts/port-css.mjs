// Port an app's CSS into a film: scoped under .app-shot, ready for captured screens (see capture.mjs, which can do this with --css).
// usage: node port-css.mjs <app-url> <film>/app.css [--path /radar] [--root "#root > .app"]
//        node port-css.mjs <a.css> [<b.css> …] <film>/app.css [--root sel]        (fallback when the app is not running)
// From a URL it reads the CSSOM of the live page, so it works with any bundler or dev server (Vite, Bun, Next, CSS-in-JS).
// Rewrites: :root/html/body/#root rules → .app-shot (html/body attributes such as data-theme move to the wrapper); every other
//   selector → :where(.app-shot) <selector> (same specificity as in the app); @media/@supports resolved for 1920×1080 (matching
//   branches kept); @keyframes dropped (films animate on the timeline); position:fixed → absolute, and the app root static so
//   overlays anchor to the 1920×1080 wrapper; vh/vw/vmin/vmax → px; font and image files copied to <film>/fonts and <film>/img.
// Add <link rel="stylesheet" href="app.css"> before film.css (the starter has it). Prints the font faces to list in film.js `fonts:`.
import path from "node:path";
import { help, args, load, die, mustExist } from "./lib/common.mjs";
import { W, H, detectRoot, pageInfo, collectSheets, sheetsFromFiles, portCss } from "./lib/port.mjs";
help(import.meta.url);

const a = args();
const out = a._.at(-1), inputs = a._.slice(0, -1);
if (!inputs.length || !out?.endsWith(".css")) die("usage: node port-css.mjs <app-url> <film>/app.css   |   node port-css.mjs <a.css> … <film>/app.css");
const film = path.dirname(out);
const { chromium } = load("playwright");
const browser = await chromium.launch();
try {
  let sheets, info, sel;
  const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: "reduce" });
  if (/^https?:/.test(inputs[0])) {
    await page.goto(new URL(a.path ?? "", inputs[0]).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    sel = a.root ?? await detectRoot(page);
    sheets = await collectSheets(page);
  } else {
    inputs.forEach((f) => mustExist(f, "css file"));
    await page.setContent('<!doctype html><html><body><div id="root"><div class="app"></div></div></body></html>');
    sel = a.root ?? "#root > .app";
    sheets = sheetsFromFiles(inputs);
  }
  info = await pageInfo(page, sel);
  await page.close();
  const r = await portCss(browser, sheets, info, film, out);
  console.log(`css → ${r.out} (${sheets.length} stylesheets; ${r.copied.length} font/image files copied; ${r.stats.keyframes} @keyframes dropped, ${r.stats.media} @media branches skipped, ${r.stats.fixed} position:fixed → absolute)`);
  console.log(`fonts (list in film.js "fonts:"): ${JSON.stringify(r.fonts)}`);
} finally { await browser.close(); }

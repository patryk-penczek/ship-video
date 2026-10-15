// Port an app's CSS into a film: scoped under .app-shot, ready for captured screens (see capture.mjs, which can do this with --css).
// usage: node port-css.mjs <app-url> <film>/app.css [--path /radar] [--root "#root > .app"] [--viewport 390x844]
//        node port-css.mjs <a.css> [<b.css> …] <film>/app.css [--root sel]        (fallback when the app is not running)
// From a URL it reads the CSSOM of the live page, so it works with any bundler or dev server (Vite, Bun, Next, CSS-in-JS).
// Rewrites: :root/html/body/#root rules → .app-shot (html/body attributes such as data-theme move to the wrapper); every other
//   selector → :where(.app-shot) <selector> (same specificity as in the app); @media/@supports resolved for 1920×1080 (matching
//   branches kept); @keyframes dropped (films animate on the timeline); position:fixed → absolute, and the app root static so
//   overlays anchor to the 1920×1080 wrapper; vh/vw/vmin/vmax → px; font and image files copied to <film>/fonts and <film>/img.
//   --viewport WxH  capture size of a phone/narrow app (default 1920x1080): vh/vw/@media resolve for it; .app-shot gets that size, centred on the stage.
// Add <link rel="stylesheet" href="app.css"> before film.css (the starter has it). Prints the font faces to list in film.js `fonts:`.
import path from "node:path";
import { help, args, load, die, mustExist, known } from "./lib/common.mjs";
import { envOptions, gotoPage } from "./lib/drive.mjs";
import { detectRoot, pageInfo, collectSheets, sheetsFromFiles, portCss } from "./lib/port.mjs";
help(import.meta.url);

const a = args();
known(a, ["path", "root", "viewport"]);
const env = envOptions({ viewport: a.viewport });
if (a.path === true || a.root === true) die("--path and --root need a value");
const out = a._.at(-1), inputs = a._.slice(0, -1);
if (!inputs.length || !out?.endsWith(".css")) die("usage: node port-css.mjs <app-url> <film>/app.css   |   node port-css.mjs <a.css> … <film>/app.css");
const film = path.dirname(out);
const { chromium } = load("playwright");
const browser = await chromium.launch();
try {
  let sheets, info, sel;
  const page = await browser.newPage({ viewport: { width: env.width, height: env.height }, reducedMotion: "reduce" });
  if (/^https?:/.test(inputs[0])) {
    await gotoPage(page, new URL(a.path ?? "", inputs[0]).href);
    await page.evaluate(() => document.fonts.ready);
    sel = a.root ?? await detectRoot(page);
    if (a.root && !(await page.$(a.root))) die(`--root "${a.root}" matches nothing on ${page.url()}`);
    sheets = await collectSheets(page);
  } else {
    inputs.forEach((f) => mustExist(f, "css file"));
    await page.setContent('<!doctype html><html><body><div id="root"><div class="app"></div></div></body></html>');
    sel = a.root ?? "#root > .app";
    sheets = sheetsFromFiles(inputs);
  }
  info = await pageInfo(page, sel);
  await page.close();
  const r = await portCss(browser, sheets, info, film, out, { viewport: [env.width, env.height] });
  console.log(`css → ${r.out} (${sheets.length} stylesheets; ${r.copied.length} font/image files copied; ${r.stats.keyframes} @keyframes dropped, ${r.stats.media} @media branches skipped, ${r.stats.fixed} position:fixed → absolute)`);
  console.log(`fonts (list in film.js "fonts:"): ${JSON.stringify(r.fonts)}${r.variable.length ? `\n  variable fonts (weight range; any weight inside it loads the same file): ${r.variable.join(", ")}` : ""}`);
  if (r.failed.length) process.exitCode = 1;
} finally { await browser.close(); }

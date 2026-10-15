// Real app vs replica, one state at a time: screenshots the running app after each state's actions and the matching
// .frame[data-state] of the replica gallery, prints a pixel-diff % per state and stacks real / replica / diff into <outDir>/<state>.png
// (the diff alone: <state>-diff.png). Read every PNG. Target: under ~2 % per state; text anti-aliasing alone is about 0.3 %.
// usage: node compare.mjs <app-url> <film>/gallery.html <outDir> --states states.json [--width 1920 --height 1080] [--scale 0.5] [--full] [--max-diff 2]
//   states.json is the file capture.mjs reads (actions: click fill type press hover select check set scroll waitFor wait goto eval;
//   `continue: true` reuses the previous state's page). Each state name must match a gallery .frame[data-state].
//   --scale   size of the images in the stacked PNG (default 0.5; 1 = pixel for pixel)
//   --full    compare the whole page height instead of the 1080 viewport (replica frame is stretched to the real page's height)
//   --max-diff N  mark states above N % as OVER (default 2)
// The app runs with reduced motion and CSS animations/transitions frozen, so screenshots are stable.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { help, args, load, die, mustExist, known, num } from "./lib/common.mjs";
import { drive, readStates, freezePage } from "./lib/drive.mjs";
help(import.meta.url);

const a = args(undefined, ["full", "help"]);
known(a, ["states", "width", "height", "scale", "full", "max-diff"]);
const [url, gallery, outDir] = a._;
if (a.states === true) die("--states needs a file");
if (!url || !gallery || !outDir || !a.states) die("usage: node compare.mjs <app-url> <gallery.html> <outDir> --states states.json [--scale 1] [--full]");
mustExist(gallery, "gallery"); mustExist(a.states, "states file");
const states = readStates(a.states);
const W = num(a, "width", 1920, { min: 320, max: 7680, int: true }), H = num(a, "height", 1080, { min: 240, max: 4320, int: true });
const scale = num(a, "scale", 0.5, { min: 0.1, max: 2 }), max = num(a, "max-diff", 2, { min: 0, max: 100 });
if (W !== 1920 || H !== 1080) console.error(`note: the gallery frames are 1920x1080; a ${W}x${H} app will differ everywhere`);

// Runs in a blank page: per-pixel diff of two PNGs (a channel differing by more than 24/255 counts) and a diff image.
async function diff(page, real, replica) {
  return page.evaluate(async ([A, B]) => {
    const load = (b) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `data:image/png;base64,${b}`; });
    const [ia, ib] = [await load(A), await load(B)], w = ia.width, h = ia.height;
    const px = (img) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = "#f0f"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h); };
    const da = px(ia), db = px(ib), out = new ImageData(w, h);
    let bad = 0;
    for (let i = 0; i < da.data.length; i += 4) {
      const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
      const g = (da.data[i] + da.data[i + 1] + da.data[i + 2]) / 3 * 0.25;
      if (d > 24) { bad++; out.data[i] = 255; out.data[i + 1] = 40; out.data[i + 2] = 40; } else { out.data[i] = out.data[i + 1] = out.data[i + 2] = g; }
      out.data[i + 3] = 255;
    }
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").putImageData(out, 0, 0);
    return { pct: bad / (w * h) * 100, png: c.toDataURL("image/png").split(",")[1], size: [w, h, ib.width, ib.height] };
  }, [real, replica]);
}

mkdirSync(outDir, { recursive: true });
const { chromium } = load("playwright");
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const errors = [], rows = [];
try {
  const gal = await browser.newPage({ viewport: { width: W, height: H } });
  gal.on("pageerror", (e) => errors.push(`[gallery] ${e.message}`));
  await gal.goto(pathToFileURL(path.resolve(gallery)).href);
  await gal.addStyleTag({ content: ".frame::before{display:none!important}" }); // the state label would count as a difference
  await gal.evaluate(() => document.fonts.ready);
  await gal.waitForTimeout(300);
  const tool = await browser.newPage({ viewport: { width: 400, height: 300 } });

  await drive(browser, url, states, { width: W, height: H, errors, animate: false }, async (app, st) => {
    if (st.capture === false) return; // drive-only state, same meaning as in capture.mjs
    const fullPage = !!(st.full ?? a.full);
    // a click may have scrolled the real page (the replica is captured at scroll 0): put window and scroll containers back first
    await app.evaluate(() => { window.scrollTo(0, 0); for (const e of document.querySelectorAll("*")) if (e.scrollTop || e.scrollLeft) { e.scrollTop = 0; e.scrollLeft = 0; } });
    await app.waitForTimeout(100);
    if (st.canvas) console.error(`note [${st.name}] canvas state: pixels inside animated canvases differ from the captured frame; judge the rest`);
    const realBuf = await app.screenshot({ fullPage });
    const real = realBuf.toString("base64");
    const frame = await gal.$(`.frame[data-state="${st.name}"]`);
    if (!frame) { errors.push(`gallery has no .frame[data-state="${st.name}"]`); return; }
    const full = fullPage ? await app.evaluate(() => document.documentElement.scrollHeight) : H;
    if (fullPage) await frame.evaluate((f, h) => { f.style.height = `${h}px`; f.querySelectorAll(".app-shot").forEach((s) => { s.style.height = `${h}px`; }); }, full);
    const replica = (await frame.screenshot()).toString("base64");
    if (fullPage) await frame.evaluate((f) => { f.style.height = ""; f.querySelectorAll(".app-shot").forEach((s) => { s.style.height = ""; }); });
    const d = await diff(tool, real, replica);
    writeFileSync(path.join(outDir, `${st.name}-diff.png`), Buffer.from(d.png, "base64"));

    const sheet = await browser.newPage({ viewport: { width: Math.round(W * scale), height: 100 } });
    const img = (b) => `<img src="data:image/png;base64,${b}" style="display:block;width:100%">`;
    const bar = (c, t) => `<div style="padding:6px 10px;background:${c}">${t}</div>`;
    await sheet.setContent(`<body style="margin:0;background:#111;font:600 16px system-ui;color:#fff">
      ${bar("#0a6", `REAL · ${st.name}`)}${img(real)}${bar("#a40", `REPLICA · ${st.name}`)}${img(replica)}${bar(d.pct > max ? "#c22" : "#446", `DIFF · ${st.name} · ${d.pct.toFixed(2)} %`)}${img(d.png)}</body>`);
    await sheet.screenshot({ path: path.join(outDir, `${st.name}.png`), fullPage: true });
    await sheet.close();
    rows.push({ name: st.name, pct: +d.pct.toFixed(2), real: d.size.slice(0, 2), replica: d.size.slice(2) });
    console.log(`${st.name.padEnd(18)} diff ${d.pct.toFixed(2).padStart(6)} %${d.pct > max ? "  OVER" : ""}${d.size[1] !== d.size[3] ? `  (size ${d.size[0]}x${d.size[1]} vs ${d.size[2]}x${d.size[3]})` : ""}  → ${path.join(outDir, `${st.name}.png`)}`);
  });
} finally {
  await browser.close();
}
writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(rows, null, 1));
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

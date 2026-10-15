// Real app vs replica, one state at a time: screenshots the running app after each state's actions and the matching
// .frame[data-state] of the replica gallery, and stacks them (real on top) into <outDir>/<state>.png. Read every PNG.
// usage: node compare.mjs <app-url> <film>/gallery.html <outDir> --states states.json [--width 1920 --height 1080]
// states.json: [{ "name": "home", "path": "/", "actions": [{ "click": ".add-city" }, { "type": "Bar" }, { "press": "Enter" }, { "wait": 200 }] }]
//   actions: click <selector> · fill [<selector>, <text>] · type <text> · press <key> · hover <selector> · wait <ms> · eval <js>
// The app runs with reduced motion and CSS animations/transitions frozen, so screenshots are stable.
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { help, args, load } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
const [url, gallery, outDir] = a._;
if (!url || !gallery || !outDir || !a.states) { console.error("usage: node compare.mjs <app-url> <gallery.html> <outDir> --states states.json"); process.exit(1); }
const states = JSON.parse(readFileSync(a.states, "utf8"));
const W = Number(a.width ?? 1920), H = Number(a.height ?? 1080);
mkdirSync(outDir, { recursive: true });

const { chromium } = load("playwright");
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const FREEZE = "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}";
const errors = [];
try {
  const gal = await browser.newPage({ viewport: { width: W, height: H } });
  gal.on("pageerror", (e) => errors.push(`[gallery] ${e.message}`));
  await gal.goto(pathToFileURL(path.resolve(gallery)).href);
  await gal.evaluate(() => document.fonts.ready);
  await gal.waitForTimeout(300);

  for (const st of states) {
    const app = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: "reduce" });
    app.on("pageerror", (e) => errors.push(`[app ${st.name}] ${e.message}`));
    await app.goto(new URL(st.path ?? "", url).href, { waitUntil: "networkidle" });
    await app.addStyleTag({ content: FREEZE });
    for (const act of st.actions ?? []) {
      const [k, v] = Object.entries(act)[0];
      if (k === "click") await app.click(v);
      else if (k === "fill") await app.fill(v[0], v[1]);
      else if (k === "type") await app.keyboard.type(v);
      else if (k === "press") await app.keyboard.press(v);
      else if (k === "hover") await app.hover(v);
      else if (k === "wait") await app.waitForTimeout(v);
      else if (k === "eval") await app.evaluate(v);
      else throw new Error(`state ${st.name}: unknown action "${k}"`);
    }
    await app.evaluate(() => document.fonts.ready);
    await app.waitForTimeout(150);
    const real = (await app.screenshot()).toString("base64");
    await app.close();

    const frame = await gal.$(`.frame[data-state="${st.name}"]`);
    if (!frame) { errors.push(`gallery has no .frame[data-state="${st.name}"]`); continue; }
    const replica = (await frame.screenshot()).toString("base64");

    const sheet = await browser.newPage({ viewport: { width: W / 2, height: H + 80 } });
    await sheet.setContent(`<body style="margin:0;background:#111;font:600 16px system-ui;color:#fff">
      <div style="padding:6px 10px;background:#0a6">REAL · ${st.name}</div><img src="data:image/png;base64,${real}" style="display:block;width:100%">
      <div style="padding:6px 10px;background:#a40">REPLICA · ${st.name}</div><img src="data:image/png;base64,${replica}" style="display:block;width:100%"></body>`);
    await sheet.screenshot({ path: path.join(outDir, `${st.name}.png`), fullPage: true });
    await sheet.close();
    console.log(`${st.name} → ${path.join(outDir, `${st.name}.png`)}`);
  }
} finally {
  await browser.close();
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

// Capture the running app into a film: one outerHTML per state → <film>/screens.js, a screenshot per state →
// <film>/review/discovery/<state>.png, and (--css) the app's stylesheets ported to <film>/app.css.
// usage: node capture.mjs <app-url> <states.json> <film> [--css] [--root "#root > .app"] [--full] [--only a,b]
//        node capture.mjs <app-url> <film> --discover [--routes /,/radar,/compare] [--depth 2]
// states.json (same file compare.mjs reads): [{ "name": "palette", "path": "/", "actions": [{ "press": "Control+k" }, { "type": "Rey" }, { "wait": 200 }] }]
//   state keys: name · path · actions · continue (keep the previous state's page, no reload) · capture:false (drive only)
//     · root (selector for this state) · full (full-page screenshot) · canvas { frames: N, every: ms, steps: [[actions], …] }
//   actions: click <sel> · dblclick <sel> · fill [<sel>, <text>] · type <text> · press <key> · hover <sel> · select [<sel>, <v>]
//     · check <sel> · set [<sel>, <v>] (range inputs) · scroll <y>|[<sel>, <y>] · waitFor <sel> · wait <ms> · goto <path> · eval <js>
//   Use `fill`, not Control+A + type: on macOS Control+A moves the caret to the line start. `wait` covers timers (a 4 s toast).
// Per state it bakes input/textarea values and checked state into attributes, strips scripts and on* handlers, turns every <canvas>
//   into an <img> (img/<state>-c<k>-<n>.png; canvas.frames grabs N frames over time, data-frames lists them), makes SVG ids unique
//   per state (url(#id) rewritten), and copies images into <film>/img. Output: window.SCREENS (html) + window.SCREENS_META (theme
//   attributes, page height, canvas frames) for ui.js shot()/stack(). --discover only inventories views: every route fully
//   screenshotted into review/discovery/ plus inventory.json (heights, scroll containers, canvases, buttons, links).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { help, args, load, die, mustExist, known, num } from "./lib/common.mjs";
import { drive, readStates, runActions, freezePage } from "./lib/drive.mjs";
import { detectRoot, pageInfo, collectSheets, portCss } from "./lib/port.mjs";
help(import.meta.url);

const a = args(undefined, ["css", "full", "discover", "help"]);
known(a, ["css", "full", "discover", "root", "only", "routes", "depth"]);
for (const k of ["root", "only", "routes"]) if (a[k] === true) die(`--${k} needs a value`);
const url = a._[0], W = 1920, H = 1080;
const { chromium } = load("playwright");

async function discover(film) {
  mustExist(film, "film folder (create it with new-film.mjs)");
  const dir = path.join(film, "review/discovery");
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const norm = (r) => (r.length > 1 ? r.replace(/\/+$/, "") : r) || "/"; // /radar and /radar/ are one view
  const queue = (a.routes ? String(a.routes).split(",").map((r) => r.trim()).filter(Boolean) : ["/"]).map(norm);
  const badRoute = queue.find((r) => !r.startsWith("/") || r.startsWith("//"));
  if (badRoute) die(`--routes: "${badRoute}" must be a path on the app starting with a single /`);
  const errors = [], rows = [];
  const seen = new Set(), depth = num(a, "depth", 2, { min: 0, max: 6, int: true }), origin = new URL(url).origin;
  const level = new Map(queue.map((r) => [r, 0]));
  try {
    while (queue.length && rows.length < 40) {
      const route = queue.shift();
      if (seen.has(route)) continue; seen.add(route);
      const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: "reduce" });
      page.on("pageerror", (e) => errors.push(`[${route}] ${e.message}`));
      const res = await page.goto(new URL(route, url).href, { waitUntil: "networkidle" }).catch((e) => (errors.push(`[${route}] ${e.message.split("\n")[0]}`), null));
      if (!res) { await page.close(); continue; }
      await freezePage(page);
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
      const info = await page.evaluate(() => {
        const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const sel = (e) => e.id ? `#${e.id}` : `${e.tagName.toLowerCase()}${e.classList.length ? "." + [...e.classList].slice(0, 2).join(".") : ""}`;
        const scrollers = [...document.querySelectorAll("*")].filter((e) => e !== document.body && e !== document.documentElement && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 20).map((e) => `${sel(e)} ${e.clientHeight}→${e.scrollHeight}`);
        const text = (e) => (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28);
        return {
          title: document.title, h1: document.querySelector("h1")?.textContent.trim().slice(0, 60) ?? "", height: document.documentElement.scrollHeight, scrollers,
          canvases: document.querySelectorAll("canvas").length, dialogs: document.querySelectorAll("dialog[open], [role=dialog]").length, inputs: document.querySelectorAll("input, textarea, select").length,
          buttons: [...new Set([...document.querySelectorAll("button, [role=tab], [role=button]")].filter(vis).map(text).filter(Boolean))].slice(0, 30),
          links: [...new Set([...document.querySelectorAll("a[href]")].map((l) => l.getAttribute("href")))].slice(0, 40),
        };
      });
      const name = (route.replace(/^\/+|\/+$/g, "").replace(/[^\w.-]+/g, "-") || "home");
      await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
      rows.push({ route, status: res.status(), file: `${name}.png`, ...info });
      for (const l of info.links) {
        let u; try { u = new URL(l, new URL(route, url)); } catch { continue; }
        const r = norm(u.pathname) + u.search;
        if (u.origin === origin && !seen.has(r) && !level.has(r) && (level.get(route) ?? 0) < depth && !/\.\w{2,5}$/.test(u.pathname)) { level.set(r, (level.get(route) ?? 0) + 1); queue.push(r); }
      }
      // SPA tabs are often buttons, not links: click each nav/tab control and note where the URL goes
      const nav = page.locator("[role=tab], nav button, nav a, aside a");
      for (let i = 0, n = Math.min(await nav.count(), 12); i < n && (level.get(route) ?? 0) < depth; i++) {
        try {
          await nav.nth(i).click({ timeout: 1500 }); await page.waitForTimeout(400);
          const r = new URL(page.url()).pathname;
          if (r !== route && !seen.has(r) && !level.has(r)) { level.set(r, (level.get(route) ?? 0) + 1); queue.push(r); }
          if (r !== route) await page.goto(new URL(route, url).href, { waitUntil: "networkidle" });
        } catch {}
      }
      await page.close();
    }
    if (!a.routes || !a.routes.split(",").some((r) => /404|nope|missing/.test(r))) { // an unknown route is a view too
      const probe = "/__no-such-page__", page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: "reduce" });
      const res = await page.goto(new URL(probe, url).href, { waitUntil: "networkidle" }).catch(() => null);
      if (res) { await freezePage(page); await page.waitForTimeout(300); await page.screenshot({ path: path.join(dir, "not-found.png"), fullPage: true }); rows.push({ route: probe, status: res.status(), file: "not-found.png", title: await page.title(), height: await page.evaluate(() => document.documentElement.scrollHeight), note: "unknown route" }); }
      await page.close();
    }
  } finally { await browser.close(); }
  if (!rows.length) { console.error(errors.join("\n")); die(`nothing could be loaded from ${url}: is the app running?`); }
  writeFileSync(path.join(dir, "inventory.json"), JSON.stringify(rows, null, 1));
  for (const r of rows) console.log(`${r.route.padEnd(22)} ${r.status}  h=${String(r.height).padEnd(5)} ${r.file.padEnd(16)} ${r.h1 ?? ""}${r.scrollers?.length ? `  scroll:${r.scrollers.join(", ")}` : ""}${r.canvases ? `  canvas:${r.canvases}` : ""}`);
  console.log(`inventory → ${path.join(dir, "inventory.json")}  (buttons/links per route are in the json; states that need clicks are not crawled)`);
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
}

// Runs in the page: serialises the app root without scripts, with form state and canvases baked in.
function snapshot({ sel, key, canvasSrc, frameSrc }) {
  const root = document.querySelector(sel);
  if (!root) throw new Error(`root "${sel}" not found on the page`);
  const live = [root, ...root.querySelectorAll("*")], clone = root.cloneNode(true), cl = [clone, ...clone.querySelectorAll("*")];
  const assets = new Set(), abs = (u) => { try { const x = new URL(u, document.baseURI); if (/^https?:|^file:/.test(x.protocol)) { assets.add(x.href); return x.href; } } catch {} return u; };
  let ci = 0;
  live.forEach((l, i) => {
    const c = cl[i];
    if (l instanceof HTMLInputElement) {
      if (l.type === "checkbox" || l.type === "radio") l.checked ? c.setAttribute("checked", "") : c.removeAttribute("checked");
      else if (l.type !== "file") c.setAttribute("value", l.value);
    } else if (l instanceof HTMLTextAreaElement) c.textContent = l.value;
    else if (l instanceof HTMLSelectElement) [...c.options].forEach((o, j) => l.options[j].selected ? o.setAttribute("selected", "") : o.removeAttribute("selected"));
    else if (l instanceof HTMLCanvasElement) {
      const img = document.createElement("img");
      for (const at of c.attributes) img.setAttribute(at.name, at.value);
      img.setAttribute("src", canvasSrc[ci] ?? ""); img.setAttribute("alt", "");
      if (frameSrc[ci]?.length > 1) img.setAttribute("data-frames", frameSrc[ci].join(","));
      c.replaceWith(img); ci++;
    } else if (l instanceof HTMLImageElement) { c.setAttribute("src", abs(l.currentSrc || l.src)); c.removeAttribute("srcset"); c.removeAttribute("loading"); }
    else if (l instanceof HTMLVideoElement && l.poster) c.setAttribute("poster", abs(l.poster));
    for (const at of [...c.attributes]) {
      if (/^on/i.test(at.name)) c.removeAttribute(at.name);
      else if ((at.name === "href" || at.name === "xlink:href") && /^(use|image)$/i.test(c.tagName) && !at.value.startsWith("#")) c.setAttribute(at.name, abs(at.value.replace(/#.*/, "")) + (at.value.match(/#.*/)?.[0] ?? ""));
      else if (at.name === "style" && /url\(/.test(at.value)) c.setAttribute("style", at.value.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (m, q, u) => /^data:/.test(u) ? m : `url("${abs(u)}")`));
    }
  });
  clone.querySelectorAll("script, noscript").forEach((s) => s.remove());
  let html = clone.outerHTML;
  // SVG ids repeat across states (gradients, clip paths): a stacked copy would paint with another copy's defs. Suffix per state.
  const ids = [...new Set([...clone.querySelectorAll("svg [id]")].map((e) => e.id))];
  const re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const id of ids) {
    const n = `${id}--${key}`, e = re(id);
    html = html.replace(new RegExp(`(\\sid=")${e}(")`, "g"), `$1${n}$2`)
      .replace(new RegExp(`url\\(((?:&quot;|"|')?)#${e}(?![\\w-])`, "g"), `url($1#${n}`)
      .replace(new RegExp(`((?:xlink:)?href=")#${e}(")`, "g"), `$1#${n}$2`)
      .replace(new RegExp(`(\\s(?:aria-labelledby|aria-describedby|for)=")${e}(")`, "g"), `$1${n}$2`);
  }
  return { html, assets: [...assets], height: document.documentElement.scrollHeight };
}

async function save(url, dir, film, used) { // downloads one asset into <film>/img, returns the film-relative path
  const u = new URL(url); let name = path.basename(u.pathname) || "asset", n = 1;
  const ext = path.extname(name);
  while (used.has(name)) name = `${path.basename(u.pathname, ext)}-${++n}${ext}`;
  used.add(name);
  const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`);
  writeFileSync(path.join(film, dir, name), Buffer.from(await r.arrayBuffer()));
  return `${dir}/${name}`;
}

async function main(statesFile, film) {
  const states = readStates(statesFile);
  const only = a.only ? new Set(String(a.only).split(",")) : null;
  mkdirSync(path.join(film, "img"), { recursive: true });
  const disc = path.join(film, "review/discovery");
  mkdirSync(disc, { recursive: true });
  const lastCaptured = states.filter((s) => s.capture !== false && (!only || only.has(s.name))).at(-1);
  const SCREENS = Object.create(null), META = Object.create(null), errors = [], usedImg = new Set(), allImages = [];
  const browser = await chromium.launch();
  let cssSummary = null;
  try {
    await drive(browser, url, states, { width: W, height: H, errors }, async (page, st) => {
      if (st.capture === false || (only && !only.has(st.name))) return;
      const sel = st.root ?? a.root ?? await detectRoot(page);
      if (!(await page.$(sel))) throw new Error(`state ${st.name}: root "${sel}" matches nothing on ${page.url()} (set "root" in the state or --root)`);
      const key = st.name.replace(/[^\w]+/g, "-");
      // canvases: N frames over time (or one frame per step), saved as PNGs
      const cv = st.canvas ?? {}, nFrames = Math.max(1, cv.steps?.length ?? cv.frames ?? 1);
      // a WebGL canvas without preserveDrawingBuffer exports fully transparent PNGs: report those as blank too
      const grab = () => page.evaluate((s) => [...document.querySelector(s).querySelectorAll("canvas")].map((c) => {
        try {
          const d = c.toDataURL("image/png"), t = document.createElement("canvas"); t.width = t.height = 32;
          const x = t.getContext("2d"); x.drawImage(c, 0, 0, 32, 32);
          return x.getImageData(0, 0, 32, 32).data.some((v, i) => i % 4 === 3 && v) ? d : "";
        } catch { return ""; }
      }), sel);
      const frames = [];
      for (let f = 0; f < nFrames; f++) {
        if (cv.steps) { await runActions(page, cv.steps[f], { name: st.name, base: url }); await page.waitForTimeout(cv.every ?? 150); }
        else if (f > 0) await (page.clocked ? page.clock.runFor(cv.every ?? 250) : page.waitForTimeout(cv.every ?? 250)); // fake clock: rAF advances exactly `every` ms
        (await grab()).forEach((d, k) => { (frames[k] ??= []).push(d); });
      }
      frames.forEach((list, k) => { // a canvas that never moved gives N copies of one frame: say so loudly
        const distinct = new Set(list).size;
        if (list.length > 1 && distinct === 1) console.error(`WARNING [${st.name}] canvas ${k}: all ${list.length} frames are identical (animation paused, or it needs input, not time). Fix: drive it with canvas.steps (e.g. {"set":["input[type=range]", 30]} per step) or raise canvas.every.`);
        else if (distinct < list.length) console.error(`note [${st.name}] canvas ${k}: ${distinct} distinct of ${list.length} frames (some repeat; raise canvas.every if the motion is slow)`);
      });
      const frameSrc = frames.map((list, k) => list.map((d, n) => {
        if (!d) { errors.push(`[${st.name}] canvas ${k} is blank or tainted (WebGL needs preserveDrawingBuffer: true, or a screenshot of the area instead)`); return ""; }
        const rel = `img/${st.name}-c${k}-${n}.png`;
        writeFileSync(path.join(film, rel), Buffer.from(d.split(",")[1], "base64"));
        allImages.push(rel);
        return rel;
      }));
      const info = await pageInfo(page, sel);
      await page.screenshot({ path: path.join(disc, `${st.name}.png`), fullPage: !!(st.full ?? a.full) });
      const snap = await page.evaluate(snapshot, { sel, key, canvasSrc: frameSrc.map((l) => l[0]), frameSrc });
      let html = snap.html;
      for (const u of [...snap.assets].sort((x, y) => y.length - x.length)) { // longest first: ?id=12 before ?id=1
        try {
          const rel = await save(u, "img", film, usedImg);
          for (const v of new Set([u, u.replace(/&/g, "&amp;")])) html = html.split(v).join(rel); // outerHTML escapes & in attributes
          allImages.push(rel);
        }
        catch (e) { errors.push(`[${st.name}] asset ${u}: ${e.message}`); }
      }
      SCREENS[st.name] = html;
      META[st.name] = { attrs: info.attrs, height: snap.height, root: sel, ...(frameSrc.length ? { canvas: frameSrc } : {}) };
      console.log(`${st.name.padEnd(18)} ${String(html.length).padStart(7)} chars  page height ${snap.height}  → ${path.join(disc, `${st.name}.png`)}`);
      if (a.css && st === lastCaptured) { // collect after the last state so rules injected by earlier views are in the CSSOM
        cssSummary = await portCss(browser, await collectSheets(page), info, film);
      }
    });
    if (a.css && !cssSummary && !errors.length) errors.push("--css: no state was captured, so there is nothing to read the CSS from");
  } finally { await browser.close(); }
  const names = Object.keys(SCREENS);
  if (!names.length) { console.error(errors.join("\n")); die(only ? `no state captured: --only ${a.only} matches none, or it failed` : "no state captured"); }
  writeFileSync(path.join(film, "screens.js"), `// generated by scripts/capture.mjs: regenerate, don't hand-edit\nwindow.SCREENS = ${JSON.stringify(SCREENS)};\nwindow.SCREENS_META = ${JSON.stringify(META)};\n`);
  console.log(`screens → ${path.join(film, "screens.js")} (${names.length} states)`);
  if (allImages.length) console.log(`images (list in film.js "images:"): ${JSON.stringify([...new Set(allImages)])}`);
  if (cssSummary?.failed.length) errors.push(`--css: ${cssSummary.failed.length} font/image file(s) could not be copied (see above)`);
  if (cssSummary) console.log(`css → ${cssSummary.out} (${cssSummary.copied.length} files copied; ${cssSummary.stats.keyframes} @keyframes dropped, ${cssSummary.stats.fixed} position:fixed → absolute)\nfonts (list in film.js "fonts:"): ${JSON.stringify(cssSummary.fonts)}${cssSummary.variable.length ? `\n  variable fonts (weight range; any weight inside it loads the same file): ${cssSummary.variable.join(", ")}` : ""}`);
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
}

if (a.discover) {
  if (a._.length > 2) die("usage: node capture.mjs <app-url> <film> --discover [--routes /,/radar] [--depth 2]");
  if (!url || !a._[1]) die("usage: node capture.mjs <app-url> <film> --discover [--routes /,/radar]");
  await discover(a._[1]);
} else {
  const [, statesFile, film] = a._;
  if (!url || !statesFile || !film) die("usage: node capture.mjs <app-url> <states.json> <film> [--css] [--root sel] [--full]  |  node capture.mjs <app-url> <film> --discover");
  mustExist(statesFile, "states file"); mustExist(film, "film folder (create it with new-film.mjs)");
  await main(statesFile, film);
}

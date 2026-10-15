// Capture the running app into a film: one outerHTML per state → <film>/screens.js, a screenshot per state →
// <film>/review/discovery/<state>.png, and (--css) the app's stylesheets ported to <film>/app.css.
// usage: node capture.mjs <app-url> <states.json> <film> [--css] [--root "#root > .app"] [--full] [--only a,b] [--dpr 2]
//          [--viewport 390x844] [--touch] [--scheme light|dark] [--storage "token=abc;user={\"id\":1}"]
//   --dpr N  device pixel ratio (default: 2 for states with a canvas, 1 otherwise; given explicitly it applies to every state)
//   --viewport WxH  browser size (default 1920x1080). A phone app: 390x844; the replica wrapper .app-shot gets that size, centred on the stage
//   --motion  keep prefers-reduced-motion off: pages that disable their CSS animations under "reduce" play them, and the freeze rule lands each on its end state (draw-on lines, fade-ins)
//   --touch  mobile emulation (isMobile + touch): tap/swipe send real touch events, the app sees (pointer: coarse)
//   --scheme light|dark  prefers-color-scheme for every state (a state's own "scheme" wins). Capture both and --css ports both themes
//   --storage-state file.json  a Playwright storage state (cookies, localStorage, IndexedDB) used by every state: log in / onboard once, reuse it
//   --prune-hidden  drop display:none elements (inactive tabs, hidden CodeMirror editors) from every state's markup
//   --seed N  seeded Math.random (mulberry32: the same N gives the same sequence on every load, so random demo data is reproducible) for every page (and "init": { "seed": N, "date": "2026-01-15T10:00:00Z" } in states.json: a fixed clock);
//   --init-script file.js  JS run before any app script (stub random data, feature flags). Apps with random demo data differ at every load:
//   capture ALL states in one run (never mix runs: the numbers would disagree) and treat compare.mjs as layout-only (--no-text)
//   --storage k=v;k2=v2  localStorage seeded before the first navigation (once per tab): log in without a login state. Same as "init" in states.json
//   Default root: the app container's only child; the container itself (#root) when it has siblings inside (toasts); body when
//   visible elements sit outside it (portals) or the page has no container (static sites). A warning names what a root leaves out.
//        node capture.mjs <app-url> <film> --discover [--routes /,/radar,/compare] [--depth 2] [--parallel 4] [--max-pages 40] [--no-clicks]
//   --routes alone does not crawl further (depth 0; add --depth N to follow links). Routes that differ only by an id (/orders/1042, /orders/1043) are visited once.
//   --discover visits routes in parallel (--parallel, default 4) and prints a line per route as it finishes; --no-clicks skips clicking nav/tab controls to
//   find more routes (the slow part). A single route found means the interesting states need clicks: write a states.json (see replicas.md).
// states.json (same file compare.mjs reads): [{ "name": "palette", "path": "/", "actions": [{ "press": "Control+k" }, { "type": "Rey" }, { "wait": 200 }] }]
//   state keys: name · path · actions · continue (keep the previous state's page, no reload) · capture:false (drive only)
//     · scheme ("light"|"dark") · storage {k: v} (seed localStorage) · reveal: true (scroll through the page first: scroll-reveal / IntersectionObserver)
//   the file may be { "init": { "storage": {…}, "sessionStorage": {…}, "cookies": [{ "name", "value" }], "scheme", "seed", "date", "script" },
//     "setup": { "path": "/", "actions": [{ "click": "text=Try the demo" }, { "waitFor": ".budget" }] }, "states": [...] }
//   setup runs once before all states (onboarding, login form); its storage is reused by every state, and compare.mjs replays the same setup
//   record steps are actions too: { "press": "ArrowLeft" } (keyboard games), { "wait": 80 }, mouse moves, strokes; one frame is grabbed after each.
//   state keys for hard layouts: "image": true (store a screenshot of the root as the state: JS-measured grids / chart containers that break in a
//   replica; text is no longer live) · "pin": true | "<selector>" (inline the resolved width/height of grid children, absolutely positioned
//   boxes and svg in the live page before capturing: freezes container-query / ResponsiveContainer layouts; it edits the live page, so keep such a state last)
//     · root (selector for this state) · full (full-page screenshot) · canvas { frames: N, every: ms, steps: [[actions], …] }
//     · before: true (also capture <name>-before, the page right before the last action, so a click has its before and after)
//   actions: upload [<sel>, <file>|[files]] (setInputFiles on an <input type=file>, hidden ones too) · click <sel> · dblclick <sel> · fill [<sel>, <text>] · type <text> · press <key> · hover <sel> · select [<sel>, <v>]
//     · check <sel> · set [<sel>, <v>] (range inputs) · scroll <y>|[<sel>, <y>] · waitFor <sel> · wait <ms> · goto <path> · eval <js>
//     · tap <sel> · swipe [<sel>, dx, dy, {steps, hold}] · drag [<from>, <to>, {steps, hold}] · mouse "down"|"up"|["move", <sel>|[x, y]]
//   Use `fill`, not Control+A + type: on macOS Control+A moves the caret to the line start. `wait` covers timers (a 4 s toast).
// Per state it bakes input/textarea values and checked state into attributes, strips scripts and on* handlers, turns every <canvas>
//   into an <img> (img/<state>-c<k>-<n>.png; canvas.frames grabs N frames over time, data-frames lists them), makes SVG ids unique
//   per state (url(#id) rewritten), and copies images into <film>/img. Output: window.SCREENS (html) + window.SCREENS_META (theme
//   attributes, page height, scheme, canvas frames) for ui.js shot()/stack(). --discover only inventories views: every route fully
//   screenshotted into review/discovery/ plus inventory.json (heights, scroll containers, canvases, buttons, links).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { help, args, load, die, mustExist, known, num } from "./lib/common.mjs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { drive, readStates, runActions, freezePage, envOptions, makeContext, scrollThrough, hiddenContent, gotoPage } from "./lib/drive.mjs";
import { existsSync, readFileSync } from "node:fs";
import { detectRoot, outsideRoot, pageInfo, collectSheets, portCss } from "./lib/port.mjs";
help(import.meta.url);

const a = args(undefined, ["css", "full", "discover", "touch", "motion", "prune-hidden", "no-clicks", "help"]);
known(a, ["css", "full", "discover", "root", "only", "routes", "depth", "dpr", "viewport", "touch", "scheme", "storage", "motion", "storage-state", "seed", "init-script", "prune-hidden", "no-clicks", "parallel", "max-pages"]);
for (const k of ["root", "only", "routes"]) if (a[k] === true) die(`--${k} needs a value`);
const env = envOptions(a);
const url = a._[0], W = env.width, H = env.height, DPR = num(a, "dpr", 2, { min: 1, max: 4 }); // device pixel ratio: canvas states always, every state when --dpr is given
const sha = (b) => createHash("sha1").update(b).digest("hex").slice(0, 12);
const hashRoute = (u) => (/^#!?\//.test(u.hash) ? u.hash : ""); // hash routers: /#/notes is a view, /#section is an anchor
// the same screenshot under several names: the app showed one page (login, error page, redirect) for different routes
function warnIdentical(rows) {
  const by = new Map();
  for (const r of rows) if (r.hash) (by.get(r.hash) ?? by.set(r.hash, []).get(r.hash)).push(r);
  for (const g of by.values()) { const names = g.map((r) => r.name); if (g.length > 1 && new Set(g.map((r) => r.path ?? r.name)).size > 1) console.error(`WARNING identical screenshots: ${names.join(", ")}. Either they are the same view (a hash anchor, a default route) or every one redirected to a login or error page; in that case seed auth with --storage k=v or "init" in states.json (see replicas.md), then capture again.`); }
}
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
  const seen = new Set(), depth = num(a, "depth", a.routes ? 0 : 2, { min: 0, max: 6, int: true }), maxPages = num(a, "max-pages", 40, { min: 1, max: 200, int: true }), patterns = new Set(), skipped = new Map(),
    pattern = (r) => r.replace(/\/(\d+|[0-9a-f]{8}-[0-9a-f-]{27,}|[0-9a-f]{16,}|[A-Za-z]*\d[\w-]{5,})(?=\/|\?|$)/g, "/:id"), // /orders/1042 and /orders/1043 are one view: /orders/:id
    origin = new URL(url).origin;
  const level = new Map(queue.map((r) => [r, 0])), explicit = new Set(queue);
  try {
    const order = new Map(), PAR = num(a, "parallel", 4, { min: 1, max: 8, int: true });
    const visit = async (route) => {
      const t0 = Date.now();
      const page = await (await makeContext(browser, url, env, {}, {})).newPage();
      page.on("pageerror", (e) => errors.push(`[${route}] ${e.message}`));
      const res = await gotoPage(page, new URL(route, url).href).catch((e) => (errors.push(`[${route}] ${e.message.split("\n")[0]}`), null));
      if (!res) { await page.context().close(); return; }
      await freezePage(page);
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
      await scrollThrough(page); // scroll-reveal / IntersectionObserver content appears only once it has been in view
      const hidden = await hiddenContent(page);
      if (hidden.length) console.error(`WARNING [${route}] ${hidden.length} element(s) still invisible (opacity 0) after scrolling the page: ${[...new Set(hidden)].slice(0, 5).join(", ")}. The screenshot has blank bands there; reveal them in a state ("reveal": true, or scrollIntoView + wait) before trusting it.`);
      const info = await page.evaluate(() => {
        const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const sel = (e) => e.id ? `#${e.id}` : `${e.tagName.toLowerCase()}${e.classList.length ? "." + [...e.classList].slice(0, 2).join(".") : ""}`;
        const scrollers = [...document.querySelectorAll("*")].filter((e) => e !== document.body && e !== document.documentElement && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 20).map((e) => `${sel(e)} ${e.clientHeight}→${e.scrollHeight}`);
        const text = (e) => (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28);
        return {
          title: document.title, h1: document.querySelector("h1")?.innerText.trim().replace(/\s+/g, " ").slice(0, 60) ?? "", height: document.documentElement.scrollHeight, scrollers,
          text: document.body.innerText.trim().slice(0, 4000), canvases: document.querySelectorAll("canvas").length, dialogs: document.querySelectorAll("dialog[open], [role=dialog]").length, inputs: document.querySelectorAll("input, textarea, select").length,
          buttons: [...new Set([...document.querySelectorAll("button, [role=tab], [role=button]")].filter(vis).map(text).filter(Boolean))].slice(0, 30),
          links: [...new Set([...document.querySelectorAll("a[href]")].map((l) => l.getAttribute("href")))].filter((h) => !/^#(?!!?\/)/.test(h)).slice(0, 40),
        };
      });
      const name = (route.replace(/^\/+|\/+$/g, "").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "home");
      const shot = await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
      const here = new URL(page.url()), landed = norm(here.pathname) + here.search + hashRoute(here);
      const row = { route, status: res.status(), file: `${name}.png`, hash: sha(shot), ...info };
      if (landed !== route && landed !== norm(new URL(route, url).pathname) + new URL(route, url).search + hashRoute(new URL(route, url))) { row.redirectedTo = landed; console.error(`${/login|sign-?in|auth|session/i.test(landed) ? "WARNING " : "note: "}${route} ended up on ${landed}${/login|sign-?in|auth|session/i.test(landed) ? " (a login: seed auth with --storage k=v or \"init\" in states.json)" : " (redirect)"}`); }
      rows.push(row); row.order = order.get(route);
      for (const l of info.links) {
        let u; try { u = new URL(l, new URL(route, url)); } catch { continue; }
        const r = norm(u.pathname) + u.search + hashRoute(u);
        if (u.origin === origin && !seen.has(r) && !level.has(r) && (level.get(route) ?? 0) < depth && !/\.\w{2,5}$/.test(u.pathname)) { level.set(r, (level.get(route) ?? 0) + 1); queue.push(r); }
      }
      // SPA tabs are often buttons, not links: click each nav/tab control and note where the URL goes
      const nav = page.locator("[role=tab], nav button, nav a, aside a");
      for (let i = 0, n = a["no-clicks"] ? 0 : Math.min(await nav.count(), 12); i < n && (level.get(route) ?? 0) < depth; i++) {
        try {
          await nav.nth(i).click({ timeout: 1500 }); await page.waitForTimeout(400);
          const nu = new URL(page.url()), r = norm(nu.pathname) + nu.search + hashRoute(nu);
          if (r !== route && !seen.has(r) && !level.has(r)) { level.set(r, (level.get(route) ?? 0) + 1); queue.push(r); }
          if (r !== route) await gotoPage(page, new URL(route, url).href);
        } catch {}
      }
      await page.context().close();
      console.error(`[${rows.length}/${seen.size}${queue.length ? `+${queue.length}` : ""}] ${route} ${((Date.now() - t0) / 1000).toFixed(1)} s`); // progress: a long crawl is visible
    };
    let running = 0; // routes are independent pages: crawl PAR at a time (a serial crawl took ~20 s per route)
    await new Promise((done) => {
      const pump = () => {
        while (running < PAR && queue.length && seen.size < maxPages) {
          const route = queue.shift(); if (seen.has(route)) continue;
          const pt = pattern(route.split("?")[0]); if (!explicit.has(route) && pt !== route.split("?")[0] && patterns.has(pt)) { skipped.set(pt, (skipped.get(pt) ?? 0) + 1); continue; } patterns.add(pt);
          seen.add(route); order.set(route, order.size); running++;
          visit(route).catch((e) => errors.push(`[${route}] ${String(e.message).split("\n")[0]}`)).finally(() => { running--; pump(); });
        }
        if (!running) done();
      };
      pump();
    });
    rows.sort((x, y) => x.order - y.order); rows.forEach((r) => delete r.order);
  } finally { await browser.close(); }
  if (!rows.length) { console.error(errors.join("\n")); die(`nothing could be loaded from ${url}: is the app running?`); }
  warnIdentical(rows.map((r) => ({ name: r.route, path: r.route, hash: r.redirectedTo && rows.some((x) => x.route === r.redirectedTo) ? undefined : r.hash }))); // a plain redirect to another listed route is not a login wall
  for (const r of rows) delete r.text;
  if (skipped.size) console.error(`note: skipped repeated routes (one per pattern is enough): ${[...skipped].map(([k, n]) => `${k} +${n}`).join(", ")}`);
  if (rows.length === 1 && !a.routes) console.error("note: only one route found. A single-page app keeps its views behind clicks: discovery cannot see them. Write a states.json (name, path, actions) for the screens you need (replicas.md, states.json) and capture those.");
  writeFileSync(path.join(dir, "inventory.json"), JSON.stringify(rows, null, 1));
  for (const r of rows) console.log(`${r.route.padEnd(22)} ${r.status}  h=${String(r.height).padEnd(5)} ${r.file.padEnd(16)} ${r.h1 ?? ""}${r.scrollers?.length ? `  scroll:${r.scrollers.join(", ")}` : ""}${r.canvases ? `  canvas:${r.canvases}` : ""}`);
  console.log(`inventory → ${path.join(dir, "inventory.json")}  (buttons/links per route are in the json; states that need clicks are not crawled)`);
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
}

// Page-side helpers (installed per state): canvas layers of one root that sit on top of each other (a static + an interactive + an overlay
// canvas) are ONE picture. groups() numbers them; composite() draws every layer of a group (or, with g === null, all canvases) into one PNG
// with transparency kept, optionally cropped to [x, y, w, h] css px relative to the root. "" when the composite is fully transparent.
const CANVAS_SRC = `window.__svCanvas = {
  groups(root) {
    const cs = [...root.querySelectorAll("canvas")], bx = cs.map((c) => c.getBoundingClientRect()), res = [];
    // layers sit in the same clipping container; two canvases in DIFFERENT clip containers (a before/after slider: each half is clipped by its own
    // overflow:hidden / clip-path wrapper) are two pictures, even though they overlap
    const clip = (c) => { for (let e = c; e && e !== root.parentElement; e = e.parentElement) { const s = getComputedStyle(e); if (/hidden|clip/.test(s.overflowX + s.overflowY) || s.clipPath !== "none") return e; } return root; };
    const cp = cs.map(clip);
    let n = 0;
    cs.forEach((c, i) => {
      const a = bx[i].width * bx[i].height; let hit = -1;
      if (a > 0) for (let j = 0; j < i && hit < 0; j++) {
        if (!res[j].lead || cp[j] !== cp[i]) continue;
        const b = bx[j], w = Math.min(b.right, bx[i].right) - Math.max(b.left, bx[i].left), h = Math.min(b.bottom, bx[i].bottom) - Math.max(b.top, bx[i].top);
        if (w > 0 && h > 0 && w * h >= 0.9 * Math.min(a, b.width * b.height)) hit = j;
      }
      res.push(hit < 0 ? { g: n++, lead: true } : { g: res[hit].g, lead: false });
    });
    return res;
  },
  composite(root, g, crop) {
    try {
      const cs = [...root.querySelectorAll("canvas")], gr = g == null ? null : this.groups(root);
      const mem = cs.filter((c, i) => (g == null || gr[i].g === g) && c.getBoundingClientRect().width > 0);
      if (!mem.length) return "";
      const o = g == null ? root.getBoundingClientRect() : mem[0].getBoundingClientRect(), k = Math.max(...mem.map((c) => c.width / c.getBoundingClientRect().width)) || 1;
      const [cx, cy, cw, ch] = crop || [0, 0, o.width, o.height], out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(cw * k)); out.height = Math.max(1, Math.round(ch * k));
      const x = out.getContext("2d");
      for (const c of mem) { const r = c.getBoundingClientRect(); x.drawImage(c, (r.left - o.left - cx) * k, (r.top - o.top - cy) * k, r.width * k, r.height * k); }
      const t = document.createElement("canvas"); t.width = t.height = 48; const tx = t.getContext("2d"); tx.drawImage(out, 0, 0, 48, 48);
      return tx.getImageData(0, 0, 48, 48).data.some((v, i) => i % 4 === 3 && v) ? out.toDataURL("image/png") : "";
    } catch { return ""; }
  },
};`;

// Runs in the page: serialises the app root without scripts, with form state and canvases baked in.
function snapshot({ sel, key, canvasSrc, frameSrc, prune }) {
  const root = document.querySelector(sel);
  if (!root) throw new Error(`root "${sel}" not found on the page`);
  const live = [root, ...root.querySelectorAll("*")], clone = root.cloneNode(true), cl = [clone, ...clone.querySelectorAll("*")];
  const assets = new Set(), abs = (u) => { try { const x = new URL(u, document.baseURI); if (/^https?:|^file:/.test(x.protocol)) { assets.add(x.href); return x.href; } } catch {} return u; };
  let ci = 0;
  const cg = window.__svCanvas.groups(root); // stacked canvas layers share one picture: the lowest layer carries it, the others are dropped
  live.forEach((l, i) => {
    const c = cl[i];
    if (l instanceof HTMLInputElement) {
      if (l.type === "checkbox" || l.type === "radio") l.checked ? c.setAttribute("checked", "") : c.removeAttribute("checked");
      else if (l.type !== "file") c.setAttribute("value", l.value);
    } else if (l instanceof HTMLTextAreaElement) c.textContent = l.value;
    else if (l instanceof HTMLSelectElement) [...c.options].forEach((o, j) => l.options[j].selected ? o.setAttribute("selected", "") : o.removeAttribute("selected"));
    else if (l instanceof HTMLCanvasElement) {
      const m = cg[ci];
      if (!m.lead) { c.remove(); ci++; return; }
      const img = document.createElement("img");
      for (const at of c.attributes) img.setAttribute(at.name, at.value);
      if (l.clientWidth && l.clientHeight) { img.setAttribute("width", l.clientWidth); img.setAttribute("height", l.clientHeight); } // CSS size, not the (dpr-scaled) backing store
      img.setAttribute("src", canvasSrc[m.g] ?? ""); img.setAttribute("alt", "");
      if (frameSrc[m.g]?.length > 1) img.setAttribute("data-frames", frameSrc[m.g].join(","));
      c.replaceWith(img); ci++;
    } else if (l instanceof HTMLImageElement) { // lazy / async / srcset images: the URL the browser actually showed, else the lazy-load attribute, else none
      const lazy = ["data-src", "data-lazy-src", "data-original"].map((n) => l.getAttribute(n)).find(Boolean) || (l.getAttribute("data-srcset") || l.getAttribute("srcset") || "").trim().split(/\s*,\s*/)[0]?.split(/\s+/)[0] || "";
      let u = l.currentSrc || (l.getAttribute("src") ? l.src : "") || (lazy ? new URL(lazy, document.baseURI).href : "");
      if (lazy && (!u || /^data:/.test(u))) u = new URL(lazy, document.baseURI).href; // a data: placeholder until the lazy loader runs
      const here = document.baseURI.split("#")[0];
      if (!u || u.split("#")[0] === here) c.removeAttribute("src"); // <img src="">: resolves to the page itself (CodeMirror buffers): no asset
      else c.setAttribute("src", abs(u));
      for (const n of ["srcset", "data-srcset", "data-src", "data-lazy-src", "data-original", "sizes", "loading", "decoding"]) c.removeAttribute(n);
      if (c.parentElement?.tagName === "PICTURE") c.parentElement.querySelectorAll("source").forEach((x) => x.remove());
    }
    else if (l instanceof HTMLVideoElement && l.poster) c.setAttribute("poster", abs(l.poster));
    for (const at of [...c.attributes]) {
      if (/^on/i.test(at.name)) c.removeAttribute(at.name);
      else if ((at.name === "href" || at.name === "xlink:href") && /^(use|image)$/i.test(c.tagName) && !at.value.startsWith("#")) c.setAttribute(at.name, abs(at.value.replace(/#.*/, "")) + (at.value.match(/#.*/)?.[0] ?? ""));
      else if (at.name === "style" && /url\(/.test(at.value)) c.setAttribute("style", at.value.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (m, q, u) => /^data:/.test(u) ? m : `url("${abs(u)}")`));
    }
  });
  // CSS animations are not ported (films animate on the timeline). One that ends in a held state (animation-fill-mode forwards/both:
  // a path drawing itself, a card fading in) would be captured in its START state: bake the end state into inline style.
  const kebab = (k) => k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()), nm = (e) => e.id ? `#${e.id}` : `${e.tagName.toLowerCase()}${e.classList.length ? "." + [...e.classList].slice(0, 2).join(".") : ""}`;
  const baked = [];
  for (const an of document.getAnimations()) {
    const tg = an.effect?.target, i = tg instanceof Element ? live.indexOf(tg) : -1;
    if (i < 0 || an.animationName === undefined) continue;
    const fill = an.effect.getTiming().fill;
    if (fill !== "forwards" && fill !== "both") continue;
    const cs = getComputedStyle(tg);
    for (const kf of an.effect.getKeyframes()) for (const k of Object.keys(kf)) if (!["offset", "easing", "composite", "computedOffset"].includes(k)) cl[i].style.setProperty(kebab(k), cs.getPropertyValue(kebab(k)));
    baked.push(`${an.animationName} on ${nm(tg)}`);
  }
  const animated = live.filter((e) => getComputedStyle(e).animationName !== "none").map((e) => `${getComputedStyle(e).animationName.split(",")[0].trim()} on ${nm(e)}`);
  clone.querySelectorAll("script, noscript").forEach((s) => s.remove());
  let hidden = 0; // display:none elements (inactive tabs, hidden editors): counted, and dropped with --prune-hidden
  live.forEach((l, i) => { if (!clone.contains(cl[i]) || l === root) return; if (getComputedStyle(l).display === "none" && !/^(SCRIPT|STYLE|LINK|META|TEMPLATE|NOSCRIPT|HEAD|TITLE|BASE|SOURCE|TRACK|AREA|DEFS|SYMBOL|CLIPPATH|MASK|LINEARGRADIENT|RADIALGRADIENT|FILTER|PATTERN|MARKER)$/i.test(l.tagName) && !l.closest("svg")) { hidden++; if (prune) cl[i].remove(); } });
  const custom = [...new Set(live.filter((e) => e.localName.includes("-") && !(e instanceof SVGElement)).map((e) => e.localName))];
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
  return { html, assets: [...assets], height: document.documentElement.scrollHeight, baked: [...new Set(baked)], custom, hidden, animated: [...new Set(animated)] };
}

// Points an asset URL at its local copy in src/srcset/poster/href/style attributes ONLY: a text node that shows the same URL (a typed address,
// a code sample) must stay as it is.
const ASSET_ATTR = /^(src|srcset|poster|href|xlink:href|style|data-frames)$/i;
function swapAssets(html, urls, rel) {
  return html.replace(/<[a-zA-Z][\w:-]*(?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*\s*\/?>/g, (tag) =>
    tag.replace(/(\s)([^\s"'<>\/=]+)(\s*=\s*")([^"]*)"/g, (m, sp, name, eq, val) => {
      if (!ASSET_ATTR.test(name)) return m;
      for (const v of urls) val = val.split(v).join(rel);
      return `${sp}${name}${eq}${val}"`;
    }));
}

async function save(url, dir, film, used) { // downloads one asset into <film>/img, returns the film-relative path
  const u = new URL(url); let name = path.basename(u.pathname) || "asset", n = 1;
  const ext = path.extname(name);
  while (used.has(name)) name = `${path.basename(u.pathname, ext)}-${++n}${ext}`;
  used.add(name);
  if (u.protocol === "file:") { writeFileSync(path.join(film, dir, name), readFileSync(fileURLToPath(u))); return `${dir}/${name}`; }
  const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (/^text\/html/.test(r.headers.get("content-type") ?? "")) { used.delete(name); throw new Error("not an image (the server answered with an HTML page)"); } // a dev server's index.html fallback
  writeFileSync(path.join(film, dir, name), Buffer.from(await r.arrayBuffer()));
  return `${dir}/${name}`;
}

// record mode (canvas-first products: drawing, maps, games): runs state.record.steps one action at a time with the REAL mouse and grabs one frame
// of the root's canvases per step (composited, optionally cropped), plus the pointer position after it. Frames are written to img/<state>-r<n>.png
// at the capture dpr. A step is an action ({ mouse: { move: [x, y], steps: 1 } }, { click: [x, y] }, ...) or { stroke: [[x, y], ...], px: 24 }:
// move to the first point, press, one frame every `px` px along the polyline, release. Frame times are n * dt (default 1/13 s) unless a step has "t".
async function recordFrames(page, st, film, sel, allImages) {
  const r = st.record, root = r.root ?? sel, dt = r.dt ?? 1 / 13, crop = r.crop ?? null, out = [];
  if (!(dt > 0 && dt <= 1)) throw new Error(`state ${st.name}: record.dt must be seconds per frame, 0 < dt <= 1 (got ${JSON.stringify(r.dt)})`);
  if (!(await page.$(root))) throw new Error(`state ${st.name}: record root "${root}" matches nothing`);
  await page.evaluate(CANVAS_SRC);
  const o = await page.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, root);
  const steps = (r.steps ?? []).flatMap((s) => {
    if (!s.stroke) return [s];
    const pts = s.stroke, px = Math.max(4, Number(s.px) || 24), acts = [{ mouse: { move: pts[0], steps: 1 } }, { mouse: { down: true } }];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / px));
      for (let k = 1; k <= n; k++) acts.push({ mouse: { move: [x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n], steps: 1 } });
    }
    acts.push({ mouse: { up: true } });
    return acts;
  });
  if (!steps.length) throw new Error(`state ${st.name}: record.steps is empty`);
  if (steps.length > 1500) throw new Error(`state ${st.name}: record has ${steps.length} steps (max 1500: every one is a PNG); raise "px" on strokes or split the recording`);
  let size = null, prev = null;
  for (const [n, act] of steps.entries()) {
    await runActions(page, [act], { name: st.name, base: url });
    await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))); // two frames: the canvas has repainted
    if (r.every) await page.waitForTimeout(r.every);
    const d = await page.evaluate(([s, c]) => window.__svCanvas.composite(document.querySelector(s), null, c), [root, crop]);
    if (!d) { if (prev) { out.push({ ...prev, t: act.t ?? n * dt }); continue; } throw new Error(`state ${st.name}: record frame ${n} is blank (are there canvases in "${root}"? WebGL needs preserveDrawingBuffer: true)`); }
    const rel = `img/${st.name}-r${String(n).padStart(3, "0")}.png`;
    writeFileSync(path.join(film, rel), Buffer.from(d.split(",")[1], "base64")); allImages.push(rel);
    const m = page.mouseAt ?? { x: 0, y: 0 };
    prev = { t: +(act.t ?? n * dt).toFixed(4), src: rel, x: +(m.x - o[0] - (crop?.[0] ?? 0)).toFixed(1), y: +(m.y - o[1] - (crop?.[1] ?? 0)).toFixed(1) };
    out.push(prev);
    size ??= crop ? [crop[2], crop[3]] : [o[2], o[3]];
  }
  if (out.length > 150) console.error(`note [${st.name}] ${out.length} record frames: every one is a full-size PNG in Film({ images }); crop to the active region ("crop": [x, y, w, h]) or lower the frame count if the render runs out of memory`);
  console.log(`${st.name.padEnd(18)} recorded ${out.length} frames (${Math.round(out.at(-1).t * 100) / 100} s at ${Math.round(1 / dt)} fps) at dpr ${DPR}`);
  return { frames: out, dt, size, crop, root };
}

async function main(statesFile, film) {
  const states = readStates(statesFile);
  const only = a.only ? new Set(String(a.only).split(",")) : null;
  mkdirSync(path.join(film, "img"), { recursive: true });
  const disc = path.join(film, "review/discovery");
  mkdirSync(disc, { recursive: true });
  const SCREENS = Object.create(null), META = Object.create(null), errors = [], usedImg = new Set(), allImages = [];
  const browser = await chromium.launch();
  let cssSummary = null;
  const usedFonts = new Set(); let lastLen = null; const tks = new Map(), tall = [], META_REC = Object.create(null), jsFonts = new Map(), cssBy = new Map(), shots = [], warned = new Set(), animSeen = new Map(), bakedAll = new Set();
  const warnOnce = (msg) => { if (!warned.has(msg)) { warned.add(msg); console.error(msg); } };
  try {
    await drive(browser, url, states, { width: W, height: H, errors, dpr: DPR, dprAll: !!env.dprGiven, touch: env.touch, motion: env.motion, scheme: env.scheme, storage: env.storage, init: states.init, setup: states.setup, seed: env.seed, initScript: env.initScript, storageState: env.storageState }, async (page, st) => {
      if (st.capture === false || (only && !only.has(st.name) && !only.has(st.name.replace(/-before$/, "")))) return;
      const sel = st.root ?? a.root ?? await detectRoot(page);
      if (!(await page.$(sel))) throw new Error(`state ${st.name}: root "${sel}" matches nothing on ${page.url()} (set "root" in the state or --root)`);
      { // what the root leaves out: toasts, portals, sibling sections; a root far shorter than the page
        const o = await outsideRoot(page, sel);
        const left = st.root || a.root ? o.over : o.out; // an explicit root is a choice: only overlays (toasts, banners) are worth a warning
        if (left.length) warnOnce(`WARNING [${st.name}] root "${sel}" leaves out ${left.length} visible element(s): ${left.slice(0, 4).join(" | ")}. They are NOT in the replica: use --root body (or the container, e.g. "#root"), or "root" on the state.`);
        else if (sel !== "body" && o.pageH > H * 1.5 && o.rootH < o.pageH * 0.5) warnOnce(`WARNING [${st.name}] root "${sel}" is ${Math.round(o.rootH)} px tall, the page ${o.pageH} px: did you mean --root body?`);
        if (!st.root && !a.root) warnOnce(`root: ${sel}${sel === "body" ? "  (static page or portals outside the app container)" : ""}`);
        if (o.pageH > H * 1.3) {
          const hid = await hiddenContent(page, sel);
          if (hid.length) warnOnce(`WARNING [${st.name}] ${hid.length} element(s) invisible (opacity 0) in a ${o.pageH} px page: ${[...new Set(hid)].slice(0, 5).join(", ")}. Scroll-reveal content is captured blank: set "reveal": true on the state (or scrollIntoView + wait).`);
        }
      }
      const key = st.name.replace(/[^\w]+/g, "-");
      // canvases: N frames over time (or one frame per step), saved as PNGs
      const cv = st.canvas ?? {}, nFrames = Math.max(1, cv.steps?.length ?? cv.frames ?? 1);
      // one picture per group of stacked canvases; a WebGL canvas without preserveDrawingBuffer exports fully transparent PNGs: blank too.
      // A transparent overlay layer is not an error as long as its group (the composite) has content.
      await page.evaluate(CANVAS_SRC);
      const grab = () => page.evaluate((s) => { const r = document.querySelector(s), gr = window.__svCanvas.groups(r), n = gr.reduce((m, x) => Math.max(m, x.g + 1), 0); return Array.from({ length: n }, (_, g) => window.__svCanvas.composite(r, g)); }, sel);
      if (st.record) META_REC[st.name] = await recordFrames(page, st, film, sel, allImages);
      const frames = [];
      for (let f = 0; f < nFrames; f++) {
        if (cv.steps) { await runActions(page, cv.steps[f], { name: st.name, base: url }); await (page.clocked ? page.clock.runFor(cv.every ?? 150) : page.waitForTimeout(cv.every ?? 150)); } // fake clock: advance it, or rAF canvases never repaint
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
      const shotBuf = await page.screenshot({ path: path.join(disc, `${st.name}.png`), fullPage: !!(st.full ?? a.full), scale: "css" });
      if (!/-before$/.test(st.name)) {
        shots.push({ name: st.name, hash: sha(shotBuf), path: st.path, url: page.url() });
        if (st.path && !st.continue) { const want = new URL(st.path, url), got = new URL(page.url()); if (want.pathname.replace(/\/$/, "") !== got.pathname.replace(/\/$/, "") && hashRoute(want) === hashRoute(got)) warnOnce(`WARNING [${st.name}] asked for ${st.path} but the page is at ${got.pathname}${got.search}: redirected (login?). Seed auth with --storage k=v or "init" in states.json.`); }
      }
      if (st.pin) {
        const n = await page.evaluate(({ sel, pin }) => {
          const root = document.querySelector(sel), els = pin === true
            ? [...root.querySelectorAll("*")].filter((e) => { const cs = getComputedStyle(e), p = e.parentElement; return cs.position === "absolute" || e instanceof SVGSVGElement || (p && /grid/.test(getComputedStyle(p).display)); })
            : [...root.querySelectorAll(pin)];
          for (const e of els.slice(0, 4000)) {
            const cs = getComputedStyle(e);
            if (cs.display === "none") continue;
            e.style.width = cs.width; e.style.height = cs.height;
            if (cs.position === "absolute") { e.style.left = cs.left; e.style.top = cs.top; e.style.right = "auto"; e.style.bottom = "auto"; }
          }
          return Math.min(els.length, 4000);
        }, { sel, pin: st.pin });
        console.log(`${st.name.padEnd(18)} pinned the resolved size of ${n} element(s)`);
      }
      await page.evaluate(async (sel) => { // lazy images: load every one (loading=lazy, data-src) so the snapshot has a real URL, not a placeholder
        const imgs = [...document.querySelector(sel).querySelectorAll("img")];
        for (const i of imgs) {
          if (i.loading === "lazy") i.loading = "eager";
          const ds = i.getAttribute("data-src") || i.getAttribute("data-lazy-src") || i.getAttribute("data-original");
          if (ds && (!i.getAttribute("src") || /^data:/.test(i.getAttribute("src")))) i.src = ds;
        }
        await Promise.race([Promise.all(imgs.filter((i) => i.getAttribute("src") && !i.complete).map((i) => new Promise((ok) => { i.onload = i.onerror = ok; }))), new Promise((ok) => setTimeout(ok, 2500))]);
      }, sel);
      const snap = await page.evaluate(snapshot, { sel, key, canvasSrc: frameSrc.map((l) => l[0]), frameSrc, prune: !!a["prune-hidden"] });
      let html = snap.html;
      if (snap.custom.length) warnOnce(`WARNING custom element(s) <${snap.custom.slice(0, 6).join(">, <")}>: scripts are stripped, so they lose their behaviour in the replica (a hamburger that shows only on small screens, tabs, menus) and may render the wrong state. Compare reports it as "only in replica"; hide the extra ones in film.css (e.g. ${snap.custom[0]} { display: none !important }) or capture the state you want with "actions".`);
      if (snap.hidden > 20) warnOnce(`note [${st.name}] ${snap.hidden} hidden element(s) (display:none tabs, hidden editors) are in the snapshot: a selector like $$(".cm-content")[1] may hit a hidden copy. Check visibility in film.js, or capture with --prune-hidden to drop them.`);
      if (lastLen != null && html.length < 400 && lastLen > 4000 && html.length < lastLen * 0.01) warnOnce(`WARNING [${st.name}] this state's DOM is ${html.length} chars after a ${lastLen}-char one: the page probably went blank (dev-server reload, crash, navigation). Check review/discovery/${st.name}.png before trusting it.`);
      lastLen = html.length;
      if (st.image) { // the screenshot IS the state: for layouts that only work with the app's own JS
        const loc = page.locator(sel).first(), box = await loc.boundingBox(), rel = `img/${st.name}.png`;
        await loc.screenshot({ path: path.join(film, rel) }); allImages.push(rel);
        html = `<img src="${rel}" alt="" style="display:block;width:${Math.round(box.width)}px;height:${Math.round(box.height)}px">`; snap.assets = [];
        console.log(`${st.name.padEnd(18)} stored as an image (${Math.round(box.width)}x${Math.round(box.height)} css px at dpr ${DPR}): text and counters are not live`);
      }
      for (const u of [...snap.assets].sort((x, y) => y.length - x.length)) { // longest first: ?id=12 before ?id=1
        try {
          const rel = await save(u, "img", film, usedImg);
          html = swapAssets(html, new Set([u, u.replace(/&/g, "&amp;")]), rel); // outerHTML escapes & in attributes
          allImages.push(rel);
        }
        catch (e) { errors.push(`[${st.name}] asset ${u}: ${e.message}`); }
      }
      SCREENS[st.name] = html;
      META[st.name] = { attrs: info.attrs, height: snap.height, root: sel, scheme: info.scheme, viewport: [W, H], bg: info.base.background, lum: +info.lum.toFixed(3), ...(frameSrc.length ? { canvas: frameSrc } : {}), ...(META_REC[st.name] ? { record: META_REC[st.name] } : {}) };
      { // FontFace-API fonts: keep the faces the browser actually loaded (an app may register a hundred unicode-range shards)
        const got = await page.evaluate(() => ({ made: window.__svFonts || [], loaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family.replace(/^["']|["']$/g, "")}|${f.unicodeRange}|${f.style}`) }));
        const norm = (v) => (v || "U+0-10FFFF").replace(/\s+/g, "");
        for (const f of got.made) if (f.source && got.loaded.some((k) => { const [fam, ur, sty] = k.split("|"); return fam === f.family.replace(/^["']|["']$/g, "") && norm(ur) === norm(f.desc.unicodeRange) && sty === (f.desc.style || "normal"); })) jsFonts.set(`${f.family}|${f.source}|${JSON.stringify(f.desc)}`, { ...f, base: page.url() });
      }
      for (const f of await page.evaluate((sel) => { const out = new Set(); for (const e of document.querySelector(sel).querySelectorAll("*")) { if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") continue; cs.fontFamily.split(",").forEach((x) => out.add(x.trim().replace(/^["']|["']$/g, ""))); } return [...out]; }, sel)) usedFonts.add(f);
      for (const n of snap.animated) { const [k, ...r] = n.split(" on "); (animSeen.get(k) ?? animSeen.set(k, new Set()).get(k)).add(r.join(" on ")); }
      snap.baked.forEach((b) => bakedAll.add(b));
      if (snap.height > H * 1.1) tall.push(st.name);
      console.log(`${st.name.padEnd(18)} ${String(html.length).padStart(7)} chars  page height ${snap.height}  → ${path.join(disc, `${st.name}.png`)}`);
      { // theme fingerprint (colour scheme + every :root custom property): apps inject one theme block at a time, a run that switches themes needs a block per theme
        const sg = sha(info.sig); if (!tks.has(sg)) tks.set(sg, `t${tks.size}`);
        if (process.env.DEBUG) console.error(`[${st.name}] theme signature ${tks.get(sg)}: ${info.sig.slice(-160)}`);
        META[st.name].tk = tks.get(sg);
        if (a.css) cssBy.set(sg, { sheets: await collectSheets(page), info, key: tks.get(sg) }); // the last captured state per theme wins: rules injected by earlier views are in its CSSOM
      }
    });
    if (a.css && cssBy.size) {
      const base = [...cssBy.values()].find((x) => x.key === "t0") ?? [...cssBy.values()][0], extra = [...cssBy.values()].filter((x) => x !== base);
      const faces = [...jsFonts.values()].map((f) => {
        const src = f.source.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (m, q, u) => { try { return /^data:/.test(u) ? m : `url("${new URL(u, f.base).href}")`; } catch { return m; } });
        const d = f.desc, e = (v) => v == null ? "" : `${v}`;
        return `@font-face { font-family: "${f.family}"; src: ${src}; ${d.weight ? `font-weight: ${e(d.weight)}; ` : ""}${d.style ? `font-style: ${e(d.style)}; ` : ""}${d.unicodeRange ? `unicode-range: ${e(d.unicodeRange)}; ` : ""}}`;
      });
      if (faces.length) console.log(`fonts registered with the FontFace API: ${faces.length} face(s) ported to app.css`);
      cssSummary = await portCss(browser, base.sheets, base.info, film, undefined, { viewport: [W, H], extra, faces });
      if (extra.length) console.error(`WARNING the theme changed during the run (${extra.length + 1} variants: ${[...cssBy.values()].map((x) => `${x.key}=${x.info.lum > 0.6 ? "light" : "dark"}${x.info.attrs["data-theme"] ? "/" + x.info.attrs["data-theme"] : ""}${x.info.attrs.class ? " ." + x.info.attrs.class.split(/\s+/).slice(0, 2).join(".") : ""}`).join(", ")}): app.css holds the ${base.key} rules plus a block per other theme, scoped under .app-shot[data-tk="tN"] (UI.shot() sets the attribute from the state's theme). Check one state of each theme in the stills.`);
    }
    if (a.css && !cssSummary && !errors.length) errors.push("--css: no state was captured, so there is nothing to read the CSS from");
  } finally { await browser.close(); }
  warnIdentical(shots);
  if (tall.length) console.log(`note: ${tall.join(", ")} scroll as a document taller than ${H} px: build them with UI.shot(name, { tall: true }) so the camera can reach below it`);
  for (const x of cssSummary?.animations ?? []) { const [k, ...r] = x.split(" on "); (animSeen.get(k) ?? animSeen.set(k, new Set()).get(k)).add(r.join(" on ")); }
  if (animSeen.size) console.error(`WARNING CSS animations on the page are not in the replica (${animSeen.size} @keyframes): ${[...animSeen].slice(0, 8).map(([k, v]) => `${k} on ${[...v].slice(0, 3).join(", ")}`).join("; ")}. Recreate them on the film timeline: each is a tween on the element (rotation for a spinner: UI.spin; fade/slide in: tl.from), see replicas.md Pitfalls "CSS animations and transitions don't run" and motion-vocabulary.md.${bakedAll.size ? ` Held end states were baked into style: ${[...bakedAll].slice(0, 6).join("; ")}.` : " If the page switches animations off under prefers-reduced-motion, fill-forwards end states (draw-on lines, fade-ins) were captured at their START: capture with --motion."}`);
  const names = Object.keys(SCREENS);
  if (names.length) { const { bg, lum } = META[names[0]]; console.log(`app background ${bg} (luminance ${lum}): the film theme is ${lum > 0.6 ? "light" : "dark"}  (starter: <html data-theme="auto"> follows it; or new-film.mjs --theme light|dark)`); }
  if (!names.length) { console.error(errors.join("\n")); die(only ? `no state captured: --only ${a.only} matches none, or it failed` : "no state captured"); }
  if (only && existsSync(path.join(film, "screens.js"))) { // --only: keep the states of earlier runs
    try {
      const w = {}; new Function("window", readFileSync(path.join(film, "screens.js"), "utf8"))(w);
      for (const [k, v] of Object.entries(w.SCREENS ?? {})) if (!(k in SCREENS)) { SCREENS[k] = v; META[k] = w.SCREENS_META?.[k] ?? {}; }
      console.error(`note: --only merged into the existing screens.js. Apps with random demo data differ at every load: states from different runs disagree (numbers, order); capture all states in one run for the final film.`);
    } catch (e) { console.error(`note: could not merge the old screens.js (${e.message.split("\n")[0]})`); }
  }
  writeFileSync(path.join(film, "screens.js"), `// generated by scripts/capture.mjs: regenerate, don't hand-edit\nwindow.SCREENS = ${JSON.stringify(SCREENS)};\nwindow.SCREENS_META = ${JSON.stringify(META)};\n`);
  console.log(`screens → ${path.join(film, "screens.js")} (${names.length} states)`);
  if (allImages.length) console.log(`images (list in film.js "images:"): ${JSON.stringify([...new Set(allImages)])}`);
  if (cssSummary?.failed.length) errors.push(`--css: ${cssSummary.failed.length} font/image file(s) could not be copied (see above)`);
  const fontsUsed = cssSummary ? (cssSummary.fonts.filter((f) => { const fam = f.match(/'([^']+)'/)?.[1]; return !usedFonts.size || !fam || usedFonts.has(fam); })) : [];
  if (cssSummary) console.log(`css → ${cssSummary.out} (${cssSummary.copied.length} files copied; ${cssSummary.stats.keyframes} @keyframes dropped, ${cssSummary.stats.fixed} position:fixed → absolute)\nfonts (list in film.js "fonts:"): ${JSON.stringify(fontsUsed)}${fontsUsed.length < cssSummary.fonts.length ? `\n  (${cssSummary.fonts.length - fontsUsed.length} face(s) of families no visible text uses were left out)` : ""}${cssSummary.variable.length ? `\n  variable fonts (weight range; any weight inside it loads the same file): ${cssSummary.variable.join(", ")}` : ""}`);
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

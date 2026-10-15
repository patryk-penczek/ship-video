// Drives the running app through a states.json list; shared by capture.mjs and compare.mjs so both see the same app.
// State: { name, path?, actions?, continue? }. `continue: true` keeps the previous state's page instead of reloading.
// Actions (one key each): click <sel> · dblclick <sel> · fill [<sel>, <text>] · upload [<sel>, <file>|[files]] (<input type=file>) · type <text> · press <key> · hover <sel>
//   · select [<sel>, <value>] · check <sel> · set [<sel>, <value>] (range/number inputs, fires input+change)
//   · scroll <y> | [<sel>, <y>] · waitFor <sel> · wait <ms> · goto <path> · eval <js>
//   · tap <sel> (touch tap; a click without touch) · swipe [<sel>, dx, dy, {steps, hold}] (finger/mouse from the element's centre)
//   · drag [<from>, <to>, {steps, hold}] (real mouse events, <to> a selector or [x, y]; hold:true leaves the button down)
//   · mouse "down" | "up" | ["move", <sel>|[x, y], {steps}]  (building blocks for drags that need a pause or a second move)
// State keys that shape the page: scheme ("light"|"dark": prefers-color-scheme), storage {key: value} (localStorage seeded before the
// first navigation, once per tab), reveal: true (scroll through the page so IntersectionObserver content appears).
// The file may also be { "init": { storage, sessionStorage, cookies: [{name, value}], scheme }, "states": [...] }: init applies to every page (login).
// before: true on a state also captures <name>-before, the page right before the last action (the "before" half of a click).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { die } from "./common.mjs";

// no CSS animation/transition/caret may move between the screenshot and the DOM capture
export const FREEZE = "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}";

// Options shared by capture.mjs and compare.mjs: --viewport WxH · --touch · --dpr N · --scheme light|dark · --storage "k=v;k2=v2" · --motion
// (--motion: prefers-reduced-motion stays off, so a page that turns its CSS animations off under "reduce" plays them; the freeze rule then
// jumps every animation to its end state, which is what a draw-on line or fade-in should be captured as. JS timers/counters still need a wait.)
export const ENV_FLAGS = ["viewport", "touch", "dpr", "scheme", "storage", "motion", "storage-state", "seed", "init-script"];
export function envOptions(a) {
  const o = { width: 1920, height: 1080, dpr: 1, touch: !!a.touch, motion: !!a.motion, scheme: undefined, storage: {} };
  if (a.viewport !== undefined) {
    const m = String(a.viewport).match(/^(\d{2,5})x(\d{2,5})$/);
    if (!m) die(`--viewport must look like 390x844, got "${a.viewport === true ? "" : a.viewport}"`);
    o.width = +m[1]; o.height = +m[2];
  }
  if (a.dpr !== undefined) { const v = Number(a.dpr); if (!(v >= 1 && v <= 4)) die(`--dpr must be 1..4, got "${a.dpr === true ? "" : a.dpr}"`); o.dpr = v; o.dprGiven = true; }
  if (a.scheme !== undefined) { if (!/^(light|dark)$/.test(a.scheme)) die("--scheme must be light or dark"); o.scheme = a.scheme; }
  if (a["storage-state"] !== undefined) { if (a["storage-state"] === true || !existsSync(a["storage-state"])) die(`--storage-state: file not found: ${a["storage-state"]}`); o.storageState = a["storage-state"]; }
  if (a.seed !== undefined) { const v = Number(a.seed); if (!Number.isInteger(v)) die("--seed must be an integer"); o.seed = v; }
  if (a["init-script"] !== undefined) { if (a["init-script"] === true || !existsSync(a["init-script"])) die(`--init-script: file not found: ${a["init-script"]}`); o.initScript = readFileSync(a["init-script"], "utf8"); }
  if (a.storage !== undefined) {
    if (a.storage === true) die("--storage needs key=value;key2=value2");
    for (const kv of String(a.storage).split(";").filter(Boolean)) { const i = kv.indexOf("="); if (i < 1) die(`--storage: "${kv}" is not key=value`); o.storage[kv.slice(0, i)] = kv.slice(i + 1); }
  }
  return o;
}

// A browser context for one state: viewport, touch, dpr, colour scheme, and login seeds applied before the first navigation.
export async function makeContext(browser, url, opts, st = {}, init = {}) {
  const scheme = st.scheme ?? opts.scheme ?? init.scheme;
  const ctx = await browser.newContext({
    viewport: { width: opts.width, height: opts.height }, deviceScaleFactor: opts.dpr, isMobile: !!opts.touch, hasTouch: !!opts.touch,
    reducedMotion: opts.reducedMotion ?? "reduce", ...(scheme ? { colorScheme: scheme } : {}), ...(opts.storageState ? { storageState: opts.storageState } : {}),
  });
  // deterministic demo data: a seeded Math.random and a fixed clock, installed before any app script runs
  const seed = opts.seed ?? init.seed, date = init.date;
  if (seed != null || date) await ctx.addInitScript(([seed, date]) => {
    if (seed != null) { let a = seed >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    if (date) { const D = Date, fixed = new D(date).getTime(); const F = class extends D { constructor(...r) { r.length ? super(...r) : super(fixed); } static now() { return fixed; } }; window.Date = F; }
  }, [seed ?? null, date ?? null]);
  const script = [opts.initScript, init.script].filter(Boolean).join("\n");
  if (script) await ctx.addInitScript(script);
  const ser = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  const local = ser({ ...(init.storage ?? {}), ...opts.storage, ...(st.storage ?? {}) }), session = ser(init.sessionStorage ?? {});
  // fonts registered from JS (new FontFace(...), e.g. canvas apps) are not in any stylesheet: remember them so capture can copy the files
  await ctx.addInitScript(() => {
    const O = window.FontFace; if (!O || O.__sv) return;
    const F = function (family, source, desc) { (window.__svFonts ||= []).push({ family, source: typeof source === "string" ? source : null, desc: desc || {} }); return new O(family, source, desc); };
    F.prototype = O.prototype; F.__sv = true; window.FontFace = F;
  });
  if (Object.keys(local).length || Object.keys(session).length) {
    // once per tab: a later logout / reload must not be undone by the seed
    await ctx.addInitScript(([l, s]) => {
      try {
        if (sessionStorage.getItem("__sv_seeded")) return;
        for (const [k, v] of Object.entries(l)) localStorage.setItem(k, v);
        for (const [k, v] of Object.entries(s)) sessionStorage.setItem(k, v);
        sessionStorage.setItem("__sv_seeded", "1");
      } catch {}
    }, [local, session]);
  }
  if (init.cookies?.length) await ctx.addCookies(init.cookies.map((c) => ({ url: new URL("/", url).href, ...c })));
  return ctx;
}

// Scrolls the page top to bottom in viewport steps (IntersectionObserver / scroll-reveal content shows up), then back to the top.
export async function scrollThrough(page, wait = 300) {
  const [h, vh] = await page.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
  if (h <= vh + 20) return;
  const to = (y) => page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
  for (let y = 0; y < h; y += Math.round(vh * 0.6)) { await to(y); await page.waitForTimeout(wait); }
  await to(h); await page.waitForTimeout(wait);
  await to(0); await page.waitForTimeout(wait);
}
// Elements that are still invisible (opacity 0) after scrolling: content the capture would lose.
export const hiddenContent = (page, rootSel = "body") => page.evaluate((sel) => {
  const root = document.querySelector(sel) ?? document.body, out = [];
  for (const e of root.querySelectorAll("*")) {
    if (/^(SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE|HEAD|svg|path|defs)$/i.test(e.tagName) || e instanceof SVGElement) continue;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    if (cs.display === "none" || cs.visibility === "hidden" || !(r.width > 4 && r.height > 4) || r.right <= 0 || r.left >= innerWidth || !(e.textContent.trim() || e.querySelector("img,svg"))) continue;
    let op = 1; for (let p = e; p && p !== document.body; p = p.parentElement) op *= Number(getComputedStyle(p).opacity);
    if (op < 0.05 && Number(cs.opacity) < 0.05) out.push(e.id ? `#${e.id}` : `${e.tagName.toLowerCase()}${e.classList.length ? "." + [...e.classList].slice(0, 2).join(".") : ""}`);
  }
  return out;
}, rootSel);

export function readStates(file) {
  let s;
  try { s = JSON.parse(readFileSync(file, "utf8")); } catch (e) { die(`${file}: ${e.message}`); }
  let init = {}, setup = null;
  if (s && !Array.isArray(s) && typeof s === "object" && Array.isArray(s.states)) { init = s.init ?? {}; setup = s.setup ?? init.setup ?? null; s = s.states; }
  if (setup && Array.isArray(setup)) setup = { actions: setup };
  if (!Array.isArray(s) || !s.length) die(`${file}: expected a non-empty array of { name, path?, actions? } (or { init, states })`);
  const seen = new Set();
  for (const st of s) {
    if (!st || typeof st !== "object") die(`${file}: every state must be an object`);
    if (!st.name || !/^[\w.-]+$/.test(st.name)) die(`${file}: every state needs a "name" of letters, digits, - _ . (got ${JSON.stringify(st.name)})`);
    if (["__proto__", "constructor", "prototype"].includes(st.name) || /^\.+$/.test(st.name)) die(`${file}: state name "${st.name}" is reserved`);
    // names become file names (<name>.png, img/<name>-c0-0.png): compare case-insensitively, macOS would overwrite
    if (seen.has(st.name.toLowerCase())) die(`${file}: duplicate state "${st.name}" (names are compared case-insensitively: their files would collide)`);
    seen.add(st.name.toLowerCase());
    if (st.before) {
      if (!st.actions?.length) die(`${file}: state ${st.name}: "before" needs at least one action`);
      if (seen.has(`${st.name}-before`.toLowerCase())) die(`${file}: "${st.name}-before" (made by before:true) collides with another state`);
      seen.add(`${st.name}-before`.toLowerCase());
    }
    if (st.canvas) {
      const f = st.canvas.frames;
      if (f !== undefined && !(Number.isInteger(f) && f >= 1 && f <= 60)) die(`${file}: state ${st.name}: canvas.frames must be an integer 1..60 (got ${JSON.stringify(f)})`);
      if (st.canvas.steps !== undefined && !(Array.isArray(st.canvas.steps) && st.canvas.steps.length)) die(`${file}: state ${st.name}: canvas.steps must be a non-empty array of action lists`);
    }
    if (st.scheme !== undefined && !/^(light|dark)$/.test(st.scheme)) die(`${file}: state ${st.name}: scheme must be "light" or "dark"`);
    for (const act of st.actions ?? []) if (!act || typeof act !== "object" || Object.keys(act).length !== 1) die(`${file}: state ${st.name}: each action needs exactly one key, got ${JSON.stringify(act)} (put "wait" in its own action)`);
  }
  s.init = init; s.setup = setup;
  return s;
}

// The freeze rule is tagged so port.mjs collectSheets can leave it out of a ported app.css (it would disable every transition in the film).
export const freezePage = (page) => page.evaluate((css) => { const s = document.createElement("style"); s.setAttribute("data-ship-video-freeze", ""); s.textContent = css; document.head.append(s); }, FREEZE);

// Navigation that does not depend on networkidle (an app that polls or holds a socket never reaches it): wait for "load", then give the network
// a few seconds to settle, without failing when it does not. A goto timeout with a rendered DOM is tolerated (a slow third-party request).
export async function gotoPage(page, href) {
  let res = null;
  try { res = await page.goto(href, { waitUntil: "load" }); }
  catch (e) {
    const filled = /Timeout/.test(e.message) && await page.evaluate(() => document.body?.children.length > 0).catch(() => false);
    if (!filled) throw e;
  }
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  return res;
}
async function open(page, href, freeze) {
  await gotoPage(page, href);
  if (freeze) await freezePage(page);
}

export const ACTION_TIMEOUT = 5000; // a wrong selector fails in 5 s instead of Playwright's 30 s

// A selector that matches several elements used to hit the first one silently (a sidebar filter instead of the dialog's input).
// Now it warns with the count and picks the first VISIBLE match, preferring one inside a dialog/modal, then <main>.
async function pick(page, sel, name, act) {
  const loc = page.locator(sel), n = await loc.count();
  if (n <= 1) return loc;
  const i = await loc.evaluateAll((els) => {
    const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const ok = els.map((e, k) => [e, k]).filter(([e]) => vis(e));
    const inside = (q) => ok.find(([e]) => e.closest(q));
    return (inside("dialog[open], [role=dialog], [aria-modal=true]") ?? inside("main") ?? ok[0] ?? [null, 0])[1];
  });
  console.error(`WARNING [${name}] ${JSON.stringify(act)}: selector matches ${n} elements, using #${i} (the first visible one, preferring a dialog, then <main>); scope it (e.g. "[role=dialog] input") to be sure`);
  return loc.nth(i);
}

// A point on the page: [x, y] as is, or the centre of an element (scrolled into view).
async function pointOf(page, target, name, act) {
  if (Array.isArray(target)) return { x: target[0], y: target[1] };
  const loc = await pick(page, target, name, act);
  await loc.scrollIntoViewIfNeeded({ timeout: ACTION_TIMEOUT });
  const b = await loc.boundingBox(); if (!b) throw new Error(`${target} has no box`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
// One finger/pointer stroke. With touch emulation it is a real touch sequence (CDP), so touch- and pointer-event apps both see it;
// without, a mouse press-move-release. hold:true leaves the finger/button down (a "held" state to capture).
async function gesture(page, a, z, { steps = 10, hold = false } = {}) {
  if (page.touch) {
    const cdp = page.cdp ??= await page.context().newCDPSession(page);
    const send = (type, p) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
    await send("touchStart", a);
    for (let i = 1; i <= steps; i++) { await send("touchMove", { x: a.x + (z.x - a.x) * i / steps, y: a.y + (z.y - a.y) * i / steps }); await page.waitForTimeout(16); }
    if (!hold) await send("touchEnd");
  } else {
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(z.x, z.y, { steps });
    if (!hold) await page.mouse.up();
  }
}

export async function runActions(page, actions, { name, base, freeze = true } = {}) {
  for (const act of actions ?? []) {
    const [k, v] = Object.entries(act)[0] ?? [];
    const T = { timeout: ACTION_TIMEOUT };
    try {
      if (k === "click") { if (Array.isArray(v)) await page.mouse.click(v[0], v[1], v[2]); else await (await pick(page, v, name, act)).click(T); } // [x, y] = real mouse click at page coordinates
      else if (k === "dblclick") { if (Array.isArray(v)) await page.mouse.dblclick(v[0], v[1]); else await (await pick(page, v, name, act)).dblclick(T); }
      else if (k === "fill") await (await pick(page, v[0], name, act)).fill(v[1], T);
      else if (k === "upload") { // <input type=file> (hidden ones too): [selector, path | [paths]]; relative paths resolve from the working directory
        const files = [].concat(v[1]).map((f) => path.resolve(f)), miss = files.find((f) => !existsSync(f));
        if (miss) throw new Error(`upload: file not found: ${miss}`);
        await page.setInputFiles(v[0], files, T);
      }
      else if (k === "type") await page.keyboard.type(v);
      else if (k === "press") await page.keyboard.press(v);
      else if (k === "hover") await (await pick(page, v, name, act)).hover(T);
      else if (k === "select") await (await pick(page, v[0], name, act)).selectOption(v[1], T);
      else if (k === "check") await (await pick(page, v, name, act)).check(T);
      else if (k === "set") await page.$eval(v[0], (el, val) => {
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
      }, String(v[1]));
      else if (k === "scroll") await page.evaluate(([sel, y]) => (sel ? document.querySelector(sel) : window).scrollTo(0, y), Array.isArray(v) ? v : [null, v]);
      else if (k === "waitFor") await page.waitForSelector(v, T);
      else if (k === "wait") await (page.clocked ? page.clock.runFor(v) : page.waitForTimeout(v));
      else if (k === "goto") await open(page, new URL(v, base).href, freeze);
      else if (k === "eval") await page.evaluate(v);
      else if (k === "tap") { const loc = await pick(page, v, name, act); await (page.touch ? loc.tap(T) : loc.click(T)); }
      else if (k === "swipe") {
        const [sel, dx = 0, dy = 0, o = {}] = v, loc = await pick(page, sel, name, act);
        await loc.scrollIntoViewIfNeeded(T);
        const b = await loc.boundingBox(); if (!b) throw new Error(`swipe: ${sel} has no box`);
        await gesture(page, { x: b.x + b.width / 2, y: b.y + b.height / 2 }, { x: b.x + b.width / 2 + dx, y: b.y + b.height / 2 + dy }, o);
      } else if (k === "drag") {
        const [from, to, o = {}] = v, a = await pointOf(page, from, name, act), z = await pointOf(page, to, name, act);
        await page.mouse.move(a.x, a.y); await page.mouse.down();
        await page.mouse.move(a.x + Math.sign(z.x - a.x) * 4, a.y + Math.sign(z.y - a.y) * 4, { steps: 2 }); // pass the drag threshold
        await page.mouse.move(z.x, z.y, { steps: o.steps ?? 14 });
        if (!o.hold) { await page.waitForTimeout(o.settle ?? 60); await page.mouse.up(); }
      } else if (k === "mouse") {
        if (v && typeof v === "object" && !Array.isArray(v)) { // { move: [x, y] | sel, steps, down: true, up: true }, or { x, y }: move, then press, then release
          const to = v.move ?? (v.x != null ? [v.x, v.y] : null);
          if (to) { const p = await pointOf(page, to, name, act); await page.mouse.move(p.x, p.y, { steps: v.steps ?? 10 }); }
          if (v.down) await page.mouse.down();
          if (v.up) await page.mouse.up();
          continue;
        }
        const [m, target, o = {}] = Array.isArray(v) ? v : [v];
        if (m === "down") await page.mouse.down(); else if (m === "up") await page.mouse.up();
        else if (m === "move") { const p = await pointOf(page, target, name, act); await page.mouse.move(p.x, p.y, { steps: o.steps ?? 10 }); }
        else throw new Error(`mouse: "${m}" (use "down", "up" or ["move", <sel>|[x, y], {steps}])`);
      }
      else throw new Error(`unknown action "${k}" (click dblclick fill upload type press hover select check set scroll waitFor wait goto eval tap swipe drag mouse)`);
    } catch (e) {
      const timedOut = /Timeout/.test(e.message);
      throw new Error(`state ${name}, action ${JSON.stringify(act)}: ${timedOut ? `nothing matched or became actionable within ${ACTION_TIMEOUT / 1000} s for ${JSON.stringify(v)} (wrong selector, or covered/disabled; compare with review/discovery/inventory.json buttons)` : String(e.message).split("\n")[0]}`);
    }
  }
}

// Visits each state in order; calls onState(page, state) once its actions are done and fonts/layout settled.
// A state that fails (bad selector, page error, onState throws) is recorded in `errors` and skipped; the run goes on with the next
// state, so one typo doesn't lose every other state. animate: false keeps reduced motion for every state (compare.mjs).
export async function drive(browser, url, states, { width = 1920, height = 1080, freeze = true, errors = [], settle = 150, animate = true, dpr = 1, dprAll = false, touch = false, motion = false, scheme, storage = {}, init = {}, setup = null, seed, initScript, storageState } = {}, onState) {
  let page = null;
  const shut = async (pg) => { if (pg) { await pg.context().close().catch(() => {}); } };
  const env = { width, height, touch, scheme, storage, seed, initScript, storageState };
  if (setup) { // onboarding / "Try the demo" / a login form: run once, keep the resulting storage (cookies, localStorage, IndexedDB) for every state
    const ctx = await makeContext(browser, url, { ...env, dpr: 1 }, {}, init), pg = await ctx.newPage();
    try {
      await open(pg, new URL(setup.path ?? "/", url).href, freeze);
      await runActions(pg, setup.actions, { name: "setup", base: url, freeze });
      await pg.waitForTimeout(setup.settle ?? 300);
      env.storageState = await ctx.storageState({ indexedDB: true });
    } catch (e) { errors.push(`setup: ${String(e.message).split("\n")[0]}`); }
    finally { await ctx.close().catch(() => {}); }
  }
  try {
    for (const st of states) {
      try {
        if (!(st.continue && page)) {
          await shut(page);
          // A state with canvas.frames > 1 needs a running animation: most apps pause it under prefers-reduced-motion, so that
          // state gets "no-preference" and a controllable clock (page.clock.runFor advances rAF/timers deterministically).
          const animated = animate && (st.canvas?.frames ?? 0) > 1;
          // a state with a canvas renders it at devicePixelRatio (apps use min(2, dpr)): dpr 2 keeps it sharp when the film zooms 2×
          const ctx = await makeContext(browser, url, { ...env, dpr: dprAll || st.canvas || st.record || st.image ? dpr : 1, reducedMotion: animated || motion || st.motion ? "no-preference" : "reduce" }, st, init);
          page = await ctx.newPage();
          page.touch = touch; page.clocked = false;
          for (const k of ["move", "click", "dblclick"]) { const o = page.mouse[k].bind(page.mouse); page.mouse[k] = async (x, y, ...r) => { page.mouseAt = { x, y }; return o(x, y, ...r); }; } // last pointer position, for recorded paths
          if (animated) { try { await page.clock.install(); page.clocked = true; } catch {} }
          page.on("pageerror", (e) => errors.push(`[app ${st.name}] ${e.message}`));
          await open(page, new URL(st.path ?? "", url).href, freeze);
        } else {
          if (st.scheme) await page.emulateMedia({ colorScheme: st.scheme });
          if (st.path) await open(page, new URL(st.path, url).href, freeze);
        }
        if (st.reveal) await scrollThrough(page);
        if (st.before) { // also capture the state right before the last action: <name>-before (what the viewer sees before the click)
          await runActions(page, st.actions.slice(0, -1), { name: st.name, base: url, freeze });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(settle);
          await onState(page, { ...st, name: `${st.name}-before`, actions: undefined, before: false, canvas: undefined });
          await runActions(page, st.actions.slice(-1), { name: st.name, base: url, freeze });
        } else await runActions(page, st.actions, { name: st.name, base: url, freeze });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(settle);
        await onState(page, st);
      } catch (e) {
        { const m = String(e.message).split("\n")[0]; errors.push(/^state /.test(m) ? m : `[${st.name}] ${m}`); }
        if (page?.isClosed()) page = null;
      }
    }
  } finally {
    await shut(page);
  }
}

// Drives the running app through a states.json list; shared by capture.mjs and compare.mjs so both see the same app.
// State: { name, path?, actions?, continue? }. `continue: true` keeps the previous state's page instead of reloading.
// Actions (one key each): click <sel> · dblclick <sel> · fill [<sel>, <text>] · type <text> · press <key> · hover <sel>
//   · select [<sel>, <value>] · check <sel> · set [<sel>, <value>] (range/number inputs, fires input+change)
//   · scroll <y> | [<sel>, <y>] · waitFor <sel> · wait <ms> · goto <path> · eval <js>
// before: true on a state also captures <name>-before, the page right before the last action (the "before" half of a click).
import { readFileSync } from "node:fs";
import { die } from "./common.mjs";

// no CSS animation/transition/caret may move between the screenshot and the DOM capture
export const FREEZE = "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}";

export function readStates(file) {
  let s;
  try { s = JSON.parse(readFileSync(file, "utf8")); } catch (e) { die(`${file}: ${e.message}`); }
  if (!Array.isArray(s) || !s.length) die(`${file}: expected a non-empty array of { name, path?, actions? }`);
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
    for (const act of st.actions ?? []) if (!act || typeof act !== "object" || Object.keys(act).length !== 1) die(`${file}: state ${st.name}: each action needs exactly one key, got ${JSON.stringify(act)} (put "wait" in its own action)`);
  }
  return s;
}

// The freeze rule is tagged so port.mjs collectSheets can leave it out of a ported app.css (it would disable every transition in the film).
export const freezePage = (page) => page.evaluate((css) => { const s = document.createElement("style"); s.setAttribute("data-ship-video-freeze", ""); s.textContent = css; document.head.append(s); }, FREEZE);

async function open(page, href, freeze) {
  await page.goto(href, { waitUntil: "networkidle" });
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

export async function runActions(page, actions, { name, base, freeze = true } = {}) {
  for (const act of actions ?? []) {
    const [k, v] = Object.entries(act)[0] ?? [];
    const T = { timeout: ACTION_TIMEOUT };
    try {
      if (k === "click") await (await pick(page, v, name, act)).click(T);
      else if (k === "dblclick") await (await pick(page, v, name, act)).dblclick(T);
      else if (k === "fill") await (await pick(page, v[0], name, act)).fill(v[1], T);
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
      else throw new Error(`unknown action "${k}" (click dblclick fill type press hover select check set scroll waitFor wait goto eval)`);
    } catch (e) {
      const timedOut = /Timeout/.test(e.message);
      throw new Error(`state ${name}, action ${JSON.stringify(act)}: ${timedOut ? `nothing matched or became actionable within ${ACTION_TIMEOUT / 1000} s for ${JSON.stringify(v)} (wrong selector, or covered/disabled; compare with review/discovery/inventory.json buttons)` : String(e.message).split("\n")[0]}`);
    }
  }
}

// Visits each state in order; calls onState(page, state) once its actions are done and fonts/layout settled.
// A state that fails (bad selector, page error, onState throws) is recorded in `errors` and skipped; the run goes on with the next
// state, so one typo doesn't lose every other state. animate: false keeps reduced motion for every state (compare.mjs).
export async function drive(browser, url, states, { width = 1920, height = 1080, freeze = true, errors = [], settle = 150, animate = true, dpr = 1 } = {}, onState) {
  let page = null;
  try {
    for (const st of states) {
      try {
        if (!(st.continue && page)) {
          await page?.close();
          // A state with canvas.frames > 1 needs a running animation: most apps pause it under prefers-reduced-motion, so that
          // state gets "no-preference" and a controllable clock (page.clock.runFor advances rAF/timers deterministically).
          const animated = animate && (st.canvas?.frames ?? 0) > 1;
          // a state with a canvas renders it at devicePixelRatio (apps use min(2, dpr)): dpr 2 keeps it sharp when the film zooms 2×
          page = await browser.newPage({ viewport: { width, height }, reducedMotion: animated ? "no-preference" : "reduce", deviceScaleFactor: st.canvas ? dpr : 1 });
          page.clocked = false;
          if (animated) { try { await page.clock.install(); page.clocked = true; } catch {} }
          page.on("pageerror", (e) => errors.push(`[app ${st.name}] ${e.message}`));
          await open(page, new URL(st.path ?? "", url).href, freeze);
        } else if (st.path) await open(page, new URL(st.path, url).href, freeze);
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
    await page?.close();
  }
}

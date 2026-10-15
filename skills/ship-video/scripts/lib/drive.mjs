// Drives the running app through a states.json list; shared by capture.mjs and compare.mjs so both see the same app.
// State: { name, path?, actions?, continue? }. `continue: true` keeps the previous state's page instead of reloading.
// Actions (one key each): click <sel> · dblclick <sel> · fill [<sel>, <text>] · type <text> · press <key> · hover <sel>
//   · select [<sel>, <value>] · check <sel> · set [<sel>, <value>] (range/number inputs, fires input+change)
//   · scroll <y> | [<sel>, <y>] · waitFor <sel> · wait <ms> · goto <path> · eval <js>
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
    if (!st.name || !/^[\w.-]+$/.test(st.name)) die(`${file}: every state needs a "name" of letters, digits, - _ . (got ${JSON.stringify(st.name)})`);
    if (seen.has(st.name)) die(`${file}: duplicate state "${st.name}"`);
    seen.add(st.name);
  }
  return s;
}

async function open(page, href, freeze) {
  await page.goto(href, { waitUntil: "networkidle" });
  if (freeze) await page.addStyleTag({ content: FREEZE });
}

export async function runActions(page, actions, { name, base, freeze = true } = {}) {
  for (const act of actions ?? []) {
    const [k, v] = Object.entries(act)[0] ?? [];
    try {
      if (k === "click") await page.click(v);
      else if (k === "dblclick") await page.dblclick(v);
      else if (k === "fill") await page.fill(v[0], v[1]);
      else if (k === "type") await page.keyboard.type(v);
      else if (k === "press") await page.keyboard.press(v);
      else if (k === "hover") await page.hover(v);
      else if (k === "select") await page.selectOption(v[0], v[1]);
      else if (k === "check") await page.check(v);
      else if (k === "set") await page.$eval(v[0], (el, val) => {
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
      }, String(v[1]));
      else if (k === "scroll") await page.evaluate(([sel, y]) => (sel ? document.querySelector(sel) : window).scrollTo(0, y), Array.isArray(v) ? v : [null, v]);
      else if (k === "waitFor") await page.waitForSelector(v);
      else if (k === "wait") await page.waitForTimeout(v);
      else if (k === "goto") await open(page, new URL(v, base).href, freeze);
      else if (k === "eval") await page.evaluate(v);
      else throw new Error(`unknown action "${k}" (click dblclick fill type press hover select check set scroll waitFor wait goto eval)`);
    } catch (e) {
      throw new Error(`state ${name}, action ${JSON.stringify(act)}: ${String(e.message).split("\n")[0]}`);
    }
  }
}

// Visits each state in order; calls onState(page, state) once its actions are done and fonts/layout settled.
export async function drive(browser, url, states, { width = 1920, height = 1080, freeze = true, errors = [], settle = 150 } = {}, onState) {
  let page = null;
  try {
    for (const st of states) {
      if (!(st.continue && page)) {
        await page?.close();
        page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
        page.on("pageerror", (e) => errors.push(`[app ${st.name}] ${e.message}`));
        await open(page, new URL(st.path ?? "", url).href, freeze);
      } else if (st.path) await open(page, new URL(st.path, url).href, freeze);
      await runActions(page, st.actions, { name: st.name, base: url, freeze });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(settle);
      await onState(page, st);
    }
  } finally {
    await page?.close();
  }
}

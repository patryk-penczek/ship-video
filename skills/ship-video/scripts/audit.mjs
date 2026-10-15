// Scans the film every 1/8 s and reports visible text that is clipped by the frame or by an overflow:hidden ancestor.
// usage: node audit.mjs <film/index.html> [--step 0.125] [--no-crop] [--summary]
// data-clip-ok on any ancestor of a text (deliberate crops: rotating words, camera pans, a blurred backdrop; set it on the scene or on
// the .app-shot wrapper via pick(scene, name).setAttribute("data-clip-ok", "")) silences its subtree, frame-crop lines included; overflow auto/scroll
// (scrolling lists) don't count. Text entirely outside a box or the frame is hidden, not cut, and is ignored.
//   --step      seconds between samples, >= 0.01 (default 0.125)
//   --no-crop   skip frame-edge checks (films that zoom past big type on purpose)
//   --summary   one line per clipping box instead of per text
// Output: "<first>–<last> (<n>x)  <issue>". Fix every hit that isn't a deliberate transition.
import { help, args, openFilm, die, num, known } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
known(a, ["step", "no-crop", "summary"]);
const [html] = a._;
if (!html) die("usage: node audit.mjs <film/index.html> [--step 0.125] [--no-crop] [--summary]");
const step = num(a, "step", 0.125, { min: 0.01 });
const noCrop = !!a["no-crop"];
const { browser, page, duration } = await openFilm(html);
if (!(await page.$("#scenes"))) { await browser.close(); die("the page has no #scenes element (is this a film built from the starter?)"); }
const seen = new Map();
for (let t = 0; t < duration; t += step) {
  const issues = await page.evaluate(({ tt, noCrop }) => {
    window.__seek(tt);
    const out = [];
    const walker = document.createTreeWalker(document.getElementById("scenes"), NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      let op = 1;
      for (let p = el; p; p = p.parentElement) op *= Number(getComputedStyle(p).opacity);
      if (op < 0.35) continue;
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      if (r.width < 2) continue;
      const label = n.textContent.trim().slice(0, 40);
      // data-clip-ok on ANY ancestor (a scene, a wrapper, the text's own box) marks a deliberate crop for its whole subtree.
      // The .app-shot wrapper carries data-clip-ok="box" (UI.shot): that only exempts its own edge, set it to "" to cover the screen.
      if (el.closest('[data-clip-ok]:not([data-clip-ok="box"])')) continue;
      for (let p = el.parentElement; p && p.id !== "scenes"; p = p.parentElement) {
        if (p.classList.contains("scene")) break;
        const ov = getComputedStyle(p).overflow;
        if (p.hasAttribute("data-clip-ok") || ov === "visible" || /auto|scroll/.test(ov)) continue;
        const pr = p.getBoundingClientRect();
        // text entirely outside the box (scrolled away, off-camera) is hidden, not cut: only partial overlaps count
        const touches = r.right > pr.left && r.left < pr.right && r.bottom > pr.top && r.top < pr.bottom;
        if (touches && (r.right > pr.right + 1 || r.bottom > pr.bottom + 1 || r.left < pr.left - 1 || r.top < pr.top - 1)) out.push(`overflow-clip [${p.className || p.tagName}] "${label}"`);
      }
      const fs = parseFloat(cs.fontSize);
      const onFrame = r.right > 0 && r.left < 1920 && r.bottom > 0 && r.top < 1080;
      if (!noCrop && fs >= 48 && onFrame && (r.left < -2 || r.right > 1922)) out.push(`frame-crop fs=${fs} "${label}" x=${r.left.toFixed(0)}..${r.right.toFixed(0)}`);
    }
    return out;
  }, { tt: t, noCrop });
  for (const i of issues) { if (!seen.has(i)) seen.set(i, []); seen.get(i).push(t.toFixed(3)); }
}
// ending: the last copy should be complete >= 1.2 s before the end and the camera at rest on the last frame
const endWarn = await page.evaluate((D) => {
  const sample = (t) => { window.__seek(t); return { text: document.getElementById("scenes").innerText.replace(/\s+/g, " ").trim(), cam: [...document.querySelectorAll(".camlayer")].map((e) => getComputedStyle(e).transform).join("|") }; };
  const early = sample(D - 1.2), mid = sample(D - 1 / 30), last = sample(D);
  const out = [];
  if (early.text !== last.text) out.push(`ending: text still changing after ${(D - 1.2).toFixed(2)} s (end - 1.2 s): finish the last copy earlier and let the end card rest`);
  if (mid.cam !== last.cam) out.push("ending: the camera is still moving on the last frame (ease the final push to rest, or end with land())");
  return out;
}, duration);
for (const w of endWarn) console.log(`WARNING ${w}`);
await browser.close();
if (!seen.size) console.log("audit: no clipped text");
else if (a.summary) {
  const boxes = new Map();
  for (const [k, ts] of seen) {
    const box = k.replace(/ ".*$/, "");
    const b = boxes.get(box) ?? { texts: 0, from: ts[0], to: ts.at(-1) };
    b.texts++; b.from = Math.min(b.from, ts[0]); b.to = Math.max(b.to, ts.at(-1));
    boxes.set(box, b);
  }
  for (const [box, b] of boxes) console.log(`${Number(b.from).toFixed(3)}–${Number(b.to).toFixed(3)}  ${box}  (${b.texts} texts)`);
} else for (const [k, ts] of seen) console.log(`${ts[0]}–${ts.at(-1)} (${ts.length}x)  ${k}`);

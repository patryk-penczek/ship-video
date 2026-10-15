// Scans the film every 1/8 s and reports visible text that is clipped by the frame or by an overflow:hidden ancestor.
// usage: node audit.mjs <film/index.html> [--step 0.125] [--no-crop] [--summary]
// Ancestors with data-clip-ok (deliberate masks: rotating words, line clamps, tiles) or overflow auto/scroll
// (scrolling lists) don't count. Text entirely outside a box or the frame is hidden, not cut, and is ignored.
//   --no-crop   skip frame-edge checks (films that zoom past big type on purpose)
//   --summary   one line per clipping box instead of per text
// Output: "<first>–<last> (<n>x)  <issue>". Fix every hit that isn't a deliberate transition.
import { help, args, openFilm } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
const [html] = a._;
if (!html) { console.error("usage: node audit.mjs <film/index.html> [--step 0.125]"); process.exit(1); }
const step = Number(a.step ?? 0.125);
const noCrop = !!a["no-crop"];
const { browser, page, duration } = await openFilm(html);
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

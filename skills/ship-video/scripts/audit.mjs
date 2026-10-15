// Scans the film every 1/8 s and reports visible text that is clipped by the frame or by an overflow:hidden ancestor.
// usage: node audit.mjs <film/index.html> [--step 0.125]
// Ancestors with class "scene" or attribute data-clip-ok (deliberate masks: rotating words, line clamps, tiles) are skipped.
// Output: "<first>–<last> (<n>x)  <issue>". Fix every hit that isn't a deliberate transition.
import { help, args, openFilm } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
const [html] = a._;
if (!html) { console.error("usage: node audit.mjs <film/index.html> [--step 0.125]"); process.exit(1); }
const step = Number(a.step ?? 0.125);
const { browser, page, duration } = await openFilm(html);
const seen = new Map();
for (let t = 0; t < duration; t += step) {
  const issues = await page.evaluate((tt) => {
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
        if (p.hasAttribute("data-clip-ok") || getComputedStyle(p).overflow === "visible") continue;
        const pr = p.getBoundingClientRect();
        if (r.right > pr.right + 1 || r.bottom > pr.bottom + 1 || r.left < pr.left - 1 || r.top < pr.top - 1) out.push(`overflow-clip [${p.className || p.tagName}] "${label}"`);
      }
      const fs = parseFloat(cs.fontSize);
      if (fs >= 48 && (r.left < -2 || r.right > 1922)) out.push(`frame-crop fs=${fs} "${label}" x=${r.left.toFixed(0)}..${r.right.toFixed(0)}`);
    }
    return out;
  }, t);
  for (const i of issues) { if (!seen.has(i)) seen.set(i, []); seen.get(i).push(t.toFixed(3)); }
}
await browser.close();
if (!seen.size) console.log("audit: no clipped text");
for (const [k, ts] of seen) console.log(`${ts[0]}–${ts.at(-1)} (${ts.length}x)  ${k}`);

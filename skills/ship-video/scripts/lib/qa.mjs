// Runtime quality checks for audit.mjs: determinism (pixel compare of repeated seeks), text contrast (WCAG) and personal data in the rendered DOM.
import { openFilm } from "./common.mjs";
import { PII, isFake, mask } from "./redact.mjs";

const r3 = (x) => Math.round(x * 1000) / 1000;

// ---------- determinism ----------
// The same time must always give the same pixels: twice in a row, after scrubbing backwards, and on a fresh page load.
// A mismatch means film code reads something that is not the timeline (random, clock, a timer, measured layout, a tween that depends on order).
const domSig = () => {
  const out = [];
  for (const e of document.querySelectorAll("#stage *")) {
    if (out.length > 4000) break;
    const lab = e.id ? "#" + e.id : e.classList[0] ? "." + e.classList[0] : e.tagName.toLowerCase();
    out.push(`${lab}|${(e.getAttribute("style") ?? "").replace(/(translate|rotate|scale): none;?\s*|transform: translate\(0px, 0px\);?\s*/g, "").replace(/\s+/g, "")}|${e.getAttribute("class") ?? ""}|${e.children.length ? "" : (e.textContent || "").slice(0, 40)}`);
  }
  out.push("cam|" + getComputedStyle(document.getElementById("cam")).transform);
  return out;
};
async function pass(page, times, repeat) {
  const res = [];
  for (const t of times) {
    await page.evaluate((tt) => window.__seek(tt), t);
    const a = await page.screenshot({ type: "png" }), sig = await page.evaluate(domSig);
    let rep = null;
    if (repeat) { await page.waitForTimeout(60); await page.evaluate((tt) => window.__seek(tt), t); rep = await page.screenshot({ type: "png" }); }
    res.push({ t, buf: a, sig, again: rep });
  }
  return res;
}
// pixels that differ by more than 8/255 in a channel (Chromium's own dithering of big gradients and blur differs by 1-2 levels between loads: not a film bug)
export const pixDiff = (page, A, B) => page.evaluate(async ([A, B]) => {
  const ld = (x) => new Promise((o) => { const i = new Image(); i.onload = () => o(i); i.src = "data:image/png;base64," + x; });
  const [ia, ib] = [await ld(A), await ld(B)], mk = (i) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
  const da = mk(ia), db = mk(ib); let n = 0, x0 = 1e9, x1 = 0, y0 = 1e9, y1 = 0;
  for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) > 8 || Math.abs(da[i + 1] - db[i + 1]) > 8 || Math.abs(da[i + 2] - db[i + 2]) > 8) { n++; const p = i / 4, x = p % ia.width, y = (p / ia.width) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { n, box: [x0, y0, x1, y1] };
}, [A.toString("base64"), B.toString("base64")]);
export async function determinism(html, page, duration, { n = 12 } = {}) {
  // off the beat grid: exactly at a tween start GSAP renders differently depending on the direction of arrival (a scrub artefact, not a film bug)
  const times = Array.from({ length: n }, (_, i) => r3(duration * (i + 0.5) / n + 0.0137));
  const first = await pass(page, times, true);
  const back = await pass(page, [...times].reverse(), false); back.reverse();
  const { browser: b2, page: p2 } = await openFilm(html);
  let fresh; try { fresh = await pass(p2, times.map((_, i) => times[(i * 5) % n]), false); } finally { await b2.close(); }
  const freshBy = new Map(fresh.map((f) => [f.t, f]));
  const out = [];
  for (const [i, f] of first.entries()) {
    const why = [], boxes = [], fr = freshBy.get(f.t);
    for (const [label, other] of [["the same seek twice", f.again], ["after scrubbing backwards", back[i].buf], ["on a fresh page load", fr?.buf]]) {
      if (!other || f.buf.equals(other)) continue;
      const d = await pixDiff(page, f.buf, other);
      if (d.n > 40) { why.push(label); boxes.push(d); }
    }
    if (!why.length) continue;
    const d = boxes[0], other = (why.includes("on a fresh page load") ? fr : back[i]).sig, k = f.sig.findIndex((s, j) => s !== other[j]);
    const where = k >= 0 ? `first changed element: ${f.sig[k].split("|").slice(0, 2).join(" ").slice(0, 80)}` : "no DOM difference: canvas / filter / pixel-level noise";
    out.push(`determinism t=${f.t.toFixed(2)}  ${d.n} px differ ${why.join(", ")} at x ${d.box[0]}–${d.box[2]}, y ${d.box[1]}–${d.box[3]} (${where})  fix: nothing in build()/react() may read random, clock, timers or measured layout at render time; see the lint lines above, or diff two seeks of this time`);
  }
  return out;
}

// ---------- contrast ----------
function collectText({ appText }) {
  const W = innerWidth, H = innerHeight, out = [], rg = document.createRange();
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const walker = document.createTreeWalker(document.getElementById("scenes"), NodeFilter.SHOW_TEXT);
  const byEl = new Map();
  while (walker.nextNode()) {
    const n = walker.currentNode, el = n.parentElement;
    if (!el || !/[\p{L}\p{N}]/u.test(n.textContent) || /^(SCRIPT|STYLE)$/.test(el.tagName)) continue;
    if (el.closest("[data-contrast-ok]") || (!appText && el.closest(".app-shot"))) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text") continue;
    let op = 1; for (let p = el; p; p = p.parentElement) op *= Number(getComputedStyle(p).opacity);
    if (op < 0.9) continue; // fading in or out: judged once it rests
    rg.selectNodeContents(n); const r = rg.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(W, r.right), y1 = Math.min(H, r.bottom);
    if (x1 - x0 < 2 || y1 - y0 < 2 || (x1 - x0) * (y1 - y0) < 0.6 * r.width * r.height) continue; // mostly off-screen
    const top = document.elementsFromPoint((x0 + x1) / 2, (y0 + y1) / 2)[0];
    if (!top || !(el.contains(top) || top.contains(el))) continue; // covered by something else (a modal, a scene above)
    const col = rgba(cs.webkitTextFillColor || cs.color);
    if (col[3] * op < 0.05) continue;
    const k = el instanceof HTMLElement && el.offsetWidth > 0 ? Math.min(6, Math.max(0.2, el.getBoundingClientRect().width / el.offsetWidth)) : 1;
    const own = el.closest("[class]"), lab = el.id ? "#" + el.id : own?.classList[0] ? "." + own.classList[0] : el.tagName.toLowerCase();
    const text = n.textContent.replace(/\s+/g, " ").trim().slice(0, 40), key = lab + "|" + text;
    if (byEl.has(key)) continue;
    byEl.set(key, 1);
    out.push({ key, lab, text, rect: [x0, y0, x1 - x0, y1 - y0], col, a: col[3] * op, fs: parseFloat(cs.fontSize) * k, bold: Number(cs.fontWeight) >= 700 });
  }
  return out;
}
const HIDE_TEXT = "*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;text-decoration-color:transparent!important;caret-color:transparent!important}svg text,svg tspan{fill:transparent!important;stroke:none!important}";
async function measure(page, items, b64) {
  return page.evaluate(async ({ items, b64 }) => {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = "data:image/png;base64," + b64; });
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return items.map((it) => {
      const [rx, ry, rw, rh] = it.rect, nx = Math.min(16, Math.max(2, Math.ceil(rw / 8))), ny = Math.min(5, Math.max(2, Math.ceil(rh / 8))), cr = [], bgs = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const px = Math.min(img.width - 1, Math.floor(rx + (i + 0.5) * rw / nx)), py = Math.min(img.height - 1, Math.floor(ry + (j + 0.5) * rh / ny)), d = x.getImageData(px, py, 1, 1).data;
        const f = [0, 1, 2].map((k) => it.col[k] * it.a + d[k] * (1 - it.a)), l1 = L(f[0], f[1], f[2]), l2 = L(d[0], d[1], d[2]);
        cr.push((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)); bgs.push([d[0], d[1], d[2]]);
      }
      const ord = cr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), pick = ord[Math.floor(ord.length * 0.1)];
      const hex = (a) => "#" + a.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
      return { ratio: pick[0], fg: hex(it.col.slice(0, 3)), bg: hex(bgs[pick[1]]) };
    });
  }, { items, b64 });
}
// Samples every `step` s and at every cut; reports text that stays below WCAG AA (4.5:1, or 3:1 for large text: >= 24 px, or >= 18.66 px bold)
// for >= 0.5 s. The background is read from a screenshot with all text made transparent, so images, gradients and scrims count.
export async function contrast(page, duration, { step = 0.5, appText = false } = {}) {
  const cuts = await page.evaluate(() => window.__tl ? [...new Set(window.__tl.getChildren(true, true, false).filter((c) => c.vars?.attr && "data-on" in c.vars.attr && c.vars.attr["data-on"] === "1").map((c) => Math.round(c.startTime() * 1000) / 1000))] : []);
  const times = new Set(); for (let t = step / 2; t < duration; t += step) times.add(r3(t));
  for (const c of cuts) if (c + 0.02 < duration) times.add(r3(c + 0.02));
  const sorted = [...times].sort((a, b) => a - b), runs = new Map(), open = new Map();
  for (const t of sorted) {
    await page.evaluate((tt) => window.__seek(tt), t);
    const items = await page.evaluate(collectText, { appText });
    const bad = new Map();
    if (items.length) {
      const h = await page.addStyleTag({ content: HIDE_TEXT });
      const png = (await page.screenshot({ type: "png" })).toString("base64");
      await h.evaluate((e) => e.remove());
      const m = await measure(page, items, png);
      items.forEach((it, i) => { const big = it.fs >= 24 || (it.fs >= 18.66 && it.bold), need = big ? 3 : 4.5; if (m[i].ratio < need) bad.set(it.key, { ...it, ...m[i], need }); });
    }
    for (const [k, v] of bad) { const o = open.get(k); if (o) { o.end = t; o.worst = Math.min(o.worst, v.ratio); } else open.set(k, { start: t, end: t, worst: v.ratio, v }); }
    for (const [k, o] of [...open]) if (!bad.has(k)) { (runs.get(k) ?? runs.set(k, []).get(k)).push(o); open.delete(k); }
  }
  for (const [k, o] of open) (runs.get(k) ?? runs.set(k, []).get(k)).push(o);
  const out = [];
  for (const [, list] of runs) for (const o of list) {
    if (o.end - o.start < step * 0.9 - 1e-6) continue; // seen on one sample only: a flash, a transition
    const v = o.v;
    out.push(`contrast ${o.start.toFixed(2)}–${o.end.toFixed(2)}  "${v.text}" ${o.worst.toFixed(1)}:1 (needs ${v.need}:1${v.need === 3 ? ", large text" : ""}) text ${v.fg} on ${v.bg} [${v.lab}]  fix: darken/lighten the text, or put a scrim/solid chip behind it; data-contrast-ok on the element if it is deliberately dim`);
  }
  return out;
}

// ---------- personal data in the rendered film ----------
export async function piiScan(page, duration, { allow = [], names = [] } = {}) {
  const ok = new Set(allow.map((s) => s.toLowerCase()));
  const found = new Map();
  const grab = () => {
    const res = [], seen = new Set(), lab = (e) => e.id ? "#" + e.id : e.closest("[class]")?.classList[0] ? "." + e.closest("[class]").classList[0] : e.tagName.toLowerCase();
    const wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (wk.nextNode()) { const n = wk.currentNode, e = n.parentElement; if (!e || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName) || e.closest("[data-pii-ok]")) continue; const s = n.nodeValue.trim(); if (s && !seen.has(s)) { seen.add(s); res.push([s, lab(e)]); } }
    for (const e of document.body.querySelectorAll("*")) {
      if (e.closest("[data-pii-ok]")) continue;
      for (const at of ["value", "title", "alt", "placeholder", "aria-label", "href"]) { const v = e.getAttribute(at); if (v && !seen.has(v) && (at !== "href" || /^(mailto|tel):/i.test(v))) { seen.add(v); res.push([v, `${lab(e)}[${at}]`]); } }
      if ((e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement) && e.value && !seen.has(e.value)) { seen.add(e.value); res.push([e.value, `${lab(e)}[value]`]); }
    }
    return res;
  };
  for (let t = 0; t <= duration; t += 1) {
    await page.evaluate((tt) => window.__seek(tt), Math.min(t, duration));
    for (const [s, where] of await page.evaluate(grab)) {
      for (const [kind, src, flags] of PII) for (const m of s.matchAll(new RegExp(src, flags))) {
        if (isFake(kind, m[0]) || ok.has(m[0].toLowerCase())) continue;
        const k = kind + m[0]; if (!found.has(k)) found.set(k, { kind, v: m[0], where, t });
      }
      for (const nm of names) if (new RegExp(`(?<![\\p{L}\\p{N}])${nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu").test(s)) { const k = "name" + nm; if (!found.has(k)) found.set(k, { kind: "name", v: nm, where, t }); }
    }
  }
  return [...found.values()].map((f) => `privacy t=${f.t.toFixed(0)}  ${f.kind} ${mask(f.v)} in ${f.where}  fix: re-capture with capture.mjs --redact (names: --redact-names), or data-pii-ok if it is public on purpose. Real customer data must never appear in a public film`);
}

// ---------- brand deny list ----------
// audit.mjs --brand-deny "ShareGPT,Acme": third-party names that must not be visible anywhere in the film (a brief that keeps other brands out). Samples every 0.5 s; text on screen only
// (display:none stacked states and off-frame boxes are skipped), plus alt / title / aria-label / placeholder / value of visible elements. One line per name with the first and last time seen.
export async function brandScan(page, duration, names) {
  const res = new Map();
  const grab = (list) => {
    const hits = [], vis = (e) => { if (!e.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight; };
    const re = list.map((n) => [n, new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu")]);
    const lab = (e) => e.id ? "#" + e.id : e.closest("[class]")?.classList[0] ? "." + e.closest("[class]").classList[0] : e.tagName.toLowerCase();
    const test = (s, e, at) => { for (const [n, r] of re) if (r.test(s)) hits.push([n, `${lab(e)}${at ? `[${at}]` : ""}`, s.trim().slice(0, 50)]); };
    const wk = document.createTreeWalker(document.getElementById("scenes"), NodeFilter.SHOW_TEXT);
    while (wk.nextNode()) { const n = wk.currentNode, e = n.parentElement; if (!e || !n.nodeValue.trim() || e.closest("[data-pii-ok]") || /^(SCRIPT|STYLE)$/.test(e.tagName) || !vis(e)) continue; test(n.nodeValue, e); }
    for (const e of document.querySelectorAll("#scenes [alt], #scenes [title], #scenes [aria-label], #scenes [placeholder], #scenes input, #scenes textarea")) {
      if (e.closest("[data-pii-ok]") || !vis(e)) continue;
      for (const at of ["alt", "title", "aria-label", "placeholder", "value"]) { const v = e.getAttribute(at) ?? (at === "value" ? e.value : null); if (v) test(v, e, at); }
    }
    return hits;
  };
  for (let t = 0; t <= duration + 1e-6; t += 0.5) {
    await page.evaluate((tt) => window.__seek(tt), Math.min(t, duration));
    for (const [n, where, text] of await page.evaluate(grab, names)) { const k = n.toLowerCase(), r = res.get(k) ?? { n, where, text, from: t, to: t }; r.to = t; res.set(k, r); }
  }
  return [...res.values()].map((r) => `brand ${r.from.toFixed(1)}–${r.to.toFixed(1)}  "${r.n}" is visible in ${r.where}: "${r.text}"  fix: remove or rename it in the replica (the state's markup or ui.js), re-capture with the control hidden, or data-pii-ok if it is allowed on purpose`);
}

// ---------- hard cut into the end card ----------
// The last scene (the end card) should be joined to the product scene (toCard(): reveal, flip, tile). A frame pair 1/30 s around its start that differs over most of the picture is a hard cut.
export async function hardCut(page, duration) {
  const T = await page.evaluate(() => { const l = document.getElementById("scenes").lastElementChild; return l && l.__end == null && l.__start > 0.5 ? l.__start : null; });
  if (T == null || T >= duration - 0.2) return [];
  const shot = async (t) => { await page.evaluate((tt) => window.__seek(tt), t); return page.screenshot({ type: "png" }); };
  const a = await shot(T - 1 / 30), b = await shot(T + 1 / 30);
  const d = await pixDiff(page, a, b), frac = d.n / (1920 * 1080);
  return frac > 0.45 ? [`hard-cut ${T.toFixed(2)}  ${Math.round(frac * 100)} % of the picture changes in 2 frames into the last scene, with no overlap  fix: join it with toCard(cam, card, T, { mode: "reveal" | "flip" | "tile" }) (shots.md, Into the end card), or justify the cut in SCENARIO.md`] : [];
}

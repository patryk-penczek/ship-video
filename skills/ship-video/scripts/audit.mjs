// Scans the film every 1/8 s and reports visible text that is clipped by the frame or by an overflow:hidden ancestor, then runs the quality checks below.
// usage: node audit.mjs <film/index.html> [--step 0.125] [--no-crop] [--summary] [--strict]
// Quality checks (each line is "<kind> <where> <what> fix: <how>"; none of them is a deliberate-transition candidate: fix or justify in SCENARIO.md):
//   lint         (first, static, no browser) film.js / ui.js / data.js: Math.random, Date.now / new Date(), performance.now, setTimeout / setInterval / requestAnimationFrame,
//                repeat: -1, a tweened `display`, measuring (getBoundingClientRect / center() / rect()) inside a tween callback, a timeline built outside Film() or with `fonts:` empty
//                while build() measures text, more than 2 camera shakes in `hits:`; CSS animation / transition left in film.css / app.css (a note when base.css freezes it anyway); emails and API keys left in the sources.
//   determinism  renders 12 times twice, after scrubbing backwards and on a fresh page load, and pixel-compares: any difference = something reads a clock, random, a timer or layout.
//   contrast     samples every 0.5 s and at every cut: text of the FILM (not the captured app, see --app-text) below WCAG AA (4.5:1, 3:1 for large text) for >= 0.5 s. The background is read from a
//                screenshot with the text hidden, so images and gradients count. Faded frames (opacity < 0.9) are skipped. data-contrast-ok on the element or an ancestor opts out.
//   privacy      emails, phone numbers, API keys / tokens (and names given with --pii-names) in the rendered DOM text and in value/title/alt/placeholder/aria-label/mailto:/tel:. data-pii-ok opts out.
//   brand        --brand-deny "ShareGPT,Acme": third-party names that must not appear in rendered text (a brief that keeps other brands out): every frame sampled like privacy, case-insensitive, whole words.
//                Also checked: value/title/alt/aria-label. data-pii-ok opts out. Check the film's last seconds yourself too: a captured button can carry a name for the whole film.
//   hard-cut     the last scene (end card) starts with > 45 % of the picture changing in 2 frames and no overlap: join it with toCard() (shots.md, Into the end card). --no-hardcut skips it.
//   --no-lint  --no-determinism  --no-contrast  --no-pii   skip one check · --lint-only  static lint only (instant, no browser)
//   --app-text  include text inside the captured app (.app-shot) in the contrast check (default: skipped, it is the app's own design)
//   --contrast-step S  seconds between contrast samples (default 0.5) · --pii-names "Jane Doe,Sam" · --pii-allow "support@acme.com,..."
//   --strict  exit code 1 when any line is printed (CI)
// data-clip-ok on any ancestor of a text OR of a click target (deliberate crops, also a control at a window edge under camera zoom: rotating words, camera pans, a blurred backdrop; set it on the scene or on
// the .app-shot wrapper via pick(scene, name).setAttribute("data-clip-ok", "")) silences its subtree, frame-crop lines included; overflow auto/scroll
// (scrolling lists) don't count. Text entirely outside a box or the frame is hidden, not cut, and is ignored.
//   --step      seconds between samples, >= 0.01 (default 0.125)
//   --no-crop   skip frame-edge checks (films that zoom past big type on purpose)
//   --summary   one line per clipping box instead of per text
//   --no-motion skip the motion and click checks (below)
// Click check: each cursor() click / finger() tap is read from window.__clicks; at that time the target's position in FRAME coordinates (after the
//   camera) must be inside the central 60 % of the frame, not cropped by an edge and at least 24 px tall on screen. Otherwise:
//   "click 14.20 at (1820, 60) — edge of frame; frame the control before the press". A cursor hidden under an app popover is reported too.
//   --app-clip  also report clipping caused by the captured app's own overflow:hidden boxes (default: honoured, it is the app's design)
// Motion check (jumps): every frame around each tween start (all frames when the engine has no window.__tl) it samples the boxes of visible
//   text, images and svg in camera space and flags an element that moves or scales > 12 px in ONE frame while it was nearly still the frame
//   before: a teleport, not a ramp. Cuts (an element appearing or hiding) and whip pans (continuous speed-ups) are not jumps. The classic
//   cause is a later entrance written tl.fromTo(el, {y:50}, {y:0, ...NI}, t): the element sits at rest from the scene start, then jumps to
//   its `from` offset at t. Use enter(el, from, t, dur) (hidden until t, plain fromTo) or start the tween at the scene start.
// Output: "<first>–<last> (<n>x)  <issue>". Fix every hit that isn't a deliberate transition.
import path from "node:path";
import { help, args, openFilm, die, num, known, mustExist } from "./lib/common.mjs";
import { lintFilm, fmt } from "./lib/lint.mjs";
import { determinism, contrast, piiScan, hardCut, brandScan } from "./lib/qa.mjs";
help(import.meta.url);

const a = args();
known(a, ["step", "no-crop", "summary", "no-motion", "app-clip", "no-lint", "no-determinism", "no-contrast", "no-pii", "lint-only", "app-text", "contrast-step", "pii-names", "pii-allow", "strict", "no-hardcut", "brand-deny"]);
for (const k of ["pii-names", "pii-allow", "brand-deny"]) if (a[k] === true) die(`--${k} needs a value`);
const [html] = a._;
if (!html) die("usage: node audit.mjs <film/index.html> [--step 0.125] [--no-crop] [--summary]");
const step = num(a, "step", 0.125, { min: 0.01 });
const noCrop = !!a["no-crop"], appClip = !!a["app-clip"], cstep = num(a, "contrast-step", 0.5, { min: 0.1 });
const quality = []; // lines of the quality checks, counted for --strict
mustExist(path.resolve(html), "film");
if (!a["no-lint"] || a["lint-only"]) {
  const found = lintFilm(path.dirname(path.resolve(html)));
  for (const f of found) { console.log(fmt(f)); if (f.kind !== "note") quality.push(f); }
  if (a["lint-only"]) { if (!found.length) console.log("lint: clean"); process.exit(a.strict && quality.length ? 1 : 0); }
}
const { browser, page, duration } = await openFilm(html);
if (!(await page.$("#scenes"))) { await browser.close(); die("the page has no #scenes element (is this a film built from the starter?)"); }
const seen = new Map();
for (let t = 0; t < duration; t += step) {
  const issues = await page.evaluate(({ tt, noCrop, appClip }) => {
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
      const shotBox = appClip ? null : el.closest(".app-shot");
      for (let p = el.parentElement; p && p.id !== "scenes"; p = p.parentElement) {
        if (p.classList.contains("scene")) break;
        if (shotBox && p !== shotBox && shotBox.contains(p)) continue; // the captured app's own overflow:hidden (rows, chips, phone shells): its design, not a film bug
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
    // a cursor / finger must be the topmost thing at its tip: an app popover or modal above it (z-index leak) hides the pointer
    for (const cur of document.querySelectorAll("#scenes .cursor, #scenes .finger")) {
      const cs = getComputedStyle(cur); if (cs.visibility === "hidden" || cs.display === "none") continue;
      let op = 1; for (let p = cur; p; p = p.parentElement) op *= Number(getComputedStyle(p).opacity);
      const r = cur.getBoundingClientRect(); if (op < 0.5 || r.width < 2) continue;
      const fing = cur.classList.contains("finger"), x = fing ? r.left + r.width / 2 : r.left + r.width * 8 / 44, y = fing ? r.top + r.height / 2 : r.top + r.height * 14 / 44;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const keep = cur.style.pointerEvents; cur.style.pointerEvents = "auto";
      const top = document.elementsFromPoint(x, y)[0]; cur.style.pointerEvents = keep;
      if (top && top !== cur && !cur.contains(top) && !top.classList.contains("ripple")) {
        const nm = (e) => e.id ? "#" + e.id : e.classList[0] ? "." + e.classList[0] : e.tagName.toLowerCase();
        // the stacking context the covering element lives in: the nearest ancestor that creates one (z-index on a positioned box, transform, opacity < 1, filter, isolation, fixed/sticky)
        let ctx = null; for (let p = top.parentElement; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if ((c.zIndex !== "auto" && c.position !== "static") || c.transform !== "none" || Number(c.opacity) < 1 || c.filter !== "none" || c.isolation === "isolate" || c.position === "fixed" || c.position === "sticky") { ctx = p; break; } }
        const z = (e) => getComputedStyle(e).zIndex;
        out.push(`cursor hidden under ${nm(top)} (z-index ${z(top)}${ctx ? `, in the stacking context of ${nm(ctx)} (z-index ${z(ctx)})` : ""}; the cursor sits in ${nm(cur.closest(".camlayer") ?? cur.parentElement)}): an app popover / modal paints above the cursor layer. Is it inside .app-shot? Re-capture css, or give the cursor's host a higher z-index in film.css (.ptr { z-index: 99999 })`);
      }
    }
    return out;
  }, { tt: t, noCrop, appClip });
  // a deliberate camera crop produces the same frame-crop line for every x position: one entry per text
  for (const i of issues) { const key = i.replace(/ x=-?\d+\.\.-?\d+/, ""); if (!seen.has(key)) seen.set(key, []); seen.get(key).push(t.toFixed(3)); }
}
// ---- motion check: teleports (see the header)
const jumps = [];
if (!a["no-motion"]) {
  const fps = 60;
  const starts = await page.evaluate(() => window.__tl ? [...new Set(window.__tl.getChildren(true, true, false).map((c) => Math.round(c.startTime() * 60)))] : null);
  const total = Math.floor(duration * fps), want = new Set();
  if (starts) for (const f of starts) for (let k = -3; k <= 4; k++) { if (f + k >= 0 && f + k <= total) want.add(f + k); }
  else for (let f = 0; f <= total; f++) want.add(f);
  const frames = [...want].sort((x, y) => x - y);
  const sample = (t) => page.evaluate((tt) => {
    window.__seek(tt);
    const stage = document.getElementById("stage"), cam = document.getElementById("cam"), sr = stage.getBoundingClientRect(), k = sr.width / 1920;
    const inv = new DOMMatrix(getComputedStyle(cam).transform).inverse(), out = {};
    const els = new Set(), walker = document.createTreeWalker(document.getElementById("scenes"), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) els.add(walker.currentNode.parentElement);
    document.querySelectorAll("#scenes img, #scenes svg, #scenes canvas").forEach((e) => els.add(e));
    window.__aid ??= new WeakMap(); window.__aidn ??= 0;
    for (const e of els) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      let op = 1; for (let p = e; p; p = p.parentElement) op *= Number(getComputedStyle(p).opacity);
      const r = e.getBoundingClientRect();
      if (op < 0.35 || r.width < 2 || r.height < 2 || r.right < sr.left || r.left > sr.right || r.bottom < sr.top || r.top > sr.bottom) continue;
      if (!window.__aid.has(e)) window.__aid.set(e, ++window.__aidn);
      const pt = (x, y) => { const q = inv.transformPoint(new DOMPoint(x / k - 960, y / k - 540)); return [q.x, q.y]; }; // stage px, camera shake and zoom removed
      const [x0, y0] = pt(r.left - sr.left, r.top - sr.top), [x1, y1] = pt(r.right - sr.left, r.bottom - sr.top);
      const own = e.closest("[class]"), lab = e.id ? "#" + e.id : e.classList[0] ? "." + e.classList[0] : own ? `${e.tagName.toLowerCase()} in .${own.classList[0]}` : e.tagName.toLowerCase();
      out[window.__aid.get(e)] = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, txt: e.textContent || "", lab }; // the text itself: a counter 24 -> 60 changes glyph widths, not position
    }
    const cl = [...document.querySelectorAll(".camlayer")].map((e) => { const m = new DOMMatrix(getComputedStyle(e).transform); return [m.e, m.f, m.a * 960, m.d * 540]; });
    return { out, cl };
  }, t);
  const mv = (u, v) => Math.max(Math.abs(u.cx - v.cx), Math.abs(u.cy - v.cy), Math.abs(u.w - v.w), Math.abs(u.h - v.h));
  const S = new Map(); // frame -> sample
  for (const f of frames) S.set(f, await sample(f / fps));
  const clMove = (f) => { const u = S.get(f)?.cl, v = S.get(f - 1)?.cl; return u && v && u.length === v.length ? Math.max(0, ...u.map((q, i) => Math.max(...q.map((x, j) => Math.abs(x - v[i][j]))))) : 0; }; // how far the camera layers moved in one frame
  const seenJ = new Set(), vec = (u, v) => [u.cx - v.cx, u.cy - v.cy, u.w - v.w, u.h - v.h];
  // A jump: the element rests, moves > 12 px in ONE frame, and then slides BACK (the next frames move against the jump). A fast ramp, a whip pan
  // or a cursor travelling carries on in its direction; a hard cut (appear / hide / swap) has no box in one of the two frames.
  for (const f of frames) {
    const cur = S.get(f)?.out, prev = S.get(f - 1)?.out, prev2 = S.get(f - 2)?.out, n1 = S.get(f + 1)?.out, n2 = S.get(f + 2)?.out;
    if (!prev) continue;
    if (clMove(f) > 12 && clMove(f) > 3 * clMove(f - 1) + 4) continue; // an instantaneous camera-layer change is a hard cut, not an element teleport
    // a cut: several elements shift by the same vector in the same frame (one camera / scene change moves them all)
    const moved = Object.entries(cur).filter(([id, c]) => prev[id] && prev[id].txt === c.txt && Math.max(...vec(c, prev[id]).map(Math.abs)) > 12).map(([id, c]) => vec(c, prev[id]));
    if (moved.length >= 3 && moved.filter((q) => moved.filter((r) => q.every((x, i) => Math.abs(x - r[i]) < 8)).length >= 3).length >= 3) continue;
    for (const [id, c] of Object.entries(cur)) {
      const b = prev[id]; if (!b || b.txt !== c.txt) continue; // appearing / hiding is a cut; changing text (counter, typing) is not motion
      const v = vec(c, b), m = Math.max(...v.map(Math.abs));
      if (m <= 12) continue;
      const b2 = prev2?.[id], mp = b2 && b2.txt === b.txt ? Math.max(...vec(b, b2).map(Math.abs)) : 0;
      if (m <= 3 * mp + 4) continue;
      const back = [n1, n2].map((x) => x?.[id]).filter((x) => x && x.txt === c.txt).map((x) => vec(x, c)).map((w) => w.reduce((acc, wi, i) => acc + wi * v[i], 0));
      if (!back.some((d) => d < -4)) continue; // no slide back: a deliberate move or cut
      const sgn = (x) => `${x > 0 ? "+" : ""}${Math.round(x)}`, [dx, dy, dw, dh] = v;
      const what = Math.abs(dy) >= Math.max(Math.abs(dx), Math.abs(dw), Math.abs(dh)) ? `y ${sgn(dy)} px` : Math.abs(dx) >= Math.max(Math.abs(dw), Math.abs(dh)) ? `x ${sgn(dx)} px` : Math.abs(dw) >= Math.abs(dh) ? `width ${sgn(dw)} px` : `height ${sgn(dh)} px`;
      const key = `${c.lab}|${what}|${Math.round(f / 6)}`;
      if (!seenJ.has(key)) { seenJ.add(key); jumps.push(`jump ${(f / fps).toFixed(2)} ${c.lab} (${what} in 1 frame) — NI on a later entrance? use enter(el, from, t) / a plain fromTo, or start the tween at the scene start`); }
    }
  }
}
// ---- click placement: every cursor() click / finger() tap (window.__clicks) must land where the viewer can read it
const clickWarn = [];
if (!a["no-motion"]) {
  const n = await page.evaluate(() => (window.__clicks || []).length);
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate((i) => {
      const c = window.__clicks[i]; window.__seek(Math.max(0, c.t - 1 / 30)); // BEFORE the press: the state swap at the click time moves / replaces the target
      const el = c.el, stage = document.getElementById("stage"), sr = stage.getBoundingClientRect(), k = sr.width / 1920, b = el.getBoundingClientRect();
      const fing = el.classList.contains("finger"), tx = fing ? b.left + b.width / 2 : b.left + b.width * 4 / 44, ty = fing ? b.top + b.height / 2 : b.top + b.height * 2 / 44;
      const x = (tx - sr.left) / k, y = (ty - sr.top) / k;
      const hit = document.elementsFromPoint(tx + (fing ? 0 : 3), ty + (fing ? 0 : 6)).find((e) => !e.closest("#flash, #vignette, #grain, .band, .cap, .cursor, .finger, .ripple"));
      const tgt = hit && (hit.closest("button, a, [role=button], [role=tab], input, select, textarea, summary, label, article, li, tr") || hit), tb = tgt?.getBoundingClientRect();
      const op = (() => { let o = 1; for (let p = el; p; p = p.parentElement) o *= Number(getComputedStyle(p).opacity); return o; })();
      const lay = el.closest(".camlayer"), M = lay ? new DOMMatrix(getComputedStyle(lay).transform) : null;
      // the camera is clamped at the layer's edge (focus() keeps the frame inside the app): the layer's own edge sits ON the frame edge and the click is on that side. Nothing the cut can fix without over:
      const clamp = !!M && M.a > 1.05 && ((Math.abs(M.e + 960 - 960 * M.a) <= 3 && x < 384) || (Math.abs(M.e + 960 + 960 * M.a - 1920) <= 3 && x > 1536) || (Math.abs(M.f + 540 - 540 * M.d) <= 3 && y < 216) || (Math.abs(M.f + 540 + 540 * M.d - 1080) <= 3 && y > 864));
      return { clamp, t: c.t, x, y, vis: op > 0.3, w: tb ? tb.width / k : null, h: tb ? tb.height / k : null, cropped: tb ? (tb.left < sr.left - 2 || tb.right > sr.right + 2 || tb.top < sr.top - 2 || tb.bottom > sr.bottom + 2) && tb.width < 600 : false, ok: !!tgt?.closest('[data-clip-ok]:not([data-clip-ok="box"])'), name: tgt ? (tgt.id ? "#" + tgt.id : tgt.classList[0] ? "." + tgt.classList[0] : tgt.tagName.toLowerCase()) : "" };
    }, i);
    if (!r.vis || r.ok) continue; // data-clip-ok on the target or an ancestor: a deliberate crop (the control sits at the edge under camera zoom)
    const at = `click ${r.t.toFixed(2)} at (${Math.round(r.x)}, ${Math.round(r.y)})${r.name ? " on " + r.name : ""}`;
    if (r.x < 0 || r.x > 1920 || r.y < 0 || r.y > 1080) clickWarn.push(`${at} — off-screen; frame the control before the press`);
    else if ((r.x < 384 || r.x > 1536 || r.y < 216 || r.y > 864) && r.clamp) continue; // the focus clamp keeps the camera inside the app: the control cannot be centred without autoCam / focus({ over })
    else if (r.x < 384 || r.x > 1536 || r.y < 216 || r.y > 864) clickWarn.push(`${at} — edge of frame (outside the central 60 %); frame the control before the press`);
    else if (r.cropped) clickWarn.push(`${at} — the control is cropped by the frame edge`);
    else if (r.w != null && Math.min(r.w, r.h) < 24) clickWarn.push(`${at} — only ${Math.round(Math.min(r.w, r.h))} px on screen; zoom in before the press`);
  }
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
const qa = [];
if (!a["no-determinism"]) qa.push(...await determinism(html, page, duration));
if (!a["no-contrast"]) qa.push(...await contrast(page, duration, { step: cstep, appText: !!a["app-text"] }));
if (!a["no-hardcut"]) qa.push(...await hardCut(page, duration));
if (a["brand-deny"]) qa.push(...await brandScan(page, duration, String(a["brand-deny"]).split(",").map((x) => x.trim()).filter(Boolean)));
if (!a["no-pii"]) qa.push(...await piiScan(page, duration, { allow: String(a["pii-allow"] ?? "").split(",").map((s) => s.trim()).filter(Boolean), names: String(a["pii-names"] ?? "").split(",").map((s) => s.trim()).filter(Boolean) }));
for (const q of qa) console.log(q);
quality.push(...qa);
await browser.close();
for (const j of jumps) console.log(j);
for (const w of clickWarn) console.log(w);
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

if (a.strict && (quality.length || jumps.length || clickWarn.length || seen.size)) process.exit(1);

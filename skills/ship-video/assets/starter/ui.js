/* Screen builders: functions that return HTML for app replicas. One per screen.
   In a real film, build these from the product's actual components (structure, copy, sizes, tokens, icons),
   then audit each one against the source before filming. This sample is a placeholder to learn the pattern. */
window.UI = (() => {
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const row = (text, meta, cls = "") => `<div class="demo-row ${cls}"><span class="demo-box">${check}</span><span class="demo-txt">${text}</span><small>${meta}</small></div>`;

  function app() {
    return `<div class="demo-app">
      <div class="demo-app-top"><i></i><i></i><i></i><b>Tasks</b></div>
      <div class="demo-app-body">
        <div class="demo-app-h"><h2>Today</h2><span><b class="demo-done-n">0</b> of 3 done</span></div>
        <div class="demo-app-new"><div class="demo-app-in"><span class="q">Add a task…</span></div><div class="demo-app-btn">Add</div></div>
        <div class="demo-app-list">
          ${row("", "now", "new")}
          ${row("Call the dentist", "9:00")}
          ${row("Buy oat milk", "11:30")}
        </div>
      </div>
    </div>`;
  }

  // ---------- captured screens (scripts/capture.mjs writes screens.js: SCREENS = state → html, SCREENS_META) ----------
  // shot(name)  → HTML of one captured state inside an .app-shot wrapper (carries the app's theme attributes on <html>/<body>).
  // stack(names) → several states stacked in one scene; all but the first are display:none (no layout: see measure()).
  // pick(scene, name) → the wrapper element; $(pick(scene, name), ".card") is the app's real element, tween it like any other.
  const META = (n) => (window.SCREENS_META || {})[n] || {};
  const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  // shot(name, { tall: true }): a page that scrolls as a document (no inner scroll container) keeps its full height instead of being cut at 1080 px,
  // so the camera (scrollTo on the wrapper or the scene's camlayer) can reach the sections below. { hidden: true } = display:none (stack()).
  // Every shot() call gets its own SVG ids (gradients, clip paths, masks): the same state placed in two scenes (or twice in one) would otherwise
  // share ids, and a gradient defined inside a display:none copy renders nothing in the visible one.
  const calls = {};
  const uniq = (html, n) => {
    const refs = new Set([...html.matchAll(/url\(\s*(?:&quot;|["'])?#([^)"'&\s]+)/g), ...html.matchAll(/<use\b[^>]*href="#([^"]+)"/g)].map((m) => m[1])); // gradients, clip paths, masks, filters, <use>: not skip-link anchors
    const ids = [...new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))].filter((id) => refs.has(id));
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const id of ids) html = html.replace(new RegExp(`(\\sid=")${esc(id)}(")`, "g"), `$1${id}~${n}$2`).replace(new RegExp(`(url\\((?:&quot;|"|')?#)${esc(id)}(?![\\w-])`, "g"), `$1${id}~${n}`).replace(new RegExp(`((?:xlink:)?href="#)${esc(id)}(")`, "g"), `$1${id}~${n}$2`);
    return html;
  };
  function shot(name, opts = false) {
    const { hidden = false, tall = false } = typeof opts === "object" ? opts : { hidden: opts };
    let html = (window.SCREENS || {})[name];
    if (html != null) html = uniq(html, (calls[name] = (calls[name] || 0) + 1));
    if (html == null) throw new Error(`no captured state "${name}" (have: ${Object.keys(window.SCREENS || {}).join(", ") || "none"})`);
    const at = Object.entries(META(name).attrs || {}).filter(([k]) => k !== "style" && k !== "class").map(([k, v]) => ` ${k}="${attr(v)}"`).join("");
    const cls = META(name).attrs?.class ? " " + attr(META(name).attrs.class) : "", st = META(name).attrs?.style ? ` ${attr(META(name).attrs.style)};` : "";
    const sch = (META(name).scheme ? ` data-scheme="${META(name).scheme}"` : "") + (META(name).tk ? ` data-tk="${META(name).tk}"` : ""); // data-tk picks the theme block of app.css (capture --css)
    return `<div class="app-shot${cls}${tall ? " tall" : ""}"${at}${sch} data-shot="${name}" data-clip-ok="box" style="${st}${tall && META(name).height ? `min-height:${META(name).height}px;` : ""}${hidden ? "display:none" : ""}">${html}</div>`;
  }
  const stack = (names, opts = {}) => names.map((n, i) => shot(n, { ...opts, hidden: i > 0 })).join("");
  const pick = (scene, name) => scene.querySelector(`[data-shot="${name}"]`);
  // Show one state and hide the others from time t. Use on a scene built with stack(); hide the covered copy after a reveal
  // too (backdrop-filter in a stacked copy blurs what lies beneath and ghosts).
  function swap(tl, scene, name, t) {
    const all = [...scene.querySelectorAll("[data-shot]")];
    tl.set(all.filter((e) => e.dataset.shot !== name), { display: "none" }, t);
    tl.set(pick(scene, name), { display: "block" }, t);
  }
  // Layout of a hidden copy: show it, run fn() (center/rect…), restore. Measure before tweening, never read hidden copies directly.
  function measure(scene, name, fn) {
    const all = [...scene.querySelectorAll("[data-shot]")], was = all.map((e) => e.style.display);
    all.forEach((e) => { e.style.display = e.dataset.shot === name ? "block" : "none"; });
    try { return fn(pick(scene, name)); } finally { all.forEach((e, i) => { e.style.display = was[i]; }); }
  }
  // An animated canvas captured with canvas.frames: step its <img> through the saved frames between t0 and t1 (loop = repeat).
  // frames(tl, img, t0, t1, loop, { every }): the frames are spread evenly over t0..t1; { every: 0.25 } plays them in REAL time instead
  // (the capture's canvas.every in seconds: a 10 s loop sampled at 4 fps stays a 10 s loop), repeating until t1.
  // { from, to } slice the frame list ([from, to), indices): continue a canvas after a click from frame k, or play only a part of it.
  function frames(tl, img, t0, t1, loop = 1, { every, from = 0, to } = {}) {
    const list = (img.dataset.frames || "").split(",").slice(from, to), n = list.length;
    if (every && n > 1) { for (let i = 0, t = t0; t < t1 - 1e-6; i++, t += every) tl.set(img, { attr: { src: list[i % n] } }, t); return; }
    const d = (t1 - t0) / (n * loop);
    if (n < 2) return;
    for (let i = 0; i < n * loop; i++) tl.set(img, { attr: { src: list[i % n] } }, t0 + i * d);
  }
  // Keeps live DOM bits of a canvas state moving in sync with its frames (a clock's text, a timeline thumb, a counter): list[i] belongs to frame i
  // (after { from } slicing). An item is a string (textContent) or a gsap vars object ({ x: 120 }, { width: "40%" }). Same timing options as frames().
  function frameSync(tl, el, list, t0, t1, loop = 1, { every, from = 0, to } = {}) {
    const vals = list.slice(from, to), n = vals.length;
    if (!n) return;
    const set = (i, t) => { const v = vals[i % n]; tl.set(el, typeof v === "object" ? v : { textContent: v }, t); };
    if (every) { for (let i = 0, t = t0; t < t1 - 1e-6; i++, t += every) set(i, t); return; }
    const d = (t1 - t0) / (n * loop);
    for (let i = 0; i < n * loop; i++) set(i, t0 + i * d);
  }
  // Frames with their own times: seq = [{ t, src }] (absolute seconds). A recorded drawing (capture.mjs "record") has uneven frames; this keeps them exact.
  function frameSeq(tl, img, seq) {
    tl.set(img, { attr: { src: seq[0].src } }, 0);
    for (const f of seq) tl.set(img, { attr: { src: f.src } }, f.t);
  }
  // A capture.mjs "record" state: { frames: [{ t, src, x, y }] (t from 0, x/y = pointer in css px inside the frame), size: [w, h], dt }.
  // seq(t0) → frameSeq input with absolute times; path(k, ox, oy, t0) → follow() points: stage = origin + css px * k.
  function recording(name) {
    const r = META(name).record;
    if (!r) throw new Error(`state "${name}" has no record (see capture.mjs "record")`);
    return {
      ...r,
      images: r.frames.map((f) => f.src),
      seq: (t0 = 0) => r.frames.map((f) => ({ t: t0 + f.t, src: f.src })),
      path: (k = 1, ox = 0, oy = 0, t0 = 0) => r.frames.map((f) => ({ x: ox + f.x * k, y: oy + f.y * k, t: f.t + t0 })),
    };
  }
  // A CSS spinner the capture could not keep (@keyframes are dropped): rotate its element on the timeline. turns defaults to one per second.
  function spin(tl, el, t0, t1, { turns = t1 - t0, ease = "none", from = 0 } = {}) {
    tl.fromTo(el, { rotation: from }, { rotation: from + 360 * turns, duration: t1 - t0, ease, immediateRender: false }, t0);
    return el;
  }
  const images = () => [...new Set(Object.values(window.SCREENS_META || {}).flatMap((m) => [...(m.canvas || []).flat(), ...(m.record?.frames || []).map((f) => f.src)]))]; // for Film({ images })

  return { app, check, shot, stack, pick, swap, measure, frames, frameSync, frameSeq, recording, images, spin };
})();

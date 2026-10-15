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
  function shot(name, hidden = false) {
    const html = (window.SCREENS || {})[name];
    if (html == null) throw new Error(`no captured state "${name}" (have: ${Object.keys(window.SCREENS || {}).join(", ") || "none"})`);
    const at = Object.entries(META(name).attrs || {}).filter(([k]) => k !== "style" && k !== "class").map(([k, v]) => ` ${k}="${attr(v)}"`).join("");
    const cls = META(name).attrs?.class ? " " + attr(META(name).attrs.class) : "", st = META(name).attrs?.style ? ` ${attr(META(name).attrs.style)};` : "";
    return `<div class="app-shot${cls}"${at} data-shot="${name}" data-clip-ok="box" style="${st}${hidden ? "display:none" : ""}">${html}</div>`;
  }
  const stack = (names) => names.map((n, i) => shot(n, i > 0)).join("");
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
  function frames(tl, img, t0, t1, loop = 1) {
    const list = (img.dataset.frames || "").split(","), n = list.length, d = (t1 - t0) / (n * loop);
    if (n < 2) return;
    for (let i = 0; i < n * loop; i++) tl.set(img, { attr: { src: list[i % n] } }, t0 + i * d);
  }
  const images = () => [...new Set(Object.values(window.SCREENS_META || {}).flatMap((m) => (m.canvas || []).flat()))]; // for Film({ images })

  return { app, check, shot, stack, pick, swap, measure, frames, images };
})();

/* ship-video engine (browser side): timeline helpers, deterministic audio-reactive layer, preview shell.
   Don't edit per film. Scenes go in film.js, screen builders in ui.js.

   Rule: everything on screen is a pure function of t. No setTimeout, no CSS animations/transitions,
   no Date/Math.random. Use ctx.rnd() (seeded), sprites (frame = floor(t·fps) % n) and window.ENV. */
(function () {
  const $ = (root, s) => root.querySelector(s);
  const $$ = (root, s) => [...root.querySelectorAll(s)];
  const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const preload = (src) => new Promise((ok) => { const im = new Image(); im.onload = im.onerror = () => ok(); im.src = src; });

  /* Spring eases: the unit step response of a damped spring (freq w in 1/duration units, damping ratio z), normalised to land exactly on 1.
     z >= 1 never overshoots (critically damped at 1); z < 1 overshoots a little. Registered with GSAP as "focused" and "smooth"
     (ease: "focused"), so no CustomEase plugin is needed. ctx.spring(w, z) builds others. Pure functions of progress. */
  function spring(w = 11, z = 1) {
    const f = (x) => {
      if (z === 1) return 1 - (1 + w * x) * Math.exp(-w * x);
      if (z > 1) { const r = Math.sqrt(z * z - 1), s1 = -w * (z - r), s2 = -w * (z + r); return 1 - (s2 * Math.exp(s1 * x) - s1 * Math.exp(s2 * x)) / (s2 - s1); }
      const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z * w / wd) * Math.sin(wd * x));
    }, end = f(1);
    return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : f(p) / end);
  }
  // focused: fast, settles early, no overshoot (UI, how-to). smooth: longer, softer landing (launch films). inDur/outDur = the autoCam defaults.
  const SPRINGS = { focused: { w: 11, z: 1, inDur: 1.3, outDur: 1.0 }, smooth: { w: 6.5, z: 1, inDur: 1.8, outDur: 1.4 } };
  if (window.gsap) for (const [k, v] of Object.entries(SPRINGS)) gsap.registerEase(k, spring(v.w, v.z));

  /* Film({ duration, bpm, track, hits, fonts, images, seed, build(ctx), react(t, ctx) })
     duration  seconds; the timeline is padded to it
     bpm       tempo; drives the preview metronome when there is no track
     track     audio file next to index.html, or null (silent clock + metronome)
     hits      [[t, shakePx], …]: camera shake that decays within 0.6 s
     fonts     CSS font shorthands to load before build, e.g. "800 40px 'Inter Variable'"
     images    image URLs to preload before build (layout is measured at build time); "auto" = every image of the captured states (screens.js) */
  // images: "auto": every file the captured markup points at (src, poster, canvas frames, recorded frames)
  function autoImages() {
    const set = new Set(), ok = (u) => /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(u);
    for (const h of Object.values(window.SCREENS || {})) for (const m of String(h).matchAll(/\s(?:src|poster|data-frames)="([^"]+)"/g)) m[1].split(",").forEach((u) => ok(u) && set.add(u));
    for (const m of Object.values(window.SCREENS_META || {})) {
      for (const u of (m.canvas || []).flat()) if (u) set.add(u);
      for (const f of m.record?.frames || []) set.add(f.src);
    }
    return [...set];
  }
  window.Film = function Film(cfg) {
    // <html data-theme="auto"> (the starter): a captured app with a light background switches the film to the light tokens (film.css html.light)
    const root = document.documentElement, first = Object.values(window.SCREENS_META || {})[0];
    if (first?.accent) root.style.setProperty("--f-app-accent", first.accent); // the captured app's own accent (spot ring); film.css may adopt it: --f-accent: var(--f-app-accent)
    if (root.dataset.theme === "auto" && first && first.lum != null) root.classList.toggle("light", first.lum > 0.6);
    const imgs = cfg.images === "auto" ? autoImages() : cfg.images || [];
    const waits = [...(cfg.fonts || []).map((f) => document.fonts.load(f)), ...imgs.map(preload)];
    Promise.all(waits).then(() => document.fonts.ready).then(() => start(cfg));
  };

  function start(cfg) {
    const DURATION = cfg.duration;
    const RENDER = location.search.includes("render");
    if (RENDER) document.documentElement.classList.add("render");

    const stage = document.getElementById("stage");
    const cam = document.getElementById("cam");
    const scenesEl = document.getElementById("scenes");
    const flashEl = document.getElementById("flash");
    const grain = document.getElementById("grain");
    const bgGlow = $(document, ".bg-glow");

    const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    let seed = cfg.seed || 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    // fromTo renders its from-values at build time; use NI for elements that share a scene
    const NI = { immediateRender: false };
    const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    // Build-time notes for the director (autoCam skipped a framing, loupe target too big): console.warn "[ship-video] ..." (audit / snap / render print them) and window.__warnings.
    const warn = (msg) => { (window.__warnings ??= []).push(msg); console.warn(`[ship-video] ${msg}`); };

    // A scene is a full-frame layer shown from start to end. Hidden scenes get visibility:hidden AND opacity:0
    // (base.css), so a child with visibility:visible can't leak through; they still have layout, so center() works.
    // scene(html, start, end, { frame }): frame: true | { scale, radius, bar, title, bg, shadow } draws the content as a framed window on a backdrop (see frame()).
    let lastScene = null;
    function scene(html, start, end, opts = {}) {
      const el = document.createElement("div");
      el.className = "scene";
      el.innerHTML = html;
      el.__start = start; el.__end = end;
      scenesEl.appendChild(el);
      tl.set(el, { attr: { "data-on": "1" } }, start);
      if (end != null) tl.set(el, { attr: { "data-on": "0" } }, end);
      lastScene = el;
      if (opts.frame) frame(el, opts.frame === true ? {} : opts.frame);
      return el;
    }
    // Framed stage for landing, hero and README films (NOT feeds: the app gets ~15 % smaller, so its text does too): the scene's content is
    // drawn as a window (scale 0.85, rounded corners, shadow, optional window bar) on a gradient backdrop built from the film's tokens.
    // Call it BEFORE wrap(); the camera then zooms window and backdrop together. Returns { win, inner, bg, box, content }: box = the window's
    // stage rect (pass it as focus()/autoCam's box so the camera stays inside the window), content = the app's own rect.
    // opts: scale 0.85, radius 18, bar true (or false), title "", bg (any CSS background), shadow (CSS), barH 44.
    function frame(sc, { scale = 0.85, radius = 18, bar = true, title = "", bg, shadow, barH = 44 } = {}) {
      if (sc.__frame) return sc.__frame;
      const W = 1920 * scale, H = 1080 * scale, bh = bar ? barH : 0, x0 = (1920 - W) / 2, y0 = (1080 - H - bh) / 2;
      const mk = (cls, st = "") => { const d = document.createElement("div"); d.className = cls; d.style.cssText = st; return d; };
      const bgEl = mk("fbg", bg ? `background:${bg}` : ""), win = mk("fwin", `left:${x0}px;top:${y0}px;width:${W}px;height:${H + bh}px;border-radius:${radius}px;${shadow ? `box-shadow:${shadow}` : ""}`);
      const clip = mk("fclip", `top:${bh}px;height:${H}px`), inner = mk("finner", `transform:scale(${scale})`);
      for (const k of [...sc.childNodes]) inner.appendChild(k);
      if (bar) { const b = mk("fbar", `height:${barH}px`); b.innerHTML = `<i></i><i></i><i></i><span>${title}</span>`; win.appendChild(b); }
      clip.appendChild(inner); win.appendChild(clip);
      sc.append(bgEl, win);
      return (sc.__frame = { win, inner, bg: bgEl, box: { l: x0, t: y0, r: x0 + W, b: y0 + H + bh }, content: { l: x0, t: y0 + bh, r: x0 + W, b: y0 + bh + H } });
    }
    // Moves a scene's children into a camera layer; tween its x/y/scale (see focus()).
    function wrap(el) {
      const w = document.createElement("div");
      w.className = "camlayer";
      while (el.firstChild) w.appendChild(el.firstChild);
      el.appendChild(w);
      return w;
    }
    function splitChars(el) {
      el.innerHTML = [...el.textContent].map((c) => `<span class="ch">${c}</span>`).join("");
      return $$(el, ".ch");
    }
    // Writes text into an element of captured markup without destroying it: an <input>/<textarea> gets its value (property AND attribute),
    // an element with children (<span class="num">21<sup>°</sup></span>) gets only its first text node changed, a plain element its textContent.
    function put(el, str) {
      if (el.matches("input, textarea")) { el.value = str; el.setAttribute("value", str); }
      else if (el.children.length) {
        const n = [...el.childNodes].find((c) => c.nodeType === 3);
        if (n) n.nodeValue = str; else el.insertBefore(document.createTextNode(str), el.firstChild);
      } else el.textContent = str;
    }
    // Typing via a proxy tween: seek-safe in both directions. el may be a captured <input> (its value is typed).
    function type(el, full, t0, t1, onUpd) {
      const p = { n: 0 };
      tl.fromTo(p, { n: 0 }, { n: full.length, duration: t1 - t0, ease: "none", onUpdate: () => { const k = Math.round(p.n); put(el, full.slice(0, k)); onUpd && onUpd(k); } }, t0);
    }
    // Number tween. Before t0 the element shows its own HTML text: write the start value there (or tl.set it at 0).
    // On captured markup with child elements only the first text node counts (the <sup>° stays).
    function count(el, from, to, t0, dur, fmt = (v) => Math.round(v).toLocaleString("en-US")) {
      const p = { v: from };
      tl.fromTo(p, { v: from }, { v: to, duration: dur, ease: "power2.out", onUpdate: () => { put(el, fmt(p.v)); }, ...NI }, t0);
    }
    // Stage-space rect of an element ({l, t, r, b}), e.g. as focus()'s box. Measure before tweens.
    // { text: true } measures the text's own box (Range) instead of the element: a flex-wide <span> or a block as wide as its container otherwise
    // reports the middle of the strip, not of the words.
    function rect(el, { text = false } = {}) {
      const s = stage.getBoundingClientRect(), k = s.width / 1920;
      let r = el.getBoundingClientRect();
      if (text) { const g = document.createRange(); g.selectNodeContents(el); const q = g.getBoundingClientRect(); if (q.width) r = q; }
      return { l: (r.left - s.left) / k, t: (r.top - s.top) / k, r: (r.right - s.left) / k, b: (r.bottom - s.top) / k };
    }
    // Stage-space centre of an element. Measure BEFORE adding tweens that move it.
    function center(el, { text = false } = {}) {
      const s = stage.getBoundingClientRect();
      const k = s.width / 1920;
      let r = el.getBoundingClientRect();
      if (text) { const g = document.createRange(); g.selectNodeContents(el); const q = g.getBoundingClientRect(); if (q.width) r = q; }
      return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k };
    }
    // Camera transform that puts stage point p at screen centre at zoom s. App UI is small: 1.4–2.3× on what matters.
    // By default the point is clamped so the frame never shows past the edges of `box` (the 1920×1080 stage);
    // pass the replica's own rect as box when it doesn't fill the stage, or clamp: false to aim anywhere. Targets in the top or bottom
    // third can't be centred at 1.5–2.3× inside the box: use { over: 300 } (allow that many px of empty edge) or clamp: false.
    // A band() reserves space at the top or bottom of the frame: focus() then centres on the free part (view.cy) and clamps to its height (view.h).
    const view = { top: 0, bottom: 0, h: 1080, cy: 540 };
    const focus = (p, s, { clamp = true, over = 0, box: b0 = { l: 0, t: 0, r: 1920, b: 1080 } } = {}) => {
      let { x, y } = p;
      const box = { l: b0.l - over, t: b0.t - over, r: b0.r + over, b: b0.b + over };
      if (clamp && s >= 1) {
        // when the box is smaller than the view on an axis, centre on it; otherwise keep the view inside it
        x = (box.r - box.l) * s <= 1920 ? (box.l + box.r) / 2 : Math.min(Math.max(x, box.l + 960 / s), box.r - 960 / s);
        y = (box.b - box.t) * s <= view.h ? (box.t + box.b) / 2 : Math.min(Math.max(y, box.t + view.h / 2 / s), box.b - view.h / 2 / s);
      }
      return { x: -(x - 960) * s, y: view.cy - 540 - (y - 540) * s, scale: s };
    };
    // Camera that frames a stage rect (rect(el), or {l,t,r,b}) edge to edge with `pad` px of air: the zoom is the largest that shows the whole
    // rect in the free part of the frame. opts: max (zoom cap, default 4), min (default 0.3), plus focus() options (box to clamp).
    // Use it instead of focus(center, guessedScale) to align a crop to column/card edges: no word sliced at the frame edge.
    const focusRect = (r, pad = 40, { max = 4, min = 0.3, ...o } = {}) => {
      const w = r.r - r.l + pad * 2, h = r.b - r.t + pad * 2;
      const s = Math.max(min, Math.min(max, 1920 / w, view.h / h));
      return focus({ x: (r.l + r.r) / 2, y: (r.t + r.b) / 2 }, s, { clamp: false, ...o });
    };
    function flash(t, peak = 0.9, dur = 0.35, color = "#fff") {
      tl.set(flashEl, { backgroundColor: color }, t);
      tl.fromTo(flashEl, { opacity: peak }, { opacity: 0, duration: dur, ease: "power2.out", ...NI }, t);
    }
    function press(el, t) {
      // explicit from-values (rest scale 1): the same picture whether a seek arrives from before or after t (a lazy tl.to records its start on first play)
      tl.fromTo(el, { scale: 1 }, { scale: 0.92, duration: 0.07, ease: "power2.in", ...NI }, t - 0.07);
      tl.fromTo(el, { scale: 0.92 }, { scale: 1, duration: 0.3, ease: "back.out(3)", ...NI }, t);
    }
    function burst(host, at, t, n = 12, spread = 60, colors = [css("--f-accent"), "#fff"]) {
      for (let i = 0; i < n; i++) {
        const d = document.createElement("i");
        d.className = "particle";
        d.style.left = `${at.x}px`;
        d.style.top = `${at.y}px`;
        d.style.background = colors[i % colors.length];
        host.appendChild(d);
        const a = (i / n) * Math.PI * 2 + rnd() * 0.4;
        const r = spread * (0.7 + rnd() * 0.7);
        tl.fromTo(d, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r, scale: 0, opacity: 0, duration: 0.5, ...NI }, t);
      }
    }
    // Shockwave rings from the centre of host at t.
    function rings(host, t, radii = [120, 210, 320, 450, 610, 800]) {
      const w = document.createElement("div");
      w.className = "rings";
      w.innerHTML = radii.map((r, i) => `<i class="${i % 2 ? "dash" : ""}" style="width:${r * 2}px;height:${r * 2}px"></i>`).join("");
      host.appendChild(w);
      $$(w, "i").forEach((r, i) => tl.fromTo(r, { scale: 0.2 + i * 0.05, opacity: 1 }, { scale: 2.6, opacity: 0, duration: 1 + i * 0.1, ...NI }, t));
    }

    // ---------- shot helpers (documented in film-api.md; every one is a pure function of t) ----------
    const CUR = '<svg class="cursor" viewBox="0 0 44 44"><path d="M4 2v34l9-8 6 14 6-3-6-13h12z" fill="#fff" stroke="#111" stroke-width="2.5" stroke-linejoin="round"/></svg>';

    // ---------- selector targets: cursor()/finger() steps take { to: ".btn" } or { to: element }; target() / targetRect() work anywhere ----------
    // The element is found inside a scene (the scene of the camera layer you pass, else the last scene() made) and measured in stage space with
    // the camera layer neutral and the timeline at the step's time (so an element that an earlier tween moved, scaled or scrolled is measured
    // where it is at that moment; tweens added AFTER the call are not seen: same rule as center()). Stacked copies (UI.stack): the copy that is
    // displayed at that time wins; { in: "stateName" } picks one (a hidden copy is shown for the measurement, as UI.measure does).
    // Options: in, text (measure the text's own box), withText ("Add": the first match whose text contains it), fx/fy (point inside the box,
    // 0..1, default .5/.5), dx/dy (px offset), t (time to measure at), scene.
    const sceneOf = (host) => (host?.closest?.(".scene") ?? host?.querySelector?.(".camlayer")?.parentElement ?? host);
    const camOf = (sc) => (sc.classList.contains("camlayer") ? sc : sc.querySelector(":scope > .camlayer") ?? sc);
    function atTime(t, fn) {
      const d = tl.duration(), had = tl.time();
      if (d <= 0) return fn();
      tl.time(Math.min(Math.max(t ?? 0, 0.0001), d), true);
      try { return fn(); } finally { tl.time(Math.max(had, 0.0001), true); tl.invalidate(); } // invalidate: tweens re-record their start values when first played, not at this peek
    }
    function bare(host, fn) { // the camera layer at identity while measuring
      if (!host || !host.classList.contains("camlayer")) return fn();
      const s = { x: gsap.getProperty(host, "x"), y: gsap.getProperty(host, "y"), scale: gsap.getProperty(host, "scale") };
      gsap.set(host, { x: 0, y: 0, scale: 1 });
      try { return fn(); } finally { gsap.set(host, s); }
    }
    function findEl(sel, scn, { in: name, withText } = {}) {
      if (sel instanceof Element) return sel;
      const hit = (root) => { if (!root) return null; const all = $$(root, sel).filter((e) => !e.closest(".loupe")); return withText ? all.find((e) => e.textContent.includes(withText)) : all[0]; };
      if (name) return hit(pick(scn, name));
      const shots = $$(scn, "[data-shot]").filter((s) => !s.closest(".loupe"));
      for (const s of [...shots.filter((x) => getComputedStyle(x).display !== "none"), ...shots]) { const e = hit(s); if (e) return e; }
      return hit(scn);
    }
    const pick = (scn, name) => scn.querySelector(`[data-shot="${name}"]`);
    function measureShot(scn, name, fn) { // layout of a hidden stacked copy: show it, run fn, restore (UI.measure)
      const all = $$(scn, "[data-shot]"), was = all.map((e) => e.style.display);
      all.forEach((e) => { e.style.display = e.dataset.shot === name ? "block" : "none"; });
      try { return fn(); } finally { all.forEach((e, i) => { e.style.display = was[i]; }); }
    }
    function targetRect(sel, o = {}) {
      const scn = o.scene ? sceneOf(o.scene) : lastScene;
      if (!scn) throw new Error("target(): no scene yet (create one with scene() first)");
      const t = o.t ?? (scn.__start ?? 0) + 0.0001;
      return atTime(t, () => bare(scn.querySelector(":scope > .camlayer"), () => {
        const el = findEl(sel, scn, o);
        if (!el) throw new Error(`target "${sel}" not found in the scene${o.in ? ` (state ${o.in})` : ""}${o.withText ? ` with text "${o.withText}"` : ""}`);
        const shot = el.closest("[data-shot]"), run = () => rect(el, { text: !!o.text });
        const r = shot && getComputedStyle(shot).display === "none" ? measureShot(scn, shot.dataset.shot, run) : run();
        if (r.r - r.l < 1 && r.b - r.t < 1) throw new Error(`target "${sel}" has no size at ${t.toFixed(2)} s (display:none or not laid out?)`);
        r.el = el;
        return r;
      }));
    }
    function target(sel, o = {}) {
      const r = targetRect(sel, o), { fx = 0.5, fy = 0.5, dx = 0, dy = 0 } = o;
      return { x: r.l + (r.r - r.l) * fx + dx, y: r.t + (r.b - r.t) * fy + dy };
    }
    const isPt = (v) => v && typeof v === "object" && !(v instanceof Element) && "x" in v;
    const resolve = (v, scn, s = {}, t) => (isPt(v) ? v : target(v, { scene: scn, t: t ?? (s.t ?? 0) + (s.dur ?? 0), in: s.in, text: s.text, withText: s.withText, fx: s.fx, fy: s.fy, dx: s.dx, dy: s.dy }));

    // ---------- pointers: cursor() and finger() ----------
    // A pointer keeps its on-screen size when the camera zooms: the glyph sits in a wrapper that is counter-scaled by 1 / zoom each frame (pure
    // function of t). Film({ pointer: 1.5 }) or opts.size multiplies the default (cursor 66 px, finger 64 px at any zoom): 1.5-3 for feeds.
    // opts.scaleWithCamera: true gives the old behaviour (the pointer grows with the camera).
    const ptrs = [], live = []; // live: per-frame hooks (loupe): fn(t) may return a promise (images to decode)
    const zoomOf = (host) => (host?.classList?.contains("camlayer") ? Number(gsap.getProperty(host, "scale")) || 1 : 1);
    const syncPtrs = () => { for (const p of ptrs) p.s.style.scale = String(p.k / zoomOf(p.host)); };
    function ptrAdd(host, html, k, fixed, at) {
      host.insertAdjacentHTML("beforeend", `<i class="ptr${at ? " rp" : ""}"${at ? ` style="left:${at.x}px;top:${at.y}px"` : ""}><i class="ptr-s">${html}</i></i>`);
      const w = host.lastElementChild, s = w.firstElementChild;
      if (fixed) ptrs.push({ s, host, k });
      s.style.scale = String(fixed ? k / zoomOf(host) : 1);
      return w;
    }
    const PTR = { cursor: { html: CUR, k: 1.5, press: [0.92, 0.07, 1.7, 0.45] }, finger: { html: '<i class="finger"></i>', k: 1, press: [0.78, 0.07, 1.5, 0.5] } };
    function pointer(kind, host, from, steps, opts) {
      const D = PTR[kind], scn = sceneOf(host), k = (opts.size ?? 1) * (cfg.pointer ?? 1) * D.k, fixed = opts.scaleWithCamera !== true;
      const rs = steps.map((s) => ({ ...s, to: resolve(s.to, scn, s) }));
      from = resolve(from, scn, { t: rs[0]?.t ?? 0 }, rs[0]?.t ?? 0);
      const w = ptrAdd(host, D.html, k, fixed), cur = w.firstElementChild.firstElementChild;
      w.__steps = rs; w.__from = from;
      let at = from;
      tl.set(w, { x: from.x, y: from.y }, 0);
      const appear = opts.appear ?? rs[0]?.t ?? 0;
      if (appear > 0) { tl.set(cur, { opacity: 0 }, 0); tl.set(cur, { opacity: 1 }, appear); }
      for (const s of rs) {
        tl.fromTo(w, { x: at.x, y: at.y }, { x: s.to.x, y: s.to.y, duration: s.dur, ease: s.ease ?? "power2.inOut", ...NI }, s.t);
        if (s.hold === true || s.hold === "start") { const dn = kind === "finger" ? 0.8 : 0.86; tl.fromTo(cur, { scale: 1 }, { scale: dn, duration: kind === "finger" ? 0.12 : 0.1, ease: "power2.in", ...NI }, s.t); }
        if (s.hold === true || s.hold === "end") { const dn = kind === "finger" ? 0.8 : 0.86; tl.fromTo(cur, { scale: dn }, { scale: 1, duration: 0.2, ease: "back.out(3)", ...NI }, s.t + s.dur); }
        if (s.click || s.tap) {
          const tc = s.t + s.dur;
          (window.__clicks ??= []).push({ t: tc, el: cur }); // audit.mjs checks where each press lands in the frame
          const rp = ptrAdd(host, '<i class="ripple"></i>', k, fixed, s.to);
          tl.fromTo(rp.firstElementChild.firstElementChild, { scale: 0.3, opacity: 1 }, { scale: D.press[2], opacity: 0, duration: D.press[3], ease: "power2.out", ...NI }, tc);
          if (kind === "finger") { tl.fromTo(cur, { scale: 1 }, { scale: D.press[0], duration: D.press[1], ease: "power2.in", ...NI }, tc - 0.07); tl.fromTo(cur, { scale: D.press[0] }, { scale: 1, duration: 0.3, ease: "back.out(3)", ...NI }, tc); }
          else press(cur, tc);
        }
        at = s.to;
      }
      return w;
    }
    // Cursor path with click ripples. host = camera layer, so it follows the UI. steps: [{ to, t, dur, click?, hold? }]; `to` is a stage-space point
    // ({ x, y }, e.g. center()) OR a selector / element inside the scene ({ to: ".btn-add" }, see target()). The cursor is hidden until opts.appear
    // (default: its first step); { appear: 0 } shows it from the start. hold:true presses at the step's start and releases at its end (a drag).
    // `from` may be a point or a selector too. Returns the wrapper (tween its x/y, or pass it to follow()); .__steps = the resolved steps.
    function cursor(host, from, steps, opts = {}) { return pointer("cursor", host, from, steps, opts); }
    // drag(host, from, path, t0, t1, { ease: "none", kind, appear, size }): the pointer goes to `from` (appears there at t0), presses, follows `path` (a point, a selector,
    // an element, or an array of them) at constant speed from t0 to t1 (default ease "none": a slider thumb, a map pan, a long linear drag), releases at t1. Segments share the
    // time by their length. Same as cursor(host, from, [{ to, t: t0, dur: t1 - t0, hold: true, ease: "none" }]); each step also accepts `ease` ("none", "power1.inOut"...).
    // Returns the pointer wrapper (.__steps resolved: autoCam sees the press and the release; use autoCam's also: [{ path }] for the points between).
    function drag(host, from, path, t0, t1, { ease = "none", kind = "cursor", ...o } = {}) {
      const scn = sceneOf(host), pts = [].concat(path).map((p) => resolve(p, scn, { t: t1 }, t1)), p0 = resolve(from, scn, { t: t0 }, t0);
      const len = pts.map((p, i) => Math.hypot(p.x - (i ? pts[i - 1] : p0).x, p.y - (i ? pts[i - 1] : p0).y) || 1), tot = len.reduce((a, b) => a + b, 0);
      let t = t0; const steps = pts.map((p, i) => { const dur = ((t1 - t0) * len[i]) / tot, st = { to: p, t, dur, ease, hold: pts.length === 1 ? true : i === 0 ? "start" : i === pts.length - 1 ? "end" : "mid" }; t += dur; return st; });
      return pointer(kind, host, p0, steps, { appear: t0 - 0.0001, ...o });
    }
    // Caption pill (.cap in base.css), appended to the scene AFTER wrap() so it doesn't zoom. Opaque, enters by offset only: sharp on its first frame.
    // opts.pos: "bl" (default) | "br" | "tl" | "tr" | "bc"; or opts.x / opts.y = stage px of its top-left corner. Pick the corner that
    // leaves the content free. The default offset slides from the left edge (from the right for "br"/"tr").
    // opts.size = font size in px (default 44: the .cap rule). opts.end = second at which the caption is removed (hard cut, like show()); without it the caption stays to the end of its scene.
    function caption(s, text, t, from, opts = {}) {
      if (from && ("pos" in from || "end" in from || "size" in from || ("x" in from && "pos" in opts) === false && ("left" in from))) { opts = from; from = undefined; }
      const { pos = "bl", x, y, end, size } = opts;
      const c = document.createElement("div");
      c.className = "cap";
      c.textContent = text;
      const st = c.style, m = 96;
      if (size) st.fontSize = `${size}px`; // opts.size: font size in px (default 44 from .cap); padding and radius stay
      if (x != null || y != null) { st.left = `${x ?? m}px`; st.top = `${y ?? 900}px`; st.bottom = "auto"; }
      else {
        if (pos[0] === "t") { st.top = `${m}px`; st.bottom = "auto"; }
        if (pos[1] === "r") { st.right = `${m}px`; st.left = "auto"; }
        if (pos[1] === "c") { st.left = "0"; st.right = "0"; st.margin = "0 auto"; st.width = "fit-content"; }
      }
      s.appendChild(c);
      tl.fromTo(c, from || { x: pos[1] === "r" ? 70 : pos[1] === "c" ? 0 : -70, y: pos[1] === "c" ? 40 : 0 }, { x: 0, y: 0, duration: 0.4, ease: "expo.out", ...NI }, t);
      tl.set(c, { opacity: 0 }, 0); tl.set(c, { opacity: 1 }, t); // hidden until t (a caption at a later time must not sit at its start offset from the scene start)
      if (end != null) tl.set(c, { opacity: 0 }, end);
      return c;
    }
    // Touch pointer for phone UIs: a round translucent finger instead of an arrow. host = camera layer. steps: [{ to, t, dur, tap?, hold? }] (`to` as for cursor():
    // a point, a selector or an element). tap = press + ring on arrival; hold = pressed during the move (swipe, drag), released at its end.
    // Hidden until opts.appear (default: first step). Keeps its on-screen size under camera zoom like cursor().
    function finger(host, from, steps, opts = {}) { return pointer("finger", host, from, steps, opts); }

    // ---------- autoCam: camera keyframes from the cursor's click steps ----------
    // autoCam(cam, steps, opts) plans the camera tweens of one camera layer from the same steps array you give cursor() / finger()
    // (or pass the element cursor() returned). Clicks closer than opts.merge (2.5 s) share one framing; the camera is settled opts.pad (0.5 s) before the
    // first click, zooms in over opts.inDur, holds until the last click, and leaves opts.pad - opts.early after it (never sooner than 0.35 s); the next framing is
    // reached by a direct pan when the gap is short, else via a zoom-out. Every framing keeps its clicks inside the central opts.safe (60 %) of the frame, zoom
    // <= opts.max (2.4); a cluster that would need less than opts.min (1.25) zoom, or that moves the camera less than a dead zone, is skipped (stays wide).
    // Eases are the spring presets ("focused" default, or opts.preset: "smooth"). Manual tweens on the same layer WIN: autoCam sees every tween already on `cam`
    // (call it after your own focus() tweens; push() counts too), starts from where they leave the camera and drops any framing that would overlap one. It only
    // ever adds non-overlapping fromTo tweens. Returns the plan: [{ t0, t1, zoom, at, skipped? }] (also cam.__plan); every skipped framing (but the dead zone) is also printed as a build
    // warning with its reason. A first framing whose first click is > 0.5 s after the scene starts is set from the first frame (no zoom-in from 1.0 over the cut): startFramed: false opts out.
    // Only click / tap steps (and the start and end of a hold) are clustered: a drag's path, a follow() and holds are not: add the points that must stay in frame as also: [{ path: [{ x, y, t }] }].
    // opts: zoom 1.7, max 2.4, min 1.25, merge 2.5, pad 0.5, early 0.5, safe 0.6, margin 140 (px of context around the click boxes), inDur / outDur (preset),
    //       preset, ease, box + over (as focus()), from / to (window it may use: default the scene), settle (zoom back out at the end, default true),
    //       also: [{ t, to }] extra moments to frame (a typing field, a result), start (cursor's start point, for a first drag).
    function autoCam(cam, steps, o = {}) {
      const sp = SPRINGS[o.preset ?? "focused"] ?? SPRINGS.focused, scn = sceneOf(cam);
      const P = { zoom: 1.7, max: 2.4, min: 1.25, merge: 2.5, pad: 0.5, early: 0.5, safe: 0.6, margin: 140, inDur: sp.inDur, outDur: sp.outDur, ease: o.preset ?? "focused", settle: true, ...o };
      const from = P.from ?? scn.__start ?? 0, to = P.to ?? scn.__end ?? cfg.duration;
      if (steps instanceof Element) steps = steps.__steps;
      // 1 · moments to frame
      const evs = []; let prev = P.start ? resolve(P.start, scn, { t: steps[0]?.t }, steps[0]?.t) : null;
      for (const s of steps) {
        const p = resolve(s.to, scn, s);
        if (s.hold && prev) evs.push({ t: s.t, p: prev });
        if (s.click || s.tap || s.hold) evs.push({ t: s.t + s.dur, p });
        prev = p;
      }
      for (const e of P.also || []) { if (Array.isArray(e.path)) for (const q of e.path) evs.push({ t: q.t, p: resolve(q.to ?? q, scn, { t: q.t }, q.t) }); else evs.push({ t: e.t, p: resolve(e.to, scn, { t: e.t }, e.t) }); }
      evs.sort((a, b) => a.t - b.t);
      const sx = 960 * P.safe, sy = (view.h / 2) * P.safe, over = P.over ?? 220;
      // 3 · the camera state of a cluster: the largest zoom <= zoom/max that keeps every click in the safe area (and inside the clamp box + over)
      const fit = (c) => {
        const xs = c.ev.map((e) => e.p.x), ys = c.ev.map((e) => e.p.y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const hw = (Math.max(...xs) - Math.min(...xs)) / 2 + P.margin, hh = (Math.max(...ys) - Math.min(...ys)) / 2 + P.margin;
        c.at = { x: cx, y: cy }; c.st = null;
        for (let z = Math.min(P.zoom, P.max, sx / hw, sy / hh); z >= P.min - 1e-9; z *= 0.94) {
          const f = focus(c.at, z, { box: P.box, over });
          if (c.ev.every(({ p }) => Math.abs(960 + (p.x - 960) * z + f.x - 960) <= sx + 0.5 && Math.abs(540 + (p.y - 540) * z + f.y - view.cy) <= sy + 0.5)) { c.st = f; break; }
        }
        return c;
      };
      const mk = (ev) => fit({ ta: ev[0].t, tb: ev[ev.length - 1].t, ev });
      // 2 · clusters (clicks closer than merge share a framing); a cluster that cannot be framed (too spread out) is split at its longest pause
      const split = (c) => {
        if (c.st || c.ev.length < 2) return [c];
        let k = 1; for (let i = 2; i < c.ev.length; i++) if (c.ev[i].t - c.ev[i - 1].t > c.ev[k].t - c.ev[k - 1].t) k = i;
        return [...split(mk(c.ev.slice(0, k))), ...split(mk(c.ev.slice(k)))];
      };
      const cl = []; let grp = [];
      for (const e of [...evs, null]) {
        if (grp.length && (!e || e.t - grp[grp.length - 1].t > P.merge)) { cl.push(...split(mk(grp))); grp = []; }
        if (e) grp.push(e);
      }
      // 4 · what is already on the layer (manual tweens win) and the planned moves share one list; state after each entry = its end values
      const rest = { x: 0, y: 0, scale: 1 }, num = (v, d) => (typeof v === "number" ? v : d), list = [];
      let S = rest;
      for (const tw of tl.getChildren(false, true, false).filter((w) => w.targets().includes(cam)).sort((a, b) => a.startTime() - b.startTime())) {
        S = { x: num(tw.vars.x, S.x), y: num(tw.vars.y, S.y), scale: num(tw.vars.scale, S.scale) };
        list.push({ a: tw.startTime(), b: tw.startTime() + tw.duration(), end: S });
      }
      const stateAt = (t) => { let best = null; for (const e of list) if (e.b <= t + 1e-6 && (!best || e.a >= best.a)) best = e; return best ? best.end : rest; };
      const busy = (a, b) => list.some((e) => e.a < b - 1e-6 && e.b > a + 1e-6);
      const moves = [], add = (a, d, st) => { const m = { a, b: a + d, fr: stateAt(a), end: st, d }; list.push(m); moves.push(m); return m; };
      const near = (u, v) => Math.abs(u.scale - v.scale) < 0.1 && Math.abs(u.x - v.x) < 50 && Math.abs(u.y - v.y) < 50;
      // 5 · chain the framings
      const plan = []; let prevC = null, free = from;
      for (const c of cl) {
        const info = { t0: c.ta, t1: c.tb, zoom: c.st ? +c.st.scale.toFixed(2) : null, at: c.at };
        plan.push(info);
        if (!c.st) { info.skipped = "too spread out or too close to an edge for the safe area"; continue; }
        const arrive = c.ta - P.pad, leave = c.tb + Math.max(P.pad - P.early, 0.35);
        let f0 = prevC ? prevC.leave : from, out = null;
        if (prevC && arrive - prevC.leave >= P.outDur + 0.8 * P.inDur && !busy(prevC.leave, prevC.leave + P.outDur)) { out = add(prevC.leave, P.outDur, rest); f0 = out.b; }
        let s0 = Math.max(arrive - P.inDur, f0, free), d = arrive - s0;
        if (d < 0.5) { d = 0.5; s0 = Math.max(f0, free, arrive - 0.5); }
        const cur = stateAt(s0);
        if (near(cur, c.st)) { info.skipped = "already framed (dead zone)"; prevC = { leave, st: cur }; continue; }
        if (busy(s0, s0 + d)) { info.skipped = "overlaps a manual camera tween"; if (out) { list.splice(list.indexOf(out), 1); moves.splice(moves.indexOf(out), 1); } continue; }
        if (plan.length === 1 && P.startFramed !== false && c.ta - from > 0.5 && !busy(from, from + 0.01) && near(stateAt(from), rest)) { // the first click comes later than 0.5 s after the cut: the cut frame is already the framing (zoom 1 at the cut is unreadable)
          const m = { a: from, b: from, fr: rest, end: c.st, d: 0 }; list.push(m); moves.push(m); info.move = [+from.toFixed(2), +from.toFixed(2)]; info.startFramed = true;
        } else { add(s0, d, c.st); info.move = [+s0.toFixed(2), +(s0 + d).toFixed(2)]; }
        prevC = { leave, st: c.st }; free = leave;
      }
      if (P.settle && prevC) {
        const d = Math.min(P.outDur, to - prevC.leave);
        if (d >= 0.6 && !busy(prevC.leave, prevC.leave + d) && !near(stateAt(prevC.leave), rest)) add(prevC.leave, d, rest);
      }
      for (const i of plan) if (i.skipped && !/dead zone/.test(i.skipped)) warn(`autoCam: framing ${i.t0.toFixed(2)}-${i.t1.toFixed(2)} s skipped (${i.skipped}); the camera stays where it is. Clicks that spread wide or sit at an edge: pass over / margin / min, or frame them with focus()`);
      for (const m of moves) if (m.d === 0) tl.set(cam, { x: m.end.x, y: m.end.y, scale: m.end.scale }, m.a); else tl.fromTo(cam, { x: m.fr.x, y: m.fr.y, scale: m.fr.scale }, { x: m.end.x, y: m.end.y, scale: m.end.scale, duration: m.d, ease: P.ease, ...NI }, m.a);
      cam.__plan = plan;
      return plan;
    }

    // ---------- spot() and loupe(): crisp overlays inside the camera layer (they zoom with the UI) ----------
    // spot(scene, target, t0, t1, { dim, pad: 14, radius, ring: false, ringColor, in, text }): dims everything except the target (a rect {l,t,r,b}, a selector or an element)
    // between t0 and t1: an opaque-edge scrim with a hole, so the target stays at full brightness and sharp (it is never dimmed: the dimmed part is everything AROUND the rect, so
    // measure the element you want to read, not a small child of it). dim defaults to 0.6 on a dark app and 0.34 on a light one (the captured app's background luminance: a heavy
    // scrim washes a light UI grey). The ring is the captured app's accent (--f-app-accent, set from the capture), else the film's --f-accent; ringColor overrides it.
    // in: "<state name>" picks the stacked copy (see targetRect). Put the caption above it (captions sit over the scrim). The target should stand still while the spot is on.
    function spot(sc, tgt, t0, t1, { dim, pad = 14, radius, ring = false, ringColor, ...o } = {}) {
      const host = camOf(sc), r = typeof tgt.l === "number" ? tgt : targetRect(tgt, { scene: sc, t: t0, ...o });
      const el = document.createElement("div");
      el.className = "spot"; el.setAttribute("data-clip-ok", "");
      const rad = radius ?? (r.el ? parseFloat(getComputedStyle(r.el).borderRadius) || 10 : 10);
      const shot = (r.el ?? host).closest?.("[data-shot]") ?? host.querySelector("[data-shot]"), lum = (window.SCREENS_META || {})[shot?.dataset.shot]?.lum;
      const light = lum != null ? lum > 0.6 : document.documentElement.classList.contains("light");
      const d = dim ?? (light ? 0.34 : 0.6);
      el.style.cssText = `left:${r.l - pad}px;top:${r.t - pad}px;width:${r.r - r.l + pad * 2}px;height:${r.b - r.t + pad * 2}px;border-radius:${rad + pad * 0.6}px;box-shadow:0 0 0 6000px rgb(0 0 0 / ${d})${ring ? `, 0 0 0 3px ${ringColor ?? "var(--f-app-accent, var(--f-accent))"}` : ""}`;
      host.appendChild(el);
      const f = Math.min(0.3, (t1 - t0) / 3);
      tl.set(el, { opacity: 0 }, 0);
      tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: f, ease: "power2.out", ...NI }, t0);
      tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: f, ease: "power2.in", ...NI }, t1 - f);
      return el;
    }
    // loupe(scene, target, t0, t1, { scale: 2, size: 360, shape: "circle"|"round", side, gap, at, in, text }): a magnified inset of the target for tiny UI (a badge, a price, a
    // field label) without a camera move. The lens shows the live scene (a clone of the camera layer, refreshed every frame from the timeline: typing, counters and
    // tweens inside it move), cropped to a circle (or a rounded rect) next to the target; side: "above" | "below" | "left" | "right" (default: where there is room),
    // at: { x, y } = centre of the lens in stage px. Appears with a small pop at t0, gone at t1. Marked data-clip-ok (the clone repeats the scene's text on purpose).
    // leader: true draws a thin line from the lens to the target (when the lens sits away from it: dense maps and charts, where the lens would otherwise cover the data).
    // For TINY UI only: a target over 50 % of the stage prints a warning (a big region magnified shows the page's middle: use a camera zoom). The clone is rebuilt only when the
    // scene's markup changed since the last frame (a still target costs one clone), but a dense scene (100 KB+ of DOM) still doubles the layout work per frame.
    function loupe(sc, tgt, t0, t1, { scale = 2, size = 360, shape = "circle", side, gap = 28, at, leader = false, ...o } = {}) {
      const host = camOf(sc), r = typeof tgt.l === "number" ? tgt : targetRect(tgt, { scene: sc, t: t0, ...o });
      if ((r.r - r.l) * (r.b - r.t) > 0.5 * 1920 * 1080) warn(`loupe at ${t0.toFixed(2)} s: the target covers ${Math.round(((r.r - r.l) * (r.b - r.t)) / (1920 * 1080) * 100)} % of the stage, so the lens shows its middle, not the detail. A loupe is for tiny UI (a badge, a price): for a big region use a camera zoom (focusRect) or spot()`);
      const w = shape === "round" ? Math.round(size * 1.5) : size, h = shape === "round" ? Math.round(size * 0.9) : size;
      const cx = (r.l + r.r) / 2, cy = (r.t + r.b) / 2, m = 24;
      let x, y;
      if (at) { x = at.x - w / 2; y = at.y - h / 2; }
      else {
        const sd = side ?? (r.t - gap - h >= m ? "above" : r.b + gap + h <= 1080 - m ? "below" : r.r + gap + w <= 1920 - m ? "right" : "left");
        x = sd === "right" ? r.r + gap : sd === "left" ? r.l - gap - w : cx - w / 2;
        y = sd === "above" ? r.t - gap - h : sd === "below" ? r.b + gap : cy - h / 2;
      }
      x = Math.min(Math.max(x, m), 1920 - m - w); y = Math.min(Math.max(y, m), 1080 - m - h);
      const el = document.createElement("div");
      el.className = "loupe"; el.setAttribute("data-clip-ok", "");
      el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${shape === "round" ? 28 : 999}px`;
      el.innerHTML = `<div class="loupe-in" style="transform:translate(${w / 2 - cx * scale}px,${h / 2 - cy * scale}px) scale(${scale})"></div>`;
      host.appendChild(el);
      const inner = el.firstElementChild;
      let line = null;
      if (leader) {
        const lx = x + w / 2, ly = y + h / 2, dx = cx - lx, dy = cy - ly, dist = Math.hypot(dx, dy);
        if (dist > Math.max(w, h) / 2 + 10) {
          line = document.createElement("i"); line.className = "loupe-line"; line.setAttribute("data-clip-ok", "");
          line.style.cssText = `left:${lx}px;top:${ly}px;width:${dist}px;transform:rotate(${Math.atan2(dy, dx)}rad)`;
          host.insertBefore(line, el);
          tl.set(line, { visibility: "hidden" }, 0); tl.set(line, { visibility: "visible" }, t0); tl.set(line, { visibility: "hidden" }, t1);
        }
      }
      let sig = null;
      live.push((t) => {
        if (t < t0 - 0.001 || t > t1 + 0.001) return;
        const kids = [...host.children].filter((k) => !/\b(loupe|loupe-line|spot|ptr)\b/.test(k.className)), now = kids.map((k) => k.outerHTML).join("");
        if (now === sig) return; sig = now; // unchanged markup: keep the clone (and its decoded images)
        inner.replaceChildren(...kids.map((k) => k.cloneNode(true)));
        const imgs = [...inner.querySelectorAll("img")];
        return imgs.length ? Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : null))) : null;
      });
      tl.set(el, { visibility: "hidden" }, 0);
      tl.set(el, { visibility: "visible" }, t0);
      tl.fromTo(el, { scale: 0.82 }, { scale: 1, duration: 0.35, ease: "focused", ...NI }, t0);
      tl.set(el, { visibility: "hidden" }, t1);
      return el;
    }
    // Persistent step-caption band for how-tos: a bar at the bottom (or top) of the frame that never covers the UI. It reserves the space:
    // the scenes are clipped to the free part and focus() / focusRect() centre and clamp on that part (view.cy, view.h), so call band() BEFORE
    // the focus() calls. Not zoomed by the camera. Returns { el, step(text, t0, t1?, { n }), progress(t0, t1), height }.
    //   const b = band({ height: 180 });  b.step("Press and hold the card", 2.5, 6, { n: 1 });  b.step("Drop it on In review", 6, 9, { n: 2 });
    // At zoom 1 the whole 1080 px app no longer fits: use scale <= (1080 - height) / 1080 to see all of it, or frame with focusRect().
    function band({ height = 180, pos = "bottom", size = 46 } = {}) {
      const top = pos === "top", el = document.createElement("div");
      el.className = "band"; el.style.cssText = `height:${height}px;${top ? "top" : "bottom"}:0;font-size:${size}px`;
      el.innerHTML = '<i class="band-bar"></i>';
      stage.insertBefore(el, flashEl);
      view.top = top ? height : 0; view.bottom = top ? 0 : height; view.h = 1080 - height; view.cy = 540 + (view.top - view.bottom) / 2;
      scenesEl.style.clipPath = top ? `inset(${height}px 0 0 0)` : `inset(0 0 ${height}px 0)`;
      const api = {
        el, height,
        step(text, t0, t1, { n } = {}) {
          const s = document.createElement("div");
          s.className = "band-step";
          s.innerHTML = `${n != null ? `<b class="band-n">${n}</b>` : ""}<span>${text}</span>`;
          el.appendChild(s);
          show(s, t0, t1);
          tl.fromTo(s, { y: top ? -26 : 26 }, { y: 0, duration: 0.35, ease: "expo.out", ...NI }, t0);
          return s;
        },
        progress(t0, t1) { tl.fromTo($(el, ".band-bar"), { scaleX: 0 }, { scaleX: 1, duration: t1 - t0, ease: "none", ...NI }, t0); },
      };
      return api;
    }
    // A key cap (the keyboard equivalent of the cursor): for apps driven by keys (games, editors, shortcuts). "ArrowUp", "Enter", "Space", "k", or a combo
    // "Ctrl+K" / "Cmd+Shift+P" (one cap per key). Appears at t, presses on t (depresses and springs back), leaves at opts.end (default t + 0.9).
    // host = the scene (not the camera layer: it stays put and big). opts.pos like caption(): "bl" (default) | "br" | "tl" | "tr" | "bc"; x/y = stage px. Returns the element.
    function keycap(host, key, t, { pos = "br", x, y, end, size = 84 } = {}) {
      const G = { arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→", enter: "↵", return: "↵", escape: "esc", esc: "esc", space: "␣", tab: "⇥", backspace: "⌫", delete: "⌦", shift: "⇧", ctrl: "ctrl", control: "ctrl", alt: "alt", option: "⌥", cmd: "⌘", meta: "⌘", command: "⌘" };
      const keys = String(key).split("+").map((k) => k.trim()).filter(Boolean);
      const w = document.createElement("div");
      w.className = "keycaps";
      w.style.fontSize = `${size}px`;
      w.innerHTML = keys.map((k) => `<b class="keycap">${G[k.toLowerCase()] ?? (k.length === 1 ? k.toUpperCase() : k)}</b>`).join("");
      const m = 96;
      if (x != null || y != null) { w.style.left = `${x ?? m}px`; w.style.top = `${y ?? 900}px`; }
      else {
        if (pos[0] === "t") w.style.top = `${m}px`; else w.style.bottom = `${m}px`;
        if (pos[1] === "r") w.style.right = `${m}px`; else if (pos[1] === "c") { w.style.left = "0"; w.style.right = "0"; w.style.margin = "0 auto"; w.style.width = "fit-content"; } else w.style.left = `${m}px`;
      }
      host.appendChild(w);
      const caps = $$(w, ".keycap"), e1 = end ?? t + 0.9;
      tl.set(w, { opacity: 0 }, 0); tl.set(w, { opacity: 1 }, t - 0.12); tl.set(w, { opacity: 0 }, e1);
      tl.fromTo(w, { y: 26 }, { y: 0, duration: 0.25, ease: "expo.out", ...NI }, t - 0.12);
      caps.forEach((c) => { tl.to(c, { y: size * 0.07, scale: 0.94, duration: 0.07, ease: "power2.in" }, t - 0.07); tl.to(c, { y: 0, scale: 1, duration: 0.3, ease: "back.out(3)" }, t); });
      return w;
    }
    // Side panels for a narrow app (a phone UI, a 2048 board) centred on the 16:9 stage: two panels fill the margins for copy / captions.
    // panels(scene, { width: 608, bg }) → { l, r, box } : l / r are absolutely placed divs (.panel, put text in them), box = the app's column {l, t, r, b}
    // to pass to focus({ box }). bg defaults to the film's card colour; pass the app's background to make the margins look like the page.
    function panels(host, { width = 608, bg } = {}) {
      const side = (1920 - width) / 2, mk = (left) => { const d = document.createElement("div"); d.className = "panel"; d.style.cssText = `left:${left}px;width:${side}px;${bg ? `background:${bg};` : ""}`; host.appendChild(d); return d; };
      return { l: mk(0), r: mk(side + width), box: { l: side, t: 0, r: side + width, b: 1080 }, width: side };
    }
    // The empty edge a focus({ over }) camera shows beyond a replica takes the captured page's own background instead of the film's: edge(scene[, stateName]).
    function edge(sceneEl, name) {
      const sh = name ? sceneEl.querySelector(`[data-shot="${name}"]`) : sceneEl.querySelector("[data-shot]");
      const bg = (window.SCREENS_META || {})[sh?.dataset.shot]?.bg;
      if (bg) sceneEl.style.background = bg;
      return sceneEl;
    }
    // Moves an element (a captured toast: tell it from its parent .parentElement when the parent is the fixed wrapper) next to a reference
    // element or rect, so it lands inside the zoomed frame instead of in the far corner. Measure-time placement: call before tweens, with the
    // element's parents at scale 1. side: "below" | "above" | "right" | "left" | "inside-br" | "inside-bl" | "inside-tr" | "inside-tl";
    // align (for below/above): "center" | "start" | "end". Returns the stage-space point of the element's new centre.
    function dock(el, ref, { side = "below", gap = 24, align = "center" } = {}) {
      const a = rect(el), b = typeof ref.l === "number" ? ref : rect(ref), w = a.r - a.l, h = a.b - a.t, mid = (u, v, l) => (align === "start" ? u : align === "end" ? v - l : (u + v) / 2 - l / 2);
      let x, y;
      if (side === "below" || side === "above") { x = mid(b.l, b.r, w); y = side === "below" ? b.b + gap : b.t - gap - h; }
      else if (side === "right" || side === "left") { y = (b.t + b.b) / 2 - h / 2; x = side === "right" ? b.r + gap : b.l - gap - w; }
      else { x = side.endsWith("l") ? b.l + gap : b.r - gap - w; y = side.includes("t") && side[side.length - 2] === "t" ? b.t + gap : b.b - gap - h; }
      // applied at build time too (gsap.set), then re-measured: whatever transform the element already has (a MUI Snackbar's translateX(-50%)) is composed with,
      // and a later enter(el, …) reads the docked rest values. Call dock BEFORE enter / other tweens of the element.
      gsap.set(el, { x: (gsap.getProperty(el, "x") || 0) + x - a.l, y: (gsap.getProperty(el, "y") || 0) + y - a.t });
      for (let i = 0; i < 3; i++) { const r = rect(el), dx = x - r.l, dy = y - r.t; if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) break; gsap.set(el, { x: gsap.getProperty(el, "x") + dx, y: gsap.getProperty(el, "y") + dy }); }
      tl.set(el, { x: gsap.getProperty(el, "x"), y: gsap.getProperty(el, "y") }, 0);
      return { x: x + w / 2, y: y + h / 2 };
    }
    // Scroll a tall page inside the camera: tweens `main` (the element holding the page, usually the scene's camlayer or the app's
    // main column) up by `y` px between t and t+dur. Returns { y, at(p) }: at() maps a point measured BEFORE the scroll (center()/rect())
    // to where it sits after it, so focus(sc.at(center(el)), 1.8, { over: 300 }) aims at the right place.
    // Document-scrolling pages (no scroll container; UI.shot(name, { tall: true })): tween the shot's wrapper or the scene's camlayer. `pin` = elements that
    // must stay put while the page scrolls under them (a position:sticky nav): they are counter-tweened by +y.
    // y is the scroll POSITION (px from the top of the page): a second scrollTo on the same element continues from where the first ended (or from a
    // pre-scroll set with dur 0), it does not jump back to 0. dur 0 = a pre-scroll: the page starts scrolled (tl.set at t). Returns { y, from, at(p), box(b) }:
    // at() maps a point measured BEFORE any scroll to its place after it; box() does the same for a rect, e.g. the `box` option of focus() after a pre-scroll.
    function scrollTo(main, y, t, dur = 0.8, ease = "power2.inOut", { pin = [] } = {}) {
      const from = main.__sv_scroll ?? 0; main.__sv_scroll = y;
      if (dur > 0) tl.fromTo(main, { y: -from }, { y: -y, duration: dur, ease, ...NI }, t); else tl.set(main, { y: -y }, t);
      for (const p of [].concat(pin)) { if (dur > 0) tl.fromTo(p, { y: from }, { y, duration: dur, ease, ...NI }, t); else tl.set(p, { y }, t); }
      return { y, from, at: (p) => ({ x: p.x, y: p.y - y }), box: (b) => ({ l: b.l, r: b.r, t: b.t - y, b: b.b - y }) };
    }
    // Typing on given times (one absolute second per character: onsets from music.json, or jittered with rnd() for a silent film).
    function typeOn(el, text, times, onUpd) {
      const a = times[0] - 0.001, p = { t: a };
      tl.fromTo(p, { t: a }, { t: times[times.length - 1] + 0.001, duration: times[times.length - 1] - times[0], ease: "none",
        onUpdate: () => { const k = times.filter((x) => x <= p.t).length; put(el, text.slice(0, k)); onUpd && onUpd(k); }, ...NI }, times[0]);
    }
    // Slow camera drift (scale from→to) so a shot is never still. Default ease "power1.out": it eases to rest at t1, so the last frame
    // of the film (or a cut) is not mid-move; pass "none" for a constant drift that ends at a cut. Don't combine with a focus() tween on the same layer at once.
    function push(el, t0, t1, from = 1, to = 1.06, ease = "power1.out") {
      tl.fromTo(el, { scale: from }, { scale: to, duration: t1 - t0, ease, ...NI }, t0);
    }
    const endColor = () => {
      const last = scenesEl.lastElementChild, opaque = (c) => c && !/rgba?\(.*(,\s*0\)|\/\s*0\))$|^transparent$/.test(c) && c !== "rgba(0, 0, 0, 0)";
      for (const e of last ? [last, ...[...last.querySelectorAll("*")].slice(0, 12)] : []) { const c = getComputedStyle(e).backgroundColor; if (opaque(c) && e.getBoundingClientRect().width >= 1900) return c; }
      return css("--f-land") || "#000";
    };
    // Fade the whole frame to a colour (default the film's --f-bg) from t0 over dur, fully covered at t0+dur: end the film with
    // land(DURATION - 0.4, 0.4) so the last frame is calm instead of a hard cut. Uses the flash layer (don't flash() during it).
    // The default colour is the last scene's own background (the end card's flood), else the --f-land token, else black: a fade to --f-bg washes a coloured end card out.
    function land(t0, dur = 0.4, color) {
      color ??= endColor();
      tl.set(flashEl, { backgroundColor: color }, t0);
      tl.fromTo(flashEl, { opacity: 0 }, { opacity: 1, duration: dur, ease: "power1.inOut", ...NI }, t0);
    }
    // The default way to bring something in at t: hidden until t, then a PLAIN fromTo from `from` to the element's own rest values. `from` is any
    // gsap vars ({ y: 50 }, { scale: 0.8, opacity: 0 }); the rest values are read at build time. Never write tl.fromTo(el, {y:50}, {y:0, ...NI}, t)
    // for something that is on screen before t: with NI the element sits at rest until t, then jumps to `from` (audit.mjs flags it as a jump).
    function enter(el, from, t, dur = 0.5, ease) {
      const to = {};
      for (const k of Object.keys(from)) to[k] = gsap.getProperty(el, k);
      tl.set(el, { visibility: "hidden" }, 0);
      tl.set(el, { visibility: "visible" }, t);
      tl.fromTo(el, from, { ...to, duration: dur, ...(ease ? { ease } : {}) }, t);
      return el;
    }
    // A pointer (cursor() / finger() element) that follows a recorded path: pts = [{ x, y, t }] in stage space with t in seconds from t0
    // (UI.recording(name).path(k, ox, oy) builds them). One linear segment per sample, so it is seek-safe and exact.
    function follow(el, pts, t0) {
      tl.set(el, { x: pts[0].x, y: pts[0].y }, t0 + pts[0].t);
      for (let i = 1; i < pts.length; i++) tl.fromTo(el, { x: pts[i - 1].x, y: pts[i - 1].y }, { x: pts[i].x, y: pts[i].y, duration: Math.max(0.001, pts[i].t - pts[i - 1].t), ease: "none", ...NI }, t0 + pts[i - 1].t);
      return el;
    }
    // Visible from t0 (to t1, optional): opacity 0 at build time, hard switch on the beat. Use for word-per-beat layers and tiles.
    function show(el, t0, t1) {
      tl.set(el, { opacity: 0 }, 0);
      tl.set(el, { opacity: 1 }, t0);
      if (t1 != null) tl.set(el, { opacity: 0 }, t1);
    }
    // Circle reveal of a stacked copy (theme change) from point p; starts at r0 > 0 so the first frame already shows a disc.
    // Measure p (center of the toggle) while both copies are displayed. At camera zoom > 1.2 the disc is a flat blob.
    // opts.below = the copy the disc covers: hidden right after the reveal (a translucent glass UI would show it through, and backdrop-filter ghosts).
    function reveal(el, p, t0, dur = 0.8, r0 = 70, r1 = 2400, { below } = {}) {
      if (below) tl.set(below, { display: "none" }, t0 + dur + 0.01);
      const circ = (r) => `circle(${r}px at ${p.x}px ${p.y}px)`;
      tl.set(el, { display: "none" }, 0);
      tl.set(el, { display: "" }, t0);
      tl.fromTo(el, { clipPath: circ(r0) }, { clipPath: circ(r1), duration: dur, ease: "power2.inOut", ...NI }, t0);
      tl.set(el, { clipPath: "none" }, t0 + dur + 0.001); // a finished reveal leaves no clip layer behind (a clip-path layer rasterises its text differently: determinism)
    }
    // The join into the end card: no hard cut. toCard(fromCam, card, T, { mode, from, dur: 0.6, pull, bg, el, to, tile }): fromCam = the product scene's camera layer (wrap(s)), card = the end
    // card's scene (scene(html, T, null)), T = the card's start. The product scene must run until T + dur (scene(..., T + dur)); for mode "tile" until the end of the film.
    //   "reveal" (default)  the card's colour grows as a circle from `from` (a point, selector or element: the last click; default the centre) while the camera pulls back (pull: true = zoom 0.92,
    //                       a number = that zoom, false = leave the camera to you / autoCam). bg = the card element that grows (selector or element; default the whole card scene).
    //   "flip"              the payoff element `el` (inside the product scene) flies to `to` (the element of the card that holds the same number / chip) while the card's background (bg: selector
    //                       or element, default the first full-frame child) fades in under it. The flown copy is a clone: el itself is hidden at T.
    //   "tile"              the product shrinks into a rounded tile (tile: { scale: 0.46, y: -150, radius: 44 }) that slides up while the card, already behind it, shows below. Put the card's text
    //                       in the lower half, e.g. a line under the tile.
    // Entrances of the card's own text are yours (enter(el, { y: 40 }, T + 0.35, 0.5)). Call toCard BEFORE autoCam on the product camera (autoCam then plans around the pull-back). Returns { point, bg }.
    function toCard(fromCam, card, T, { mode = "reveal", from, dur = 0.6, pull = true, bg, r0 = 70, el, to, tile = {} } = {}) {
      if (!["reveal", "flip", "tile"].includes(mode)) throw new Error(`toCard: mode must be "reveal", "flip" or "tile" (got "${mode}")`);
      const scn = sceneOf(fromCam), cs = sceneOf(card), find = (v, root) => (typeof v === "string" ? $(root, v) : v);
      if (cs.__start != null && Math.abs(cs.__start - T) > 0.01) warn(`toCard: the card scene starts at ${cs.__start} s but T is ${T} s; create it with scene(html, ${T}, null)`);
      if (mode === "tile") { if (scn.__end != null && scn.__end < DURATION - 0.01) warn(`toCard tile: the product scene ends at ${scn.__end} s, so the tile disappears; end it at the film's end (null)`); }
      else if (scn.__end != null && scn.__end < T + dur - 0.01) warn(`toCard: the product scene ends at ${scn.__end} s, before the join is done (${(T + dur).toFixed(2)} s): scene(..., ${(T + dur).toFixed(2)}) keeps it under the card`);
      const p = from ? resolve(from, scn, { t: T }, T) : { x: 960, y: 540 };
      if (mode === "reveal") {
        if (pull) tl.to(fromCam, { ...focus({ x: 960, y: 540 }, typeof pull === "number" ? pull : 0.92, { clamp: false }), duration: dur, ease: "focused" }, T);
        const bgEl = bg ? find(bg, cs) : cs, r1 = Math.max(...[[0, 0], [1920, 0], [0, 1080], [1920, 1080]].map(([x, y]) => Math.hypot(x - p.x, y - p.y))) + 40;
        reveal(bgEl, p, T, dur, r0, r1);
        return { point: p, bg: bgEl };
      }
      if (mode === "tile") {
        const k = tile.scale ?? 0.46, dy = tile.y ?? -150, rad = tile.radius ?? 44;
        cs.style.zIndex = "0"; scn.style.zIndex = "1";
        tl.fromTo(scn, { scale: 1, y: 0, clipPath: "inset(0px round 0px)" }, { scale: k, y: dy, clipPath: `inset(0px round ${Math.round(rad / k)}px)`, duration: dur, ease: "power3.inOut", ...NI }, T);
        return { point: p, bg: cs };
      }
      // flip
      if (!el || !to) throw new Error('toCard flip: pass el (the payoff element in the product scene) and to (its place in the card): toCard(cam, card, T, { mode: "flip", el, to })');
      const src = find(el, scn), dst = find(to, cs);
      if (!src || !dst) throw new Error(`toCard flip: ${!src ? "el" : "to"} not found`);
      const er = rect(src), tr = rect(dst), shot = src.closest("[data-shot], .app-shot") ?? scn;
      let node = src.cloneNode(true);
      node.style.cssText += `;position:absolute;left:${er.l}px;top:${er.t}px;width:${er.r - er.l}px;height:${er.b - er.t}px;margin:0;transform-origin:0 0;box-sizing:border-box`;
      const leaf = node;
      for (let a = src.parentElement; a && a !== scn; a = a.parentElement) { const c = a.cloneNode(false); c.style.cssText = "display:contents"; c.appendChild(node); node = c; if (a === shot) break; }
      const fly = document.createElement("div"); fly.className = "flip-fly"; fly.setAttribute("data-clip-ok", ""); fly.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none";
      fly.appendChild(node); scenesEl.appendChild(fly);
      const g = leaf, s1 = (tr.r - tr.l) / Math.max(1, er.r - er.l);
      const bgEl = bg ? find(bg, cs) : [...cs.children].find((e) => e.getBoundingClientRect().width >= 1900) ?? cs;
      tl.set(fly, { visibility: "hidden" }, 0); tl.set(fly, { visibility: "visible" }, T); tl.set(fly, { visibility: "hidden" }, T + dur + 0.001);
      tl.fromTo(g, { x: 0, y: 0, scale: 1 }, { x: tr.l - er.l, y: tr.t - er.t, scale: s1, duration: dur, ease: "power3.inOut" }, T);
      tl.fromTo(bgEl, { opacity: 0 }, { opacity: 1, duration: dur * 0.8, ease: "power2.out", ...NI }, T);
      tl.set(src, { visibility: "hidden" }, T);
      tl.set(dst, { visibility: "hidden" }, 0); tl.set(dst, { visibility: "visible" }, T + dur);
      return { point: p, bg: bgEl };
    }
    // One value drives dot, guide line, highlighted path and tooltip: seek-safe both ways. chart = { xy: [[x,y]…] in svg units, vals: value per point,
    // pad: [left, top] offset of the svg inside the tooltip's parent, fmt }. The scene needs .tip, .dot, .guide, .hl (display:none in the HTML).
    function scrubChart(s, chart, t0, t1, v0, v1, ease = "sine.inOut") {
      const { xy, vals, pad = [0, 0], fmt = (v) => `$${Math.round(v)}k` } = chart;
      const n = xy.length - 1, tip = $(s, ".tip"), dot = $(s, ".dot"), guide = $(s, ".guide"), hl = $(s, ".hl");
      const at = (v) => { const f = Math.min(v, 0.9999) * n, i = Math.floor(f), k = f - i;
        return [xy[i][0] + (xy[i + 1][0] - xy[i][0]) * k, xy[i][1] + (xy[i + 1][1] - xy[i][1]) * k, vals[i] + (vals[i + 1] - vals[i]) * k]; };
      const draw = (v) => {
        const [x, y, val] = at(v);
        let d = `M${xy[0][0]} ${xy[0][1]}`;
        for (let i = 1; i <= Math.floor(v * n); i++) d += `L${xy[i][0]} ${xy[i][1]}`;
        hl.setAttribute("d", d + `L${x} ${y}`);
        dot.setAttribute("cx", x); dot.setAttribute("cy", y);
        guide.setAttribute("x1", x); guide.setAttribute("x2", x);
        tip.style.left = `${pad[0] + x}px`; tip.style.top = `${pad[1] + y}px`; tip.textContent = fmt(val);
      };
      [dot, guide, tip].forEach((e) => (e.style.display = ""));
      const p = { v: v0 };
      draw(v0);
      tl.fromTo(p, { v: v0 }, { v: v1, duration: t1 - t0, ease, onUpdate: () => draw(p.v), ...NI }, t0);
    }

    const ctx = { tl, $, $$, rnd, NI, warn, toCard, drag, scene, frame, wrap, target, targetRect, autoCam, spot, loupe, spring, splitChars, type, put, scrollTo, count, center, rect, focus, focusRect, enter, follow, view, band, dock, finger, flash, press, burst, rings, cursor, caption, keycap, panels, edge, typeOn, push, land, show, reveal, scrubChart, stage, cam, hash, css };
    cfg.build(ctx);
    tl.set({}, {}, DURATION);
    window.__tl = tl; // audit.mjs reads tween start times from it

    // ---------- audio-reactive layer (pure function of t) ----------
    const HITS = cfg.hits || [];
    const env = (k, t) => { const E = window.ENV; if (!E || !E[k]) return 0; const a = E[k]; return a[Math.min(a.length - 1, Math.max(0, Math.floor(t * E.fps)))]; };
    ctx.env = env;
    const sprites = $$(document, ".sprite");
    function react(t) {
      syncPtrs();
      let sx = 0, sy = 0, sr = 0;
      const f = Math.floor(t * 60);
      for (const [h, a] of window.__measure ? [] : HITS) {
        const d = t - h;
        if (d < 0 || d > 0.6) continue;
        const k = a * Math.exp(-d * 9);
        sx += (hash(f + h) - 0.5) * 2 * k;
        sy += (hash(f * 1.7 + h) - 0.5) * 2 * k;
        sr += (hash(f * 2.3 + h) - 0.5) * 0.04 * k;
      }
      // sprite sheets (GIFs, animated emoji): <i class="sprite" data-n="12" data-fps="15"> with a horizontal strip background
      for (const sp of sprites) {
        const n = Number(sp.dataset.n);
        const fr = Math.floor(t * Number(sp.dataset.fps || 15)) % n;
        sp.style.backgroundPosition = `${(fr / (n - 1)) * 100}% 0`;
      }
      const sub = window.__measure ? 0 : env("sub", t);
      cam.style.transform = `translate(${sx}px, ${sy}px) rotate(${sr}deg) scale(${1 + sub * 0.014})`;
      if (bgGlow) bgGlow.style.filter = `brightness(${0.75 + sub * 0.7})`;
      const g = Math.floor(t * 24);
      grain.style.transform = `translate(${(hash(g) - 0.5) * 300}px, ${(hash(g + 9) - 0.5) * 300}px)`;
      cfg.react && cfg.react(t, ctx);
      const wait = window.__measure ? [] : live.map((fn) => fn(t)).filter(Boolean);
      return wait.length ? Promise.all(wait) : undefined; // __seek returns it: the renderer waits for the loupe's images
    }
    // a paused timeline doesn't render tl.set(..., 0) when asked for time 0, so the first frame would be blank: clamp to 0.0001
    function seek(t) { tl.time(Math.min(Math.max(t, 0.0001), DURATION - 0.0001), false); return react(t); }

    // Motion per frame, for render.mjs --preset selective: the largest on-screen displacement (px) between t and t + dt of every element a tween is moving
    // (x/y/scale/rotation/size) at that moment: the camera layer, cursor, cards. Beat shake and the sub pulse are left out (they are not motion to blur).
    const MOVES = ["x", "y", "xPercent", "yPercent", "scale", "scaleX", "scaleY", "rotation", "rotate", "rotationX", "rotationY", "skewX", "skewY", "left", "top", "width", "height", "right", "bottom"];
    const movers = tl.getChildren(false, true, false).filter((w) => w.duration() > 0 && MOVES.some((k) => k in w.vars) && w.targets().some((e) => e instanceof Element));
    window.__speed = (t, dt = 1 / 60) => {
      const act = movers.filter((w) => w.startTime() < t + dt && w.startTime() + w.duration() > t);
      const els = [...new Set(act.flatMap((w) => w.targets().filter((e) => e instanceof Element)))];
      if (!els.length) return 0;
      const pts = () => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, (r.left + r.right) / 2, (r.top + r.bottom) / 2]; });
      window.__measure = true;
      try { seek(t + dt); var b = pts(); seek(t); var a = pts(); } finally { window.__measure = false; }
      let v = 0;
      a.forEach((p, i) => p.forEach((u, k) => { v = Math.max(v, Math.abs(u - b[i][k])); }));
      return v;
    };

    window.__seek = seek;
    window.__duration = DURATION;
    const t0 = Number(new URLSearchParams(location.search).get("t") || 0);
    seek(t0);
    if (!RENDER) preview(cfg, seek, stage, DURATION, t0);
    window.__ready = true;
  }

  // ---------- preview: the track drives time; without a track a silent clock + metronome does ----------
  function preview(cfg, seek, stage, D, t0) {
    const audio = document.getElementById("audio");
    const scrub = document.getElementById("scrub");
    const timeEl = document.getElementById("time");
    const playBtn = document.getElementById("play");
    scrub.max = D;
    const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
    fit();
    addEventListener("resize", fit);

    let useAudio = !!cfg.track;
    let vt = t0, playing = false, last = 0, ac = null;
    if (useAudio) {
      audio.src = cfg.track;
      audio.currentTime = t0;
      audio.addEventListener("error", () => { useAudio = false; console.warn(`track "${cfg.track}" not found, using a silent clock`); });
    }
    const beat = 60 / (cfg.bpm || 120);
    function click(accent) {
      ac = ac || new AudioContext();
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = accent ? 1600 : 1000;
      g.gain.setValueAtTime(accent ? 0.3 : 0.15, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 0.06);
    }
    const now = () => (useAudio ? audio.currentTime : vt);
    const set = (t) => { t = Math.max(0, Math.min(D, t)); if (useAudio) audio.currentTime = t; else vt = t; seek(t); };
    const paused = () => (useAudio ? audio.paused : !playing);
    function toggle() {
      if (paused()) {
        if (now() >= D - 0.05) set(0);
        if (useAudio) audio.play(); else { playing = true; last = performance.now(); }
      } else if (useAudio) audio.pause(); else playing = false;
    }
    playBtn.onclick = toggle;
    stage.addEventListener("click", toggle);
    addEventListener("keydown", (e) => {
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      const step = e.shiftKey ? 1 / 60 : e.altKey ? beat : 1;
      if (e.code === "ArrowLeft") set(now() - step);
      if (e.code === "ArrowRight") set(now() + step);
    });
    scrub.oninput = () => set(Number(scrub.value));
    function loop(ts) {
      if (!useAudio && playing) {
        const prev = vt;
        vt = Math.min(D, vt + (ts - last) / 1000);
        last = ts;
        const b = Math.floor(vt / beat);
        if (b > Math.floor(prev / beat) && cfg.metronome !== false) click(b % 4 === 0);
        if (vt >= D) playing = false;
      }
      const t = now();
      seek(t);
      scrub.value = t;
      timeEl.textContent = `${t.toFixed(2)}  ·  bar ${Math.floor(t / beat / 4) + 1}.${(Math.floor(t / beat) % 4) + 1}`;
      playBtn.textContent = paused() ? "▶ Play" : "❚❚ Pause";
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
})();

/* ship-video engine (browser side): timeline helpers, deterministic audio-reactive layer, preview shell.
   Don't edit per film. Scenes go in film.js, screen builders in ui.js.

   Rule: everything on screen is a pure function of t. No setTimeout, no CSS animations/transitions,
   no Date/Math.random. Use ctx.rnd() (seeded), sprites (frame = floor(t·fps) % n) and window.ENV. */
(function () {
  const $ = (root, s) => root.querySelector(s);
  const $$ = (root, s) => [...root.querySelectorAll(s)];
  const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const preload = (src) => new Promise((ok) => { const im = new Image(); im.onload = im.onerror = () => ok(); im.src = src; });

  /* Film({ duration, bpm, track, hits, fonts, images, seed, build(ctx), react(t, ctx) })
     duration  seconds; the timeline is padded to it
     bpm       tempo; drives the preview metronome when there is no track
     track     audio file next to index.html, or null (silent clock + metronome)
     hits      [[t, shakePx], …]: camera shake that decays within 0.6 s
     fonts     CSS font shorthands to load before build, e.g. "800 40px 'Inter Variable'"
     images    image URLs to preload before build (layout is measured at build time) */
  window.Film = function Film(cfg) {
    const waits = [...(cfg.fonts || []).map((f) => document.fonts.load(f)), ...(cfg.images || []).map(preload)];
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

    // A scene is a full-frame layer shown from start to end. Hidden scenes get visibility:hidden AND opacity:0
    // (base.css), so a child with visibility:visible can't leak through; they still have layout, so center() works.
    function scene(html, start, end) {
      const el = document.createElement("div");
      el.className = "scene";
      el.innerHTML = html;
      scenesEl.appendChild(el);
      tl.set(el, { attr: { "data-on": "1" } }, start);
      if (end != null) tl.set(el, { attr: { "data-on": "0" } }, end);
      return el;
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
    function rect(el) {
      const s = stage.getBoundingClientRect(), k = s.width / 1920, r = el.getBoundingClientRect();
      return { l: (r.left - s.left) / k, t: (r.top - s.top) / k, r: (r.right - s.left) / k, b: (r.bottom - s.top) / k };
    }
    // Stage-space centre of an element. Measure BEFORE adding tweens that move it.
    function center(el) {
      const s = stage.getBoundingClientRect();
      const k = s.width / 1920;
      const r = el.getBoundingClientRect();
      return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k };
    }
    // Camera transform that puts stage point p at screen centre at zoom s. App UI is small: 1.4–2.3× on what matters.
    // By default the point is clamped so the frame never shows past the edges of `box` (the 1920×1080 stage);
    // pass the replica's own rect as box when it doesn't fill the stage, or clamp: false to aim anywhere. Targets in the top or bottom
    // third can't be centred at 1.5–2.3× inside the box: use { over: 300 } (allow that many px of empty edge) or clamp: false.
    const focus = (p, s, { clamp = true, over = 0, box: b0 = { l: 0, t: 0, r: 1920, b: 1080 } } = {}) => {
      let { x, y } = p;
      const box = { l: b0.l - over, t: b0.t - over, r: b0.r + over, b: b0.b + over };
      if (clamp && s >= 1) {
        // when the box is smaller than the view on an axis, centre on it; otherwise keep the view inside it
        x = (box.r - box.l) * s <= 1920 ? (box.l + box.r) / 2 : Math.min(Math.max(x, box.l + 960 / s), box.r - 960 / s);
        y = (box.b - box.t) * s <= 1080 ? (box.t + box.b) / 2 : Math.min(Math.max(y, box.t + 540 / s), box.b - 540 / s);
      }
      return { x: -(x - 960) * s, y: -(y - 540) * s, scale: s };
    };
    function flash(t, peak = 0.9, dur = 0.35, color = "#fff") {
      tl.set(flashEl, { backgroundColor: color }, t);
      tl.fromTo(flashEl, { opacity: peak }, { opacity: 0, duration: dur, ease: "power2.out", ...NI }, t);
    }
    function press(el, t) {
      tl.to(el, { scale: 0.92, duration: 0.07, ease: "power2.in" }, t - 0.07);
      tl.to(el, { scale: 1, duration: 0.3, ease: "back.out(3)" }, t);
    }
    function burst(host, at, t, n = 12, spread = 60, colors = [css("--accent"), "#fff"]) {
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
    // Cursor path with click ripples. host = camera layer, so it zooms with the UI. steps: [{ to:{x,y}, t, dur, click? }], stage-space points (center()).
    function cursor(host, from, steps) {
      host.insertAdjacentHTML("beforeend", CUR);
      const cur = host.lastElementChild;
      let at = from;
      tl.set(cur, { x: from.x, y: from.y }, 0);
      for (const s of steps) {
        tl.fromTo(cur, { x: at.x, y: at.y }, { x: s.to.x, y: s.to.y, duration: s.dur, ease: "power2.inOut", ...NI }, s.t);
        if (s.click) {
          const tc = s.t + s.dur;
          host.insertAdjacentHTML("beforeend", `<i class="ripple" style="left:${s.to.x}px;top:${s.to.y}px"></i>`);
          tl.fromTo(host.lastElementChild, { scale: 0.3, opacity: 1 }, { scale: 1.7, opacity: 0, duration: 0.45, ease: "power2.out", ...NI }, tc);
          press(cur, tc);
        }
        at = s.to;
      }
      return cur;
    }
    // Caption pill (.cap in base.css), appended to the scene AFTER wrap() so it doesn't zoom. Opaque, enters by offset only: sharp on its first frame.
    // opts.pos: "bl" (default) | "br" | "tl" | "tr" | "bc"; or opts.x / opts.y = stage px of its top-left corner. Pick the corner that
    // leaves the content free. The default offset slides from the left edge (from the right for "br"/"tr").
    function caption(s, text, t, from, opts = {}) {
      if (from && ("pos" in from || ("x" in from && "pos" in opts) === false && ("left" in from))) { opts = from; from = undefined; }
      const { pos = "bl", x, y } = opts;
      const c = document.createElement("div");
      c.className = "cap";
      c.textContent = text;
      const st = c.style, m = 96;
      if (x != null || y != null) { st.left = `${x ?? m}px`; st.top = `${y ?? 900}px`; st.bottom = "auto"; }
      else {
        if (pos[0] === "t") { st.top = `${m}px`; st.bottom = "auto"; }
        if (pos[1] === "r") { st.right = `${m}px`; st.left = "auto"; }
        if (pos[1] === "c") { st.left = "0"; st.right = "0"; st.margin = "0 auto"; st.width = "fit-content"; }
      }
      s.appendChild(c);
      tl.fromTo(c, from || { x: pos[1] === "r" ? 70 : pos[1] === "c" ? 0 : -70, y: pos[1] === "c" ? 40 : 0 }, { x: 0, y: 0, duration: 0.4, ease: "expo.out", ...NI }, t);
      return c;
    }
    // Scroll a tall page inside the camera: tweens `main` (the element holding the page, usually the scene's camlayer or the app's
    // main column) up by `y` px between t and t+dur. Returns { y, at(p) }: at() maps a point measured BEFORE the scroll (center()/rect())
    // to where it sits after it, so focus(sc.at(center(el)), 1.8, { over: 300 }) aims at the right place.
    function scrollTo(main, y, t, dur = 0.8, ease = "power2.inOut") {
      tl.fromTo(main, { y: 0 }, { y: -y, duration: dur, ease, ...NI }, t);
      return { y, at: (p) => ({ x: p.x, y: p.y - y }) };
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
    // Fade the whole frame to a colour (default the film's --bg) from t0 over dur, fully covered at t0+dur: end the film with
    // land(DURATION - 0.4, 0.4) so the last frame is calm instead of a hard cut. Uses the flash layer (don't flash() during it).
    function land(t0, dur = 0.4, color = css("--bg")) {
      tl.set(flashEl, { backgroundColor: color }, t0);
      tl.fromTo(flashEl, { opacity: 0 }, { opacity: 1, duration: dur, ease: "power1.inOut", ...NI }, t0);
    }
    // Visible from t0 (to t1, optional): opacity 0 at build time, hard switch on the beat. Use for word-per-beat layers and tiles.
    function show(el, t0, t1) {
      tl.set(el, { opacity: 0 }, 0);
      tl.set(el, { opacity: 1 }, t0);
      if (t1 != null) tl.set(el, { opacity: 0 }, t1);
    }
    // Circle reveal of a stacked copy (theme change) from point p; starts at r0 > 0 so the first frame already shows a disc.
    // Measure p (center of the toggle) while both copies are displayed. At camera zoom > 1.2 the disc is a flat blob.
    function reveal(el, p, t0, dur = 0.8, r0 = 70, r1 = 2400) {
      const circ = (r) => `circle(${r}px at ${p.x}px ${p.y}px)`;
      tl.set(el, { display: "none" }, 0);
      tl.set(el, { display: "" }, t0);
      tl.fromTo(el, { clipPath: circ(r0) }, { clipPath: circ(r1), duration: dur, ease: "power2.inOut", ...NI }, t0);
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

    const ctx = { tl, $, $$, rnd, NI, scene, wrap, splitChars, type, put, scrollTo, count, center, rect, focus, flash, press, burst, rings, cursor, caption, typeOn, push, land, show, reveal, scrubChart, stage, cam, hash, css };
    cfg.build(ctx);
    tl.set({}, {}, DURATION);

    // ---------- audio-reactive layer (pure function of t) ----------
    const HITS = cfg.hits || [];
    const env = (k, t) => { const E = window.ENV; if (!E || !E[k]) return 0; const a = E[k]; return a[Math.min(a.length - 1, Math.max(0, Math.floor(t * E.fps)))]; };
    ctx.env = env;
    const sprites = $$(document, ".sprite");
    function react(t) {
      let sx = 0, sy = 0, sr = 0;
      const f = Math.floor(t * 60);
      for (const [h, a] of HITS) {
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
      const sub = env("sub", t);
      cam.style.transform = `translate(${sx}px, ${sy}px) rotate(${sr}deg) scale(${1 + sub * 0.014})`;
      if (bgGlow) bgGlow.style.filter = `brightness(${0.75 + sub * 0.7})`;
      const g = Math.floor(t * 24);
      grain.style.transform = `translate(${(hash(g) - 0.5) * 300}px, ${(hash(g + 9) - 0.5) * 300}px)`;
      cfg.react && cfg.react(t, ctx);
    }
    // a paused timeline doesn't render tl.set(..., 0) when asked for time 0, so the first frame would be blank: clamp to 0.0001
    function seek(t) { tl.time(Math.min(Math.max(t, 0.0001), DURATION - 0.0001), false); react(t); }

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

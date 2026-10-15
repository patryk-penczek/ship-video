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

    // A scene is a full-frame layer that is visible from start to end.
    function scene(html, start, end) {
      const el = document.createElement("div");
      el.className = "scene";
      el.innerHTML = html;
      scenesEl.appendChild(el);
      tl.set(el, { visibility: "visible" }, start);
      if (end != null) tl.set(el, { visibility: "hidden" }, end);
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
    // Typing via a proxy tween: seek-safe in both directions.
    function type(el, full, t0, t1, onUpd) {
      const p = { n: 0 };
      tl.fromTo(p, { n: 0 }, { n: full.length, duration: t1 - t0, ease: "none", onUpdate: () => { const k = Math.round(p.n); el.textContent = full.slice(0, k); onUpd && onUpd(k); } }, t0);
    }
    function count(el, from, to, t0, dur, fmt = (v) => Math.round(v).toLocaleString("en-US")) {
      const p = { v: from };
      tl.fromTo(p, { v: from }, { v: to, duration: dur, ease: "power2.out", onUpdate: () => { el.textContent = fmt(p.v); } }, t0);
    }
    // Stage-space centre of an element. Measure BEFORE adding tweens that move it.
    function center(el) {
      const s = stage.getBoundingClientRect();
      const k = s.width / 1920;
      const r = el.getBoundingClientRect();
      return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k };
    }
    // Camera transform that puts stage point p at screen centre at zoom s. App UI is small: 1.4–2.3× on what matters.
    const focus = (p, s) => ({ x: -(p.x - 960) * s, y: -(p.y - 540) * s, scale: s });
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

    const ctx = { tl, $, $$, rnd, NI, scene, wrap, splitChars, type, count, center, focus, flash, press, burst, rings, stage, cam, hash, css };
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

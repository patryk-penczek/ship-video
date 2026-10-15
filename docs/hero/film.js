/* README hero: what the ship-video skill does, in 24 s on a 120 BPM grid (beat 0.5 s, bar 2 s).
   01 ASK 0–5 · 02 MUSIC 5–8 · 03 PLAN 8–11 · 04 REVIEW 11–14 · 05 RENDER 14–16.5 · 06 FILM 16.5–22 · END 22–24
   Acts 01–05 happen in one Claude Code window (claude.js / claude.css); act 06 plays the result (Breeze, captured from demo-app). */
Film({
  duration: 24,
  bpm: 120,
  track: null,
  hits: [[5, 3], [8, 3], [11, 3], [14, 3], [16.5, 8], [22, 6]],
  fonts: ["800 40px 'Inter Variable'", "500 20px 'Inter Variable'", "500 20px 'JetBrains Mono Variable'", "700 20px 'Plus Jakarta Sans Variable'"],
  images: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `img/still-${i}.jpg`),

  build(ctx) {
    const { tl, $, $$, NI, scene, wrap, center, focus, flash, press, burst } = ctx;
    const B = (state, cls = "") => `<div class="breeze ${cls}">${BREEZE[state]}</div>`;

    // ---------------- 01–05 · Claude Code window ----------------
    if (window.CLAUDE) CLAUDE.build(ctx);

    // ---------------- 06 · FILM 16.5–22: the result in the ship-video preview ----------------
    // The preview window holds a 1920×1080 stage at 0.74 scale; Breeze scenes play inside it on the beat.
    const s6 = scene(`<div class="pv" data-clip-ok>
        <div class="pv-bar"><i></i><i></i><i></i><span>film/index.html · preview</span></div>
        <div class="pv-stage" data-clip-ok><div class="pv-scale"><div class="pv-inner">
          <div class="pv-shot pv-a">${B("lisbon")}</div>
          <div class="pv-shot pv-b">${B("dialogBar")}</div>
          <div class="pv-shot pv-c">${B("barcelona")}</div>
          <div class="pv-shot pv-d">${B("barcelonaLight", "light")}</div>
        </div></div></div>
        <div class="pv-hud"><b>❚❚</b><span class="pv-track"><i class="pv-fill"></i><i class="pv-knob"></i></span><span class="pv-time">0.00</span></div>
      </div>`, 16.5, 22);
    const c6 = wrap(s6);
    const inner = $(s6, ".pv-inner");
    const shot = (k) => $(s6, `.pv-${k}`);
    // measure inside the 1920×1080 inner stage before any transform
    const IN = (el) => { const r = el.getBoundingClientRect(), p = inner.getBoundingClientRect(), k = p.width / 1920; return { x: (r.left - p.left + r.width / 2) / k, y: (r.top - p.top + r.height / 2) / k }; };
    const P6 = {
      temp: IN($(shot("a"), ".current-temp")),
      alert: (() => { const c = IN($(shot("a"), ".alert")); return { x: c.x - 380, y: c.y + 60 }; })(),
      dialog: IN($(shot("b"), ".dialog")),
      newCity: IN($$(shot("c"), ".city-row").at(-1)),
      theme: IN($(shot("d"), ".icon-btn")),
    };
    const zoom = (p, s) => ({ x: -(p.x - 960) * s, y: -(p.y - 540) * s, scale: s });
    ["b", "c", "d"].forEach((k) => tl.set(shot(k), { opacity: 0 }, 0));
    // the window lands on the hit
    tl.fromTo($(s6, ".pv"), { y: 120, scale: 0.9, rotationX: 12, opacity: 0.4 }, { y: 0, scale: 1, rotationX: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, 16.5);
    flash(16.5, 0.3, 0.35);
    // a: 21° Lisbon, push out, then the alert
    tl.fromTo(inner, zoom(P6.temp, 2.2), { ...zoom(P6.temp, 1.35), duration: 1.0, ease: "power3.out" }, 16.5);
    tl.fromTo($(shot("a"), ".alert"), { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ...NI }, 17.5);
    tl.to(inner, { ...zoom(P6.alert, 1.3), duration: 0.45, ease: "power3.inOut" }, 17.45);
    // b: ⌘K dialog with "Bar" typed, Enter on the beat
    tl.set(shot("a"), { opacity: 0 }, 18.5);
    tl.set(shot("b"), { opacity: 1 }, 18.5);
    tl.set(inner, zoom(P6.dialog, 1.55), 18.5);
    tl.to(inner, { ...zoom(P6.dialog, 1.65), duration: 1, ease: "none" }, 18.5);
    const q = $(shot("b"), ".dialog-search input");
    const qp = { n: 0 };
    tl.fromTo(qp, { n: 0 }, { n: 3, duration: 0.35, ease: "none", onUpdate: () => { q.value = "Bar".slice(0, Math.round(qp.n)); } }, 18.55);
    tl.fromTo($(shot("b"), ".dialog"), { scale: 0.96, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.25, ...NI }, 18.5);
    press($(shot("b"), ".result.is-active"), 19.0);
    // c: Barcelona lands in the sidebar
    tl.set(shot("b"), { opacity: 0 }, 19.25);
    tl.set(shot("c"), { opacity: 1 }, 19.25);
    tl.fromTo(inner, zoom(P6.newCity, 1.9), { ...zoom(P6.newCity, 1.6), duration: 0.6, ease: "power2.out" }, 19.25);
    tl.fromTo($$(shot("c"), ".city-row").at(-1), { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ...NI }, 19.25);
    // d: theme flip from the theme button, camera eases out
    tl.to(inner, { x: 0, y: 0, scale: 1, duration: 0.9, ease: "power2.inOut" }, 20.0);
    tl.set(shot("d"), { opacity: 1 }, 20.0);
    const circ = (r) => `circle(${r}px at ${P6.theme.x}px ${P6.theme.y}px)`;
    tl.fromTo(shot("d"), { clipPath: circ(0) }, { clipPath: circ(2300), duration: 0.8, ease: "power2.inOut" }, 20.5);
    press($(shot("c"), ".icon-btn"), 20.5);
    // HUD scrubber runs through the clip
    tl.fromTo($(s6, ".pv-fill"), { scaleX: 0 }, { scaleX: 1, duration: 5.5, ease: "none" }, 16.5);
    tl.fromTo($(s6, ".pv-knob"), { left: "0%" }, { left: "100%", duration: 5.5, ease: "none" }, 16.5);
    ctx.count($(s6, ".pv-time"), 0, 20, 16.5, 5.5, (v) => v.toFixed(2));
    tl.fromTo(c6, { scale: 1.04 }, { scale: 1, duration: 5.5, ease: "none" }, 16.5);

    // ---------------- END 22–24 ----------------
    const s7 = scene(`<div class="center"><div style="display:flex;flex-direction:column;align-items:center;gap:34px">
        <div class="wordmark"><span class="e1">ship</span><span class="e2 gtext">-video</span></div>
        <div class="tagline e3">Launch films for your app, cut to the beat.</div>
        <div class="install e4"><b>/plugin install</b> ship-video@ship-video</div>
      </div></div>`, 22, null);
    tl.fromTo([$(s7, ".e1"), $(s7, ".e2")], { y: 60, scale: 1.08, opacity: 0.45, filter: "blur(10px)" }, { y: 0, scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.5, stagger: 0.1 }, 22);
    flash(22, 0.25, 0.3);
    tl.fromTo($(s7, ".e3"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 22.4);
    tl.fromTo($(s7, ".e4"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 22.7);
    tl.to(".bg-glow", { opacity: 1, duration: 0.6 }, 22);
    // fade to the opening frame so the GIF loops cleanly
    tl.to([$(s7, ".center"), ".bg-glow"], { opacity: 0, duration: 0.5, ease: "power2.in" }, 23.45);
  },
});

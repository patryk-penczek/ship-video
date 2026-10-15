/* The film: config + scenes on one paused timeline, all at absolute seconds.
   This sample is 12 s at 120 BPM (beat 0.5 s, bar 2 s) so it works without music.
   Replace the scenes with the approved scenario; keep the shape. */
Film({
  duration: 12,
  bpm: 120,
  track: null, // e.g. "track.mp3" next to index.html; null = silent clock + metronome in preview
  hits: [[2, 6], [4, 4], [6, 3], [8, 14], [10, 6]], // [t, shake px]
  fonts: ["800 40px 'Inter Variable'", "500 20px 'Inter Variable'", "500 20px 'JetBrains Mono Variable'"],
  images: [],

  build({ tl, $, $$, NI, scene, wrap, splitChars, type, count, center, focus, flash, press, burst, rings }) {
    // ------------------------------------------------------------------
    // 0–2 · intro: a line types itself, the caret stretches into the hit
    // ------------------------------------------------------------------
    const s0 = scene(`<div class="center"><div class="s0w" style="display:flex;flex-direction:column;align-items:center;gap:34px">
        <div class="eyebrow s0e">A film made in a browser</div>
        <div class="display" style="font-size:132px;white-space:nowrap"><span class="s0t"></span><span class="caret s0c" style="width:8px;margin-left:10px"></span></div>
      </div></div>`, 0, 2);
    const s0full = "Your app needs a trailer.";
    type($(s0, ".s0t"), s0full, 0.3, 1.4, (k) => {
      const done = s0full.slice(0, k), i = done.indexOf("trailer");
      $(s0, ".s0t").innerHTML = i < 0 ? done : `${done.slice(0, i)}<span class="gtext">${done.slice(i)}</span>`;
    });
    tl.fromTo($(s0, ".s0w"), { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" }, 0);
    tl.fromTo($(s0, ".s0e"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6 }, 0.15);
    tl.to($(s0, ".s0w"), { scale: 1.1, filter: "blur(3px)", duration: 0.4, ease: "power3.in" }, 1.6);
    tl.to($(s0, ".s0c"), { scaleY: 3.2, scaleX: 2, duration: 0.4, ease: "power3.in" }, 1.6);

    // ------------------------------------------------------------------
    // 2–4 · a word per beat on an accent flood
    // ------------------------------------------------------------------
    const s1 = scene(`<div class="s1f" style="position:absolute;inset:0;background:var(--accent)"></div>
      <div class="center s1a"><div class="display" style="font-size:320px;color:#111">Plan it.</div></div>
      <div class="center s1b" style="opacity:0"><div class="display" style="font-size:300px">Cut it</div></div>
      <div class="center s1c" style="opacity:0"><div class="display" style="font-size:220px;white-space:nowrap"><span class="word">on the</span> <span class="word gtext">beat.</span></div></div>`, 2, 4);
    tl.fromTo($(s1, ".s1a"), { scale: 1.35 }, { scale: 1, duration: 0.5 }, 2);
    tl.set([$(s1, ".s1f"), $(s1, ".s1a")], { opacity: 0 }, 2.5);
    tl.fromTo($(s1, ".s1b"), { opacity: 0 }, { opacity: 1, duration: 0.01, ...NI }, 2.5);
    tl.fromTo($(s1, ".s1b"), { y: 90, filter: "blur(14px)" }, { y: 0, filter: "blur(0px)", duration: 0.35, ...NI }, 2.5);
    tl.set($(s1, ".s1b"), { opacity: 0 }, 3);
    tl.fromTo($(s1, ".s1c"), { opacity: 0 }, { opacity: 1, duration: 0.01, ...NI }, 3);
    const w = $$(s1, ".s1c .word");
    tl.fromTo(w[0], { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ...NI }, 3);
    tl.fromTo(w[1], { y: 120, opacity: 0, scale: 1.2 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ...NI }, 3.5);
    // glitch out on the last 16ths
    splitChars(w[1]).forEach((c, i) => tl.to(c, { y: 140, rotation: (i % 2 ? 1 : -1) * 18, opacity: 0, duration: 0.25, ease: "power2.in" }, 3.75 + i * 0.03));

    // ------------------------------------------------------------------
    // 4–8 · the app: camera follows the action, moves land on beats
    // ------------------------------------------------------------------
    const s2 = scene(UI.app(), 4, 8);
    const c2 = wrap(s2);
    // measure first, then tween
    const rows = $$(s2, ".row");
    const P = { input: center($(s2, ".app-in")), add: center($(s2, ".app-btn")), app: center($(s2, ".app")), boxes: rows.map((r) => center($(r, ".box"))) };
    const newRow = rows[0];
    const fx = document.createElement("div");
    fx.style.cssText = "position:absolute;inset:0;pointer-events:none";
    c2.appendChild(fx);

    tl.fromTo($(s2, ".app"), { y: 60, opacity: 0.35, filter: "blur(10px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.35 }, 4);
    tl.fromTo(c2, focus({ x: P.input.x + 120, y: P.input.y }, 1.6), { ...focus({ x: P.input.x + 160, y: P.input.y }, 1.8), duration: 1.4, ease: "power1.inOut" }, 4);
    tl.set($(s2, ".app-in"), { className: "app-in" }, 0);
    tl.set($(s2, ".app-in"), { className: "app-in on" }, 4.25);
    type($(s2, ".q"), "Render the launch film", 4.3, 5.2);
    tl.set($(s2, ".q"), { textContent: "Add a task…" }, 0);
    tl.to(c2, { ...focus(P.add, 2.0), duration: 0.35, ease: "power3.inOut" }, 5.15);
    press($(s2, ".app-btn"), 5.5);
    tl.set($(s2, ".q"), { textContent: "Add a task…" }, 5.5);
    tl.set($(s2, ".app-in"), { className: "app-in" }, 5.5);
    // the new row: hidden until Add, then pops in
    tl.set(newRow, { display: "none" }, 0);
    tl.set(newRow, { display: "" }, 5.5);
    tl.set($(newRow, ".txt"), { textContent: "Render the launch film" }, 5.5);
    tl.fromTo(newRow, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)", ...NI }, 5.5);
    // 6.0 bar: pull back to see the list, then tick a box on every beat
    tl.to(c2, { ...focus({ x: P.app.x, y: P.app.y + 20 }, 1.15), duration: 0.6, ease: "power3.out" }, 6.0);
    [1, 2, 0].forEach((ri, i) => {
      const r = rows[ri];
      const t = 6.5 + i * 0.5;
      tl.set(r, { className: "row" }, 0);
      tl.set(r, { className: "row done" }, t);
      tl.fromTo($(r, "svg"), { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(3)", ...NI }, t);
      press($(r, ".box"), t);
      burst(fx, P.boxes[ri], t, 10, 50);
      tl.set($(s2, ".done-n"), { textContent: String(i + 1) }, t);
    });
    tl.set($(s2, ".done-n"), { textContent: "0" }, 0);

    // ------------------------------------------------------------------
    // 8.0 · the big hit: flash, rings, a number counts up
    // ------------------------------------------------------------------
    const s3 = scene(`<div class="center"><div style="display:flex;flex-direction:column;align-items:center;gap:20px">
        <div class="display" style="font-size:300px"><span class="num">0</span><span class="gtext" style="font-size:.5em;padding-left:.1em">fps</span></div>
        <div class="eyebrow s3e">every frame rendered on purpose</div></div></div>
      <div class="cap"><i></i><span><div class="n">01 · RENDER</div><div class="t">Frame-exact.</div></span></div>`, 8, 10);
    flash(8, 1, 0.5);
    rings(s3, 8);
    tl.to(".bg-grid, .bg-glow", { opacity: 1, duration: 0.6, ease: "power2.out" }, 8);
    count($(s3, ".num"), 0, 60, 8, 1.2);
    tl.fromTo($(s3, ".s3e"), { opacity: 0, letterSpacing: "0.6em" }, { opacity: 1, letterSpacing: "0.3em", duration: 0.6 }, 8.3);
    tl.fromTo($(s3, ".cap"), { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 }, 9.0);

    // ------------------------------------------------------------------
    // 10–12 · end card, fade out
    // ------------------------------------------------------------------
    const s4 = scene(`<div class="center"><div style="display:flex;flex-direction:column;align-items:center;gap:36px">
        <div class="display s4t" style="font-size:180px;white-space:nowrap">Your film here.</div>
        <div class="eyebrow s4e">ship-video · claude code</div></div></div>`, 10, null);
    flash(10, 0.8, 0.5, getComputedStyle(document.documentElement).getPropertyValue("--accent"));
    tl.fromTo(splitChars($(s4, ".s4t")), { y: 80, opacity: 0, filter: "blur(10px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.6, stagger: 0.02 }, 10);
    tl.fromTo($(s4, ".s4e"), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 10.5);
    tl.to([$(s4, ".center"), ".bg-grid", ".bg-glow"], { opacity: 0, duration: 0.7, ease: "power2.in" }, 11.2);
  },
});

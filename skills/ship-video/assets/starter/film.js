/* The film: config + scenes on one paused timeline, all at absolute seconds.
   12 s at 120 BPM (beat 0.5 s, bar 2 s), so it works without music. Replace the scenes with the approved scenario; keep the shapes:
   crisp cut frames (offset/scale from full opacity), a cursor and a camera that lands on content, something moving every beat. */
Film({
  duration: 12,
  bpm: 120,
  track: null, // e.g. "track.mp3" next to index.html; null = silent clock + metronome in preview
  hits: [[2, 6], [4, 4], [8, 14], [10, 6]], // [t, shake px]; a silent film uses []
  fonts: ["800 40px 'Inter Variable'", "500 20px 'Inter Variable'", "500 20px 'JetBrains Mono Variable'"],
  images: [],

  build({ tl, $, $$, NI, scene, wrap, splitChars, type, count, center, rect, focus, flash, press, burst, rings, cursor, caption, push, land, show, css }) {
    // 0–2 · hook: the word is sharp on frame 1, the app rises over it, a slow push never stops
    const s0 = scene(`<div style="position:absolute;left:0;right:0;top:40px;text-align:center;font:800 400px/.85 var(--f-font-display);letter-spacing:-.05em;color:var(--f-accent)" class="kw">Ship it.</div>${UI.app()}`, 0, 2);
    const c0 = wrap(s0);
    tl.fromTo(splitChars($(s0, ".kw")), { y: 50, scale: 1.2 }, { y: 0, scale: 1, duration: 0.7, stagger: 0.05, ease: "back.out(1.6)" }, 0);
    tl.fromTo($(s0, ".demo-app"), { y: 760 }, { y: 250, duration: 1.2, ease: "expo.out" }, 0); // plain fromTo: parked below from frame 1
    push(c0, 0, 2, 1, 1.07);

    // 2–4 · a word per beat on an accent flood: hard swap on the beat, entrances alternate up/down
    const words = ["Plan", "it.", "Cut", "it."];
    const s1 = scene(`<div style="position:absolute;inset:0;background:var(--f-accent)"></div>${words.map((w) => `<div class="center"><div class="display" style="font-size:380px;color:#111">${w}</div></div>`).join("")}`, 2, 4);
    $$(s1, ".center").forEach((el, i) => {
      const t = 2 + i * 0.5;
      show(el, t, i < 3 ? t + 0.5 : null);
      tl.fromTo($(el, ".display"), { scale: 1.35, y: i % 2 ? 50 : -50 }, { scale: 1, y: 0, duration: 0.4, ease: "expo.out" }, t);
    });

    // 4–8 · the app: cursor clicks, text types, the camera follows and lands on what matters (two camera tweens, never overlapping)
    const s2 = scene(UI.app(), 4, 8);
    const c2 = wrap(s2), app = $(s2, ".demo-app"), box = rect(app);
    const rows = $$(s2, ".demo-row");
    const P = { input: center($(s2, ".demo-app-in")), add: center($(s2, ".demo-app-btn")), app: center(app), boxes: rows.map((r) => center($(r, ".demo-box"))) }; // measure before tweening
    const fx = document.createElement("div");
    fx.style.cssText = "position:absolute;inset:0;pointer-events:none";
    c2.appendChild(fx);
    const q = $(s2, ".q"), inp = $(s2, ".demo-app-in");
    tl.fromTo(app, { scale: 1.1, y: 30 }, { scale: 1, y: 0, duration: 0.45 }, 4);
    tl.fromTo(c2, focus({ x: P.input.x + 120, y: P.input.y }, 1.6, { box }), { ...focus({ x: P.input.x + 160, y: P.input.y }, 1.8, { box }), duration: 1.0, ease: "power1.inOut", ...NI }, 4);
    cursor(c2, { x: P.input.x + 420, y: P.input.y + 140 }, [
      { to: { x: P.input.x - 60, y: P.input.y }, t: 4, dur: 0.55, click: true },
      { to: P.add, t: 5, dur: 0.5, click: true },
    ]);
    tl.set(inp, { className: "demo-app-in" }, 0);
    tl.set(inp, { className: "demo-app-in on" }, 4.55);
    type(q, "Book flights to Lisbon", 4.6, 5.2, (k) => { if (!k) q.textContent = "Add a task…"; });
    tl.to(c2, { ...focus(P.add, 2.0, { box, over: 260 }), duration: 0.35, ease: "power3.inOut" }, 5.15);
    press($(s2, ".demo-app-btn"), 5.5);
    tl.set(inp, { className: "demo-app-in" }, 5.5);
    tl.set(q, { textContent: "Add a task…" }, 5.5);
    tl.set($(rows[0], ".demo-txt"), { textContent: "Book flights to Lisbon" }, 5.5);
    tl.fromTo(rows[0], { y: -24, scale: 0.9, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }, 5.5); // plain fromTo: absent until Add
    tl.to(c2, { ...focus({ x: P.app.x, y: P.app.y + 20 }, 1.15, { box }), duration: 0.6, ease: "power3.out" }, 6); // pull back to see the list
    [1, 2, 0].forEach((ri, i) => {                                                                                  // tick a box on every beat
      const r = rows[ri], t = 6.5 + i * 0.5;
      tl.set(r, { className: "demo-row" }, 0);
      tl.set(r, { className: "demo-row done" }, t);
      tl.fromTo($(r, "svg"), { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, t);
      press($(r, ".demo-box"), t);
      burst(fx, P.boxes[ri], t, 10, 50);
      tl.set($(s2, ".demo-done-n"), { textContent: String(i + 1) }, t);
    });
    tl.set($(s2, ".demo-done-n"), { textContent: "0" }, 0);

    // 8–10 · payoff on the big hit: flash on a type-only frame, rings, a counter that starts at a real number, a caption in the margin
    const s3 = scene(`<div class="center"><div style="display:flex;flex-direction:column;align-items:center;gap:20px">
        <div class="display n3" style="font-size:300px"><span class="num">24</span><span class="gtext" style="font-size:.5em;padding-left:.1em">fps</span></div>
        <div class="eyebrow s3e">every frame rendered on purpose</div></div></div>`, 8, 10);
    const c3 = wrap(s3);
    flash(8, 0.5, 0.35);
    rings(s3, 8);
    tl.to(".bg-grid, .bg-glow", { opacity: 1, duration: 0.6, ease: "power2.out" }, 8);
    tl.fromTo($(s3, ".n3"), { scale: 1.3 }, { scale: 1, duration: 0.5 }, 8);
    count($(s3, ".num"), 24, 60, 8, 1.2);
    tl.fromTo($(s3, ".s3e"), { y: 30 }, { y: 0, duration: 0.5 }, 8.3);
    caption(s3, "Frame-exact.", 8);
    push(c3, 8, 10, 1, 1.05);

    // 10–12 · end card: letters rise from an offset (sharp, opaque), the line is complete 1.2 s before the end, the push eases to rest, a short fade lands the film
    const s4 = scene(`<div class="center"><div style="display:flex;flex-direction:column;align-items:center;gap:36px">
        <div class="display s4t" style="font-size:180px;white-space:nowrap">Your film here.</div>
        <div class="eyebrow"><span class="s4e"></span><span class="caret"></span></div></div></div>`, 10, null);
    const c4 = wrap(s4);
    flash(10, 0.3, 0.35, css("--f-accent"));
    tl.fromTo(splitChars($(s4, ".s4t")), { y: 60, scale: 1.1 }, { y: 0, scale: 1, duration: 0.6, stagger: 0.02 }, 10);
    type($(s4, ".s4e"), "ship-video · claude code", 10.2, 10.8);
    push(c4, 10, 11.6, 1, 1.06); // out-ease: at rest before the fade
    land(11.6, 0.4);
  },
});

/* README hero: what ship-video does, in 24 s on a 120 BPM grid (beat 0.5 s, bar 2 s). No music: it becomes a GIF.
   0 PROMPT 0–2 · 01 ASK 2–4 · 02 HEAR 4–8 · 03 PLAN 8–10 · 04 BUILD 10–12 · 05 REVIEW 12–14 · 06 RENDER 14–16 · FILM 16–22 · END 22–24
   Breeze screens are demo-app's real HTML (breeze.js), captured with Playwright; breeze.css is its CSS scoped to .breeze. */
Film({
  duration: 24,
  bpm: 120,
  track: null,
  hits: [[2, 8], [4, 6], [8, 6], [9.5, 16], [10, 5], [12, 5], [14, 5], [16, 18], [22, 8]],
  fonts: ["800 40px 'Inter Variable'", "600 40px 'Inter Variable'", "600 20px 'JetBrains Mono Variable'", "700 20px 'Plus Jakarta Sans Variable'"],
  images: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `img/still-${i}.jpg`),

  build({ tl, $, $$, NI, scene, wrap, center, rect, focus, type, count, press, burst, flash, rings, hash }) {
    const B = (state, cls = "") => `<div class="breeze ${cls}">${BREEZE[state]}</div>`;
    const fx = (host) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;inset:0;pointer-events:none"; host.appendChild(d); return d; };

    // ================= 0 · PROMPT 0–2: type the command, hit Enter, the input bursts into the film =================
    const s0 = scene(`<div class="center"><div class="inbar"><span class="s0t"></span><span class="caret s0c"></span><span class="ph">Ask anything</span><i class="send">↑</i></div></div>`, 0, 2);
    const bar = $(s0, ".inbar");
    tl.set($(s0, ".ph"), { display: "" }, 0);
    tl.set($(s0, ".ph"), { display: "none" }, 0.25);
    type($(s0, ".s0t"), "/ship-video", 0.25, 0.85);
    tl.fromTo(bar, { scale: 0.96, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }, 0);
    tl.set($(s0, ".send"), { className: "send" }, 0);
    tl.set($(s0, ".send"), { className: "send on" }, 0.85);
    press($(s0, ".send"), 1.5);
    tl.set($(s0, ".s0c"), { opacity: 0 }, 1.5);
    // Enter: the bar fills with the accent and grows until it is the frame; the ASK act opens on that same colour
    tl.to(bar, { backgroundColor: "#ff6a3d", borderColor: "#ff6a3d", color: "#0b0b0c", duration: 0.2, ease: "power2.out" }, 1.55);
    tl.to([$(s0, ".s0t"), $(s0, ".send")], { opacity: 0, duration: 0.1 }, 1.62); // don't stretch the text with the bar
    tl.to(bar, { scaleX: 1.6, scaleY: 10, borderRadius: 4, duration: 0.45, ease: "power4.in" }, 1.55);

    // ================= 01 · ASK 2–4 =================
    const pill = (label, rec) => `<span class="pill"><b>✓</b>${label}${rec ? ` <span class="rec">REC</span>` : ""}</span>`;
    const s1 = scene(`<div class="flood"></div>
      <div class="center k1"><div><div class="q">How long?</div><div class="pills">${pill("Match the music", 1)}${pill("15–20 s")}${pill("20–30 s")}</div></div></div>
      <div class="center k2" style="opacity:0"><div><div class="q">Music?</div><div class="pills">${pill("Your file")}${pill("Suno", 1)}${pill("No music")}</div></div></div>`, 2, 4);
    const fx1 = fx(s1);
    tl.fromTo($(s1, ".flood"), { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power2.in" }, 2.15);
    tl.fromTo($(s1, ".k1 .q"), { y: 50, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.3 }, 2);
    tl.fromTo($$(s1, ".k1 .pill"), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.06 }, 2.25);
    const pick = (root, i, t) => {
      const p = $$(s1, `${root} .pill`)[i];
      tl.set(p, { className: "pill" }, 0);
      tl.set(p, { className: "pill on" }, t);
      press(p, t);
      burst(fx1, center(p), t, 14, 120);
      $$(s1, `${root} .pill`).forEach((o, j) => j !== i && tl.to(o, { opacity: 0.25, duration: 0.2 }, t + 0.05));
    };
    pick(".k1", 0, 2.75);
    tl.set($(s1, ".k1"), { opacity: 0 }, 3);
    tl.set($(s1, ".k2"), { opacity: 1 }, 3);
    tl.fromTo($(s1, ".k2 .q"), { y: 50, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.3 }, 3);
    tl.fromTo($$(s1, ".k2 .pill"), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.06 }, 3.1);
    pick(".k2", 1, 3.5);
    tl.to([$(s1, ".k2")], { scale: 1.08, filter: "blur(6px)", opacity: 0.4, duration: 0.25, ease: "power2.in" }, 3.75);

    // ================= 02 · HEAR 4–8 =================
    const N = 150, W = 1720, H = 520;
    const envAt = (t) => t < 2 ? 0.14 + 0.06 * t : t < 6 ? 0.42 : t < 12 ? 0.62 : t < 14 ? 0.12 : t < 19 ? 0.98 : 0.5 - (t - 19) * 0.35;
    const bars = Array.from({ length: N }, (_, i) => {
      const t = (i / N) * 20, a = Math.max(0.03, envAt(t)) * (0.5 + 0.5 * hash(i * 3.7)) * (H / 2 - 10), x = (i / N) * W;
      return `<rect x="${x.toFixed(1)}" y="${(H / 2 - a).toFixed(1)}" width="${(W / N - 4).toFixed(1)}" height="${(2 * a).toFixed(1)}" rx="3" fill="#c9c6bf"/>`;
    }).join("");
    const grid = Array.from({ length: 11 }, (_, i) => `<line x1="${(i / 10) * W}" x2="${(i / 10) * W}" y1="-20" y2="${H + 20}" stroke="#2a2b30" stroke-width="${i % 2 ? 2 : 3}"/>`).join("");
    const MARKS = [[2, "HIT"], [6, "GROOVE"], [12, "BREAK"], [14, "DROP"], [19, "FINAL"]];
    const s2 = scene(`<div class="wave"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}<g class="wb">${bars}</g></svg>
      ${MARKS.map(([t, l]) => `<i class="mark${t > 17 ? " end" : ""}" style="left:${(t / 20) * 100}%"><span>${l}</span></i>`).join("")}</div>`, 4, 8);
    const c2 = wrap(s2);
    tl.fromTo($$(s2, ".wb rect"), { scaleY: 0.35, transformOrigin: "50% 50%" }, { scaleY: 1, duration: 0.45, stagger: { each: 0.002, from: "center" } }, 4);
    $$(s2, ".mark").forEach((m, i) => tl.fromTo(m, { scaleY: 0, opacity: 0, transformOrigin: "50% 100%" }, { scaleY: 1, opacity: 1, duration: 0.3, ease: "back.out(2.5)" }, 4.5 + i * 0.5));
    tl.fromTo(c2, { scale: 1.3, x: 500, y: 50 }, { scale: 1.3, x: -500, y: 50, duration: 2.9, ease: "power1.inOut" }, 4.0);
    tl.to(c2, { scale: 1, x: 0, y: 0, duration: 0.6, ease: "power3.inOut" }, 6.9);

    // ================= 03 · PLAN 8–10 =================
    const ROWS = [["0.00", "A huge 21° fades up"], ["2.00", "The storm alert slides in"], ["6.00", "⌘K, “Bar”, Barcelona lands"], ["14.00", "Dark → light, on the drop"]];
    const s3 = scene(`<div class="rows">${ROWS.map(([t, d]) => `<div class="trow"><em>${t}</em><span>${d}</span></div>`).join("")}</div>
      <div class="stamp">APPROVED</div>`, 8, 10);
    $$(s3, ".trow").forEach((r, i) => tl.fromTo(r, { x: 260, opacity: i ? 0 : 0.4 }, { x: 0, opacity: 1, duration: 0.3 }, 8 + i * 0.25));
    tl.fromTo($(s3, ".stamp"), { xPercent: -50, yPercent: -50, rotation: -20, scale: 2.4, opacity: 0 }, { rotation: -9, scale: 1, opacity: 1, duration: 0.22, ease: "power4.in" }, 9.28);
    tl.to($$(s3, ".trow"), { opacity: 0.35, duration: 0.2 }, 9.5);

    // ================= 04 · BUILD 10–12: the real app assembles from its parts =================
    const s4 = scene(`<div class="stagewrap"><div class="s4cam" style="position:absolute;inset:0">${B("lisbon")}</div></div>`, 10, 12);
    const parts = [".sidebar", ".toolbar", ".alert", ".current", ".hourly", ".daily"].map((q) => $(s4, q));
    parts.forEach((p, i) => tl.fromTo(p, { z: -1400, rotationX: 22, opacity: 0.3, transformPerspective: 2000 }, { z: 0, rotationX: 0, opacity: 1, duration: 0.45, ease: "expo.out" }, 10 + i * 0.2));
    tl.fromTo($(s4, ".s4cam"), { scale: 0.78 }, { scale: 0.9, duration: 2, ease: "power1.out" }, 10);
    tl.set($(s4, ".breeze .app"), { borderRadius: 24, overflow: "hidden" }, 0);

    // ================= 05 · REVIEW 12–14 =================
    const s5 = scene(`<div class="wallwrap"><div class="wall">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => `<div class="tile" style="background-image:url(img/still-${n}.jpg)"><span>${(i * 2.5).toFixed(1)}</span><i class="okring"></i></div>`).join("")}</div></div>`, 12, 14);
    const tiles = $$(s5, ".tile");
    tiles.forEach((t, i) => { const c = (i % 3) - 1, r = Math.floor(i / 3) - 1; tl.fromTo(t, { z: -900, opacity: 0.35 }, { z: 0, opacity: 1, duration: 0.5 }, 12 + Math.hypot(c, r) * 0.08); });
    tl.fromTo($(s5, ".wall"), { rotationX: 34, rotationZ: -14, scale: 1.1, y: 80 }, { rotationX: 24, rotationZ: -8, scale: 0.92, y: 20, duration: 2, ease: "power2.out" }, 12);
    tl.fromTo($(tiles[4], ".okring"), { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, 13);
    tl.to(tiles.filter((_, i) => i !== 4), { opacity: 0.35, duration: 0.3 }, 13);
    tl.to(tiles[4], { z: 220, duration: 0.5, ease: "power3.out" }, 13);

    // ================= 06 · RENDER 14–16 =================
    const s6 = scene(`<div class="center"><div class="counter"><span class="cn">0000</span><small>FRAMES · 1080p60</small></div></div>
      <div class="strip">${Array.from({ length: 14 }, (_, i) => `<i style="background-image:url(img/still-${(i % 9) + 1}.jpg)"></i>`).join("")}</div>
      <div class="hitrow" style="opacity:0"><div style="background-image:url(img/still-6.jpg)"><span>t − 0.02</span></div><div class="cut" style="background-image:url(img/still-7.jpg)"><span>t</span></div><div style="background-image:url(img/still-7.jpg)"><span>t + 0.02</span></div></div>
      <div class="verdict" style="opacity:0">✓ Every cut lands on its hit.</div>`, 14, 16);
    count($(s6, ".cn"), 0, 1440, 14, 1.0, (v) => String(Math.round(v)).padStart(4, "0"));
    tl.fromTo($(s6, ".strip"), { x: 0 }, { x: -3200, duration: 2, ease: "none" }, 14);
    tl.to($(s6, ".counter"), { y: -250, scale: 0.42, duration: 0.4, ease: "power3.inOut" }, 15.0);
    tl.to($(s6, ".strip"), { opacity: 0, duration: 0.3 }, 15.0);
    tl.set($(s6, ".hitrow"), { opacity: 1 }, 15.0);
    $$(s6, ".hitrow div").forEach((d, i) => tl.fromTo(d, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, 15.0 + i * 0.1));
    tl.fromTo($(s6, ".verdict"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ...NI }, 15.5);

    // ---- act captions (02–06 share one layer) ----
    const cap = scene(`<div class="cap"><i></i><span><div class="n"></div><div class="t"></div></span></div>`, 2, 16);
    [[2, "01 · ASK", "It asks. You click."], [4, "02 · HEAR", "It finds every hit."], [8, "03 · PLAN", "You approve the plan."],
     [10, "04 · BUILD", "It rebuilds your real UI."], [12, "05 · REVIEW", "You approve the stills."], [14, "06 · RENDER", "Frame-exact, on the beat."]].forEach(([t, n, txt]) => {
      tl.set($(cap, ".n"), { textContent: n }, t);
      tl.set($(cap, ".t"), { textContent: txt }, t);
      tl.fromTo($(cap, ".t"), { y: 24, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.3, ...NI }, t);
    });

    // ================= FILM 16–22: the result, on the drop =================
    const s7 = scene(`<div class="s7w" style="position:absolute;inset:0;perspective:2200px"><div class="s7cam" style="position:absolute;inset:0">
        <div class="shot a">${B("lisbon")}</div><div class="shot b">${B("dialogBar")}</div><div class="shot c">${B("barcelona")}</div><div class="shot d">${B("barcelonaLight", "light")}</div>
      </div></div>`, 16, 22);
    const cam7 = $(s7, ".s7cam");
    const shot = (k) => $(s7, `.shot.${k}`);
    const P = {
      temp: center($(shot("a"), ".current-temp")),
      // frame the alert from its icon: icon ~140 px from the left edge of the shot at 1.5×
      alert: (() => { const c = center($(shot("a"), ".alert-icon")); return { x: c.x + 960 / 1.5 - 140, y: c.y + 60 }; })(),
      dialog: center($(shot("b"), ".dialog")),
      city: center($$(shot("c"), ".city-row").at(-1)),
      theme: center($(shot("d"), ".icon-btn")),
    };
    ["b", "c", "d"].forEach((k) => tl.set(shot(k), { display: "none" }, 0));
    flash(16, 0.2, 0.25);
    rings(s7, 16);
    tl.fromTo(cam7, focus(P.temp, 2.4), { ...focus(P.temp, 1.4), duration: 0.9, ease: "expo.out" }, 16);
    tl.fromTo($(shot("a"), ".alert"), { y: -40, opacity: 0.35 }, { y: 0, opacity: 1, duration: 0.3 }, 17);
    tl.to(cam7, { ...focus(P.alert, 1.5), duration: 0.4, ease: "power3.inOut" }, 16.95);
    // ⌘K: "Bar" → Barcelona
    tl.set(shot("a"), { display: "none" }, 18);
    tl.set(shot("b"), { display: "" }, 18);
    tl.set(cam7, focus(P.dialog, 1.9), 18);
    tl.to(cam7, { ...focus(P.dialog, 2.05), duration: 1, ease: "none" }, 18);
    const q = $(shot("b"), ".dialog-search input"), qp = { n: 0 };
    tl.fromTo(qp, { n: 0 }, { n: 3, duration: 0.3, ease: "none", onUpdate: () => { q.value = "Bar".slice(0, Math.round(qp.n)); } }, 18.05);
    press($(shot("b"), ".result.is-active"), 18.75);
    tl.set(shot("b"), { display: "none" }, 19);
    tl.set(shot("c"), { display: "" }, 19);
    tl.fromTo(cam7, focus(P.city, 2.0), { ...focus(P.city, 1.5), duration: 0.6, ease: "power2.out" }, 19);
    tl.fromTo($$(shot("c"), ".city-row").at(-1), { x: -60, opacity: 0.35 }, { x: 0, opacity: 1, duration: 0.35 }, 19);
    // the drop's second half: dark → light from the theme button
    tl.to(cam7, { x: 0, y: 0, scale: 1, duration: 0.5, ease: "power2.inOut" }, 19.6);
    tl.set(shot("d"), { display: "" }, 20);
    const circ = (r) => `circle(${r}px at ${P.theme.x}px ${P.theme.y}px)`;
    tl.fromTo(shot("d"), { clipPath: circ(0) }, { clipPath: circ(2300), duration: 0.7, ease: "power2.inOut" }, 20);
    press($(shot("c"), ".icon-btn"), 20);
    // pull back: the app floats
    tl.to(cam7, { scale: 0.66, rotationX: 14, rotationY: -16, y: 20, duration: 1, ease: "power3.inOut" }, 21);
    tl.to(cam7, { borderRadius: 30, boxShadow: "0 80px 200px -40px rgba(0,0,0,.95)", overflow: "hidden", duration: 0.3 }, 21);

    // ================= END 22–24 =================
    const s8 = scene(`<div class="center"><div style="display:flex;flex-direction:column;align-items:center;gap:36px">
        <div class="wordmark"><span class="e1">ship</span><span class="e2 gtext">-video</span></div>
        <div class="tagline e3">Launch films for your app, cut to the beat.</div>
        <div class="install e4"><b>/plugin install</b> ship-video@ship-video</div></div></div>`, 22, null);
    tl.fromTo([$(s8, ".e1"), $(s8, ".e2")], { y: 60, scale: 1.08, opacity: 0.45, filter: "blur(8px)" }, { y: 0, scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.5, stagger: 0.1 }, 22);
    tl.fromTo($(s8, ".e3"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4 }, 22.35);
    tl.fromTo($(s8, ".e4"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4 }, 22.6);
    flash(22, 0.15, 0.25);
    tl.to($(s8, ".center"), { opacity: 0, duration: 0.45, ease: "power2.in" }, 23.5);
  },
});

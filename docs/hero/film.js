/* README hero: what ship-video does, in 16 s. No music: it becomes an animated WebP.
   One card every 1.5 s (three beats at 120 BPM), so the rhythm never speeds up or slows down:
   PROMPT · HOW LONG? · MUSIC? · HEAR · PLAN · BUILD · REVIEW · RENDER, then ITERATE gets one longer card
   (three changes typed into the same input as the opening, one per version) and the END card.
   Type and shapes only, one idea per card so nobody has to pause to read. */
const CARD = 1.5;
const at = (k) => k * CARD; // start of card k
const TWEAKS = ["show the dark mode too", "hold the end card longer", "make the intro snappier"], STEP = 1.25;
const ITER = 0.3 + TWEAKS.length * STEP + 0.3; // the iterate card is the one that explains, so it gets longer
const END = at(8) + ITER;

Film({
  duration: END + 2.5,
  bpm: 120,
  track: null,
  hits: [], // silent film: no shake, nothing pretends to hit a bass that isn't there
  fonts: ["900 40px 'Inter Variable'", "800 40px 'Inter Variable'", "600 40px 'Inter Variable'", "600 20px 'JetBrains Mono Variable'"],
  images: [],

  build({ tl, $, $$, NI, scene, wrap, center, type, count, press, burst, hash }) {
    const fx = (host) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;inset:0;pointer-events:none"; host.appendChild(d); return d; };
    // a word that slams in: big and blurred, then snaps; starts at 0.4 so the first frame shows it
    const slam = (el, t, from = 1.4) => tl.fromTo(el, { scale: from, opacity: 0.4, filter: "blur(14px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out" }, t);
    // every card leaves the same way, in the last 0.18 s
    const leave = (el, k, end = at(k + 1)) => tl.to(el, { scale: 1.2, filter: "blur(10px)", opacity: 0.3, duration: 0.18, ease: "power2.in" }, end - 0.18);
    // a card: its own background, a slow push the whole time
    const card = (k, html, bg, end = at(k + 1)) => {
      const s = scene(`<div class="bgflip" style="background:${bg}"></div>${html}`, at(k), end);
      const c = wrap(s);
      tl.fromTo(c, { scale: 1 }, { scale: 1.05, duration: end - at(k), ease: "none" }, at(k));
      return { s, c };
    };
    const DARK = "#0b0b0c", ACCENT = "#ff6a3d", LIGHT = "#f4f4f6";

    // ================= 0 PROMPT: type the command, Enter, the input bursts into the film =================
    const s0 = scene(`<div class="center"><div class="inbar"><span class="s0t"></span><span class="caret s0c"></span><span class="ph">Ask anything</span><i class="send">↑</i></div></div>`, 0, at(1));
    const bar = $(s0, ".inbar");
    tl.set($(s0, ".ph"), { display: "" }, 0);
    tl.set($(s0, ".ph"), { display: "none" }, 0.15);
    type($(s0, ".s0t"), "/ship-video", 0.15, 0.7);
    tl.fromTo(bar, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }, 0);
    tl.set($(s0, ".send"), { className: "send" }, 0);
    tl.set($(s0, ".send"), { className: "send on" }, 0.7);
    tl.to(bar, { scale: 1.05, duration: 0.3, ease: "power1.inOut" }, 0.72);
    press($(s0, ".send"), 1.0);
    tl.set($(s0, ".s0c"), { opacity: 0 }, 1.0);
    tl.to([$(s0, ".s0t"), $(s0, ".send")], { opacity: 0, duration: 0.1 }, 1.1);
    tl.to(bar, { backgroundColor: ACCENT, borderColor: ACCENT, duration: 0.2, ease: "power2.out" }, 1.05);
    tl.to(bar, { scaleX: 1.6, scaleY: 10, borderRadius: 4, duration: 0.45, ease: "power4.in" }, 1.05);

    // ================= 1–2 ASK: it asks, you click =================
    const pill = (label, rec) => `<span class="pill"><b>✓</b>${label}${rec ? ` <span class="rec">REC</span>` : ""}</span>`;
    const ask = (k, q, labels, rec, choice) => {
      const { s, c } = card(k, `<div class="flood"></div><div class="center k"><div><div class="q">${q}</div><div class="pills">${labels.map((l, i) => pill(l, i === rec)).join("")}</div></div></div>`, DARK);
      const t = at(k), pills = $$(s, ".pill"), p = pills[choice];
      if (k === 1) tl.fromTo($(s, ".flood"), { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power2.in" }, t + 0.05); // the prompt's colour fades out
      else tl.set($(s, ".flood"), { opacity: 0 }, 0);
      slam($(s, ".q"), t, 1.3);
      tl.fromTo(pills, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, stagger: 0.05, ease: "back.out(2)" }, t + 0.15);
      tl.set(p, { className: "pill" }, 0);
      tl.set(p, { className: "pill on" }, t + 0.75);   // ~0.6 s to read the options, ~0.6 s to see the pick
      press(p, t + 0.75);
      burst(fx(c), center(p), t + 0.75, 18, 150);
      pills.forEach((o, j) => j !== choice && tl.to(o, { opacity: 0.2, scale: 0.92, duration: 0.2 }, t + 0.8));
      leave($(s, ".k"), k);
    };
    ask(1, "How long?", ["Match the music", "15–20 s", "20–30 s"], 0, 0);
    ask(2, "Music?", ["Your file", "Suno", "No music"], 1, 1);

    // ================= 3 HEAR: it finds every hit =================
    const N = 120, W = 1720, H = 520;
    const envAt = (t) => t < 2 ? 0.14 + 0.06 * t : t < 6 ? 0.42 : t < 12 ? 0.62 : t < 14 ? 0.12 : t < 19 ? 0.98 : 0.5 - (t - 19) * 0.35;
    const bars = Array.from({ length: N }, (_, i) => {
      const t = (i / N) * 20, a = Math.max(0.03, envAt(t)) * (0.5 + 0.5 * hash(i * 3.7)) * (H / 2 - 10), x = (i / N) * W;
      return `<rect x="${x.toFixed(1)}" y="${(H / 2 - a).toFixed(1)}" width="${(W / N - 5).toFixed(1)}" height="${(2 * a).toFixed(1)}" rx="3" fill="#e9e7e1"/>`;
    }).join("");
    const MARKS = [[2, "HIT"], [6, "GROOVE"], [12, "BREAK"], [14, "DROP"], [19, "FINAL"]];
    const { s: s3 } = card(3, `<div class="hear">Hear.</div><div class="wave"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g class="wb">${bars}</g></svg>
      ${MARKS.map(([t, l]) => `<i class="mark${t > 17 ? " end" : ""}" style="left:${(t / 20) * 100}%"><span>${l}</span></i>`).join("")}</div>`, DARK);
    slam($(s3, ".hear"), at(3), 1.4);
    tl.fromTo($$(s3, ".wb rect"), { scaleY: 0.3, transformOrigin: "50% 50%" }, { scaleY: 1, duration: 0.35, stagger: { each: 0.002, from: "center" } }, at(3));
    $$(s3, ".mark").forEach((m, i) => tl.fromTo(m, { scaleY: 0, opacity: 0, transformOrigin: "50% 100%" }, { scaleY: 1, opacity: 1, duration: 0.2, ease: "back.out(3)" }, at(3) + 0.35 + i * 0.18));
    leave($(s3, ".wave"), 3);

    // ================= 4 PLAN: approved before anything is built =================
    const { s: s4 } = card(4, `<div class="center"><div class="word">Plan.</div></div><div class="stamp">APPROVED</div>`, DARK);
    slam($(s4, ".word"), at(4));
    tl.fromTo($(s4, ".stamp"), { xPercent: -50, yPercent: -50, rotation: -24, scale: 2.6, opacity: 0 }, { rotation: -9, scale: 1, opacity: 1, duration: 0.18, ease: "power4.in" }, at(4) + 0.45);
    tl.to($(s4, ".word"), { opacity: 0.45, duration: 0.15 }, at(4) + 0.6);
    leave($(s4, ".stamp"), 4);

    // ================= 5 BUILD: the word rises out of its baseline, four blocks land =================
    const { s: s5 } = card(5, `<div class="center"><div class="bwrap"><div class="word dark">Build.</div><div class="plinth"><i class="rule"></i><span class="bricks"><b></b><b></b><b></b><b></b></span></div></div></div>`, ACCENT);
    tl.fromTo($(s5, ".word"), { clipPath: "inset(55% 0 -10% 0)", y: 70, rotationX: 50, transformPerspective: 1400, transformOrigin: "50% 100%" },
      { clipPath: "inset(0% 0 -10% 0)", y: 0, rotationX: 0, duration: 0.55, ease: "expo.out" }, at(5));
    tl.fromTo($(s5, ".rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "expo.out" }, at(5) + 0.2);
    $$(s5, ".bricks b").forEach((b, i) => tl.fromTo(b, { x: -180, scaleX: 0.4, opacity: 0, transformOrigin: "0 50%" }, { x: 0, scaleX: 1, opacity: 1, duration: 0.24, ease: "back.out(1.7)" }, at(5) + 0.4 + i * 0.15));
    leave($(s5, ".bwrap"), 5);

    // ================= 6 REVIEW: the word, then a check =================
    const { s: s6, c: c6 } = card(6, `<div class="center"><div class="word">Review.<i class="tick">✓</i></div></div>`, DARK);
    slam($(s6, ".word"), at(6), 0.6);
    tl.fromTo($(s6, ".tick"), { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.3, ease: "back.out(3)" }, at(6) + 0.5);
    burst(fx(c6), center($(s6, ".tick")), at(6) + 0.5, 20, 220, ["#3ddc84", "#ffffff"]);
    leave($(s6, ".word"), 6);

    // ================= 7 RENDER: the frame counter races =================
    const { s: s7 } = card(7, `<div class="center"><div class="rwrap"><div class="word dark">Render.</div><div class="frames"><span class="cn">0000</span> frames</div></div></div>`, LIGHT);
    slam($(s7, ".word"), at(7), 1.4);
    count($(s7, ".cn"), 0, 1440, at(7) + 0.05, 1.1, (v) => String(Math.round(v)).padStart(4, "0"));
    leave($(s7, ".rwrap"), 7);

    // ================= 8 ITERATE: the first cut is a draft. The opening's input comes back; each change typed in is the next version =================
    const { s: s8 } = card(8, `<div class="center"><div class="iwrap">
        <div class="word dark">Iterate.<i class="tick loop">↻</i></div>
        <div class="inbar">${TWEAKS.map((_, i) => `<span class="t8 t8-${i}"></span>`).join("")}<span class="caret c8"></span><i class="send">↑</i></div>
        <div class="frames dark">${[0, 1, 2, 3].map((v) => `<span class="vn v-${v}">${v ? "round " + v : "first cut"}</span>`).join("")}</div></div></div>`, ACCENT, END);
    const t8 = at(8), send8 = $(s8, ".send"), loop = $(s8, ".loop");
    slam($(s8, ".word"), t8, 1.4);
    tl.fromTo($(s8, ".inbar"), { y: 120 }, { y: 0, duration: 0.45, ease: "expo.out" }, t8);
    $$(s8, ".vn").forEach((v, i) => tl.set(v, { display: i ? "none" : "" }, 0));
    $$(s8, ".t8").forEach((el, i) => tl.set(el, { display: i ? "none" : "" }, 0));
    tl.set(send8, { className: "send" }, 0);
    tl.set(loop, { rotation: 0 }, 0);
    TWEAKS.forEach((text, i) => {
      const p = t8 + 0.3 + i * STEP, line = $(s8, `.t8-${i}`);
      if (i) tl.set(line, { display: "" }, p);
      type(line, text, p, p + 0.6);
      tl.set(send8, { className: "send on" }, p + 0.6);
      press(send8, p + 0.85);                                                        // Enter: the loop turns, the next round
      tl.fromTo(loop, { rotation: i * 360 }, { rotation: (i + 1) * 360, duration: 0.6, ease: "expo.out", ...NI }, p + 0.85);
      tl.set($(s8, `.v-${i}`), { display: "none" }, p + 0.85);
      tl.set($(s8, `.v-${i + 1}`), { display: "" }, p + 0.85);
      tl.fromTo($(s8, `.v-${i + 1}`), { scale: 1.5 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, p + 0.85);
      if (i < TWEAKS.length - 1) { tl.set(line, { display: "none" }, p + 1.1); tl.set(send8, { className: "send" }, p + 1.1); }
    });
    tl.set($(s8, ".c8"), { opacity: 0 }, t8 + 0.3 + (TWEAKS.length - 1) * STEP + 0.85);
    leave($(s8, ".iwrap"), 8, END);

    // ================= END =================
    const T = END;
    const s9 = scene(`<div class="center"><div style="display:flex;flex-direction:column;align-items:center;gap:36px">
        <div class="wordmark"><span class="e0 sl">/</span><span class="e1">ship</span><span class="e2 gtext">-video</span></div>
        <div class="tagline e3">Launch films for your app, cut to the beat.</div>
        <div class="install e4"><b>/plugin install</b> ship-video@ship-video</div></div></div>`, T, null);
    tl.fromTo([$(s9, ".e0"), $(s9, ".e1"), $(s9, ".e2")], { y: 50, scale: 1.08, opacity: 0.45, filter: "blur(8px)" }, { y: 0, scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.4, stagger: 0.08 }, T);
    tl.fromTo($(s9, ".e3"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35 }, T + 0.3);
    tl.fromTo($(s9, ".e4"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35 }, T + 0.5);
    tl.to($(s9, ".center"), { opacity: 0, duration: 0.4, ease: "power2.in" }, T + 2.05);
  },
});

/* README hero: what ship-video does, in 18.5 s on a 120 BPM grid (beat 0.5 s, bar 2 s). No music: it becomes a GIF.
   PROMPT 0–2 · ASK 2–6 · HEAR 6–8 · PLAN 8–9 · BUILD 9–10 · REVIEW 10–11 · RENDER 11–12 · WATCH 12–13 · TWEAK 13–15 · AGAIN 15–16 · END 16–18.5
   Type and shapes only, one big idea per bar so nobody has to pause to read. */
Film({
  duration: 18.5,
  bpm: 120,
  track: null,
  hits: [], // silent film: no shake, nothing pretends to hit a bass that isn't there
  fonts: ["900 40px 'Inter Variable'", "800 40px 'Inter Variable'", "600 40px 'Inter Variable'", "600 20px 'JetBrains Mono Variable'"],
  images: [],

  build({ tl, $, $$, NI, scene, wrap, center, type, count, press, burst, flash, rings, hash }) {
    const fx = (host) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;inset:0;pointer-events:none"; host.appendChild(d); return d; };
    // a word that slams in: big and blurred, then snaps; starts at 0.4 so the hit frame shows it
    const slam = (el, t, from = 1.4) => tl.fromTo(el, { scale: from, opacity: 0.4, filter: "blur(14px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out" }, t);

    // ================= PROMPT 0–2: type the command, Enter, the input bursts into the film =================
    const s0 = scene(`<div class="center"><div class="inbar"><span class="s0t"></span><span class="caret s0c"></span><span class="ph">Ask anything</span><i class="send">↑</i></div></div>`, 0, 2);
    const bar = $(s0, ".inbar");
    tl.set($(s0, ".ph"), { display: "" }, 0);
    tl.set($(s0, ".ph"), { display: "none" }, 0.25);
    type($(s0, ".s0t"), "/ship-video", 0.25, 0.85);
    tl.fromTo(bar, { scale: 0.96, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }, 0);
    tl.set($(s0, ".send"), { className: "send" }, 0);
    tl.set($(s0, ".send"), { className: "send on" }, 0.85);
    tl.to(bar, { scale: 1.06, duration: 0.6, ease: "power1.inOut" }, 0.9);
    press($(s0, ".send"), 1.5);
    tl.set($(s0, ".s0c"), { opacity: 0 }, 1.5);
    tl.to([$(s0, ".s0t"), $(s0, ".send")], { opacity: 0, duration: 0.1 }, 1.62);
    tl.to(bar, { backgroundColor: "#ff6a3d", borderColor: "#ff6a3d", duration: 0.2, ease: "power2.out" }, 1.55);
    tl.to(bar, { scaleX: 1.6, scaleY: 10, borderRadius: 4, duration: 0.45, ease: "power4.in" }, 1.55);

    // ================= ASK 2–6: it asks, you click (a bar per question, so it can be read) =================
    const pill = (label, rec) => `<span class="pill"><b>✓</b>${label}${rec ? ` <span class="rec">REC</span>` : ""}</span>`;
    const s1 = scene(`<div class="flood"></div>
      <div class="center k1"><div><div class="q">How long?</div><div class="pills">${pill("Match the music", 1)}${pill("15–20 s")}${pill("20–30 s")}</div></div></div>
      <div class="center k2" style="opacity:0"><div><div class="q">Music?</div><div class="pills">${pill("Your file")}${pill("Suno", 1)}${pill("No music")}</div></div></div>`, 2, 6);
    const c1 = wrap(s1), fx1 = fx(c1);
    tl.fromTo($(s1, ".flood"), { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power2.in" }, 2.1);
    slam($(s1, ".k1 .q"), 2, 1.3);
    tl.fromTo($$(s1, ".k1 .pill"), { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, stagger: 0.05, ease: "back.out(2)" }, 2.2);
    const pick = (root, i, t) => {
      const p = $$(s1, `${root} .pill`)[i];
      tl.set(p, { className: "pill" }, 0);
      tl.set(p, { className: "pill on" }, t);
      press(p, t);
      burst(fx1, center(p), t, 18, 150);
      $$(s1, `${root} .pill`).forEach((o, j) => j !== i && tl.to(o, { opacity: 0.2, scale: 0.92, duration: 0.2 }, t + 0.05));
    };
    pick(".k1", 0, 3.0);
    tl.to($(s1, ".k1"), { x: -600, opacity: 0, duration: 0.2, ease: "power3.in" }, 3.75);
    tl.set($(s1, ".k2"), { opacity: 1 }, 4);
    tl.fromTo($(s1, ".k2"), { x: 600 }, { x: 0, duration: 0.45, ease: "expo.out", ...NI }, 4);
    tl.fromTo($$(s1, ".k2 .pill"), { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, stagger: 0.05, ease: "back.out(2)" }, 4.1);
    pick(".k2", 1, 5.0);
    tl.fromTo(c1, { scale: 1 }, { scale: 1.08, duration: 4, ease: "none" }, 2);
    tl.to($(s1, ".k2"), { scale: 1.2, filter: "blur(10px)", opacity: 0.3, duration: 0.22, ease: "power2.in" }, 5.78);

    // ================= HEAR 6–8: it finds every hit =================
    const N = 120, W = 1720, H = 520;
    const envAt = (t) => t < 2 ? 0.14 + 0.06 * t : t < 6 ? 0.42 : t < 12 ? 0.62 : t < 14 ? 0.12 : t < 19 ? 0.98 : 0.5 - (t - 19) * 0.35;
    const bars = Array.from({ length: N }, (_, i) => {
      const t = (i / N) * 20, a = Math.max(0.03, envAt(t)) * (0.5 + 0.5 * hash(i * 3.7)) * (H / 2 - 10), x = (i / N) * W;
      return `<rect x="${x.toFixed(1)}" y="${(H / 2 - a).toFixed(1)}" width="${(W / N - 5).toFixed(1)}" height="${(2 * a).toFixed(1)}" rx="3" fill="#e9e7e1"/>`;
    }).join("");
    const MARKS = [[2, "HIT"], [6, "GROOVE"], [12, "BREAK"], [14, "DROP"], [19, "FINAL"]];
    const s2 = scene(`<div class="hear">Hear.</div><div class="wave"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g class="wb">${bars}</g></svg>
      ${MARKS.map(([t, l]) => `<i class="mark${t > 17 ? " end" : ""}" style="left:${(t / 20) * 100}%"><span>${l}</span></i>`).join("")}</div>`, 6, 8);
    const c2 = wrap(s2);
    slam($(s2, ".hear"), 6, 1.4);
    tl.fromTo($$(s2, ".wb rect"), { scaleY: 0.3, transformOrigin: "50% 50%" }, { scaleY: 1, duration: 0.35, stagger: { each: 0.002, from: "center" } }, 6);
    $$(s2, ".mark").forEach((m, i) => tl.fromTo(m, { scaleY: 0, opacity: 0, transformOrigin: "50% 100%" }, { scaleY: 1, opacity: 1, duration: 0.2, ease: "back.out(3)" }, 6.5 + i * 0.25));
    tl.fromTo(c2, { scale: 1.12, rotation: -1.5 }, { scale: 1, rotation: 0, duration: 2, ease: "power2.out" }, 6);

    // ================= PLAN 8–9 · BUILD 9–10 · REVIEW 10–11 · RENDER 11–12: one word a bar, the background flips =================
    const s3 = scene(`<div class="bgflip"></div>
      <div class="center w-plan"><div class="word">Plan.</div></div>
      <div class="stamp" style="opacity:0">APPROVED</div>
      <div class="center w-build" style="opacity:0"><div class="bwrap"><div class="word dark">Build.</div><div class="plinth"><i class="rule"></i><span class="bricks"><b></b><b></b><b></b><b></b></span></div></div></div>
      <div class="center w-review" style="opacity:0"><div class="word">Review.<i class="tick">✓</i></div></div>
      <div class="center w-render" style="opacity:0"><div><div class="word dark">Render.</div><div class="frames"><span class="cn">0000</span> frames</div></div></div>`, 8, 12);
    const c3 = wrap(s3), fx3 = fx(c3), bg = $(s3, ".bgflip");
    // background per bar: black, accent, black, white
    tl.set(bg, { backgroundColor: "#0b0b0c" }, 2);
    tl.set(bg, { backgroundColor: "#ff6a3d" }, 9);
    tl.set(bg, { backgroundColor: "#0b0b0c" }, 10);
    tl.set(bg, { backgroundColor: "#f4f4f6" }, 11);
    // Plan. + the stamp on the off-beat
    slam($(s3, ".w-plan .word"), 8);
    tl.fromTo($(s3, ".stamp"), { xPercent: -50, yPercent: -50, rotation: -24, scale: 2.6, opacity: 0 }, { rotation: -9, scale: 1, opacity: 1, duration: 0.18, ease: "power4.in" }, 8.32);
    tl.to($(s3, ".w-plan .word"), { opacity: 0.3, duration: 0.15 }, 8.5);
    tl.set([$(s3, ".w-plan"), $(s3, ".stamp")], { opacity: 0 }, 9);
    // Build.: the word rises out of its baseline (a mask opening upwards), smooth like the other words
    tl.set($(s3, ".w-build"), { opacity: 1 }, 9);
    const bw = $(s3, ".w-build .word");
    tl.fromTo(bw, { clipPath: "inset(55% 0 -10% 0)", y: 70, rotationX: 50, transformPerspective: 1400, transformOrigin: "50% 100%" },
      { clipPath: "inset(0% 0 -10% 0)", y: 0, rotationX: 0, duration: 0.55, ease: "expo.out" }, 9);
    // the ground line draws in, then four blocks land on it, one per 16th
    tl.fromTo($(s3, ".rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "expo.out" }, 9.2);
    $$(s3, ".bricks b").forEach((b, i) => tl.fromTo(b, { x: -180, scaleX: 0.4, opacity: 0, transformOrigin: "0 50%" }, { x: 0, scaleX: 1, opacity: 1, duration: 0.24, ease: "back.out(1.7)" }, 9.375 + i * 0.125));
    tl.fromTo($(s3, ".bwrap"), { scale: 0.97 }, { scale: 1.03, duration: 1, ease: "none" }, 9);

    tl.set($(s3, ".w-build"), { opacity: 0 }, 10);
    // Review.: the word, then a check that pops on the off-beat
    tl.set($(s3, ".w-review"), { opacity: 1 }, 10);
    slam($(s3, ".w-review .word"), 10, 0.6);
    tl.fromTo($(s3, ".tick"), { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.3, ease: "back.out(3)" }, 10.5);
    tl.set($(s3, ".w-review"), { opacity: 0 }, 11);
    burst(fx3, center($(s3, ".tick")), 10.5, 20, 220, ["#3ddc84", "#ffffff"]);
    // Render.: the frame counter races
    tl.set($(s3, ".w-render"), { opacity: 1 }, 11);
    slam($(s3, ".w-render .word"), 11, 1.4);
    count($(s3, ".cn"), 0, 1440, 11.05, 0.8, (v) => String(Math.round(v)).padStart(4, "0"));
    tl.to($(s3, ".w-render"), { scale: 1.6, filter: "blur(14px)", opacity: 0.3, duration: 0.18, ease: "power3.in" }, 11.82);
    // one slow push across all four words instead of a jolt per bar
    tl.fromTo(c3, { scale: 1 }, { scale: 1.08, duration: 4, ease: "none" }, 8);

    // ================= WATCH 12–13 · TWEAK 13–15 · AGAIN 15–16: the first cut is a draft, iterate =================
    const s4 = scene(`<div class="bgflip"></div>
      <div class="center w-watch"><div class="word">Watch.<i class="tick play"><span style="margin-left:16px">▶</span></i></div></div>
      <div class="center w-tweak" style="opacity:0"><div style="display:flex;flex-direction:column;align-items:center;gap:70px">
        <div class="word dark">Tweak.</div>
        <div class="inbar"><span class="t4"></span><span class="caret c4"></span><i class="send">↑</i></div></div></div>
      <div class="center w-again" style="opacity:0"><div><div class="word dark">Again.<i class="tick loop">↻</i></div><div class="frames"><span class="vn">v1</span></div></div></div>`, 12, 16);
    const c4 = wrap(s4), bg4 = $(s4, ".bgflip");
    tl.set(bg4, { backgroundColor: "#0b0b0c" }, 2);
    tl.set(bg4, { backgroundColor: "#ff6a3d" }, 13);
    tl.set(bg4, { backgroundColor: "#f4f4f6" }, 15);
    // Watch.: the word, a play button pops on the off-beat
    slam($(s4, ".w-watch .word"), 12, 0.6);
    tl.fromTo($(s4, ".play"), { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.3, ease: "back.out(3)" }, 12.5);
    tl.set($(s4, ".w-watch"), { opacity: 0 }, 13);
    // Tweak.: the same input as the opening, now asking for a change
    tl.set($(s4, ".w-tweak"), { opacity: 1 }, 13);
    slam($(s4, ".w-tweak .word"), 13, 1.4);
    tl.fromTo($(s4, ".w-tweak .inbar"), { y: 120 }, { y: 0, duration: 0.45, ease: "expo.out" }, 13);
    type($(s4, ".t4"), "make the drop hit harder", 13.3, 14.1);
    tl.set($(s4, ".w-tweak .send"), { className: "send" }, 2);
    tl.set($(s4, ".w-tweak .send"), { className: "send on" }, 14.1);
    press($(s4, ".w-tweak .send"), 14.6);
    tl.set($(s4, ".c4"), { opacity: 0 }, 14.6);
    tl.to($(s4, ".w-tweak"), { scale: 1.2, filter: "blur(10px)", opacity: 0.3, duration: 0.22, ease: "power2.in" }, 14.78);
    // Again.: the loop turns, the version counts up
    tl.set($(s4, ".w-tweak"), { opacity: 0 }, 15);
    tl.set($(s4, ".w-again"), { opacity: 1 }, 15);
    slam($(s4, ".w-again .word"), 15, 1.4);
    tl.fromTo($(s4, ".loop"), { rotation: -200, scale: 0.4 }, { rotation: 0, scale: 1, duration: 0.6, ease: "expo.out" }, 15.05);
    count($(s4, ".vn"), 1, 3, 15.1, 0.7, (v) => "v" + Math.round(v));
    tl.to($(s4, ".w-again"), { scale: 1.6, filter: "blur(14px)", opacity: 0.3, duration: 0.18, ease: "power3.in" }, 15.82);
    tl.fromTo(c4, { scale: 1 }, { scale: 1.06, duration: 4, ease: "none" }, 12);

    // ================= END 16–18.5 =================
    const s5 = scene(`<div class="center"><div style="display:flex;flex-direction:column;align-items:center;gap:36px">
        <div class="wordmark"><span class="e0 sl">/</span><span class="e1">ship</span><span class="e2 gtext">-video</span></div>
        <div class="tagline e3">Launch films for your app, cut to the beat.</div>
        <div class="install e4"><b>/plugin install</b> ship-video@ship-video</div></div></div>`, 16, null);
    tl.fromTo([$(s5, ".e0"), $(s5, ".e1"), $(s5, ".e2")], { y: 50, scale: 1.08, opacity: 0.45, filter: "blur(8px)" }, { y: 0, scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.4, stagger: 0.08 }, 16);
    tl.fromTo($(s5, ".e3"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35 }, 16.3);
    tl.fromTo($(s5, ".e4"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35 }, 16.5);
    tl.to($(s5, ".center"), { opacity: 0, duration: 0.4, ease: "power2.in" }, 18.05);
  },
});

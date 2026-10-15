/* README clip: iterate, for real. A player plays the film; a note is typed; it re-renders; the film plays again with the
   change: the brand's colours, an opening on the search, a new click on Export, then a 15 s cut that plays faster. The timeline shows each round. */
const ROUNDS = [
  { label: "First <em>cut</em>", brand: "#ff6a3d", click: false, k: 1, secs: 20 },
  { label: "Round <em>1</em>", brand: "#7c5cff", click: false, k: 1, secs: 20, note: "use our brand colors" },
  { label: "Round <em>2</em>", brand: "#7c5cff", search: true, k: 1, secs: 20, note: "start on the search" },
  { label: "Round <em>3</em>", brand: "#7c5cff", search: true, click: true, k: 1, secs: 20, note: "add a click on Export" },
  { label: "Round <em>4</em>", brand: "#7c5cff", search: true, click: true, k: 0.72, secs: 15, note: "make it 15 seconds" },
];
const SEG = { intro: 1.1, app: 2.4, end: 1.0 }, GAP = 1.7;   // seconds of the mini film at k = 1
let T = 0;
for (const r of ROUNDS) { if (r.note) { r.noteAt = T; T += GAP; } r.at = T; r.intro = SEG.intro * r.k; r.app = SEG.app * r.k; r.end = SEG.end * r.k; T += r.intro + r.app + r.end; }
const DUR = T + 0.4;

Film({
  duration: DUR, bpm: 120, track: null, hits: [],
  fonts: ["900 40px 'Inter Variable'", "800 40px 'Inter Variable'", "700 40px 'Inter Variable'", "650 40px 'Inter Variable'", "800 40px 'JetBrains Mono Variable'"],
  build({ tl, $, $$, scene, NI, type, press }) {
    const CUR = `<svg class="cur" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.4 3.9 7.4-2.9 1.5-3.9-7.4L4 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
    const s = scene(`<div class="player">
        <div class="lay p-intro"><span>Plan less.</span></div>
        <div class="lay p-search"><div class="ui light"><div class="sb"><i></i><i></i><i></i><i></i></div><div class="mn"><h5>This week</h5><div class="cards"><i></i><i></i><i></i></div></div></div>
          <div class="sbar"><span class="ic">🔍</span>${ROUNDS.map((_, i) => `<span class="q q${i}"></span>`).join("")}<span class="caret"></span></div></div>
        <div class="lay p-app"><div class="ui light"><div class="sb"><i></i><i></i><i></i><i></i></div><div class="mn">
          <div class="hd"><h5>This week</h5><span class="btn">Export</span></div>
          <div class="cards"><i></i><i></i><i></i></div><div class="chart">${[40, 55, 48, 70, 62, 85, 78].map((h) => `<b style="height:${h}%"></b>`).join("")}</div></div></div>
          <div class="toast"><b>✓</b>Report exported</div><i class="ring"></i>${CUR}</div>
        <div class="lay p-end"><b>Acme</b><span>Ship more.</span></div>
        <div class="lay scrim"><span>re-rendering…</span><div class="pb"><i></i></div></div></div>
      <div class="ptl"><i class="a"></i><i class="b"></i><i class="c"></i><span class="head"></span>${ROUNDS.map((r, i) => `<span class="dur d${i}">${r.secs} s</span>`).join("")}</div>
      <div class="side"><div class="round">${ROUNDS.map((r, i) => `<span class="r${i}">${r.label}</span>`).join("")}</div>
        <div class="nlist">${ROUNDS.filter((r) => r.note).map((r) => `<div class="nl"><b>✓</b>${r.note}</div>`).join("")}</div>
        <div class="inp"><span class="tx"></span><span class="caret"></span></div></div>`, 0, null);
    const player = $(s, ".player"), search = $(s, ".p-search"), intro = $(s, ".p-intro"), app = $(s, ".p-app"), end = $(s, ".p-end"), scrim = $(s, ".scrim");
    const cur = $(s, ".cur"), ring = $(s, ".ring"), toast = $(s, ".toast"), btn = $(s, ".btn");
    const [sa, sb, sc] = $$(s, ".ptl i"), head = $(s, ".ptl .head"), notes = $$(s, ".nl"), tx = $(s, ".tx");
    const FULL = 1000;                                                   // timeline px for the 20 s cut
    [intro, search, app, end, scrim, cur, ring, toast, tx, ...$$(s, ".sbar .q")].forEach((el) => tl.set(el, { display: "none" }, 0));
    notes.forEach((n) => tl.set(n, { display: "none" }, 0));
    $$(s, ".round span").forEach((el, i) => tl.set(el, { display: i ? "none" : "" }, 0));
    $$(s, ".ptl .dur").forEach((el, i) => tl.set(el, { display: i ? "none" : "" }, 0));
    // the button's centre inside the player, measured once (the layer is laid out even while hidden by the timeline)
    tl.set(app, { display: "" }, 0); const pr = player.getBoundingClientRect(), br = btn.getBoundingClientRect(), sc0 = pr.width / 1000;
    const B = { x: (br.left + br.width / 2 - pr.left) / sc0, y: (br.top + br.height / 2 - pr.top) / sc0 };
    let ni = 0;
    ROUNDS.forEach((r, i) => {
      if (r.note) {                                                      // type the note, Enter, re-render
        const t = r.noteAt;
        tl.set(tx, { display: "" }, t);
        type(tx, r.note, t + 0.1, t + 0.75);
        tl.set(tx, { display: "none" }, t + 0.95);
        tl.set(notes[ni], { display: "" }, t + 0.95);
        tl.fromTo(notes[ni], { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "expo.out", ...NI }, t + 0.95);
        tl.set(scrim, { display: "" }, t + 0.95);
        tl.fromTo($(scrim, ".pb i"), { scaleX: 0 }, { scaleX: 1, duration: GAP - 1.0, ease: "power1.inOut", ...NI }, t + 0.95);
        tl.set(scrim, { display: "none" }, r.at);
        ni++;
      }
      const t0 = r.at, total = r.intro + r.app + r.end, k = r.k;
      tl.set(player, { "--brand": r.brand }, t0);
      if (i) {
        tl.set($(s, `.round .r${i - 1}`), { display: "none" }, t0); tl.set($(s, `.round .r${i}`), { display: "" }, t0);
        tl.fromTo($(s, `.round .r${i}`), { scale: 1.3 }, { scale: 1, duration: 0.35, ease: "back.out(3)", ...NI }, t0);
        tl.set($(s, `.ptl .d${i - 1}`), { display: "none" }, t0); tl.set($(s, `.ptl .d${i}`), { display: "" }, t0);
      }
      // the timeline: this round's lengths, its overall width, the playhead running over it
      const width = FULL * r.secs / 20 - 20;
      [[sa, r.intro], [sb, r.app], [sc, r.end]].forEach(([el, d]) => tl.set(el, { width: (width * d / total) + "px" }, t0));
      tl.fromTo(head, { left: 0 }, { left: width + 20, duration: total, ease: "none", ...NI }, t0);
      // the film itself
      const on = (el, a, b) => { tl.set(el, { display: "" }, a); if (b != null) tl.set(el, { display: "none" }, b); };
      if (r.search) {                                                    // the film now opens on the app's search
        const q = $(s, `.sbar .q${i}`);
        on(search, t0, t0 + r.intro);
        on(q, t0, t0 + r.intro);
        type(q, "revenue", t0 + 0.15 * k, t0 + 0.8 * k);
      } else {
        on(intro, t0, t0 + r.intro);
        tl.fromTo($(intro, "span"), { scale: 1.25 }, { scale: 1, duration: 0.5 * k, ease: "expo.out", ...NI }, t0);
      }
      const ta = t0 + r.intro;
      on(app, ta, ta + r.app);
      tl.fromTo($$(app, ".chart b"), { scaleY: 0.1, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.7 * k, stagger: 0.05 * k, ease: "back.out(1.4)", ...NI }, ta);
      if (r.click) {                                                     // a cursor arrives, presses Export, a toast slides in
        const tc = ta + 0.9 * k;
        on(cur, ta + 0.2 * k, ta + r.app);
        tl.fromTo(cur, { x: 640, y: 470 }, { x: B.x - 10, y: B.y - 6, duration: 0.65 * k, ease: "power2.inOut", ...NI }, ta + 0.2 * k);
        press(btn, tc);
        on(ring, tc, tc + 0.4 * k);
        tl.fromTo(ring, { left: B.x, top: B.y, scale: 0.4, opacity: 1 }, { scale: 1.4, opacity: 0, duration: 0.4 * k, ease: "power2.out", ...NI }, tc);
        on(toast, tc + 0.1 * k, ta + r.app);
        tl.fromTo(toast, { y: 120 }, { y: 0, duration: 0.4 * k, ease: "expo.out", ...NI }, tc + 0.1 * k);
      }
      on(end, ta + r.app, i < ROUNDS.length - 1 ? ROUNDS[i + 1].noteAt + GAP : null);
      tl.fromTo($(end, "b"), { y: 50 }, { y: 0, duration: 0.45 * k, ease: "expo.out", ...NI }, ta + r.app);
    });
    tl.set(app, { display: "none" }, 0);
  },
});

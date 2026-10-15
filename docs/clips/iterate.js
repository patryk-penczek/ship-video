/* README clip: iterate, for real. A player plays the film; a note is typed; it re-renders; the film plays again with the
   change: dark mode, a longer end card, a snappier intro. The timeline under the player shows each round's lengths. */
const ROUNDS = [
  { label: "First <em>cut</em>", dark: false, intro: 1.2, app: 1.6, end: 0.8 },
  { label: "Round <em>1</em>", dark: true, intro: 1.2, app: 1.6, end: 0.8, note: "show the dark mode too" },
  { label: "Round <em>2</em>", dark: true, intro: 1.2, app: 1.6, end: 1.6, note: "hold the end card longer" },
  { label: "Round <em>3</em>", dark: true, intro: 0.5, app: 1.6, end: 1.6, note: "make the intro snappier" },
];
const GAP = 1.7;                                     // typing the note + re-rendering
let T = 0; for (const r of ROUNDS) { if (r.note) { r.noteAt = T; T += GAP; } r.at = T; T += r.intro + r.app + r.end; }
const DUR = T + 0.4;

Film({
  duration: DUR, bpm: 120, track: null, hits: [],
  fonts: ["900 40px 'Inter Variable'", "800 40px 'Inter Variable'", "650 40px 'Inter Variable'", "700 40px 'JetBrains Mono Variable'"],
  build({ tl, $, $$, scene, NI, type }) {
    const ui = (theme) => `<div class="ui ${theme}"><div class="sb"><i></i><i></i><i></i><i></i></div><div class="mn"><h5>This week</h5>
      <div class="cards"><i></i><i></i><i></i></div><div class="chart">${[40, 55, 48, 70, 62, 85, 78].map((h) => `<b style="height:${h}%"></b>`).join("")}</div></div></div>`;
    const s = scene(`<div class="player">
        <div class="lay p-intro"><span>Plan less.</span></div>
        <div class="lay p-light">${ui("light")}</div><div class="lay p-dark">${ui("dark")}</div>
        <div class="lay p-end"><b>Acme</b><span>Ship more.</span></div>
        <div class="lay scrim"><span>re-rendering…</span><div class="pb"><i></i></div></div></div>
      <div class="ptl"><i class="a"></i><i class="b"></i><i class="c"></i><span class="head"></span></div>
      <div class="side"><div class="round">${ROUNDS.map((r, i) => `<span class="r${i}">${r.label}</span>`).join("")}</div>
        <div class="nlist">${ROUNDS.filter((r) => r.note).map((r) => `<div class="nl"><b>✓</b>${r.note}</div>`).join("")}</div>
        <div class="inp"><span class="tx"></span><span class="caret"></span></div></div>`, 0, null);
    const L = { intro: $(s, ".p-intro"), light: $(s, ".p-light"), dark: $(s, ".p-dark"), end: $(s, ".p-end") }, scrim = $(s, ".scrim");
    const [sa, sb, sc] = $$(s, ".ptl i"), head = $(s, ".ptl .head"), notes = $$(s, ".nl"), tx = $(s, ".tx");
    const W = 1000 - 20;                                                 // timeline width minus the two gaps
    Object.values(L).forEach((el) => tl.set(el, { display: "none" }, 0));
    tl.set(scrim, { display: "none" }, 0);
    notes.forEach((n) => tl.set(n, { display: "none" }, 0));
    $$(s, ".round span").forEach((el, i) => tl.set(el, { display: i ? "none" : "" }, 0));
    tl.set(head, { left: 0 }, 0);
    let ni = 0;
    ROUNDS.forEach((r, i) => {
      if (r.note) {                                                      // type the note, Enter, re-render
        const t = r.noteAt, msg = $(s, ".tx");
        tl.set(tx, { display: "" }, t);
        type(msg, r.note, t + 0.1, t + 0.75);
        tl.set(tx, { display: "none" }, t + 0.95);
        tl.set(notes[ni], { display: "" }, t + 0.95);
        tl.fromTo(notes[ni], { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "expo.out", ...NI }, t + 0.95);
        tl.set(scrim, { display: "" }, t + 0.95);
        tl.fromTo($(scrim, ".pb i"), { scaleX: 0 }, { scaleX: 1, duration: GAP - 1.0, ease: "power1.inOut", ...NI }, t + 0.95);
        tl.set(scrim, { display: "none" }, r.at);
        ni++;
      }
      const t0 = r.at, app = r.dark ? L.dark : L.light, total = r.intro + r.app + r.end;
      if (i) { tl.set($(s, `.round .r${i - 1}`), { display: "none" }, t0); tl.set($(s, `.round .r${i}`), { display: "" }, t0); tl.fromTo($(s, `.round .r${i}`), { scale: 1.3 }, { scale: 1, duration: 0.35, ease: "back.out(3)", ...NI }, t0); }
      // the timeline shows this round's lengths, the playhead runs over it
      [[sa, r.intro], [sb, r.app], [sc, r.end]].forEach(([el, d]) => tl.set(el, { width: (W * d / total) + "px" }, t0));
      tl.fromTo(head, { left: 0 }, { left: 1000, duration: total, ease: "none", ...NI }, t0);
      // the film itself
      const show = (el, a, b) => { tl.set(el, { display: "" }, a); if (b != null) tl.set(el, { display: "none" }, b); };
      show(L.intro, t0, t0 + r.intro);
      tl.fromTo($(L.intro, "span"), { scale: 1.25 }, { scale: 1, duration: Math.min(0.5, r.intro), ease: "expo.out", ...NI }, t0);
      show(app, t0 + r.intro, t0 + r.intro + r.app);
      tl.fromTo($$(app, ".chart b"), { scaleY: 0.1, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.7, stagger: 0.05, ease: "back.out(1.4)", ...NI }, t0 + r.intro);
      show(L.end, t0 + r.intro + r.app, i < ROUNDS.length - 1 ? ROUNDS[i + 1].noteAt + GAP : null);
      tl.fromTo($(L.end, "b"), { y: 50 }, { y: 0, duration: 0.45, ease: "expo.out", ...NI }, t0 + r.intro + r.app);
    });
  },
});

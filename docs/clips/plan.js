/* README clip: you approve the plan first. The approved scenario scrolls by like a document. One period per loop. 8 s. */
Film({
  duration: 8, bpm: 120, track: null, hits: [],
  fonts: ["650 40px 'Inter Variable'", "800 40px 'Inter Variable'", "600 40px 'JetBrains Mono Variable'"],
  build({ tl, $, scene }) {
    const ROWS = [["0.0", "intro", "“Lost?” over the map"], ["1.9", "hit", "the app, search"], ["3.8", "kick", "typing “Lisbon”"], ["5.8", "hit", "results fill in"],
      ["9.6", "groove", "the route draws"], ["17.3", "break", "push in, tension"], ["21.1", "drop", "the trip, booked"], ["30.7", "end", "name + promise"]];
    const ROW = 140, P = ROWS.length * ROW, D = 8;
    const rows = [0, 1, 2].map(() => ROWS.map(([t, m, o]) => `<div class="row"><span class="t">${t}</span><span class="m">${m}</span><span>${o}</span></div>`).join("")).join("");
    const s = scene(`<div class="panel" style="left:140px;top:70px;width:1640px;height:940px">
        <div class="doc-h"><span>SCENARIO.md</span><span class="approved">✓ Approved</span></div><div class="win fade-y" style="top:140px"><div class="rows" style="top:0">${rows}</div></div></div>`, 0, null);
    tl.fromTo($(s, ".rows"), { y: 0 }, { y: -P, duration: D, ease: "none" }, 0);
  },
});

/* README clip: your real UI, frame-exact. A film strip of app frames (light, dark, search, results) runs past. One period per loop. 8 s. */
Film({
  duration: 8, bpm: 120, track: null, hits: [],
  fonts: ["800 40px 'Inter Variable'", "700 40px 'JetBrains Mono Variable'"],
  build({ tl, $$, scene }) {
    const FR = 760, GAP = 40, D = 8;
    const ui = (theme, title, bars) => `<div class="ui ${theme}"><div class="sb"><i></i><i></i><i></i><i></i></div><div class="mn"><h5>${title}</h5>
      <div class="cards"><i></i><i></i><i></i></div><div class="chart">${bars.map((h) => `<b style="height:${h}%"></b>`).join("")}</div></div></div>`;
    const V = [ui("light", "This week", [40, 55, 48, 70, 62, 85, 78]), ui("dark", "Dark mode", [50, 42, 66, 58, 74, 69, 92]),
      ui("light", "Search", [30, 64, 45, 52, 80, 61, 70]), ui("dark", "Results", [72, 58, 84, 66, 90, 77, 95])];
    const NO = ["0120", "0240", "0360", "0480"], P = V.length * (FR + GAP);
    const frames = [0, 1, 2].map(() => V.map((v, i) => `<div class="frm">${v}<span class="no">${NO[i]}</span></div>`).join("")).join("");
    const holes = Array.from({ length: Math.ceil(3 * P / 100) }, () => "<i></i>").join("");
    const s = scene(`<div class="strip" style="width:${3 * P}px"><div class="holes mv" style="top:0">${holes}</div><div class="frames mv">${frames}</div><div class="holes mv" style="top:560px">${holes}</div></div>
      <div class="spec">1920×1080 · <b>60 fps</b> · frame-exact</div>`, 0, null);
    tl.fromTo($$(s, ".mv"), { x: 0 }, { x: -P, duration: D, ease: "none" }, 0);
  },
});

/* README clip: it reads your app first. The repo's files scroll past a reading lens; what it found stays on the right.
   The list moves by exactly one period, so the loop is seamless. 6 s. */
Film({
  duration: 6, bpm: 120, track: null, hits: [],
  fonts: ["600 40px 'JetBrains Mono Variable'", "700 40px 'Inter Variable'"],
  build({ tl, $, scene }) {
    const FILES = [["📄", "README.md"], ["🧭", "src/routes.tsx"], ["🔍", "Search.tsx"], ["📋", "Results.tsx"], ["⚙️", "Settings.tsx"], ["🎨", "theme.css"], ["📝", "CHANGELOG.md"], ["📦", "package.json"]];
    const ROW = 130, P = FILES.length * ROW, D = 6;
    const list = [0, 1, 2].map(() => FILES.map(([i, f]) => `<div class="file"><i>${i}</i>${f}</div>`).join("")).join("");
    const s = scene(`<div class="panel" style="left:90px;top:90px;width:930px;height:900px"><div class="ptitle">reading your repo</div>
        <div class="win fade-y"><div class="lens" style="top:${2 * ROW}px"></div><div class="files">${list}</div></div></div>
      <div class="panel" style="left:1070px;top:90px;width:760px;height:900px"><div class="ptitle">found</div>
        <div class="found"><div><b>✓</b>name, promise</div><div><b>✓</b>6 views</div><div><b>✓</b>dark mode</div><div><b>✓</b>what's new</div><div><b>✓</b>3 wow moments</div></div></div>`, 0, null);
    tl.fromTo($(s, ".files"), { y: 0 }, { y: -P, duration: D, ease: "none" }, 0);
  },
});

/* README clip: every cut on a hit. A timeline scrolls under a fixed playhead: the shots track above, the music below,
   and every shot boundary sits on a hit. It moves by one period per loop, so the loop is seamless. 4 s. */
Film({
  duration: 4, bpm: 120, track: null, hits: [],
  fonts: ["800 40px 'Inter Variable'", "600 40px 'JetBrains Mono Variable'"],
  build({ tl, $$, scene, hash }) {
    const D = 4, SEC = 400, P = D * SEC, PH = 700, H = 220;
    const SHOTS = [["Search", "#ff6a3d"], ["Results", "#f4f4f6"], ["Booking", "#6c8cff"], ["Done", "#3ddc84"]];
    const shots = [0, 1, 2].map(() => SHOTS.map(([w, c]) => `<div class="shot" style="width:${SEC - 12}px;background:${c}">${w}</div>`).join("")).join("");
    const N = 40, bw = P / N;                                          // one period of waveform
    const per = Array.from({ length: N }, (_, i) => {
      const t = i / N * D, onHit = Math.abs(t - Math.round(t)) < 1e-6, a = (onHit ? 0.95 : 0.22 + 0.5 * hash(i * 7.3)) * (H / 2 - 8);
      return `<rect x="${(i * bw).toFixed(1)}" y="${(H / 2 - a).toFixed(1)}" width="${(bw - 10).toFixed(1)}" height="${(2 * a).toFixed(1)}" rx="5" fill="${onHit ? "#ff6a3d" : "#3a3b42"}"/>`;
    }).join("");
    const wave = [0, 1, 2].map((k) => `<g transform="translate(${k * P} 0)">${per}</g>`).join("");
    const s = scene(`<div class="panel" style="left:90px;top:120px;width:1740px;height:840px">
        <div class="tlabel" style="top:150px">shots</div><div class="tlabel" style="top:500px">music</div>
        <div class="track" style="top:220px"><div class="mv">${shots}</div></div>
        <div class="track" style="top:570px"><svg class="mv wv" viewBox="0 0 ${3 * P} ${H}" style="width:${3 * P}px">${wave}</svg></div>
        <i class="playhead" style="left:${PH}px"></i></div>`, 0, null);
    tl.fromTo($$(s, ".mv"), { x: PH - P }, { x: PH - 2 * P, duration: D, ease: "none" }, 0);   // a boundary and a hit under the playhead at t = 0 and t = D
  },
});

/* Acts 01–05: one Claude Code session in the desktop app, 0–16.5 s.
   The transcript starts at the top and scrolls only when new items would hide under the picker or the input. */
window.CLAUDE = {
  build(ctx) {
    const { tl, $, $$, NI, scene, wrap, center, focus, press, type, count, hash } = ctx;
    const tool = (verb, path, extra = "") => `<div class="cl-tool"><b>${verb}</b><code>${path}</code>${extra}<span class="chev">›</span></div>`;
    const opt = (n, label, desc = "", other = false) => `<div class="ask-o${other ? " other" : ""}"><span class="cur">❯</span><span class="num">${n}.</span><span class="lbl">${label}</span>${desc ? `<span class="desc">${desc}</span>` : ""}</div>`;
    const ask = (tabs, q, opts) => `<div class="ask-body"><div class="ask-tabs"><span>←</span>${tabs}<span>→</span></div><div class="ask-q">${q}</div>${opts}<div class="ask-foot">Enter to select · ↑/↓ to navigate · Esc to cancel</div></div>`;

    // ---- music map waveform (20 s track, bar = 2 s) ----
    const N = 120, W = 924, Hh = 150;
    const envAt = (t) => t < 2 ? 0.12 + 0.08 * t : t < 6 ? 0.42 : t < 12 ? 0.62 : t < 14 ? 0.14 : t < 19 ? 0.95 : 0.5 - (t - 19) * 0.3;
    const bars = Array.from({ length: N }, (_, i) => {
      const t = (i / N) * 20, a = envAt(t) * (0.55 + 0.45 * hash(i * 3.1)) * (Hh / 2 - 6), x = (i / N) * W + 2;
      return `<rect x="${x.toFixed(1)}" y="${(Hh / 2 - a).toFixed(1)}" width="${(W / N - 2.5).toFixed(1)}" height="${(2 * a).toFixed(1)}" rx="1.5" fill="#8f8a80"/>`;
    }).join("");
    const grid = Array.from({ length: 11 }, (_, i) => `<line x1="${(i / 10) * W}" x2="${(i / 10) * W}" y1="0" y2="${Hh}" stroke="#3a3936" stroke-width="${i % 2 ? 1 : 1.5}"/>`).join("");
    const HITS = [[2, "2.00 hit"], [6, "6.00 groove"], [14, "14.00 drop*"], [19, "19.00 final"]];
    const marks = HITS.map(([t, l]) => `<i class="hitm${t > 16 ? " end" : ""}" style="left:${(t / 20) * 100}%"><span>${l}</span></i>`).join("");
    const STILLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    const s = scene(`<div class="cl" data-clip-ok>
      <aside class="cl-side">
        <div class="cl-lights"><i></i><i></i><i></i></div>
        <div class="cl-tabs"><span>⌕</span><span>☰</span><span class="cl-pill">&lt;/&gt; Code</span></div>
        <div class="cl-nav"><span>+</span>New session</div>
        <div class="cl-nav"><span>◷</span>Scheduled</div>
        <div class="cl-nav"><span>▭</span>Customize</div>
        <div class="cl-label">Pinned</div>
        <div class="cl-sess on"><i></i>Launch video for Breeze</div>
        <div class="cl-label">Recents</div>
        <div class="cl-sess"><i></i>Add ⌘K city search</div>
        <div class="cl-sess"><i></i>Weather alerts banner</div>
        <div class="cl-sess"><i></i>Hourly chart tooltip</div>
        <div class="cl-org">▣ breeze</div>
      </aside>
      <div class="cl-main">
        <div class="cl-head">▭ breeze <span>/</span> <b>Launch video for Breeze</b></div>
        <div class="cl-view" data-clip-ok><div class="cl-scroll">
          <div class="cl-user it" data-t="2.0">Make a 20-second launch video for the weather app in demo-app/</div>
          <div class="it" data-t="2.25">${tool("Skill", "ship-video")}</div>
          <div class="it" data-t="2.5">${tool("Read", "demo-app/src", `<span class="dim">14 files</span>`)}</div>
          <div class="it" data-t="2.75">${tool("Bash", "scripts/lib/check.mjs", `<span class="dim">ready</span>`)}</div>
          <div class="cl-text it" data-t="3.0">Read the app. Two quick questions before I plan anything:</div>
          <div class="cl-text it" data-t="4.75"><span class="dim">⎿</span> Length → <b>Match the music</b> · Music → <b>Suno</b></div>
          <div class="it" data-t="4.85">${tool("Bash", "scripts/music.mjs analyze film/track.mp3", `<span class="dim">120 BPM</span>`)}</div>
          <div class="cl-card it m1" data-t="5.0"><div class="cl-card-h"><b>Music map</b><span>120 BPM · bar 2.00 s · 20.0 s</span></div>
            <div class="wave"><svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none">${grid}<g class="wbars">${bars}</g></svg>${marks}</div></div>
          <div class="it" data-t="8.0">${tool("Write", "film/SCENARIO.md", `<span class="add">+42</span>`)}</div>
          <div class="cl-card it" data-t="8.0"><table class="cl-table"><thead><tr><th>T (S)</th><th>MUSIC</th><th>ON SCREEN</th></tr></thead><tbody>
            <tr class="r1"><td>0.00–2.00</td><td>intro swell</td><td>A huge 21° fades up over Lisbon</td></tr>
            <tr class="r2"><td>2.00</td><td>hit</td><td>The storm alert slides in</td></tr>
            <tr class="r3"><td>6.00</td><td>groove</td><td>⌘K, type “Bar”, Barcelona lands</td></tr>
            <tr class="r4"><td>14.00</td><td>drop*</td><td>Dark → light theme flip</td></tr>
          </tbody></table></div>
          <div class="cl-text cl-ok it" data-t="10.0">✓ Scenario approved. Building the screens from demo-app/src.</div>
          <div class="it" data-t="10.25">${tool("Write", "film/ui.js", `<span class="add">+214</span>`)}</div>
          <div class="it" data-t="10.5">${tool("Write", "film/film.js", `<span class="add">+388</span>`)}</div>
          <div class="it" data-t="11.0">${tool("Bash", "scripts/sheet.mjs film/index.html 0 20 2.5")}</div>
          <div class="cl-card it" data-t="11.0"><div class="sheet">${STILLS.map((n, i) => `<div style="background-image:url(img/still-${n}.jpg)"><span>${(i * 2.5).toFixed(1)}</span></div>`).join("")}</div></div>
          <div class="cl-text cl-ok it" data-t="13.0">✓ Stills approved. Rendering.</div>
          <div class="it" data-t="14.0">${tool("Bash", "scripts/render.mjs film/index.html film/out/film.mp4")}</div>
          <div class="cl-card it" data-t="14.0"><div class="cl-card-h"><b class="rtxt">frame 0 / 1200</b><span class="rdone">1080p60</span></div><div class="prog"><i></i></div></div>
          <div class="it" data-t="15.5">${tool("Bash", "scripts/hits.mjs film/out/film.mp4 hits.png 2 6 14")}</div>
          <div class="cl-card it" data-t="15.5"><div class="strip"><div style="background-image:url(img/still-6.jpg)"><span>t − 0.02</span></div><div class="cut" style="background-image:url(img/still-7.jpg)"><span>t</span></div><div style="background-image:url(img/still-7.jpg)"><span>t + 0.02</span></div></div></div>
          <div class="cl-text cl-ok it" data-t="16.0">✓ Every cut lands on its hit.</div>
        </div></div>
        <div class="cl-ask k1">
          ${ask(`<span class="on">☐ Length</span><span>☐ Music</span><span>✔ Submit</span>`, "How long should the film be?",
            opt(1, "Match the music (Recommended)", "The film runs as long as the track") + opt(2, "15–20 s") + opt(3, "20–30 s") + opt(4, "Type something.", "", true))}
          ${ask(`<span class="done">☑ Length</span><span class="on">☐ Music</span><span>✔ Submit</span>`, "Where does the music come from?",
            opt(1, "Your own file", "A track you made or licensed") + opt(2, "Suno", "I write the prompt, you generate it") + opt(3, "No music", "Cut to a 120 BPM grid") + opt(4, "Type something.", "", true))}
        </div>
        <div class="cl-ask k3">${ask(`<span class="on">☐ Scenario</span><span>✔ Submit</span>`, "Approve the scenario?",
          opt(1, "Approve", "Build it as written") + opt(2, "Change timing") + opt(3, "Change scenes") + opt(4, "Type something.", "", true))}</div>
        <div class="cl-ask k4">${ask(`<span class="on">☐ Stills</span><span>✔ Submit</span>`, "The stills are in film/review. Render?",
          opt(1, "Approve, render it") + opt(2, "Fix something") + opt(3, "Show me more frames") + opt(4, "Type something.", "", true))}</div>
        <div class="cl-input"><div class="cl-box"><span class="typed"></span><span class="cl-caret"></span><span class="ph">Type / for commands</span><span class="send"></span></div>
          <div class="cl-bar"><span>Auto accept edits</span><span>＋</span><span class="model">Opus 4.6</span></div></div>
      </div>
    </div>`, 0, 16.5);
    const cam = wrap(s);

    // ---- measure everything before any tween ----
    const view = $(s, ".cl-view"), scroll = $(s, ".cl-scroll");
    const viewH = view.clientHeight;
    const items = $$(s, ".it").map((el) => ({ el, t: Number(el.dataset.t), bottom: el.offsetTop + el.offsetHeight + 24 }));
    const cards = { k1: $(s, ".k1"), k3: $(s, ".k3"), k4: $(s, ".k4") };
    const overlap = (card) => view.getBoundingClientRect().bottom - card.getBoundingClientRect().top + 18;
    const RES = { k1: overlap(cards.k1), k3: overlap(cards.k3), k4: overlap(cards.k4) };
    const ASKS = [["k1", 3.0, 4.75], ["k3", 9.0, 10.0], ["k4", 12.0, 13.0]];
    const P = {
      input: center($(s, ".cl-box")),
      top: (() => { const c = center(scroll); return { x: c.x, y: 0 }; })(), // clamps to the top of the window
      k1: center(cards.k1), k3: center(cards.k3), k4: center(cards.k4),
      low: (() => { const c = center(scroll), r = view.getBoundingClientRect(); return { x: c.x, y: r.bottom - 300 }; })(),
    };

    // ---- reveal items + scroll ----
    for (const it of items) {
      tl.set(it.el, { display: "none" }, 0);
      tl.set(it.el, { display: "" }, it.t);
      tl.fromTo(it.el, { y: 14, opacity: 0.35 }, { y: 0, opacity: 1, duration: 0.25, ...NI }, it.t);
    }
    const reserveAt = (t) => { for (const [k, a, b] of ASKS) if (t >= a && t < b) return RES[k]; return 0; };
    const times = [...new Set([...items.map((i) => i.t), ...ASKS.flatMap(([, a, b]) => [a, b])])].sort((a, b) => a - b);
    tl.set(scroll, { y: 0 }, 0);
    let last = 0;
    for (const t of times) {
      const bottom = Math.max(0, ...items.filter((i) => i.t <= t).map((i) => i.bottom));
      const target = Math.max(0, bottom - (viewH - reserveAt(t)));
      if (target !== last) tl.to(scroll, { y: -target, duration: 0.22, ease: "power2.out" }, t);
      last = target;
    }

    // ---- pickers ----
    for (const [k, a, b] of ASKS) {
      tl.set(cards[k], { display: "none" }, 0);
      tl.set(cards[k], { display: "" }, a);
      tl.fromTo(cards[k], { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ...NI }, a);
      tl.to(cards[k], { y: 20, opacity: 0, duration: 0.15 }, b - 0.15);
    }
    const select = (body, idx, t) => $$(body, ".ask-o").forEach((o, j) => tl.set(o, { className: `ask-o${o.classList.contains("other") ? " other" : ""}${j === idx ? " sel" : ""}` }, t));
    const [b1, b2] = $$(cards.k1, ".ask-body");
    tl.set(b2, { display: "none" }, 0);
    select(b1, 0, 0);
    select(b2, 0, 0);
    press($$(b1, ".ask-o")[0], 3.5);
    tl.set(b1, { display: "none" }, 3.6);
    tl.set(b2, { display: "" }, 3.6);
    select(b2, 1, 4.0);
    press($$(b2, ".ask-o")[1], 4.5);
    const b3 = $(cards.k3, ".ask-body"), b4 = $(cards.k4, ".ask-body");
    select(b3, 0, 0);
    press($$(b3, ".ask-o")[0], 9.75);
    select(b4, 0, 0);
    press($$(b4, ".ask-o")[0], 12.75);

    // ---- input: the prompt types itself, then sends ----
    const typed = $(s, ".typed"), ph = $(s, ".ph"), caret = $(s, ".cl-caret");
    tl.set(ph, { display: "none" }, 0);
    tl.set(caret, { opacity: 1 }, 0);
    type(typed, "Make a 20-second launch video for the weather app in demo-app/", 0.25, 1.6);
    press($(s, ".cl-box"), 1.9);
    tl.set(typed, { textContent: "" }, 2.0);
    tl.set(caret, { opacity: 0 }, 2.0);
    tl.set(ph, { display: "" }, 2.0);

    // ---- results animate on the beat ----
    tl.fromTo($$(s, ".wbars rect"), { scaleY: 0.15, transformOrigin: "50% 50%" }, { scaleY: 1, duration: 0.35, stagger: 0.003 }, 5.0);
    $$(s, ".hitm").forEach((m, i) => tl.fromTo(m, { opacity: 0, scaleY: 0, transformOrigin: "50% 100%" }, { opacity: 1, scaleY: 1, duration: 0.3, ease: "back.out(2)" }, 5.5 + i * 0.5));
    ["r2", "r3", "r4"].forEach((r, i) => tl.fromTo($(s, `.${r}`), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.25 }, 8.25 + i * 0.25));
    $$(s, ".sheet div").forEach((d, i) => tl.fromTo(d, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 11.05 + i * 0.1));
    count($(s, ".rtxt"), 0, 1200, 14.05, 1.2, (v) => `frame ${Math.round(v)} / 1200`);
    tl.fromTo($(s, ".prog i"), { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: "power1.inOut", ...NI }, 14.05);
    tl.set($(s, ".rdone"), { textContent: "1080p60" }, 0);
    tl.set($(s, ".rdone"), { textContent: "✓ film.mp4 · 20.0 s · 1080p60" }, 15.25);
    $$(s, ".strip div").forEach((d, i) => tl.fromTo(d, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25 }, 15.6 + i * 0.12));

    // ---- camera: one move per beat group, never overlapping ----
    // keep the frame inside the app window: clamp the focus point so no edge of the window shows
    const WIN = (() => { const r = $(s, ".cl").getBoundingClientRect(), st = ctx.stage.getBoundingClientRect(), k = st.width / 1920; return { l: (r.left - st.left) / k, t: (r.top - st.top) / k, r: (r.right - st.left) / k, b: (r.bottom - st.top) / k }; })();
    // the caption owns the top BAND px of the frame; content is framed in the area below it (centre at 540 + BAND/2)
    const BAND = 150, HALF = (1080 - BAND) / 2;
    const clampP = (p, sc) => ({ x: Math.min(Math.max(p.x, WIN.l + 960 / sc), WIN.r - 960 / sc), y: Math.min(Math.max(p.y, WIN.t + HALF / sc), WIN.b - HALF / sc) });
    const F = (p, sc) => { const q = clampP(p, sc); return { x: -(q.x - 960) * sc, y: -(q.y - 540) * sc + BAND / 2, scale: sc }; };
    const C = (p, sc, t, d = 0.45, ease = "power3.inOut") => tl.to(cam, { ...F(p, sc), duration: d, ease }, t);
    tl.fromTo(cam, F(P.input, 1.7), { ...F(P.input, 1.85), duration: 1.85, ease: "none" }, 0);
    C(P.top, 1.75, 2.0, 0.5);
    C(P.k1, 1.6, 3.0);
    C(P.low, 1.7, 4.55);
    C(P.k3, 1.6, 9.0);
    C(P.low, 1.7, 9.8);
    C(P.k4, 1.6, 12.0);
    C(P.low, 1.7, 12.8);
    tl.to(cam, { ...F(P.low, 1.78), duration: 2.2, ease: "none" }, 13.5);

    // ---- captions ----
    const cap = scene(`<div class="capfade"></div><div class="cap"><i></i><span><div class="n"></div><div class="t"></div></span></div>`, 0, 22);
    [[0, "01 · ASK", "Claude asks. You click."], [5, "02 · MUSIC", "It finds the hits in your track."], [8, "03 · PLAN", "You approve the shot list first."],
     [11, "04 · REVIEW", "Then the stills."], [14, "05 · RENDER", "Frame-exact, every cut on a hit."], [16.5, "06 · FILM", "Your app, as a launch film."]].forEach(([t, n, txt]) => {
      tl.set($(cap, ".n"), { textContent: n }, t);
      tl.set($(cap, ".t"), { textContent: txt }, t);
      tl.fromTo($(cap, ".t"), { y: 24, opacity: 0.4, filter: "blur(6px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.3, ...NI }, t);
    });
    tl.to($(cap, ".cap"), { opacity: 0, duration: 0.3 }, 21.7);
  },
};

# Direction: structure, shots, pacing

Read before writing the scenario (step 4) and again before building (step 6). Silent does not mean calm: without music, motion, cuts and easing are the whole rhythm.

## Contents
- Film structure by length
- Story
- Pacing rules
- Framing rules
- Silent-film rules
- Reference film
- Coverage rule
- Shot library (14 shots, each with code that was rendered and checked)
- Red flags

## Film structure by length

| length | hook | promise | tour | payoff | end card |
|---|---|---|---|---|---|
| 15 s | 0–1.5 | 1.5–3 | 3–11, 4 shots of ~2 s | 11–13 | 13–15 |
| 20 s | 0–1.5 | 1.5–4 | 4–15, 6–7 shots | 15–18 | 18–20 |
| 30 s | 0–2 | 2–6 | 6–23, 8–10 shots, one breather | 23–27 | 27–30 |
| 45 s | 0–2 | 2–8 | 8–36, 12–15 shots in 2–3 chapters | 36–42 | 42–45 |

- **Hook (first second).** The first frame already shows the strongest image or word, full size and sharp, and something is already moving. Never a black or logo-only opening. Good hooks: the product's most distinctive moving thing (a live chart, a map, a canvas), a one-word headline with the app rising over it, a question typed into the app's own input.
- **Promise.** One line of copy, the sentence from PRODUCT.md. On screen with motion, not as a held title.
- **Tour.** One shot per view or wow moment from PRODUCT.md, ordered by what the viewer needs to understand, not by the sidebar. Every shot has one thing that moves in it (see shot library).
- **Payoff.** The result of using the product, not another feature: the answer arrives, the alert fires, the number lands. It is the biggest, cleanest frame of the film. Hold it ~1 s with slow motion still running.
- **End card.** Logo, tagline, call to action. The same crisp rules apply: letters rise from an offset, no blur, no fade from nothing.

## Story

Every film is one story: **problem → hero → action in the app → payoff that closes the problem.** One concrete case carries it (a person, a city, a file, a number in a real situation); features appear only as steps of that case. PRODUCT.md (Discovery) supplies the case and the promise. The payoff lands on the drop (silent: the strongest bar, 60–75% in). Test: tell the film in three sentences without naming a feature. Type and camera techniques that serve each beat, with code and music events, are in `motion-vocabulary.md`.

## Pacing rules

1. **Something moves in every frame.** Camera drift, a counter, a cursor, a chart. A static hold is at most 0.6–0.8 s; after that a new element must move or the shot ends.
2. **A new visual idea every 1–2 s in a 20 s film** (every 2–3 s at 45 s). Cut, new view, new zoom target, new interaction.
3. **Interactions, not swaps.** Whole screens appearing instantly is the weakest thing a film can do. Show the cursor moving and clicking, the route transitioning, the list filling, the number counting.
4. **One idea per shot**, shot length 1.2–2.2 s. Longer than 2.5 s needs two moving things in sequence.
5. **Entrances are crisp on cut frames.** The frame of a cut shows the new thing sharp and fully opaque. Enter by position (offset), scale (0.9–1.2) or a small blur (≤ 6 px) from full opacity. Never a fade from 0 or 0.35: it reads as dim.
6. **Don't leave the frame dark.** At least two thirds of the frames of a dark-UI film should have a bright, large element (a number, a light panel, a headline). A theme reveal, a white caption or a light screen are the tools.
7. **Easing carries energy.** Fast in, soft out (`expo.out`, `power3.out`) for arrivals; `power2.inOut` for camera moves; `none` only for slow continuous drifts and scrubs.

## Framing rules

- **The camera always lands on content.** The target (a number, a chart, an input with its text) fills 40–70% of the frame. Never zoom onto empty toolbar, empty margin, or the top of a card whose number is below the fold. Check each end point of a camera tween in a still.
- **Aim at the thing, not at the strip.** `center()` of a full-width element is the middle of its strip. Measure the number, the icon or the text inside it.
- **Text on screen is at least ~28 px after zoom** (UI text × camera scale). If the label you care about is smaller, zoom more or show it as a caption.
- **Keep the click target in frame until the click lands**, then move the camera to the result. Two camera tweens in sequence, never overlapping.
- **`focus()` clamps to the replica's rect** (`box`). That keeps stage margins out of frame but also pins the view to the app's edge: aim at the point you want 1/3 into the frame, not at its centre, if the left part matters (e.g. an input with typed text).
- **Captions go in the margin or the empty corner, never over content,** are opaque white or solid dark, and are appended to the scene after `wrap()` so they don't zoom. They are fully visible on the cut frame (enter by x offset only).

## Silent-film rules

- No `hits`, no shakes, no pulses, no rings, no hard flashes: they read as hits of a sound that isn't there. Energy comes from camera moves, fast cuts, counters, cursor motion and easing.
- Keep cuts on the bar grid (`music.mjs grid` prints it) so music can be added later by re-timing: at 120 BPM a cut every 0.5, 1.0 or 2.0 s.
- Whip pans, zoom-throughs and route transitions are the silent film's "drops". Put the biggest one at 60–75% of the film.

## Coverage rule

A launch film shows **every major view in PRODUCT.md at least briefly**, and every wow moment. If the views don't fit in sequence, use a split-screen montage or a 0.8 s-per-view run (shots 6, 8, 10). Error and empty states (a 404, "no results") earn a beat when they carry personality (shot 13). Views you skip must be named in SCENARIO.md with a reason.

## Shot library

All snippets are from a proof film rendered on a placeholder app and checked in stills. `s` is the scene element, `cam = wrap(s)`, `box = rect($(s, ".app"))`. Times are absolute seconds; `t0` is the scene start. Selectors (`.o-in`, `.o-stat`, …) are placeholders: use the replica's classes.

**Entrance rule used throughout.** `immediateRender: false` (`NI`) means: before the tween starts, the element shows its CSS state. A plain `fromTo` paints its from-state at once (build time) and keeps it until the start. So an element that must be *absent or offset until later* (toast, chip, rows landing mid-shot, stagger children) takes a plain `fromTo`; a camera or a repeated move that starts from where the element already is takes `NI`. Plain `fromTo` on an element that another tween also drives will fight: give each property one owner.

### Helpers used by several shots

`cursor`, `caption`, `scrubChart`, `push`, `show` and `reveal` are engine helpers (`film-api.md`, *Shot helpers*): destructure them from the `build` argument. Their CSS (`.cursor`, `.ripple`, `.cap`) is in `base.css`; override it in `film.css` to match the product.

### 1. Hook: kinetic word with the app rising over it
The word is fully visible and sharp on frame 1; the app is parked below the frame and rises over it.
```js
const s = scene(`<div style="position:absolute;left:0;right:0;top:10px;text-align:center;font:800 400px/.85 var(--font-display);color:var(--accent)"><span class="kw">Ask</span></div>${UI.app()}`, 0, 1.6);
const cam = wrap(s), app = $(s, ".app");
tl.fromTo(splitChars($(s, ".kw")), { y: 50, scale: 1.2 }, { y: 0, scale: 1, duration: 0.7, stagger: 0.06, ease: "back.out(1.6)" }, 0);
tl.fromTo(app, { y: 760 }, { y: 250, duration: 1.0, ease: "expo.out" }, 0);   // plain fromTo: parked from frame 1
push(cam, 0, 1.6, 1, 1.07);
```

### 2. Cursor, click ripple, live typing
```js
const IN = rect($(s, ".search")), P = { go: center($(s, ".go")) };         // measure first
cursor(cam, { x: 1500, y: 640 }, [
  { to: { x: IN.l + 300, y: (IN.t + IN.b) / 2 }, t: t0, dur: 0.6, click: true },
  { to: P.go, t: t0 + 1.35, dur: 0.35, click: true },
]);
tl.set($(s, ".search"), { className: "search" }, 0);
tl.set($(s, ".search"), { className: "search on" }, t0 + 0.6);               // focus ring on the click
type($(s, ".q"), "revenue", t0 + 0.65, t0 + 1.25, (k) => { if (!k) $(s, ".q").textContent = "Search…"; });  // placeholder when empty, both scrub directions
// camera: input left third in frame, so the typed text is visible
tl.fromTo(cam, focus({ x: IN.l + 560, y: IN.t + 200 }, 1.5, { box }), { ...focus({ x: IN.l + 640, y: IN.t + 230 }, 1.7, { box }), duration: 1.8, ease: "power1.inOut", ...NI }, t0);
```

### 3. Numbers count, bars grow (real tweens inside the captured screen)
Counters start from ~70% of the end value, not 0, so the cut frame shows a real number. All start on the cut frame.
```js
count($(s, ".stat-1 .v"), 900, 1284, t0, 1.2);
count($(s, ".stat-3 .v"), 3.9, 4.8, t0, 1.0, (v) => v.toFixed(1));
tl.fromTo($$(s, ".bars i"), { scaleY: 0.12 }, { scaleY: 1, duration: 0.7, stagger: 0.05, ease: "back.out(1.5)" }, t0);  // css: transform-origin: 50% 100%
// slow push on the middle of stats+bars, never on empty margin
tl.fromTo(cam, focus(mid, 1.2, { box }), { ...focus(mid, 1.45, { box }), duration: 1.6, ease: "power1.inOut", ...NI }, t0);
caption(s, "Live numbers", t0);
```

### 4. Chart scrubbed continuously, camera follows the marker
`scrubChart` drives dot, guide line, highlighted path and tooltip from one proxy value: a pure function of it, seek-safe in both directions.
```js
// the scene holds .tip, .dot, .guide, .hl (display:none in the HTML); xy = chart points [x,y] in svg units, vals = value per point
scrubChart(s, { xy, vals: pts, pad: [padL, padT] }, t0 + 0.05, t0 + 1.5, 0.03, 0.97);
const c = rect($(s, ".chart")), cy = (c.t + c.b) / 2;   // camera tracks left to right over the same time
tl.fromTo(cam, focus({ x: c.l + 420, y: cy - 60 }, 1.45, { box }), { ...focus({ x: c.r - 420, y: cy - 60 }, 1.45, { box }), duration: 1.6, ease: "sine.inOut", ...NI }, t0);
```
When the chart has real data, take `xy`/`pts` from the same arrays the replica renders from, so the marker sits on the line.

### 5. List staggers in, toast slides
```js
tl.fromTo($$(s, ".row"), { y: 80, scale: 0.97, filter: "blur(8px)" }, { y: 0, scale: 1, filter: "blur(0px)", duration: 0.45, stagger: 0.07, ease: "power3.out" }, t0);
app.insertAdjacentHTML("beforeend", '<div class="toast">Order shipped</div>');   // inside the app window: it clips at the window edge
tl.fromTo($(s, ".toast"), { x: 520 }, { x: 0, duration: 0.5, ease: "expo.out" }, t0 + 0.6);   // plain fromTo: parked off-window until its time
```
A toast that pushes layout (an alert banner) uses the height pattern in `film-api.md`.

### 6. Route transition: click the nav, the next view pushes in
Insert the target view into the viewport and park it at `xPercent: 100`.
```js
vp.insertAdjacentHTML("beforeend", UI.radar());
const view = $(vp, ".view");
tl.set(view, { xPercent: 100 }, 0);
const P = { nav: center($$(s, ".nav")[1]), vp: center(vp) };
cursor(cam, { x: 900, y: 700 }, [{ to: { x: P.nav.x + 20, y: P.nav.y }, t: t0, dur: 0.5, click: true }]);
// nav highlight: base state at 0, switch at the click
tl.set(navs[0], { className: "nav on" }, 0);  tl.set(navs[1], { className: "nav" }, 0);
tl.set(navs[0], { className: "nav" }, t0 + 0.5);  tl.set(navs[1], { className: "nav on" }, t0 + 0.5);
tl.to($(s, ".main"), { x: -260, scale: 0.96, duration: 0.6, ease: "power3.inOut" }, t0 + 0.5);
tl.to(view, { xPercent: 0, duration: 0.6, ease: "power3.inOut" }, t0 + 0.5);
// something in the new view already moves: a radar sweep, a map, a chart
tl.fromTo(sweep, { rotation: 0 }, { rotation: 540, duration: 1.1, ease: "none", ...NI }, t0 + 0.5);
// camera: keep the nav in frame until the click, then go to the new view (two tweens, no overlap)
tl.fromTo(cam, focus(center(app), 1.1, { box }), { ...focus({ x: P.nav.x + 500, y: P.nav.y + 150 }, 1.2, { box }), duration: 0.5, ease: "power1.out", ...NI }, t0);
tl.to(cam, { ...focus(P.vp, 1.3, { box }), duration: 1.1, ease: "power2.inOut" }, t0 + 0.5);
```
If the app has a real route animation, reproduce its easing; if a view is a canvas or map that animates (a radar, a map), use the frames `capture.mjs` grabs (`canvas: { frames }` in `states.json`, played with `UI.frames` from the starter) instead of crossfading stills.

### 7. Scroll a tall page
A tall page is one `.main` taller than the viewport; scrolling is a `y` tween on it. Put sticky headers outside `.main`.
```js
const dist = main.offsetHeight - vp.offsetHeight, V = center(vp);          // measure before tweening
tl.fromTo(main, { y: 0 }, { y: -dist, duration: 1.3, ease: "power2.inOut", ...NI }, t0 + 0.1);
tl.fromTo($(s, ".scrollbar"), { y: 0 }, { y: vp.offsetHeight - 150 - 24, duration: 1.3, ease: "power2.inOut", ...NI }, t0 + 0.1);
tl.fromTo(cam, focus(V, 1.2, { box }), { ...focus(V, 1.32, { box }), duration: 1.6, ease: "none", ...NI }, t0);
```
Don't scroll an `overflow: auto` element: real scroll position isn't a function of `t`.

### 8. Split-screen montage of three views
Three panels, each already showing content on the cut frame (offset 420 px, not off-screen), each with its own motion.
```js
const panels = $$(s, ".panel");                                              // 640 px wide each, left 0 / 640 / 1280
tl.fromTo(panels, { y: 420 }, { y: 0, duration: 0.7, stagger: 0.1, ease: "expo.out" }, t0);
count($(panels[0], ".v"), 700, 1284, t0, 1.0);
tl.fromTo($$(panels[1], ".bars i"), { scaleY: 0.12 }, { scaleY: 1, duration: 0.6, stagger: 0.04, ease: "back.out(1.5)" }, t0);
tl.fromTo($$(panels[2], ".row"), { x: 120 }, { x: 0, duration: 0.45, stagger: 0.06, ease: "power3.out" }, t0);
push(cam, t0, t0 + 1.6, 1, 1.06);
```
Build each panel from the replica's own component builders so it is the real UI, not a mock.

### 9. Zoom through into a component, match cut to its detail
Zoom until a number fills the frame, then cut to a scene that shows the same number at the same size. `clamp: false` lets the camera aim exactly.
```js
const N = center($(s, ".stat-1 .v"));                                        // .v must be inline-block so its centre is the digits
tl.fromTo(cam, { x: 0, y: 0, scale: 1 }, { ...focus(N, 5.2, { clamp: false }), duration: 0.8, ease: "power3.in", ...NI }, t0);
// detail scene at t0+0.8: the number at font-size = original × 5.2, centred
const d = scene(`<div class="center"><div class="display dnum" style="font-size:437px">1,284</div></div><div class="chip dchip" style="left:1180px;top:200px">+18% this week</div>`, t0 + 0.8, t0 + 1.6);
count($(d, ".dnum"), 1284, 1420, t0 + 0.8, 0.8);
tl.fromTo($(d, ".dchip"), { scale: 0.5, y: 40, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: "back.out(2.2)" }, t0 + 0.95);
```

### 10. Whip pan between two screens
Two screens side by side on a 3840 px strip; the strip moves while blur and skew peak and return. Different properties, so no tween fights.
```js
const s = scene(`<div class="strip"><div style="left:0">${UI.home()}</div><div style="left:1920px">${UI.list()}</div></div>`, t0, t0 + 1.6);  // css: .strip{position:absolute;width:3840px;height:1080px} .strip>div{position:absolute;top:0;width:1920px;height:1080px}
const cam = wrap(s), strip = $(s, ".strip");
tl.fromTo(strip, { x: 0 }, { x: -1920, duration: 0.5, ease: "power4.inOut", ...NI }, t0 + 0.5);
tl.fromTo(strip, { filter: "blur(0px)", skewX: 0 }, { filter: "blur(26px)", skewX: -10, duration: 0.22, ease: "power2.in", ...NI }, t0 + 0.5);
tl.to(strip, { filter: "blur(0px)", skewX: 0, duration: 0.28, ease: "power2.out" }, t0 + 0.72);
tl.fromTo($$(strip.children[1], ".row"), { y: 28 }, { y: 0, duration: 0.4, stagger: 0.05, ease: "power3.out" }, t0 + 0.7);  // landing screen already moves
push(cam, t0, t0 + 1.6, 1, 1.12);   // a slow push the whole time
```
The screen before the whip must also move (scrub, counter) so the 0.5 s before the whip isn't static.

### 11. Parallax tilt of the whole window
Perspective on the tilting layer, floating chips at different `z` in front of it. The app window must not be `overflow: visible` with 3D children inside (overflow hidden flattens the tree), so parallax comes from sibling chips, not from elements inside the window.
```js
const s = scene(`<div class="tilt" style="position:absolute;inset:0;transform-style:preserve-3d">${UI.app()}<div class="chip c1" style="left:1380px;top:150px">+18% this week</div><div class="chip c2" style="left:90px;top:800px">92 orders</div></div>`, t0, t0 + 1.6);
const tilt = $(s, ".tilt");
gsap.set(tilt, { transformPerspective: 2400 });
gsap.set($(s, ".c1"), { z: 160 });  gsap.set($(s, ".c2"), { z: 120 });
tl.fromTo(tilt, { rotationY: -20, rotationX: 10, scale: 0.9 }, { rotationY: 12, rotationX: -3, scale: 1.04, duration: 1.6, ease: "sine.inOut", ...NI }, t0);
tl.fromTo($(s, ".c1"), { y: 30 }, { y: -30, duration: 1.6, ease: "sine.inOut", ...NI }, t0);
count($(s, ".stat-1 .v"), 1100, 1284, t0, 1.2);                               // the UI inside keeps moving
```
The window ends at 85–95% of the frame: tilt shots are the exception to the 40–70% rule because the window is the subject.

### 12. Theme reveal from the toggle
Two stacked copies (dark, light). Measure the toggle with both present; `reveal(el, point, t0, dur?, r0 = 70)` hides the copy until `t0` and grows a circle from the toggle. `r0` is never 0, so the first frame already shows a disc of the new theme; on a hit frame use 120.
```js
const T = center($(s, ".theme-toggle"));
cursor(cam, { x: 900, y: 600 }, [{ to: T, t: t0, dur: 0.5, click: true }]);
reveal(light, T, t0 + 0.5);                                                    // display none until then, disc starts at r = 70
```
If the zoom is high the disc looks like a flat blob: reveal at camera scale ≤ 1.2 so the new theme is recognisable inside the disc, or use a diagonal wipe (`clipPath: polygon()`).

### 13. 404 as a witty beat
Give the error page one joke and one motion: digits fall, the zero rolls, a line types itself, the cursor goes to "Back" and clicks (the click is the cut out). Keep the digits in frame on the first frame.
```js
tl.fromTo($$(s, ".d1, .d3"), { y: -140 }, { y: 0, duration: 0.6, stagger: 0.1, ease: "bounce.out" }, t0);
tl.fromTo($(s, ".d2"), { y: -140, rotation: -360 }, { y: 0, rotation: 0, duration: 0.9, ease: "back.out(1.4)" }, t0);
type($(s, ".t404"), "This page didn't ship.", t0 + 0.5, t0 + 1.2, (k) => { if (!k) $(s, ".t404").textContent = ""; });
cursor(cam, { x: 1500, y: 300 }, [{ to: { x: 1000, y: 800 }, t: t0 + 0.2, dur: 0.5 }, { to: B, t: t0 + 1.3, dur: 0.5, click: true }]);   // B = center of the button
```
Use the app's real 404 copy and layout (captured by Discovery) and put the joke in one caption, or skip the joke if the real page has none.

### 14. End card with kinetic type and a live input
```js
tl.fromTo(splitChars($(s, ".end")), { y: 120 }, { y: 0, duration: 0.7, stagger: 0.05, ease: "expo.out" }, t0);   // offset only: sharp on the first frame
type($(s, ".q2"), "orbit.app", t0 + 0.7, t0 + 1.4);
press($(s, ".go"), t0 + 1.7);
tl.to($(s, ".center"), { scale: 1.06, duration: 2.8, ease: "none" }, t0);
```
Don't `splitChars` a `.gtext` word (lessons #9).

## Reference film

When the user has a film whose feel they want: break it into a frame sheet (`sheet.mjs` reads film pages, not MP4s): `ffmpeg -i ref.mp4 -vf "fps=2,scale=480:-1,tile=6x5" <film>/review/reference.png`, Read it, list its techniques (cut rhythm, type, camera, colour, what moves) and propose your own character that borrows the techniques, never the content.

## Red flags

| in the stills or the scenario | fix |
|---|---|
| A zoom whose end frame shows empty chrome or the top of a card | Re-aim at the content; measure the number or text, not the container |
| A shot that is the same for 2 s | Add the moving thing (shot 3, 4, 5) or cut it to 0.8 s |
| A screen that appears with no interaction | Add cursor + click, or a route transition (shots 2, 6) |
| Half the film is dark UI | Add the light theme, a bright number, a white caption, a light end card |
| A view from PRODUCT.md missing from the film | Add it to a montage (shot 8) or name why it is skipped |
| Dim cut frames (opacity 0.35) | Enter by offset/scale from full opacity |
| A caption over the content, or half-faded on its first frame | Move it to the margin; offset-only entrance |
| Words/UI text under ~28 px after zoom | Zoom further or caption it |
| Fake beat effects in a silent film | Remove; use motion and cuts |
| A shot that animates something that isn't in the real app | Replace with what the real app does |

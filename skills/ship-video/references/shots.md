# Shot library

Read at step 6 (build), after `film-api.md`. 14 shots, each with code that was rendered and checked in stills. Structure, pacing and framing rules are in `direction.md`; type and camera techniques are in `motion-vocabulary.md`.

## Contents
1. Hook: kinetic word, app rising (also a captured 1920x1080 replica)
2. Cursor, click ripple, live typing (also typing in a captured input)
3. Numbers count, bars grow
4. Chart scrubbed continuously (also hover-scrub on a captured chart)
5. List staggers in, toast slides
6. Route transition
7. Scroll a tall page
8. Split-screen montage
9. Zoom through, match cut
10. Whip pan
11. Parallax tilt
12. Theme reveal
13. 404 as a witty beat
14. End card with a live input
Also: dialog or palette shot, payoff shot (after 14), step-bar caption, drag and drop, frame a rect, move a captured overlay into frame (after the payoff shot)

All snippets are from a proof film rendered on a placeholder app and checked in stills. `s` is the scene element, `cam = wrap(s)`, `box = rect($(s, ".app"))`. Times are absolute seconds; `t0` is the scene start. Selectors (`.o-in`, `.o-stat`, …) are placeholders: use the replica's classes.

**Entrances:** which tweens take `NI` and which a plain `fromTo` is explained once, in `film-api.md` (*Entrances*). Comments below say "plain fromTo" where it matters.

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
**With a captured replica** (a full 1920x1080 `UI.shot(name)`, not the small `UI.app()` window): put it in a scaled box so it fits under the word and still rises.
```js
// scene html: the word + a wrapper around the captured screen, scaled to 72% from its top centre
const pop = `<div class="pop" style="position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:50% 0;transform:scale(.72)">${UI.shot("home")}</div>`;
tl.fromTo($(s, ".pop"), { y: 1080 }, { y: 300, duration: 1.0, ease: "expo.out" }, 0);   // plain fromTo: parked below from frame 1
```
Check the end frame in a still: the app's header must not touch the word.

### 2. Cursor, click ripple, live typing
Touch apps: use a finger (round dot, ripple, press) instead of the arrow cursor; a swipe moves the dot with the row.
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

**Typing into a captured input.** Don't swap a "typed" state for an empty one. Keep one state (the input focused, empty) and run `typeOn()` (or `type()`) with the input's `value` set in the `onUpdate` callback:
```js
const inp = $(UI.pick(s, "palette"), "input"), word = "Reykjavik";
typeOn(inp, word, times, (k) => { inp.value = word.slice(0, k); });             // k = characters typed so far; seek-safe both ways
```
If the app renders results from the value, capture the 1-2 result states (`fill` in `states.json`) and `UI.swap` to them on the beat the results should appear; only the typing runs on the input.

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

**On a captured chart** the replica has no `.tip/.dot/.guide/.hl`. Two ways, both fine:
1. *Swap captured hover states.* In `states.json` capture 3-5 states with `hover` on points along the line (`{ "name": "h1", "actions": [{ "hover": ".chart rect:nth-child(8)" }, { "wait": 150 }] }`), `UI.swap` to the next one every 0.25-0.4 s, and drive a `cursor()` along the same path so it reads as a scrub.
2. *Overlay.* Add `.tip/.dot/.guide/.hl` to the scene yourself, positioned over the captured svg from the chart's real `xy`, and run `scrubChart` on them.

### 5. List staggers in, toast slides
```js
tl.fromTo($$(s, ".row"), { y: 80, scale: 0.97, filter: "blur(6px)" }, { y: 0, scale: 1, filter: "blur(0px)", duration: 0.45, stagger: 0.07, ease: "power3.out" }, t0);
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

**Target at the bottom of a tall page.** `focus()` clamps to the replica's box, so a card at the very bottom can't reach the frame centre. Let `.main` scroll further than the page allows: tween `y` to `-(main.offsetHeight - vp.offsetHeight + 150)` (the empty strip below the page stays out of frame) and aim `focus()` at the card's position minus that scroll. Check the end frame in a still: the card sits mid-frame, not in the lower third.

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
Keep the reveal short (about 0.45 s) and `tl.set(old, { display: "none" }, end)` afterwards: translucent cards of the old theme ghost the new one while both show. If the toggle and the content are far apart, see `direction.md` (*Theme reveal when the toggle and the content are far apart*). If the zoom is high the disc looks like a flat blob (a pale circle over empty background): reveal at camera scale ≤ 1.2 with the origin on a content-dense area, so the new theme is recognisable inside the disc, or use a diagonal wipe (`clipPath: polygon()`), the safer default on light themes. Give the edge a highlight so it reads as a surface: a ring element at the same centre and radius (1.5 px accent border, `box-shadow: 0 0 40px rgb(0 0 0 / .35)`) that grows with the same tween as the clip circle.

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

### Dialog or palette shot
A scrim darkens the whole captured frame, so a dialog at camera 1.0 is a dark frame with a small box in it. Zoom onto the dialog until it fills at least 50% of the frame (usually 1.8-2.4×), aim `focus()` at its centre (measure it with `UI.measure`), and keep the scrim at the edges only. Type into its input as in shot 2 and cut out on the Enter press. Never two dark shots in a row.

### Payoff shot
The payoff is the peak of the film: the tightest framing (the result fills 60-70% of the frame), the biggest motion (the largest zoom or count of the film, a pull-back on the hit) and the longest hold (about 1 s with a slow push still running, never shorter than the shots before it). If an earlier shot is bigger or tighter, shrink that one.

### Step-bar caption (how-to films)
A how-to's instruction must stay on screen while the viewer watches the action, and full-bleed UI has no free margin. Reserve a **caption band** (a strip of about 160-180 px at the bottom or top, solid colour) and frame the app in the rest of the frame: clip the scene to the remaining area and offset every `focus()` target by half the band so the target is centred in what is left. Use the engine's step-band helper (names: `film-api.md`) rather than hand-clipping. Each step swaps its caption on the step's first frame ("1 Press and hold the card", number in a chip) with a thin progress line across the band; the caption text is 28 px or more (56 for feeds). The band is not content: don't count it toward the 40-70% rule.

### Drag and drop
The capture has no pointer drag, so stack states and tween the ghost.
1. Capture `drag-start` (card lifted or source dimmed, column highlight off), `drag-over` (target column highlighted) and `dropped` (card in its new place, counts updated) as stacked states (`UI.stack`).
2. A **ghost** (a clone of the card, slight tilt and shadow) tweens from the card to the target along the cursor path: the cursor hides under it or rides its corner.
3. **Swap `drag-start` to `drag-over` when the ghost crosses the column boundary**, and `drag-over` to `dropped` on the release frame. Compute the crossing time from the ease (`ease(p)` solved for the boundary x), not by eye, so the highlight changes as the ghost crosses.
4. Land with a small bounce and a ring on the card; the toast or counter updates on the same frame. Hold the result 1.5 s or more in a how-to.
If the real page's own drag handler can be driven by the capture's drag action, use that for the states and keep the ghost tween for the motion.

### Frame a rect
`focus()` frames a point and a scale. To fit a column, a card or a form with padding, use the engine's rect-framing helper (it derives the scale from the rect, the padding and the frame). In a narrow or top-heavy app it keeps crop edges on column and card boundaries so no word is sliced at the frame edge.

### Move a captured overlay into frame
A fixed toast, snackbar or portal is anchored to a far corner of the 1080 wrapper and lands outside a zoomed frame. Move the overlay's parent next to its target inside the scene (`el.parentElement`, then re-append and position by the measured rect of the target) and animate it there; check each toast state's HTML contains the toast text (capture with the root that includes portals).

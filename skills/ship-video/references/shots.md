# Shot library

Read at step 6 after `film-api.md`. Each recipe was rendered and checked in stills. `s` is the scene, `cam = wrap(s)`, `box = rect(app)`, `t0` the scene start, `beat = 60 / bpm`, `D` the film's duration; selectors are placeholders for the replica's own classes. Why each shot works is in `direction.md`.

## Contents
- Type: flood + word, word per beat, letter drop, caret ending
- Hook: app rising under a word
- Pointer and typing (also into a captured input)
- Numbers and bars
- Chart scrub
- Route transition
- Scroll a tall page
- Montage and screen wall
- Zoom-through, whip pan, tilt
- Focus zoom, pull back on the hit
- Theme reveal
- Dialog or palette
- Key number over dense UI
- Drag and drop, file drop
- Data over time
- Turn-based games
- Into the end card
- Sound-coded effects (music films only)

## Type

**Flood + word** (hook, chapter). The word is full size and sharp on the hit frame, then keeps moving.
```js
const s = scene(`<div style="position:absolute;inset:0;background:var(--f-accent)"></div><div class="center"><div class="display w" style="font-size:420px">Slow.</div></div>`, t0, t0 + 2);
tl.fromTo($(s, ".w"), { scale: 1.5 }, { scale: 1, duration: 0.5, ease: "expo.out" }, t0);
tl.to($(s, ".w"), { scale: 1.06, duration: 1.5, ease: "none" }, t0 + 0.5);
```

**Word per beat** (the promise in rhythm): each word its own layer, hard swap on the beat, alternating direction.
```js
const words = ["Plan", "it.", "Cut", "it."];
const s = scene(words.map((w) => `<div class="center"><div class="display" style="font-size:380px">${w}</div></div>`).join(""), t0, t0 + words.length * beat);
$$(s, ".center").forEach((el, i) => {
  const t = t0 + i * beat;
  show(el, t, i < words.length - 1 ? t + beat : null);
  tl.fromTo($(el, ".display"), { scale: 1.35, y: i % 2 ? 50 : -50 }, { scale: 1, y: 0, duration: 0.4, ease: "expo.out" }, t);
});
```

**Letter drop** (a name with weight): `tl.fromTo(splitChars($(s, ".title")), { y: -420 }, { y: 0, duration: 0.7, stagger: 0.04, ease: "bounce.out" }, t0);`

**Caret ending**: the tagline types, the caret blinks (`ease: "steps(1)"`, a finite `repeat`), then stretches across the frame into the end card's flood on the final hit.
```js
type($(s, ".tag"), "Ship the film.", t0 + 0.1, t0 + 1.0);
tl.fromTo($(s, ".cc"), { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "steps(1)", repeat: 3, yoyo: true, ...NI }, t0 + 1.0);
tl.to($(s, ".cc"), { scaleX: 160, scaleY: 3, duration: 0.5, ease: "power4.in" }, t0 + 2.0);
```

## Hook: app rising under a word

```js
const s = scene(`<div class="kw" style="position:absolute;inset:10px 0 auto;text-align:center;font:800 400px/.85 var(--f-font-display)">Ask</div>
  <div class="pop" style="position:absolute;inset:0;transform-origin:50% 0;transform:scale(.72)">${UI.shot("home")}</div>`, 0, 1.6);
const cam = wrap(s);
tl.fromTo(splitChars($(s, ".kw")), { y: 50, scale: 1.2 }, { y: 0, scale: 1, duration: 0.7, stagger: 0.06, ease: "back.out(1.6)" }, 0);
tl.fromTo($(s, ".pop"), { y: 1080 }, { y: 300, duration: 1.0, ease: "expo.out" }, 0);   // parked below from frame 1
push(cam, 0, 1.6, 1, 1.07);
```
Check the end frame: the app's header must not touch the word.

## Pointer and typing

```js
const steps = [
  { to: ".search", fx: 0.3, t: t0, dur: 0.6, click: true },
  { to: ".go", t: t0 + 1.35, dur: 0.35, click: true },
];
cursor(cam, { x: 1500, y: 640 }, steps);
autoCam(cam, steps, { box });                        // frames each burst of clicks
const inp = $(UI.pick(s, "search"), "input"), q = "revenue";
const times = [...q].map((_, i) => t0 + 0.65 + i * 0.09 + (rnd() - 0.5) * 0.05);
typeOn(inp, q, times, (k) => { inp.value = q.slice(0, k); });   // seek-safe both ways
```
Type into one captured state (input focused, empty); never swap an "empty" and a "typed" capture. If the app renders results from the value, capture the result state and `UI.swap` to it on the beat the results should appear. For a phone UI use `finger` with `tap`.

## Numbers and bars

```js
count($(s, ".stat .v"), 900, 1284, t0, 1.2);                   // starts near the end value, ends on the real one
tl.fromTo($$(s, ".bars i"), { scaleY: 0.12 }, { scaleY: 1, duration: 0.7, stagger: 0.05, ease: "back.out(1.5)" }, t0);   // transform-origin: 50% 100%
tl.fromTo(cam, focus(mid, 1.2, { box }), { ...focus(mid, 1.45, { box }), duration: 1.6, ease: "power1.inOut", ...NI }, t0);
```

## Chart scrub

```js
scrubChart(s, { xy, vals, pad: [padL, padT] }, t0 + 0.05, t0 + 1.5, 0.03, 0.97);   // xy, vals from the arrays the chart renders
const c = rect($(s, ".chart")), cy = (c.t + c.b) / 2;
tl.fromTo(cam, focus({ x: c.l + 420, y: cy }, 1.45, { box }), { ...focus({ x: c.r - 420, y: cy }, 1.45, { box }), duration: 1.6, ease: "sine.inOut", ...NI }, t0);
```
A captured chart has no `.tip/.dot/.guide/.hl`: add them over the svg yourself, or capture 3–5 `hover` states along the line and `UI.swap` between them every 0.3 s with the cursor moving along.

## Route transition

The next view pushes in as the nav item is pressed, and something in it already moves.
```js
const s = scene(UI.stack(["overview", "radar"]), t0, t0 + 2), cam = wrap(s);
const nav = target(".nav a:nth-child(2)", { in: "overview" });
cursor(cam, { x: 900, y: 700 }, [{ to: nav, t: t0, dur: 0.5, click: true }]);
tl.fromTo(cam, focus({ x: nav.x + 300, y: nav.y }, 1.5, { box }), { ...focus({ x: nav.x + 320, y: nav.y }, 1.6, { box }), duration: 0.5, ...NI }, t0);   // frame the press
UI.swap(tl, s, "radar", t0 + 0.5);
tl.fromTo($(UI.pick(s, "radar"), "main"), { x: 260 }, { x: 0, duration: 0.6, ease: "power3.out" }, t0 + 0.5);
tl.to(cam, { ...focus(center(app), 1.3, { box }), duration: 1.1, ease: "power2.inOut" }, t0 + 0.55);   // then to the new view
UI.frames(tl, $(UI.pick(s, "radar"), "img"), t0 + 0.5, t0 + 2);                                         // the canvas keeps moving
```

## Scroll a tall page

Capture with `{ tall: true }`; scroll with `scrollTo(main, y, t, dur)` (sticky headers via `pin`). Map points measured before the scroll with the returned `at(p)`. To bring a target at the very bottom to mid-frame, scroll ~150 px past the page end; the empty strip stays below the frame.

## Montage and screen wall

**Split screen**: three panels from the replica's own states, each already showing content on the cut frame (offset 420 px, not off-screen), each with its own motion.
```js
tl.fromTo($$(s, ".panel"), { y: 420 }, { y: 0, duration: 0.7, stagger: 0.1, ease: "expo.out" }, t0);
```
**Screen wall** (every view, fast): a 3×3 grid of captured screens scaled to 1/3, one tile per kick, the camera tight on the first tile and pulling back as the wall fills.
```js
names.forEach((_, i) => { const t = t0 + i * beat / 2; show($(s, ".t" + i), t); tl.fromTo($(s, ".t" + i), { scale: 1.25 }, { scale: 1, duration: 0.3, ease: "expo.out" }, t); });
tl.fromTo(cam, focus(center($(s, ".t0")), 2.6, { clamp: false }), { x: 0, y: 0, scale: 1, duration: 2.4, ease: "power2.inOut", ...NI }, t0);
```
A montage of hard cuts is one scene per cut, not camera `set`s inside one scene.

## Zoom-through, whip pan, tilt

**Zoom-through and match cut** (the silent film's peak): zoom until a number fills the frame, then cut to a scene with the same number at the same size.
```js
const N = center($(s, ".stat .v"));
tl.fromTo(cam, { x: 0, y: 0, scale: 1 }, { ...focus(N, 5.2, { clamp: false }), duration: 0.8, ease: "power3.in", ...NI }, t0);
const d = scene(`<div class="center"><div class="display" style="font-size:437px">1,284</div></div>`, t0 + 0.8, t0 + 1.6);
```
**Whip pan**: two screens side by side on a 3840 px strip; the strip moves while blur and skew peak and return.
```js
tl.fromTo(strip, { x: 0 }, { x: -1920, duration: 0.5, ease: "power4.inOut", ...NI }, t0 + 0.5);
tl.fromTo(strip, { filter: "blur(0px)", skewX: 0 }, { filter: "blur(26px)", skewX: -10, duration: 0.22, ease: "power2.in", ...NI }, t0 + 0.5);
tl.to(strip, { filter: "blur(0px)", skewX: 0, duration: 0.28, ease: "power2.out" }, t0 + 0.72);
```
**Parallax tilt**: perspective on a wrapper, floating chips at different `z` beside (not inside) the app window; the window may fill 85–95% here because the window is the subject.
```js
gsap.set(tilt, { transformPerspective: 2400 });
tl.fromTo(tilt, { rotationY: -20, rotationX: 10, scale: 0.9 }, { rotationY: 12, rotationX: -3, scale: 1.04, duration: 1.6, ease: "sine.inOut", ...NI }, t0);
```

## Focus zoom, pull back on the hit

The camera sits close on what matters while the action happens, then pulls back on the hit so the result is seen in context.
```js
tl.fromTo(cam, focus(P.input, 2.0, { box }), { ...focus(P.input, 2.1, { box }), duration: 1.2, ease: "none", ...NI }, t0);
tl.to(cam, { ...focus(center(app), 1.0, { box }), duration: 0.45, ease: "expo.out" }, t0 + 1.2);   // starts when the first ends
```

## Theme reveal

Two stacked copies; measure the toggle with both present. `reveal(light, T, t)` grows a disc of the new theme from the toggle (`r0` never 0, so the first frame shows a disc), ~0.45 s, then hide the old copy (`below`). Reveal at camera 1.0–1.2× over content-dense UI, or the disc is an unrecognisable blob; on light themes a diagonal wipe (`clipPath: polygon()`) is the safer default. A ring element growing with the clip gives the edge a highlight so it reads as a surface. If the toggle is far from the content, frame the toggle for the press, then cut to a frame of the content as the reveal runs.

## Dialog or palette

A scrim darkens the frame, so a dialog at 1.0× is a dark frame with a small box. Zoom until the dialog fills at least half the frame (usually 1.8–2.4×), aim at its centre (`UI.measure`), type into it as above, cut out on the Enter. Never two dark shots in a row.

## Key number over dense UI

Dim the captured screen from its first frame (`filter: brightness(.45)` on the app layer), put the figure in 60–70% of the frame width as display type and `count` it to the app's real value, then cut to a one-cell zoom (`focusRect(rect(cell), 60)`) on what changes for ~1–1.5 s and pull back.

## Drag and drop, file drop

**Drag and drop**: capture `drag-start`, `drag-over` and `dropped`. A ghost (clone of the card, slight tilt and shadow) rides the cursor along the path; swap to `drag-over` on the frame the ghost crosses into the target column (solve the ease for that time, don't guess) and to `dropped` on release; land with a small bounce and update the counter on the same frame. If the page's own drag handler works with the capture's `drag` action, record the states from it.

**File drop** (upload and converter tools): a film-made file chip (thumbnail, name, size) rides the cursor onto the drop zone with the same ease, the zone highlights as it crosses, the chip shrinks in on release, a progress bar keeps moving through the wait, and the result lands on the hit.

## Data over time

A slider or date control drives a chart or map and you captured one state per value: morph one DOM rather than swapping many screens.
```js
const names = ["h00", "h06", "h12", "h18", "h24"], S = UI.states(names);
const s = scene(UI.shot(names[0]), 4, 12), host = UI.pick(s, names[0]);
S.lerp(tl, host, 5, 11, { sel: "circle", key: (e) => e.getAttribute("cx") + "|" + e.getAttribute("cy"), text: [".clock"] });
drag(wrap(s), ".slider-thumb", ".slider-end", 5, 11);
```
Pair it with a camera push or counter: a recolour alone is little motion.

## Turn-based games

Run the game's own logic headless with the capture's seed to get a move trace (key, board before and after, score); build the board from captured tile markup and tween slides, merges and spawns from the trace; verify the trace against captured states. `keycap` presses on the frame the board changes. Big copy and the score go in `panels` beside the board.

## Into the end card

```js
const T = cardStart, s9 = scene(UI.shot("final"), t9, T + 0.6), cam9 = wrap(s9);
const card = scene(`<div class="card-bg"></div><div class="end">Name</div><div class="line">Promise.</div>`, T, null);
toCard(cam9, card, T, { mode: "reveal", from: P.lastClick });   // colour grows from the last click, camera pulls back
enter($(card, ".end"), { y: 60 }, T + 0.35);
enter($(card, ".line"), { y: 40 }, T + 0.5);
push(card, T + 1, D, 1, 1.03);
land(D - 0.4, 0.4);
```
`mode: "flip", el: payoffNumber, to: ".end"` makes the payoff element become the headline instead.

## Sound-coded effects (music films only, once each)

- **Stamp** (a verdict word on the hit): `tl.fromTo(st, { scale: 2.4, rotation: -12 }, { scale: 1, rotation: -4, duration: 0.18, ease: "power4.in" }, t)` and a small camera thud after it.
- **Glitch** ("it broke"): two colour copies jump on fixed 1/30 s steps with offsets from `rnd()`, shrinking to zero over 8 steps, then reset.
- **Shockwave** (the drop): `rings(s, t)` with the focus pull-back.

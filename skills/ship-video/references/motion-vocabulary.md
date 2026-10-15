# Motion vocabulary

Ten techniques with working engine code, each tied to a music event and a story role. `direction.md` says what the film is made of (structure, pacing, framing, UI shots); this file is the type-and-camera toolbox for the moments between and around them. All snippets were rendered and checked in stills. `s` is the scene element, `t0` the scene start, times are absolute seconds.

| technique | lands on | story role | use for | silent film |
|---|---|---|---|---|
| Flood + stamped word | hit | hook, chapter title | the problem word, a chapter break | yes (a colour cut, not a flash) |
| Word per beat | each kick/beat | promise, the problem in 4 words | a sentence in rhythm | yes, on the grid |
| Letter drop | bar start | title, product name | a name that needs weight | yes |
| Glitch | a hit or a sudden stop | the problem breaking | "it was broken" beat | **no, sound-coded**: use a skewed word that slides in and settles, or a letter drop |
| Stamp | hit | verdict, the payoff word | "Fixed.", "Done.", a number | **no, sound-coded** (the thud): use the word rising with `expo.out` plus a 1.0 → 1.04 push |
| Typing on onsets | kicks or hi-hats | the action begins | a query, a command, a name | yes, with jittered human timing |
| Focus zoom, pull back on the hit | build, then the hit | action → payoff | the moment the UI answers | yes, pull back on the beat |
| Shockwave | big hit or drop | climax | the single biggest moment, once | **no, sound-coded**: use a zoom-through (`shots.md` 9) or a whip pan |
| Screen wall | every kick | coverage of all views | showing the whole product fast | yes, on the grid |
| Caret ending | final hit | resolution | tagline + cut out | yes |

Silent films: use the "yes" rows on the bar grid and follow *Silent films* in `direction.md`.

**Every cut frame is sharp:** see `film-api.md`, *Cut on a hit*.

## 1. Flood + stamped word
The accent colour fills the frame and a word lands big, then settles. The word is full size and sharp on the hit frame.
```js
const s = scene(`<div style="position:absolute;inset:0;background:var(--accent)"></div><div class="center"><div class="display w" style="font-size:420px;color:#111">Slow.</div></div>`, t0, t0 + 2);
tl.fromTo($(s, ".w"), { scale: 1.5 }, { scale: 1, duration: 0.5, ease: "expo.out" }, t0);
tl.to($(s, ".w"), { scale: 1.06, duration: 1.5, ease: "none" }, t0 + 0.5);     // never a static hold
```
Flood colours: the product's accent for the hook, a neutral for chapter breaks. Keep type-only flashes ≤ 0.9 and flashes over UI ≤ 0.5.

## 2. Word per beat
Each word is its own layer; hard swap on the beat; entrance alternates up/down. The sentence is the one the story needs ("Plan it. Cut it."), not decoration.
```js
const words = ["Plan", "it.", "Cut", "it."];
const s = scene(words.map((w) => `<div class="center"><div class="display" style="font-size:380px">${w}</div></div>`).join(""), t0, t0 + 2);
$$(s, ".center").forEach((el, i) => {
  const t = t0 + i * 0.5;                                            // one per beat; use the kick times from MUSIC.md
  show(el, t, i < words.length - 1 ? t + 0.5 : null);               // hard swap: opacity 0 until t, 0 again at the next beat
  tl.fromTo($(el, ".display"), { scale: 1.35, y: i % 2 ? 50 : -50 }, { scale: 1, y: 0, duration: 0.4, ease: "expo.out" }, t);
});
```

## 3. Letter drop
```js
tl.fromTo(splitChars($(s, ".title")), { y: -420 }, { y: 0, duration: 0.7, stagger: 0.04, ease: "bounce.out" }, t0);
```
Never on a `.gtext` word (each letter restarts the gradient); animate that word whole.

## 4. Glitch
Two colour copies of the word jump on fixed 1/30 s steps with offsets from the seeded `rnd()`, shrinking to zero, then switch off. Deterministic and seek-safe. `rnd` comes from the `build` argument (seeded; never `Math.random`).
```js
const [r, c] = $$(s, ".gl"), base = $(s, ".base");               // .gl: absolutely positioned copies, colours #f0f and #0ff, mix-blend-mode: screen
for (let i = 0; i < 8; i++) {
  const t = t0 + i / 30, k = 1 - i / 8;
  tl.set(r, { x: (rnd() - 0.5) * 90 * k, y: (rnd() - 0.5) * 24 * k }, t);
  tl.set(c, { x: (rnd() - 0.5) * -90 * k, y: (rnd() - 0.5) * 24 * k }, t);
  tl.set(base, { x: (rnd() - 0.5) * 30 * k, skewX: (rnd() - 0.5) * 14 * k }, t);
}
tl.set([r, c], { x: 0, y: 0, opacity: 0 }, t0 + 8 / 30);
tl.set(base, { x: 0, skewX: 0 }, t0 + 8 / 30);
```
Use once, for the "it was broken" beat; more than once reads as a gimmick.

## 5. Stamp
A bordered verdict word slams onto the UI: scale 2.4 → 1 in 0.18 s with a tilt, then a small camera thud (sound-coded: the thud suggests an impact sound, so skip it in a silent film).
```js
show(st, t0 + 0.5);
tl.fromTo(st, { scale: 2.4, rotation: -12 }, { scale: 1, rotation: -4, duration: 0.18, ease: "power4.in" }, t0 + 0.5);
tl.fromTo(cam, { scale: 1.02 }, { scale: 1.0, duration: 0.3, ease: "power2.out", ...NI }, t0 + 0.68);
// css: .stampw{position:absolute;border:14px solid #22c55e;color:#22c55e;border-radius:24px;padding:10px 50px;font:800 220px var(--font-display);background:rgb(10 10 12/.92)}
```
Place it where it doesn't hide the thing it is a verdict on, or let it cover only what has been resolved.

## 6. Typing on onsets
`typeOn` (engine helper): characters appear on given times (kick/hi-hat onsets from `music.json`, or jittered human timing for a silent film) instead of at an even rate. A proxy tween is the only state; the count is a function of it.
```js
// typeOn(el, text, times, onUpdate?): times = one absolute second per character
const times = [..."launch film"].map((_, i) => t0 + 0.1 + i * 0.1 + (rnd() - 0.5) * 0.06);
typeOn($(s, ".q"), "launch film", times, (k) => { if (!k) $(s, ".q").textContent = "Search…"; });   // placeholder when empty
```

## 7. Focus zoom, then pull back on the hit
The camera sits at 2× on the element that matters while the action happens (typing, a number changing), then pulls back to the whole UI exactly on the hit so the viewer sees the result in context.
```js
tl.fromTo(cam, focus({ x: IN.l + 420, y: IN.t + 140 }, 2.0, { box }), { ...focus({ x: IN.l + 480, y: IN.t + 150 }, 2.1, { box }), duration: 1.2, ease: "none", ...NI }, t0);   // slow drift while typing
tl.to(cam, { ...focus(center(app), 1.0, { box }), duration: 0.45, ease: "expo.out" }, t0 + 1.2);   // pull back on the hit
```
`box` clamping pins an input at the top of the app to the frame's top edge, which is right: the typed text stays in frame. The two camera tweens do not overlap.

## 8. Shockwave
Rings from the centre of the scene on the hit; combine with the pull-back above. Music films only; once per film, on the drop.
```js
rings(s, t0 + 1.2);
press($(s, ".go"), t0 + 1.25);
```

## 9. Screen wall
A 3×3 grid of live UI tiles; one tile per kick (0.25 s at 120 BPM), each entering at full opacity from scale 1.25. The camera starts tight on the first tile so frame 1 is a full screen, and pulls back as the wall fills.
```js
// tile: 640×360 box containing the 1920×1080 screen scaled by 1/3 (css: .tile>div{width:1920px;height:1080px;transform:scale(.3333);transform-origin:0 0})
views.forEach((_, i) => {
  const t = t0 + i * 0.25;
  show($(s, ".t" + i), t);
  tl.fromTo($(s, ".t" + i), { scale: 1.25 }, { scale: 1, duration: 0.3, ease: "expo.out" }, t);
});
tl.fromTo(cam, focus(center($(s, ".t0")), 2.6, { clamp: false }), { x: 0, y: 0, scale: 1, duration: 2.4, ease: "power2.inOut", ...NI }, t0);
```
This is the coverage tool: every view in PRODUCT.md as a tile. Use real captured screens, one per view/state.

## 10. Caret ending
The tagline types, the caret blinks (steps easing, deterministic), then stretches across the frame into the final flood or cut.
```js
type($(s, ".tag"), "Ship the film.", t0 + 0.1, t0 + 1.0);
tl.fromTo($(s, ".cc"), { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "steps(1)", repeat: 3, yoyo: true, ...NI }, t0 + 1.0);
tl.set($(s, ".cc"), { opacity: 1 }, t0 + 1.99);
tl.to($(s, ".cc"), { scaleX: 160, scaleY: 3, duration: 0.5, ease: "power4.in" }, t0 + 2.0);     // becomes the flood
tl.set($(s, ".fl"), { opacity: 1 }, t0 + 2.5);                                                    // .fl: accent layer above, hidden until now
```
The caret's stretch ends on the final hit; the flood is the end card's background.

## Density rules

- Something changes every beat: a new word, a cut, a number step, a camera landing. If a beat has nothing, add a micro-move (counter, cursor, drift) before adding an effect.
- Stillness limit: one definition, `direction.md` *Pacing rules* 1 (no span over ~1 s without a visible change; a 1.0 → 1.07 drift counts).
- UI is zoomed 1.4–2.3× onto the element that matters; pull back to the whole UI on the hit.
- In a montage (screen wall, view run) cut on every kick.
- One idea per shot; effects (glitch, shockwave, stamp) once each per film.

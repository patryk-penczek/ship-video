# Film API (film.js)

Read before writing `film.js`. The starter film uses most of this; `shots.md` has worked recipes. Don't read `engine.js`: everything you need is here.

## Contents
- Files
- Config
- Helpers
- Captured states (ui.js)
- Entrances and the cut frame
- Camera and pointers
- Determinism
- Pitfalls

## Files

| file | edit? | what |
|---|---|---|
| `film.js` | yes | `Film({...})` config and `build()` with every scene |
| `film.css` | yes | tokens (`--f-bg`, `--f-accent`, `--f-font-display`, …) and film-made markup |
| `ui.js` | rarely | `window.UI`: captured-state helpers; hand-built screens only without a running app |
| `index.html` | rarely | stage, layers, script order; `<html data-theme>` |
| `engine.js`, `base.css` | no | helpers, preview clock, `window.__seek` |
| `app.css`, `screens.js`, `env.js` | generated | captured CSS and states (`capture.mjs`), audio envelope (`music.mjs envelope`; `null` when silent) |

## Config

```js
Film({
  duration: 20,                 // seconds
  track: "track.mp3",           // next to index.html, or null
  bpm: 120,                     // preview metronome when track is null
  hits: [[21.12, 10]],          // [time, shake px] camera shake (music.md)
  pulse: 0,                     // 0–1: the whole frame breathes with the bass (music.md)
  fonts: ["800 40px 'Inter Variable'"], // every face used: layout is measured after they load
  images: "auto",               // or a list; preloaded before build
  pointer: 1,                   // cursor/finger size multiplier (1.5–3 for feeds)
  build(ctx) { /* scenes */ },
  react(t, ctx) { /* optional per-frame extras, pure function of t */ },
});
```

## Helpers

Destructure from `build`'s argument. Times are absolute seconds.

**Structure**
| helper | does |
|---|---|
| `tl` | the paused GSAP timeline: `tl.to(el, {...}, 4.5)` |
| `scene(html, start, end, {frame}?)` | full-frame layer visible start→end (`null` = to the end); returns the element. `{ frame: {title} }` puts the app in a rounded window (landing, README; not feeds): its box is `s.__frame.box` (or call `frame(scene, opts)` before `wrap()`), pass it as `box` to `focus`/`autoCam` or the camera frames the backdrop |
| `wrap(scene)` | moves the scene's children into a camera layer and returns it |
| `$`, `$$` | scoped `querySelector` / `querySelectorAll` (array) |
| `center(el, {text}?)`, `rect(el, {text}?)` | stage-space centre / box; `text: true` measures the text, not a flex-wide strip |
| `target(sel, opts)`, `targetRect(sel, opts)` | same, from a selector inside the last scene, measured with the camera neutral |
| `NI` | `{ immediateRender: false }`: spread into a tween that starts from where the element already is (*Entrances*) |
| `rnd()`, `hash(n)` | seeded random, deterministic 0..1 |
| `view`, `stage`, `cam`, `spring(freq, zeta)` | free part of the frame (changes with `band()`), the stage and camera roots, a custom spring ease |
| `css(name)`, `warn(msg)` | computed CSS variable; build-time note shown by the scripts |

**Motion**
| helper | does |
|---|---|
| `enter(el, from, t, dur?, ease?)` | hidden until `t`, then from `from` to rest. The default entrance |
| `show(el, t0, t1?)` | hard on at `t0`, off at `t1` (word per beat, tiles) |
| `push(cam, t0, t1, from=1, to=1.06)` | slow drift that eases to rest: no shot stands still |
| `type(el, text, t0, t1, onUpdate?)`, `typeOn(el, text, times, onUpdate?)` | typing at an even rate / on given times (kicks, or jittered human timing). `onUpdate(k)` with `k = 0` sets a placeholder |
| `count(el, from, to, t0, dur, fmt?)` | number tween; keeps inner markup (`21<sup>°</sup>`). Before `t0` the element shows its own HTML text, so write the start value there. Start near 70% of the end value, end on the real one |
| `put(el, str)` | writes into captured markup (input value, first text node) |
| `press(el, t)`, `burst(host, pt, t)`, `rings(host, t)`, `flash(t, peak?)` | press, particles, shockwave, flash (the last three are sound-coded: not in silent films; flash ≤ 0.5 over UI) |
| `splitChars(el)` | wraps each character for staggers. Never on a `.gtext` word (the gradient restarts per letter) |
| `reveal(el, point, t0, dur?, r0?, r1?, {below}?)` | circle reveal of a stacked copy from `point`; `below` hides the covered copy afterwards |
| `scrubChart(scene, {xy, vals, pad}, t0, t1, v0, v1)` | dot, guide, path and tooltip (`.tip .dot .guide .hl`) driven from one value |
| `scrollTo(main, y, t, dur?, ease?, {pin}?)` | scrolls a tall captured page; chains; returns `at(p)` and `box(b)` to map points measured before the scroll |
| `toCard(cam, card, T, {mode, from, el, to, dur})` | the join into the end card: `reveal` (card colour grows from `from` while the camera pulls back), `flip` (payoff `el` flies to `to`), `tile`. Product scene runs to `T + dur`, card starts at `T` |
| `land(t0, dur?, color?)` | the final fade to the last scene's background |

**Camera and pointers**
| helper | does |
|---|---|
| `focus(point, scale, {box, over, clamp}?)` | camera vars that centre `point` at `scale`, clamped to `box` (default the stage; pass `rect(app)`). `over: 300` allows 300 px of empty edge so an edge target can centre; `clamp: false` removes the clamp |
| `focusRect(rect, pad=40)` | camera that frames a rect edge to edge: columns, cards, forms |
| `autoCam(cam, steps, {box, preset}?)` | camera framings planned from the pointer's clicks (see below) |
| `cursor(cam, from, steps)`, `finger(cam, from, steps)` | pointer; steps `{ to, t, dur, click/tap?, hold? }`, `to` a point or a selector. Hidden until the first step |
| `drag(cam, from, path, t0, t1)` | press, constant-speed move, release (sliders, map pans) |
| `follow(el, pts, t0)` | pointer along a recorded path (`UI.recording(name).path()`) |
| `keycap(scene, "Ctrl+K", t)` | key press glyph: the pointer of keyboard-driven apps and games |
| `spot(scene, target, t0, t1, {dim, ring}?)`, `loupe(scene, target, t0, t1, {scale, size, at}?)` | dim all but a detail / a live magnified inset: instead of a camera move for something tiny |
| `caption(scene, text, t, from?, {pos, size, end}?)` | opaque pill in a corner (`bl` `br` `tl` `tr` `bc`), outside the camera; call after `wrap()` |
| `band({height, pos, size})` | persistent step-caption band for how-tos; returns `step(text, t0, t1, {n})`. Call before any `focus()` |
| `panels(scene, {width})` | margin panels beside a narrow app for copy; returns `{l, r, box}`, pass `box` to `focus` |
| `dock(el, ref, {side, gap})` | moves a captured toast next to its target so it lands inside a zoomed frame; side `below above right left inside-br inside-bl inside-tr inside-tl`; applied at build time, call before `enter` |
| `edge(scene)` | gives the scene the app's background, so the empty edge of `focus(…, {over})` matches |

**Markup helpers (base.css)**: a rolling word is `.roll > .stack > span`; tween `.stack` `yPercent` by `-100 / spans.length` per step. A GIF or animated emoji becomes a sprite: `ffmpeg -i in.gif -vf tile=Nx1 img/strip.png`, then `<i class="sprite" data-n="N" data-fps="15" style="width:240px;height:160px;background:url(img/strip.png) 0 0/N00% 100%"></i>` (the engine steps it from `t`).

## Captured states (ui.js)

```js
const s = scene(UI.stack(["home", "palette", "added"]), 4, 12);   // stacked copies; all but the first hidden
const cam = wrap(s);
const P = UI.measure(s, "palette", (h) => ({ input: center($(h, "input")) }));   // measure a hidden copy
UI.swap(tl, s, "palette", 6);                                      // from t=6 only "palette" shows
enter($(UI.pick(s, "home"), ".card"), { y: 40 }, 4.2);             // tween the real elements inside
```
`UI.shot(name, {tall}?)` one state's markup; `UI.frames(tl, img, t0, t1)` steps a captured canvas through its frames; `UI.recording(name)` replays a recorded pointer session; `UI.states(names).lerp(tl, host, t0, t1, {sel, key})` morphs one DOM through many captured states (data over time); `UI.spin` rotates a captured spinner. A film of swapped static screens looks dead: tween the elements inside them.

## Entrances and the cut frame

GSAP pitfall that costs the most time: a `fromTo` paints its *from* state at build time, while `NI` (`{ immediateRender: false }`) leaves the element at rest until the tween starts.
- Something that **appears later** (a toast, a chip, an end-card line): `enter(el, from, t)`. With `NI` alone it sits at rest, then jumps to `from` at `t` (the audit reports the jump).
- Something that **moves from where it already is** (camera moves, the second tween on one element): `NI`.
- Never two tweens on the same property of one element at the same time; camera tweens in sequence, never overlapping.

**Cut on a hit:** the new scene's `start` is the hit time and its first frame is sharp and fully opaque. Enter by offset, scale (0.9–1.3) or blur ≤ 6 px from `opacity: 1`. Stagger children start at their offset, not hidden. Check the frame at `t + 0.02`.

## Camera and pointers

- **Pointer steps.** `to` (and `from`) is a point, a selector or an element; extra keys `in` (which stacked state), `withText`, `fx`/`fy` (0..1 inside the target's box), `dx`/`dy`, `ease`, `hold: "start" | "end"`. A selector is measured at the step's time with the tweens already added, so call `cursor()` after the tweens that move its target; a missing or hidden target stops the build with a one-line error.
- **Camera eases.** `ease: "focused"` (fast, no overshoot: UI, how-to) and `"smooth"` (longer, softer: launch films) are springs registered with GSAP by name.
- **Measure before you tween.** `center()` reads the current layout, so measure every target before adding tweens that move it or its camera, and measure stacked copies with `UI.measure` (a hidden copy measures as 0,0).
- **Aim inside the strip.** `center()` of a full-width element is the middle of the strip; measure the number, icon or text inside it.
- **Edge targets.** `focus` clamps to the replica's box, which keeps the stage margin out of frame but stops a target near the top or bottom from centring: scroll first, pass `over`, or `focusRect`.
- **autoCam** merges clicks closer than 2.5 s into one framing, settles before the first click, keeps every click in the central 60%, and stays wide (with a build warning saying why) when a cluster can't be framed. Manual `focus` tweens win: call it after them. `preset: "smooth"` for launch films; `box` and `over` as in `focus`. Drags and `follow()` paths are not clustered: pass `also: [{ path: [{ x, y, t }] }]` (or `also: [{ t, to }]` for typing) or frame them with `focus()`. `cam.__plan` says why a click got no zoom. Don't combine it with `push()` on the same layer.
- **Pointers keep their on-screen size** under zoom. Pointers, captions and the band sit above the app layer; the audit reports a cursor hidden under an app overlay.

## Determinism

Everything on screen is a pure function of `t`, so the render matches the preview frame for frame.
- No `setTimeout`, `setInterval`, `Date`, `Math.random`, CSS animations or transitions (base.css disables them), `repeat: -1`.
- `onUpdate` callbacks set state only from the tween's current value.
- Seeking straight to any `t` gives the same frame as playing to it; scrub backwards in the preview to check. `audit.mjs` lints and pixel-compares this.

## Pitfalls

- An element that slides in and pushes content down: measure it present, then tween `height` from 0 (overflow hidden), no opacity fade.
- Never hand-set `visibility: visible` inside a scene (`enter` handles visibility for you): it overrides the hidden scene around it. Switch with `display` or `opacity`.
- The captured app's accent colour is `--f-app-accent`; `--f-accent: var(--f-app-accent)` in `film.css` makes the whole film use it.
- `backdrop-filter` glass ghosts the copy stacked beneath it: hide covered copies, use near-opaque backgrounds.
- Gradient text (`.gtext`) clips descenders and the last letter unless padded (base.css pads it); check in a full-resolution still.
- Scroll by tweening `y` on the tall `.main` (or `scrollTo`), never a real `overflow: auto` element.
- A native range input can't be tweened: tween a proxy `{ v }` and set `input.value` in `onUpdate`.
- Audio-reactive extras go in `react(t, ctx)` with `ctx.env("sub", t)`: set styles directly, keep no state between frames.

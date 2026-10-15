# Film API (film.js)

Read this before writing or editing `film.js`.

## Contents
- File layout
- Config
- Helpers (ctx)
- Shot helpers (cursor, caption, typeOn, push, show, reveal, scrubChart)
- Patterns: scene with camera, typing, press + burst, entrances (`enter`, `NI`), cut on a hit, word per beat, rolling word, stacked app states, scrolling a tall page, SVG chart steps, slide-in element, captions, sprites, audio-reactive
- More: `shots.md` (14 shots with code: cursor, scrub, route transition, whip pan, tilt, montage), `motion-vocabulary.md` (type and camera techniques)
- Captured DOM recipes
- Determinism rules

## File layout

| file | edit? | what |
|---|---|---|
| `index.html` | rarely | stage, fx layers, HUD, script order |
| `engine.js` | no | helpers, react layer, preview clock, `window.__seek` |
| `base.css` | no | stage, HUD, helper classes (`.center`, `.display`, `.gtext`, `.roll`, `.sprite`) |
| `film.css` | yes | tokens (`--f-bg`, `--f-accent`, `--f-grad`, fonts) + replica styles |
| `ui.js` | yes | `window.UI` screen builders returning HTML strings; captured-state helpers `UI.shot/stack/pick/swap/measure/frames/images`: see `replicas.md` |
| `film.js` | yes | `Film({...})` config + `build()` with every scene |
| `env.js` | generated | `window.ENV` from `music.mjs envelope`; `null` for a silent film |
| `app.css`, `screens.js` | generated | the app's scoped CSS and captured states (`capture.mjs`, `port-css.mjs`); empty until then |

## Config

```js
Film({
  duration: 20,            // seconds; match the track length
  bpm: 120,                // preview metronome when track is null
  track: "track.mp3",      // next to index.html, or null
  hits: [[2, 6], [8, 14]], // [time, shake px]; decays in 0.6 s
  fonts: ["800 40px 'Inter Variable'"],  // every face used; loaded before build
  images: ["img/avatar.png"],            // every image; loaded before build
  build(ctx) { /* scenes */ },
  react(t, ctx) { /* optional per-frame extras, pure function of t */ },
});
```

## Helpers (ctx)

| helper | does |
|---|---|
| `tl` | the paused GSAP timeline; add tweens at absolute seconds: `tl.to(el, {...}, 4.5)` |
| `scene(html, start, end)` | full-frame layer visible from `start` to `end` (`null` = to the end); returns the element |
| `wrap(sceneEl)` | moves children into a camera layer; tween it with `focus()` |
| `center(el)` | stage-space centre `{x, y}`; call before tweens that move `el` or its camera |
| `focus(point, scale, {clamp, box, over}?)` | `{x, y, scale}` that puts `point` at screen centre at `scale`; clamped so the frame never shows past `box` (default the 1920×1080 stage; pass `rect(el)` for a smaller replica). The clamp pins targets near the top or bottom edge: `over: 300` allows 300 px of empty edge so they can be centred, `clamp: false` removes it (check the end frame for stage margin), or scroll the page first (`shots.md` 7) |
| `rect(el)` | stage-space `{l, t, r, b}` of an element, e.g. as focus()'s `box` |
| `type(el, text, t0, t1, onUpdate?)` | types `text` between t0 and t1; seek-safe. Empties `el` at build time; show a placeholder through `onUpdate(k)` when `k` is 0 (a `tl.set` at 0 is lost when you scrub back across the typing). Irregular timing: `typeOn` |
| `count(el, from, to, t0, dur, fmt?)` | number tween into `el` (through `put`, so markup like `21<sup>°</sup>` keeps its tags); before `t0` the element shows its own HTML text, so write the start value there |
| `press(el, t)` | button press (scale 0.92 → 1) landing at `t` |
| `burst(host, point, t, n?, spread?, colors?)` | particle burst at `point` in `host` |
| `rings(host, t)` | shockwave rings from the centre of `host` |
| `flash(t, peak?, dur?, color?)` | full-frame flash |
| `splitChars(el)` | wraps each character in `.ch`; returns them |
| `rnd()` | seeded random; never use `Math.random` |
| `enter(el, from, t, dur?, ease?)` | the default way to bring something in at `t`: hidden until `t`, then a plain `fromTo` from `from` to the element's rest values (see *Entrances*) |
| `NI` | `{ immediateRender: false }`: the element keeps its natural state until the tween starts (see *Entrances*) |
| `view` | `{ top, bottom, h, cy }`: the free part of the frame (changes with `band()`) |
| `$`, `$$` | `querySelector`, `querySelectorAll` as array, scoped to a root |
| `cursor(host, from, steps)` | see *Shot helpers* |
| `caption(scene, text, t, from?, {pos, x, y}?)` | opaque pill that enters by offset; `pos` `"bl"` (default) `"br"` `"tl"` `"tr"` `"bc"` or `x`/`y` stage px, so it can avoid content |
| `scrollTo(main, y, t, dur?)` | tweens a tall page up by `y`; returns `{ y, at(p) }`: `focus(sc.at(center(el)), 1.8, { over: 300 })` aims at the scrolled position |
| `put(el, str)` | writes into captured markup: input value+attribute, only the first text node when the element has children (`21<sup>°</sup>`); `count`/`type`/`typeOn` use it |
| `land(t0, dur?, color?)` | fades the frame to the background from t0; `land(D - 0.4, 0.4)` lands the film instead of a hard cut |
| `typeOn(el, text, times, onUpdate?)` | typing on given times |
| `push(el, t0, t1, from?, to?, ease = "power1.out")` | slow scale drift that eases to rest at t1 (`"none"` = constant drift) |
| `show(el, t0, t1?)` | hard on/off on a beat |
| `reveal(el, point, t0, dur?, r0?)` | circle reveal of a stacked copy |
| `scrubChart(scene, chart, t0, t1, v0, v1, ease?)` | marker, guide, path and tooltip from one value |
| `env(k, t)` | `ENV` value (`sub`, `mid`, `high`, `rms`) at time t (in `react`) |
| `css(var)` | computed value of a CSS variable, e.g. `css('--f-accent')` |
| `hash(n)` | deterministic number 0..1 from `n` |
| `stage`, `cam` | the stage and camera DOM roots |

## Shot helpers

Engine helpers, all pure functions of `t`; CSS for `.cursor`, `.ripple`, `.cap` is in `base.css` (override in `film.css`). Snippets using them: `shots.md`, `motion-vocabulary.md`.
- `cursor(host, from, steps)`: `host` = the camera layer, so the cursor zooms with the UI. `steps: [{ to: {x, y}, t, dur, click? }]` in stage space (`center()`); a click adds a ripple and `press`. Returns the cursor element.
- `typeOn(el, text, times, onUpdate?)`: `times` = one absolute second per character (onsets from `music.json`, or `t0 + i·0.1 + (rnd() - 0.5)·0.06` for human timing). Like `type`, show a placeholder through `onUpdate(0)`.
- `push(el, t0, t1, from = 1, to = 1.06, ease = "power1.out")`: slow drift on a camera layer that eases to rest, so no shot is still. Not at the same time as a `focus()` tween on that layer.
- `show(el, t0, t1?)`: opacity 0 at build time, 1 at `t0`, 0 again at `t1`. Word-per-beat layers, tiles, stamps.
- `reveal(el, point, t0, dur = 0.8, r0 = 70, r1 = 2400)`: `display: none` until `t0`, then a circle grows from `point` (the toggle's `center()`, measured with both copies shown). `r0` is never 0: the first frame already shows a disc.
- `scrubChart(scene, { xy, vals, pad: [l, t], fmt }, t0, t1, v0, v1, ease?)`: `xy` = chart points `[x, y]` in svg units, `vals` = value per point (take both from the arrays the replica renders from), `pad` = offset of the svg inside the tooltip's parent. The scene holds `.tip`, `.dot`, `.guide`, `.hl` with `display: none` in the HTML.

## Patterns

**Scene with a camera that follows the action**
```js
const s = scene(UI.dashboard(), 4, 8);
const cam = wrap(s);
const P = { search: center($(s, ".search")), save: center($(s, ".save")) };  // measure first
tl.fromTo(cam, focus(P.search, 1.6), { ...focus(P.search, 1.8), duration: 1.1, ease: "power1.inOut" }, 4);
tl.to(cam, { ...focus(P.save, 2.0), duration: 0.35, ease: "power3.inOut" }, 5.15); // starts after the first ends
```

**Typing into an input**
```js
type($(s, ".q"), "Lisbon", 4.3, 4.9, (k) => { if (!k) $(s, ".q").textContent = "Search…"; });   // placeholder while empty, in both scrub directions
```

**Press + burst on a beat**
```js
press($(s, ".add"), 5.5);
burst(fxLayer, P.save, 5.5, 10, 50);   // fxLayer = a div appended to the camera layer
```

**Entrances.** **Default: `enter(el, from, t, dur = 0.5, ease)`**: hidden until `t`, then a plain `fromTo` from `from` (any gsap vars: `{ y: 50 }`, `{ scale: 0.8 }`) to the element's rest values. It suits anything that appears later: a toast, a chip, a stagger child, an end-card line.
```js
enter($(s, ".new"), { y: 12, opacity: 0 }, 5.5, 0.3);
```
The two raw forms are for when `enter` does not fit (several properties on a stagger, a camera layer). `NI` (`immediateRender: false`) means the element shows its natural state until the tween starts; a plain `fromTo` paints its from-state at build time and keeps it until the start.
- **Absent or offset until its moment** (a toast, rows landing mid-shot): plain `fromTo`, or `NI` plus `tl.set(el, from, 0)`. With `NI` alone it sits at its natural spot until the tween starts, then jumps (`audit.mjs` reports `jump ... y +50 px in 1 frame`).
- **Starts from where it already is** (a camera move, the second tween of a sequence on one element, a repeated press, a counter): `NI`. Every fromTo of a sequence on one element takes `NI`, or the last one paints at build time and wins.
- Never two tweens on the same property of one element unless one ends before the next starts.

**Word per beat**: each word its own `.center` layer; `show(el, t, tNext)` switches it on its beat (`motion-vocabulary.md` #2).

**Cut on a hit** (the one home of the crisp-cut rule): the new scene's `start` equals the hit time and its first frame is **sharp and fully opaque**. Enter by position (`y: 60`), scale (0.9–1.3) or a blur ≤ 6 px, from `opacity: 1`. A fade from 0 reads as a late cut and one from 0.35 as a dim, washed-out frame. The same goes for an alert, dialog or caption that enters on a hit. Stagger children start at their offset position, not hidden, so frame 1 already shows them. Check the frame at `t + 0.02` in a still.

**Rolling word** (`.roll > .stack > span`): tween `.stack` `yPercent` by `-100 / spans.length` per step.

**Several app states in one scene**: stack copies of the screen (`UI.app("before")`, `UI.app("after")`) absolutely on top of each other and switch with `tl.set(el, { display: "none" | "" }, t)`. **Measure `center()` of every target while all copies are displayed**: a copy with `display: none` has no layout and measures as 0,0. Hide the copies afterwards, in the timeline (`tl.set(copy, { display: "none" }, 0)`), not in the HTML. For a theme change: `reveal(light, T, 14)` with `T = center($(s, ".theme-toggle"))` measured with both copies shown (framing and pitfalls: `shots.md` 12).

**Scrolling a tall page**: a `y` tween on the `.main` that is taller than its viewport, never on a real `overflow: auto` element (its scroll position isn't a function of `t`). The recipe, with the scrollbar and the target-at-the-bottom case, is `shots.md` 7; `scrollTo` (above) wraps it.

**Steps in an SVG chart**: `tl.set(dot, { attr: { r: 6, fill: "var(--sun)" } }, t)`; move an HTML tooltip with `left`/`top` in % of the chart box.

**An element that slides in and pushes content down** (alert, toast): measure its natural height first, then
```js
const h = $(s, ".alert").offsetHeight;                                  // measured with it present
// height 0 + overflow hidden hides it; no opacity fade, so the frame on the hit is already sharp
tl.fromTo($(s, ".alert"), { height: 0, marginBottom: -gap }, { height: h, marginBottom: 0, duration: 0.35, ease: "expo.out" }, 9.98);   // plain fromTo: collapsed until 9.98
```

**Captions** (use few: when and where is `direction.md`, *Framing*). `caption(scene, text, t, from = { x: -70 }, { pos, x, y, end }?)` appended **after** `wrap()` so it stays out of the camera layer; opaque, offset-only entrance, returns the element; `end` removes it at that second.
- **Placement.** `{ pos: "br" }` (`"bl"` default, `"br"`, `"tl"`, `"tr"`, `"bc"`, or `x`/`y` stage px): pick the corner the content leaves free. The default `.cap` is bottom-left, 96 px from the edges; pass `from = { x: 70 }` for a caption on the right so it enters from its own side.
- **Timing.** `caption` assumes `t` is the scene's start. For a caption that appears later in the scene, hide it first (`tl.set(c, { opacity: 0 }, 0)` and `tl.set(c, { opacity: 1 }, t)`), otherwise it sits visible at its natural spot until `t`, then jumps.

**Glass and `backdrop-filter`** ghost in stacked or scaled layers: hide the covered copy and use a solid background in the replica (`replicas.md`, *Pitfalls*).

**Sprites** for GIFs/animated emoji: convert to a horizontal strip (`ffmpeg -i in.gif -vf tile=Nx1 strip.png`), then
```html
<i class="sprite" data-n="12" data-fps="15" style="width:240px;height:160px;background:url(img/strip.png) 0 0/1200% 100%"></i>
```

**Audio-reactive extras** in `react(t, ctx)`: read `ctx.env("sub", t)`; set styles directly. No tweens, no state between frames.

## Captured DOM recipes

For screens captured with `capture.mjs` (`replicas.md`). The captured markup differs from hand-made placeholders, so a few helpers need a different form.

- **Scrub a captured chart** (`scrubChart` expects `.tip/.dot/.guide/.hl`, which a capture lacks) and **type into a captured input** (its text is its `value`, not a text node): `shots.md` 4 and 2.
- **Drive a range thumb** (a radar or timeline slider). A native range can't be tweened by CSS; tween a proxy `{ v }` and in `onUpdate` set `input.value = v` and, if the thumb is drawn by CSS variable or `left`, the same value there. Seek-safe because the value is a function of the proxy. If the thumb is custom markup, tween its `x`.
- **Count a number inside markup** such as `<span class="num">21<sup>°</sup></span>`: plain `count()` would overwrite `textContent` and lose the `<sup>`, but `count` writes through `put`, which touches only the first text node. For a value in a dedicated inner span: `onUpdate: () => { numNode.nodeValue = Math.round(p.v); }` with `numNode = el.firstChild`.
- **`focus()` near the frame's top or bottom edge:** see the `focus` row in *Helpers* (`over`, `clamp: false`, scroll first).

## Helpers for how-tos, phones, tall pages and recordings

All pure functions of `t`; destructure them from the `build` argument like the others.
- **`band({ height = 180, pos = "bottom", size = 46 })`**: a persistent step-caption band that never covers the UI. Call it before any `focus()`. It clips the scenes to the free part and `focus()` / `focusRect()` centre and clamp on that part (`view.cy`, `view.h`). Returns `{ step(text, t0, t1, { n }), progress(t0, t1) }`. At zoom 1 the whole 1080 px app no longer fits: use a scale of at most `(1080 - height) / 1080`, or `focusRect`.
- **`focusRect(rect, pad = 40, { max = 4, min = 0.3 })`**: the camera that frames a stage rect (`rect(el)`) edge to edge with `pad` px of air, so no word is sliced at the frame edge. Same return value as `focus()`.
- **`dock(el, ref, { side, gap, align })`**: moves an element (a captured toast; use its `.parentElement` if the parent is the fixed wrapper) next to a reference element or rect, so it lands inside the zoomed frame. `side`: `below above right left inside-br inside-bl inside-tr inside-tl`. Call it at build time, before tweens.
- **`finger(host, from, steps, { appear })`**: a touch pointer (round fingertip). Steps `{ to, t, dur, tap?, hold? }`: `tap` presses and rings on arrival, `hold` stays pressed during the move (swipe, drag). Use it instead of `cursor()` for phone UIs. `cursor()` takes `hold: true` on a step too, and both are hidden until their first step (`{ appear: 0 }` shows them from the start).
- **`follow(el, pts, t0)`**: a pointer following a recorded path: `pts = [{ x, y, t }]` with `t` from `t0` (`UI.recording(name).path(k, ox, oy)` makes them).
- **`land(t0, dur, color)`**: the default colour is the last scene's own background (the end card's flood), else the `--f-land` token, else black. A fade to `--f-bg` washes a coloured end card out.
- **`scrollTo(main, y, t, dur, ease, { pin })`**: for pages that scroll as a document, build the shot with `UI.shot(name, { tall: true })` and tween the wrapper or the scene's camlayer. `pin: [el]` keeps a sticky nav in place. `at(p)` maps a point measured before the scroll to where it is after it.
- **`center(el, { text: true })`, `rect(el, { text: true })`**: measure the text's own box instead of a flex-wide element.
- **`reveal(el, p, t0, dur, r0, r1, { below })`**: `below` is hidden right after the reveal, so the covered copy can't ghost through.
- **`UI.shot(name, { tall, hidden })`**: `tall` keeps the full page height. Every call gets its own SVG ids (the same state in two scenes no longer shares gradients). **`UI.frames(tl, img, t0, t1, loop, { every, from, to })`**: `every` plays the frames in real time, `from`/`to` slice them. **`UI.frameSync(tl, el, list, t0, t1, loop, opts)`** moves live DOM bits (a clock's text, a timeline thumb) with the frames. **`UI.frameSeq(tl, img, [{ t, src }])`** and **`UI.recording(name)`** replay a `record` state.
- **Layers.** `.app-shot` is its own stacking context (`isolation: isolate`); the cursor, finger, ripples, captions and the band sit above anything the app does. `audit.mjs` prints `cursor hidden under .modal` if a pointer is still covered.
- **Theme.** `<html data-theme="auto">` follows the captured app (light app, light tokens, no vignette or grain); `new-film.mjs --theme light|dark` fixes it. Tokens for captions, vignette, grain, grid and the finger live in `film.css` (`--f-cap-bg`, `--f-vignette`, `--f-grain`, `--f-land`...).

- **`keycap(scene, "ArrowUp" | "Ctrl+K", t, { pos, x, y, end, size })`**: a key glyph (one cap per key) that appears and presses at `t`; the keyboard version of the cursor for games and shortcut-driven apps. Not zoomed by the camera (give it the scene, not the camlayer).
- **`panels(scene, { width, bg })`**: the margins of a narrow app centred on the stage as two `.panel` divs for copy; returns `{ l, r, box }` (pass `box` to `focus`).
- **`edge(scene, name?)`**: gives the scene the captured page's background so the empty edge of a `focus(.., { over })` camera matches the app instead of the film colour.
- **`scrollTo(main, y, t, dur)`**: `y` is the scroll position; a second call on the same element continues from the first one's end. `dur` 0 = the page starts scrolled; `box(b)` shifts a rect (the `focus` box) by the scroll.
- **`dock`** composes with the element's own CSS transform (a toast with `translateX(-50%)`) and applies at build time: call it before `enter`.
- **`caption`** is hidden until `t` (it used to sit at its start offset from the scene start).
- **`UI.spin(tl, el, t0, t1, { turns })`**: rotates a captured CSS spinner (keyframes are not ported). `Film({ images: "auto" })` preloads every image of the captured states.
- Starter tokens are prefixed `--f-` (`--f-bg`, `--f-accent`, ...) so they cannot collide with the app's own `--card`, `--accent`, `--font-mono`.

## Determinism rules

Everything on screen must be a pure function of `t`, or renders differ from the preview and between runs.
- No `setTimeout`, `setInterval`, CSS animations or transitions (base.css disables them), `Date`, `Math.random`.
- `onUpdate` callbacks must set state from the tween's current value only (as `type` and `count` do).
- Everything visible at t must be reachable by seeking straight to t; scrub backwards in the preview to check.

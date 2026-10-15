# Film API (film.js)

Read this before writing or editing `film.js`.

## Contents
- File layout
- Config
- Helpers (ctx)
- Shot helpers (cursor, caption, typeOn, push, show, reveal, scrubChart)
- Patterns: scene with camera, typing, press + burst, entrances (NI vs plain fromTo), cut on a hit, word per beat, rolling word, stacked app states + theme reveal, scrolling a tall page, SVG chart steps, slide-in element, captions, backdrop-filter, sprites, audio-reactive
- More: `shots.md` (14 shots with code: cursor, scrub, route transition, whip pan, tilt, montage), `motion-vocabulary.md` (type and camera techniques)
- Captured DOM recipes
- Determinism rules

## File layout

| file | edit? | what |
|---|---|---|
| `index.html` | rarely | stage, fx layers, HUD, script order |
| `engine.js` | no | helpers, react layer, preview clock, `window.__seek` |
| `base.css` | no | stage, HUD, helper classes (`.center`, `.display`, `.gtext`, `.roll`, `.sprite`) |
| `film.css` | yes | tokens (`--bg`, `--accent`, `--grad`, fonts) + replica styles |
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
| `focus(point, scale, {clamp, box}?)` | `{x, y, scale}` that puts `point` at screen centre at `scale`; clamped so the frame never shows past `box` (default the 1920×1080 stage; pass `rect(el)` for a smaller replica, or `clamp: false`) |
| `rect(el)` | stage-space `{l, t, r, b}` of an element, e.g. as focus()'s `box` |
| `type(el, text, t0, t1, onUpdate?)` | types `text` between t0 and t1; seek-safe. Empties `el` at build time; show a placeholder through `onUpdate(k)` when `k` is 0 (a `tl.set` at 0 is lost when you scrub back across the typing). Irregular timing: `typeOn` |
| `count(el, from, to, t0, dur, fmt?)` | number tween into `el.textContent`; before `t0` the element shows its own HTML text, so write the start value there |
| `press(el, t)` | button press (scale 0.92 → 1) landing at `t` |
| `burst(host, point, t, n?, spread?, colors?)` | particle burst at `point` in `host` |
| `rings(host, t)` | shockwave rings from the centre of `host` |
| `flash(t, peak?, dur?, color?)` | full-frame flash |
| `splitChars(el)` | wraps each character in `.ch`; returns them |
| `rnd()` | seeded random; never use `Math.random` |
| `NI` | `{ immediateRender: false }`: the element keeps its natural state until the tween starts (see *Entrances*) |
| `$`, `$$` | `querySelector`, `querySelectorAll` as array, scoped to a root |
| `cursor(host, from, steps)` | see *Shot helpers* |
| `caption(scene, text, t)` | opaque pill that enters by offset |
| `typeOn(el, text, times, onUpdate?)` | typing on given times |
| `push(el, t0, t1, from?, to?)` | slow scale drift |
| `show(el, t0, t1?)` | hard on/off on a beat |
| `reveal(el, point, t0, dur?, r0?)` | circle reveal of a stacked copy |
| `scrubChart(scene, chart, t0, t1, v0, v1, ease?)` | marker, guide, path and tooltip from one value |
| `env(k, t)` | `ENV` value (`sub`, `mid`, `high`, `rms`) at time t (in `react`) |
| `css(var)` | computed value of a CSS variable, e.g. `css('--accent')` |
| `hash(n)` | deterministic number 0..1 from `n` |
| `stage`, `cam` | the stage and camera DOM roots |

## Shot helpers

Engine helpers, all pure functions of `t`; CSS for `.cursor`, `.ripple`, `.cap` is in `base.css` (override in `film.css`). Snippets using them: `shots.md`, `motion-vocabulary.md`.
- `cursor(host, from, steps)`: `host` = the camera layer, so the cursor zooms with the UI. `steps: [{ to: {x, y}, t, dur, click? }]` in stage space (`center()`); a click adds a ripple and `press`. Returns the cursor element.
- `caption(scene, text, t, from = { x: -70 })`: append **after** `wrap()` so it doesn't zoom; opaque, offset-only entrance, text ≥ 28 px. Returns the element. The default spot is the bottom-left corner (`.cap` in `base.css`): see *Captions* below if that covers content.
- `typeOn(el, text, times, onUpdate?)`: `times` = one absolute second per character (onsets from `music.json`, or `t0 + i·0.1 + (rnd() - 0.5)·0.06` for human timing). Like `type`, show a placeholder through `onUpdate(0)`.
- `push(el, t0, t1, from = 1, to = 1.06)`: linear drift on a camera layer so no shot is still. Not at the same time as a `focus()` tween on that layer.
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

**Entrances: `NI` or a plain `fromTo`?** `NI` (`immediateRender: false`) means: until the tween starts, the element shows its CSS/natural state. A plain `fromTo` paints its from-state at build time and keeps it until the start.
- Must be **absent or offset until its moment** (a toast, a chip, rows landing mid-shot, stagger children, a stamp): plain `fromTo`, or `NI` plus `tl.set(el, from, 0)`. With `NI` alone it sits visible at its natural spot until the tween starts, then jumps.
- Starts **from where it already is** (a camera move, the second tween of a sequence on one element, a repeated press, a counter): `NI`. Every fromTo of a sequence on one element takes `NI`, or the last one paints at build time and wins.
- Never two tweens on the same property of one element unless one ends before the next starts.
Elements that appear later and should be fully hidden before: `opacity: 0` in HTML (or `tl.set(el, { opacity: 0 }, 0)`), then
```js
tl.fromTo($(s, ".new"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 }, 5.5);
```
Fades are fine mid-shot. On a **cut frame** they are not (next pattern). An element that appears later than its scene starts never takes `NI`.

**Word per beat**: each word its own `.center` layer; `show(el, t, tNext)` switches it on its beat (`motion-vocabulary.md` #2).

**Cut on a hit**: the new scene's `start` equals the hit time and its first frame is **sharp and fully opaque**. Enter by position (`y: 60`), scale (0.9–1.3) or a blur ≤ 6 px, from `opacity: 1`. Never a fade from 0 (a late cut) or from 0.35 (a dim frame). Stagger children start at their offset position, not hidden, so frame 1 already shows them. Check the frame at `t + 0.02` in a still.

**Rolling word** (`.roll > .stack > span`): tween `.stack` `yPercent` by `-100 / spans.length` per step.

**Several app states in one scene**: stack copies of the screen (`UI.app("before")`, `UI.app("after")`) absolutely on top of each other and switch with `tl.set(el, { display: "none" | "" }, t)`. **Measure `center()` of every target while all copies are displayed**: a copy with `display: none` has no layout and measures as 0,0. Hide the copies afterwards, in the timeline (`tl.set(copy, { display: "none" }, 0)`), not in the HTML. For a theme change, `reveal(light, T, 14)` (T = `center()` of the toggle, measured with both copies shown; hides `light` until 14):
```js
const T = center($(s, ".theme-toggle"));
reveal(light, T, 14);
```
At a high camera zoom the disc is a flat blob: reveal at ≤ 1.2× (or wipe with `polygon()`).

**Scrolling a tall page**: the page is one `.main` taller than its viewport (`overflow: hidden`); a scroll is a `y` tween on it. Keep sticky headers and sidebars outside `.main`, and tween a scrollbar thumb with it.
```js
const dist = main.offsetHeight - vp.offsetHeight, V = center(vp);          // measure first
tl.fromTo(main, { y: 0 }, { y: -dist, duration: 1.3, ease: "power2.inOut", ...NI }, 9.7);
```
Never scroll a real `overflow: auto` element: its scroll position isn't a function of `t`. A target at the very bottom of the page: extra-scroll recipe in `shots.md` 7.

**Steps in an SVG chart**: `tl.set(dot, { attr: { r: 6, fill: "var(--sun)" } }, t)`; move an HTML tooltip with `left`/`top` in % of the chart box.

**An element that slides in and pushes content down** (alert, toast): measure its natural height first, then
```js
const h = $(s, ".alert").offsetHeight;                                  // measured with it present
// height 0 + overflow hidden hides it; no opacity fade, so the frame on the hit is already sharp
tl.fromTo($(s, ".alert"), { height: 0, marginBottom: -gap }, { height: h, marginBottom: 0, duration: 0.35, ease: "expo.out" }, 9.98);   // plain fromTo: collapsed until 9.98
```

**Captions**: `caption(s, "Live numbers", t0)` after `wrap()`, so it stays out of the camera layer. Opaque, placed in a margin or an empty corner, never over the thing being shown, offset-only entrance (fully visible on the hit frame), text ≥ 28 px.
- **Placement.** The default `.cap` is bottom-left, 96 px from the edges. If the shot has content there, move it to a free corner: set `c.style.left = "auto"; c.style.right = "96px"` (and `top`/`bottom`) on the returned element, and pass `from = { x: 70 }` so it enters from its own side. If your `engine.js` accepts a position option on `caption` (check its signature), that is the same thing, optional.
- **Timing.** `caption` assumes `t` is the scene's start. For a caption that appears later in the scene, hide it first (`tl.set(c, { opacity: 0 }, 0)` and `tl.set(c, { opacity: 1 }, t)`), otherwise it sits visible at its natural spot until `t`, then jumps.

**`backdrop-filter` ghosting**: a blurred glass panel samples what is behind it in the browser, and in a stacked-copy scene or a scaled camera layer that can ghost or smear. Replace it in replicas with a solid or semi-opaque colour close to the blurred result (`background: rgb(20 22 28 / .92)`); verify in a still at the zoom the shot uses.

**Sprites** for GIFs/animated emoji: convert to a horizontal strip (`ffmpeg -i in.gif -vf tile=Nx1 strip.png`), then
```html
<i class="sprite" data-n="12" data-fps="15" style="width:240px;height:160px;background:url(img/strip.png) 0 0/1200% 100%"></i>
```

**Audio-reactive extras** in `react(t, ctx)`: read `ctx.env("sub", t)`; set styles directly. No tweens, no state between frames.

## Captured DOM recipes

For screens captured with `capture.mjs` (`replicas.md`). The captured markup differs from hand-made placeholders, so a few helpers need a different form. Helper names below are generic: use the ones your `engine.js` exports (check its `ctx` list); if one is missing, the plain-GSAP fallback is given.

- **Scrub a captured chart.** `scrubChart` expects `.tip/.dot/.guide/.hl`, which a capture lacks. Either capture 3–5 hover states (`hover` actions) and `UI.swap` between them under a moving `cursor()`, or add those four elements over the captured svg (positioned from the chart's real `xy`) and run `scrubChart` (`shots.md` 4).
- **Type into a captured input.** The input's text is its `value`, not a text node. Run the typing helper (`type`/`typeOn`, or an input-aware variant such as a `typeInput`-like helper if your engine has one) with `(k) => { inp.value = word.slice(0, k); }` in `onUpdate`. Never replace the input with a span.
- **Drive a range thumb** (a radar or timeline slider). A native range can't be tweened by CSS; tween a proxy `{ v }` and in `onUpdate` set `input.value = v` and, if the thumb is drawn by CSS variable or `left`, the same value there. Seek-safe because the value is a function of the proxy. If the thumb is custom markup, tween its `x`.
- **Count a number inside markup** such as `<span class="num">21<sup>°</sup></span>`: `count()` overwrites `textContent` and loses the `<sup>`. Use a text-aware counter (a `countText`-like helper that updates only the first text node), or write the value into a dedicated inner span: `onUpdate: () => { numNode.nodeValue = Math.round(p.v); }` with `numNode = el.firstChild`.
- **`focus()` without the 1080 clamp.** The clamp pins targets near the top or bottom edge; for those, use `focus(point, scale, { clamp: false })` (the stage margin may show: check the end frame) or scroll the page first (`shots.md` 7). An unclamped, scroll-aware variant may exist in your engine: prefer it when it does.

## Determinism rules

Everything on screen must be a pure function of `t`, or renders differ from the preview and between runs.
- No `setTimeout`, `setInterval`, CSS animations or transitions (base.css disables them), `Date`, `Math.random`.
- `onUpdate` callbacks must set state from the tween's current value only (as `type` and `count` do).
- Everything visible at t must be reachable by seeking straight to t; scrub backwards in the preview to check.

# Film API (film.js)

Read this before writing or editing `film.js`. Paths to scripts are relative to the skill directory.

## Contents
- File layout
- Config
- Helpers (ctx)
- Patterns: scene with camera, typing, press + burst, word per beat, cut on a hit, rolling word, sprites, audio-reactive
- Determinism rules

## File layout

| file | edit? | what |
|---|---|---|
| `index.html` | rarely | stage, fx layers, HUD, script order |
| `engine.js` | no | helpers, react layer, preview clock, `window.__seek` |
| `base.css` | no | stage, HUD, helper classes (`.center`, `.display`, `.gtext`, `.roll`, `.sprite`) |
| `film.css` | yes | tokens (`--bg`, `--accent`, `--grad`, fonts) + replica styles |
| `ui.js` | yes | `window.UI` screen builders returning HTML strings |
| `film.js` | yes | `Film({...})` config + `build()` with every scene |
| `env.js` | generated | `window.ENV` from `music.mjs envelope` or `music.mjs grid` |

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
| `focus(point, scale)` | `{x, y, scale}` that puts `point` at screen centre at `scale` |
| `type(el, text, t0, t1, onUpdate?)` | types `text` between t0 and t1; seek-safe |
| `count(el, from, to, t0, dur, fmt?)` | number tween into `el.textContent` |
| `press(el, t)` | button press (scale 0.92 → 1) landing at `t` |
| `burst(host, point, t, n?, spread?, colors?)` | particle burst at `point` in `host` |
| `rings(host, t)` | shockwave rings from the centre of `host` |
| `flash(t, peak?, dur?, color?)` | full-frame flash |
| `splitChars(el)` | wraps each character in `.ch`; returns them |
| `rnd()` | seeded random; never use `Math.random` |
| `NI` | `{ immediateRender: false }` for `fromTo` in shared scenes |
| `$`, `$$` | `querySelector`, `querySelectorAll` as array, scoped to a root |
| `env(k, t)` | `ENV` value (`sub`, `mid`, `high`, `rms`) at time t (in `react`) |

## Patterns

**Scene with a camera that follows the action**
```js
const s = scene(UI.dashboard(), 4, 8);
const cam = wrap(s);
const P = { search: center($(s, ".search")), save: center($(s, ".save")) };  // measure first
tl.fromTo(cam, focus(P.search, 1.6), { ...focus(P.search, 1.8), duration: 1.2, ease: "power1.inOut" }, 4);
tl.to(cam, { ...focus(P.save, 2.0), duration: 0.35, ease: "power3.inOut" }, 5.15); // starts after the first ends
```

**Typing into an input**
```js
type($(s, ".q"), "Lisbon", 4.3, 4.9);
tl.set($(s, ".q"), { textContent: "Search…" }, 0);       // state before typing
```

**Press + burst on a beat**
```js
press($(s, ".add"), 5.5);
burst(fxLayer, P.save, 5.5, 10, 50);   // fxLayer = a div appended to the camera layer
```

**Element that appears later in a scene**: hide it in HTML, then reveal.
```js
// <div class="row new" style="opacity:0">…</div>
tl.fromTo($(s, ".new"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ...NI }, 5.5);
```

**Word per beat**: each word its own `.center` layer with `opacity:0`; `tl.set` it visible on its beat, hide the previous one.

**Cut on a hit**: the new scene's `start` equals the hit time, and its first frame already shows content (start opacity ≥ 0.35 or a scale/blur entrance), so the cut reads on the frame of the hit.

**Rolling word** (`.roll > .stack > span`): tween `.stack` `yPercent` by `-100 / spans.length` per step.

**Sprites** for GIFs/animated emoji: convert to a horizontal strip (`ffmpeg -i in.gif -vf tile=Nx1 strip.png`), then
```html
<i class="sprite" data-n="12" data-fps="15" style="width:240px;height:160px;background:url(img/strip.png) 0 0/1200% 100%"></i>
```

**Audio-reactive extras** in `react(t, ctx)`: read `ctx.env("sub", t)`; set styles directly. No tweens, no state between frames.

## Determinism rules

Everything on screen must be a pure function of `t`, or renders differ from the preview and between runs.
- No `setTimeout`, `setInterval`, CSS animations or transitions (base.css disables them), `Date`, `Math.random`.
- `onUpdate` callbacks must set state from the tween's current value only (as `type` and `count` do).
- Everything visible at t must be reachable by seeking straight to t; scrub backwards in the preview to check.

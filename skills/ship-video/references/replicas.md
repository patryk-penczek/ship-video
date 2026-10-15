# Replicas: capture the running app into the film

Read in step 5. The replica is the app itself: its real DOM and CSS, captured per state, not rebuilt by hand. `$S` = the skill's `scripts/`.

## Contents
- Capture first (commands)
- states.json
- Using captured states in film.js
- Pitfalls
- Compare against the real app
- Without a running app

## Capture first (commands)

```
node $S/capture.mjs <url> <film> --discover [--routes /,/radar]   # 1. inventory every view: review/discovery/*.png + inventory.json
node $S/capture.mjs <url> <film>/states.json <film> --css         # 2. DOM per state + app.css + fonts
node $S/compare.mjs <url> <film>/gallery.html <film>/review/compare --states <film>/states.json   # 3. diff per state
```

- `--discover` follows links and clicks nav/tab buttons, adds an unknown-route probe (the 404 page is a view), and prints height, inner scroll containers and canvases per route. States that need clicks (dialogs, toasts, themes) are yours to list in states.json.
- Capture writes `<film>/screens.js` (`SCREENS` html + `SCREENS_META`), `<film>/review/discovery/<state>.png`, `<film>/img/*` (canvas frames, images), and with `--css` `<film>/app.css` + `<film>/fonts/*`. It prints the `fonts:` and `images:` lists for film.js. Regenerate, never hand-edit. Other flags: `--root "<sel>"` (default: first child of `#root`/`#app`/`#__next`, else of body), `--full` (full-page screenshots).
- `node $S/port-css.mjs <url|a.css b.css> <film>/app.css` ports the CSS alone (reads the live page's CSSOM and stylesheet sources, so Vite/Bun/Next dev all work; css files are the fallback).
- Handled for you: scripts and `on*` stripped; input/textarea values, checked and selected baked into attributes; `<canvas>` → `<img>`; SVG ids suffixed per state (`url(#g)` rewritten) so stacked copies never share gradients; remote images copied to `img/`; `html`/`body` attributes (`data-theme`, classes) moved to the `.app-shot` wrapper; CSS scoped as `:where(.app-shot) …` (app specificity unchanged), `:root`/`html`/`body` rules → `.app-shot`, `@media`/`@supports` resolved for 1920×1080, `@keyframes` dropped, `position:fixed` → absolute with the app root made static (overlays anchor to the 1080 wrapper), `vh`/`vw` → px, `@font-face` files copied (inlined data: fonts extracted).

## states.json

```json
[
  { "name": "home" },
  { "name": "palette", "actions": [{ "press": "Control+k" }, { "wait": 150 }] },
  { "name": "query", "continue": true, "actions": [{ "type": "Reyk" }, { "wait": 150 }] },
  { "name": "added", "continue": true, "actions": [{ "press": "Enter" }, { "wait": 300 }] },
  { "name": "radar", "path": "/radar", "actions": [{ "waitFor": "canvas" }], "canvas": { "frames": 4, "every": 400 } },
  { "name": "not-found", "path": "/nope" }
]
```

State keys: `name` (letters, digits, `-_.`; must match the gallery `.frame[data-state]`), `path`, `actions`, `continue: true` (keep the previous state's page instead of reloading: no repeated prefix), `capture: false` (drive only), `root`, `full`, `canvas`.
Actions: `click` · `dblclick` · `fill [sel, text]` · `type text` · `press key` · `hover` · `select [sel, value]` · `check` · `set [sel, value]` (range inputs) · `scroll y | [sel, y]` · `waitFor sel` · `wait ms` · `goto path` · `eval js`.

- Scope every selector (`.dialog input`, not `input`): an ambiguous one fills the first match (a sidebar filter instead of the dialog) and the state still looks fine. Check the captured state's PNG.
- Use `fill`, not `Control+A` + `type`: on macOS Chromium `Control+A` is "line start", so the text is appended and the palette never closes.
- Timers need `wait` (a 4.2 s toast: `wait: 4400` to see it gone).
- `canvas`: `{ frames: N, every: ms }` grabs N frames over time for an animated canvas (radar); `{ steps: [[actions], …] }` runs actions before each frame (scrub a slider; for a timeline radar `set` the range input from its minimum to its maximum so frames come out in order: `frames` alone samples a looping animation by time, not by timeline). Frames land in `img/<state>-c<k>-<n>.png`; the `<img>` carries `data-frames`. A WebGL canvas without `preserveDrawingBuffer` comes out blank (reported).

## Using captured states in film.js

`index.html` and `gallery.html` already load `app.css` and `screens.js`. `ui.js` has:

```js
const s = scene(UI.stack(["home", "palette", "added"]), 4, 12);   // stacked copies, all but the first display:none
const cam = wrap(s);
const P = UI.measure(s, "home", (h) => ({ card: center($(h, ".current")) }));   // measure a state: shows it, runs fn, restores
UI.swap(tl, s, "palette", 6);                                      // from t=6 only "palette" is visible
tl.fromTo($(UI.pick(s, "home"), ".current"), { y: 40 }, { y: 0, duration: .6, ...NI }, 4);   // real elements tween; offset only: opaque on the cut frame
UI.frames(tl, $(UI.pick(s, "radar"), "img"), 8, 12);               // step a captured canvas through its frames
```

`UI.shot(name)` is one state's html (an `.app-shot` wrapper), `UI.images()` the canvas frames for `Film({ images })`. Don't film a sequence of swapped static screens alone: tween individual elements inside the captured screens (cards rise in, bars grow, a row slides) so it reads as the app moving. List the font faces from the capture output in `fonts:`.

## Pitfalls

- **Stacked copies are `display:none` when measuring.** With all copies visible the page is several screens tall and every `center()`/`rect()` is wrong. Always `UI.measure`.
- **After a theme reveal, hide the covered copy** (`UI.swap` does). `backdrop-filter` cards blur whatever is stacked beneath, so a dark copy under a light one ghosts.
- **Duplicate SVG ids** make a copy paint with another copy's gradient; capture suffixes them, and for hand-made markup do the same.
- **Tall pages.** The wrapper is a 1920×1080 window. Scroll by tweening `y` on `.main` (the sidebar stays put) and subtract the scroll from `focus()` coordinates. `page height` in the capture log and `SCREENS_META[name].height` give the length. A target at the very bottom needs the extra-scroll recipe in `shots.md` 7.
- **Fixed overlays** (toasts, dialogs, scrims) are handled by the port; if one is missing in the replica, check that the app root is `position: static` in `app.css`.
- **Input values** are baked into `value=`. To type in a captured input, run `typeOn()` (or `type()`) on it and set `input.value` in the `onUpdate(k)` callback (`shots.md` 2); never fake it by swapping an "empty" and a "typed" state.
- **Hover on a captured chart:** capture hover states with `hover` actions and `UI.swap` between them with a moving cursor, or add a `.tip/.dot` overlay for `scrubChart` (`shots.md` 4).
- **Dialogs and palettes:** the scrim darkens the frame, so zoom onto the dialog (≥ 50% of the frame) instead of filming it at 1.0× (`shots.md`, *Dialog or palette shot*).
- **A paused or reduced-motion canvas** captures identical `frames`: use `canvas.steps` (scrub the range input with `set`) and check that the frames differ.
- **`compare.mjs` shows a big diff after a click that scrolled the real page:** the real page kept its scroll, the replica didn't. Add a `scroll 0` action, or ignore that state's offset.
- **CSS animations and transitions don't run** (base.css disables them); rebuild entrances on the timeline.
- **Fonts**: the capture copies them; check the faces are in `fonts:` or the first frames render in a fallback.
- **Theme**: tokens computed from other tokens work because the wrapper carries `data-theme`; both themes can be on screen at once.
- Browser defaults: `base.css` resets margins/padding/box-sizing at zero specificity; `app.css` restores UA defaults for headings, lists and paragraphs the same way. Form controls the app styles itself are fine; unstyled ones may differ (compare shows it).
- `audit.mjs` flags the wrapper's crop; `shot()` sets `data-clip-ok` on it.

## Compare against the real app

`compare.mjs` drives the real app through the same states.json and screenshots each `.frame[data-state]` of `gallery.html` (which lists every captured state automatically). It prints a pixel diff per state and writes `<state>.png` (real / replica / diff stacked) and `<state>-diff.png`. Flags: `--scale 1` (full-size stacked images, default 0.5), `--full` (whole page height; sticky/fixed sidebar and sky differ by construction there), `--max-diff N` (default 2 %). Captured DOM often scores 0.00 %: that is expected and not informative; the stills are the real check, and `--full` for tall pages (the default compares only the 1080 viewport). Read the PNGs: target under ~2 %, text anti-aliasing alone is ~0.3 %. A red block in the diff is a real difference (missing element, wrong colour, scrolled content).

## Without a running app

Rebuild from the components: read each one and write a builder in `ui.js` returning the same markup and class names, port its CSS the same way (`port-css.mjs a.css b.css <film>/app.css`), and register the builders as states in `gallery.html`. From screenshots only when there is no code; say which screens are approximated.

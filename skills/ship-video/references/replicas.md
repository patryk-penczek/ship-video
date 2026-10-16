# Replicas: the app's real UI in the film

Read at step 5 (and for capture options in Discovery). The replica is the app itself: its real DOM and CSS captured per state, then animated. Rebuilding by hand is the fallback. Every script has `--help` with all flags; this file covers what you need to decide.

## Contents
- Commands
- states.json
- Options: login, phones, themes, scroll-reveal, deterministic data, privacy
- Canvas, maps, games
- Comparing with the real app
- Pitfalls
- Without a running app

## Commands

```
node $S/capture.mjs <url> <film> --discover [--routes /,/radar]    # every view: review/discovery/*.png + inventory.json
node $S/capture.mjs <url> <film>/states.json <film> --css          # DOM per state, app.css, fonts, images → screens.js
node $S/compare.mjs <url> <film>/gallery.html <film>/review/compare --states <film>/states.json
```
Capture prints the `fonts:` and `images:` lists for `film.js`. Regenerate the outputs, never hand-edit them. Pass the same flags (`--storage`, `--viewport`, `--scheme`, `--seed`, `--timezone`, `--redact`) to capture and compare.

The capture handles the hard parts: scripts stripped, input values baked in, SVG ids made unique per state, CSS scoped under `.app-shot` at the app's own specificity, media queries resolved for 1920×1080, fixed overlays anchored to the frame, fonts and remote images copied, hover-only UI baked with `--bake-hover "row,.btn"`.

Dev servers compile each route on first request: warm every route once, or capture a production build if the dev server is slow or half-styled.

## states.json

```json
[
  { "name": "home" },
  { "name": "palette", "actions": [{ "press": "Control+k" }, { "wait": 150 }] },
  { "name": "query", "continue": true, "actions": [{ "fill": [".palette input", "Reyk"] }, { "wait": 150 }] },
  { "name": "radar", "path": "/radar", "actions": [{ "waitFor": "canvas" }], "canvas": { "frames": 6, "every": 400 } }
]
```
- `continue: true` keeps the previous state's page instead of reloading; `before: true` also captures the page right before the last action (the *before* state a click needs).
- Actions: `click`, `dblclick`, `fill [sel, text]`, `type`, `press`, `hover`, `select`, `check`, `set [sel, value]` (range inputs), `scroll`, `waitFor`, `wait ms`, `goto`, `upload`, `tap`, `swipe`, `drag`, `mouse`, `eval`.
- **Scope every selector** (`.dialog input`, not `input`): an ambiguous one fills the first match and the state still looks fine. Check each captured PNG.
- Use `fill`, not Control+A then type (on macOS Chromium Control+A is "line start").
- Timers need a `wait` long enough to pass them.
- Capture both states of every interaction the film shows (`toggle-off` and `toggle-on`): a click needs its *before* state.

## Options

- **Login or onboarding.** Seed the session instead of driving a form: `--storage "token=abc"`, `--storage-state file.json`, or `"init": { "storage": {}, "cookies": [] }` with the states under `"states"`. A first-run screen: a `"setup"` block that runs once and whose storage every state reuses. No way in: ask the user for a test account or a seeded dev mode.
- **Phones.** `--viewport 390x844 --touch`; the app is centred on the stage at that size.
- **Themes.** `--scheme light|dark` or `"scheme"` per state; with `--css` both themes' rules are kept.
- **Root.** Default is the app container's child; `--root "<sel>"` when toasts or portals live outside it (a warning names visible elements the root leaves out).
- **Landing pages.** `"reveal": true` scrolls through first so scroll-triggered content appears; `--discover` always does. CSS keyframe animations are not ported (the warning names them): rebuild them on the timeline.
- **Deterministic data.** `--seed N`, `--timezone Area/City`, `"init": { "date": "2026-01-15T10:00:00Z" }`, or `--init-script`. Capture all states in one run so they agree.
- **Layouts that break in the replica** (JS-measured grids): `"pin": true` inlines resolved sizes; `"image": true` stores a screenshot instead (text no longer live).
- **Privacy.** A film that is public or shared never shows real customer data. `--redact` replaces emails, phones and keys in text and attributes with consistent fakes (`--redact-names "Jane Doe"` for names). It doesn't touch pixels (canvases, photos, avatars): look at them. In `continue` states, text selectors for redacted words no longer match: use CSS selectors. `audit.mjs` checks the finished film too.

## Canvas, maps, games

- An animated canvas: `"canvas": { "frames": N, "every": ms }` grabs frames over a fake clock; `"steps"` runs actions before each frame (scrub a slider with `set`). Identical frames print a warning: a paused or reduced-motion canvas needs `steps`. Frames play with `UI.frames`.
- Drawing, maps, games: a `"record"` state drives the page with the real mouse (`"steps": [{ "stroke": [[x, y], …] }, { "click": [x, y] }]`) and writes a frame per step plus the pointer path; replay with `UI.recording(name)` and `follow`. Real frames are exact and cheaper than rebuilding the drawing.
- Captured at DPR 2: sharp up to ~1.9× camera zoom. WebGL without `preserveDrawingBuffer` comes out blank (reported).

## Comparing with the real app

`compare.mjs` drives the real app through the same states and writes `<state>.png` (real / replica / diff) per state with a diff %. Read the PNGs: under ~2% is the target (text anti-aliasing alone is ~0.3%); a red block is a real difference. It also lists text the real page shows and the replica doesn't (a dropped toast scores low in pixels but is `MISSING`). `"mask": ["#clock"]` ignores live values; `--full` compares the whole page height.

Captured DOM often scores near 0%: the comparison then mostly proves nothing broke. The stills at the zoom the film uses are the real check.

## Pitfalls

- **A theme on `<html>`** is moved to the `.app-shot` wrapper, so tokens computed from tokens still resolve; check a still of each theme.
- **Fonts**: list every face in `fonts:` or the first frames render in a fallback. A font can load and still lack glyphs (accents, CJK): check the copy in a full-resolution still. Some bundlers break `@font-face` (`format("woff2-variations")` unquoted): if the app itself renders in a system font, write your own `@font-face` in `film.css`.
- **Real scroll** isn't a function of `t`: a click that scrolled the real page shows as a big diff; add a `scroll` action.

## Without a running app

Read each component the scenario needs and write a builder in `ui.js` returning the same markup and class names; port its CSS with `node $S/port-css.mjs a.css b.css <film>/app.css`; register the builders as states in `gallery.html`; compare with `snap.mjs` stills against the app's own screenshots. Copy tokens, icons and copy verbatim, then audit component by component: the first pass misses a lot. From screenshots alone only when there is no code (a native app): say which screens are approximated.

# Replicas: porting the app's UI into the film

Read in step 5. The goal is a replica that is the app, pixel for pixel, in the states the scenario needs.

## Contents
- Where the HTML comes from
- Porting the CSS
- Themes
- Fonts and assets
- Comparing against the real app

## Where the HTML comes from

Best to worst:
1. **Capture the running app.** Open it with Playwright, drive it into each state, and save `document.querySelector(root).outerHTML`. The structure, copy and classes are exactly the app's. Strip scripts and event attributes; keep it as a string per state in a generated file (say `screens.js`), and regenerate rather than hand-edit.
2. **Rebuild from the components.** Read each component and write a builder in `ui.js` that returns the same markup with the same class names.
3. **From screenshots** only when there's no code. Say in the report which screens were approximated.

## Porting the CSS

Copy the app's stylesheets (tokens first) into `film.css`, then fix four things:

- **Scope everything** under one wrapper class (`.app-shot`) so the app's rules can't touch the film's stage, captions or HUD.
- **Resets go through `:where()`** so they keep zero specificity: `:where(#scenes, .frame) :where(button, input) { all: unset }`. A plain `.app-shot button { … }` outranks the app's own component classes and silently restyles every button.
- **`position: fixed` → `absolute`.** Fixed elements escape the camera layer and stay put while the camera moves. Also convert `vh`/`vw` to px for 1920×1080 (`100vh` → `1080px`).
- **No CSS animations or transitions survive.** base.css disables them; anything the app animates (spinners, entrance effects, animated icons) must be rebuilt on the timeline if the film needs it.

Bundlers can mangle `@font-face` (see lessons #10): write your own rules pointing at the font files.

## Themes

Apps usually set the theme on `<html>` (`data-theme="light"`), and the film needs both themes on screen at once (a reveal). Move the attribute to the replica's wrapper (`.app-shot[data-theme="light"]`) and **re-declare every token that is computed from another token** there too: `--card-gradient: linear-gradient(var(--sky), …)` declared on `:root` keeps the dark values even inside a light wrapper, because custom properties resolve where they're declared.

## Fonts and assets

- Copy the font files the app actually loads (check the network tab or the built CSS), declare them in `film.css`, list every face in `fonts:`.
- Images, avatars, logos: copy into `<film>/img`, list in `images:`.
- Icons: copy the SVG source verbatim; don't redraw.

## Comparing against the real app

`gallery.html` renders one `.frame` per state from the same `ui.js` and `film.css` as the film. Name each state, then describe how to reach it in the real app in `states.json`:

```json
[
  { "name": "home" },
  { "name": "search", "actions": [{ "click": ".add-city" }, { "type": "Bar" }, { "wait": 150 }] },
  { "name": "light", "actions": [{ "click": ".theme-toggle" }] }
]
```

`node scripts/compare.mjs <url> <film>/gallery.html <film>/review/compare --states <film>/states.json` writes one PNG per state, real on top. Check structure, copy, spacing, sizes, colours, icons, selected/hover states. Fix, re-run, repeat until every pair matches. The app is captured with animations frozen, so compare its resting state.

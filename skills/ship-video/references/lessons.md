# Lessons learned

Each one cost real time on a shipped film. Read once before step 5 (replicas); it covers step 6 (build) too. Direction pitfalls (identity, story thread, dense UI, static end card, silent films, coverage, dark frames, captions, empty zoom) are in `direction.md`, *Red flags*; this file keeps process, tooling and layout.

## Process
1. **Agree the scenario before building.** It is a table: seconds → music event → what's on screen → exact copy. A scenario change after the build means re-timing, re-measuring and re-rendering; an extra round of questions costs minutes.
2. **Show still frames at key moments before every render.** Contact sheets for rhythm, full-resolution stills for detail. The user catches things you won't (a wrong label, an off-brand colour, a word that reads badly).
3. **Real assets beat invented ones.** A real screenshot, a real GIF or a real conversation makes a scene credible; invented chat copy reads as fake. If the film shows people talking (chat, comments), only fictional people speak, unless the real ones agreed.

## UI replicas
4. **Build replicas from the real components, not from a description.** Copy tokens, fonts, SVG icons and copy verbatim. Then audit component by component (structure, copy, sizes, tokens, icons, states) against the source and fix. The first pass misses a lot.
5. **The app's CSS resets outrank its components once scoped.** `.app-shot button { … }` beats `.btn-primary`. Port resets through `:where()` (zero specificity); see `replicas.md`.
6. **A theme on `<html>` doesn't move cleanly to a wrapper.** Tokens computed from other tokens on `:root` keep the dark values inside a light wrapper. Re-declare them on the wrapper's `[data-theme]`.

## GSAP and camera
7. **Bring things in with `enter(el, from, t)`** (`film-api.md`, *Entrances*). `fromTo` paints its from-values at build time; `NI` doesn't, so an element tweened with `NI` that should be absent until later sits at rest, then jumps. A real case: an end-card tagline tweened `fromTo({y: 50}, {y: 0, ...NI})` sat on screen, then jumped 50 px down at its time and slid back; the audit's jump check reports it.
8. **Measure positions (`center()`) before adding tweens that move those elements** (or their camera). Otherwise you measure the from-state and every focus point is off.
9. **Never let two camera tweens overlap on the same properties.** They fight, and the shot jitters. End one before the next starts, or tween different properties.
10. **`center()` of a full-width or `flex: 1` element is the middle of its strip, not of its content.** A focus on an alert banner lands in empty space. Measure the icon or title inside it and offset from there.
11. **An element that starts collapsed** (an alert that slides in and pushes content down) must be measured in its natural layout; the elements below it are measured with it present, so their positions before it appears are off by its height plus the gap. Measure both states.
12. **Never set `visibility: visible` on an element inside a scene.** It overrides the hidden scene around it. Switch states with `display` or `opacity`.
13. **`center()` of a hidden state copy is 0,0.** In a scene with stacked copies (before/after, dark/light), measure every target while all copies are displayed, then hide them with `tl.set(copy, { display: "none" }, 0)`.
14. **A camera tween aimed at the top of a component can land on empty chrome or a half-cropped card**, and `focus()`'s clamp keeps a target near the frame's top or bottom from being centred. Check both end points of every camera tween in a still (`direction.md`, *Framing*).

## Layout
15. **Translucent glass ghosts.** A covered copy still shows through `backdrop-filter` cards after a swap or reveal: hide it and use solid backgrounds in the replica (`replicas.md`, *Pitfalls*).
16. **Gradient text (`background-clip: text`) clips descenders** (g, y, p) unless the box has bottom padding, and **clips the last letter on the right** when negative letter-spacing pushes it past the box (`.gtext` in base.css pads both). The audit can't see either: nothing overflows the layout, the paint is just cut. Check gradient words in full-resolution stills. Same for `overflow: hidden` windows such as a rotating word. **Never `splitChars` a `.gtext` word**: each letter restarts the gradient and the word looks broken. Animate it as one element.
17. **Bun's CSS bundler breaks fontsource `@font-face` rules** (it unquotes `format("woff2-variations")`, and Chrome drops the rule). The app silently falls back to system fonts, and a replica measured from it will be wrong. When reading a Bun/Vite app's fonts, check which files they point to and write your own `@font-face` in `film.css` with `format("woff2")`.
18. **Long kinetic words overflow 1920 px.** Run `audit.mjs` and fix every hit that isn't a deliberate transition.
19. **A chat panel starts at the top and scrolls only when replies overflow**, as real chat apps do. Don't bottom-anchor it.
20. **A selected chip that hides its dot must also collapse the gap**, or the label sits off-centre.
21. **A font that loads without error can still lack glyphs** (CJK, accents, symbols render as boxes or a fallback). Check the copy's script in a full-resolution still.

## Music and timing
22. **Cuts land on detected hits and kicks.** Verify on the final MP4 with `hits.mjs`: frames at ±0.02 s around every hit.
23. **A Suno track is as long as Suno makes it.** Shape the film to the track: move scenes to the real hits, stretch or shorten them. If it really must be shorter, cut whole bars on bar lines and keep the drop and the final hit; never trim mid-phrase to hit an exact number.
24. **A cut on a hit that fades in from 0 reads as a late cut** (and at 0.35 opacity as dim): the cut frames of a whole film looked washed out for this. The rule is in `film-api.md`, *Cut on a hit*; it covers alerts, dialogs and captions that enter on a hit too.
25. **A silent film with bass effects feels broken.** Shake, pulses, rings, hard flashes, stamp and glitch read as hits of a sound that isn't there (`direction.md`, *Silent films*).
26. **Flashes over app UI stay at ≤ 0.5.** A 0.85–0.9 white flash turns a frame of dark UI flat grey. Strong flashes belong on type-only frames.

## Tooling
(Shell safety, shared machines and untrusted downloads: `sharing.md`.)
27. **Render time on a shared machine is 2–3× the idle estimate** (a motion-blur render quoted at 6–8 minutes took about 20 under load; 9 s per film second was measured). Quote a range and check `.progress`.
28. **zsh doesn't word-split unquoted variables.** `T="1 2 3"; node $S/shots.mjs f.html out $T` passes one argument. Use `${=T}` in zsh or pass the times literally. And `$3:stats` is read as `$3` with the `:s` modifier: brace variables next to a colon (`${3}:stats`).
29. **GIFs hate grain and gradients.** (The skill doesn't produce GIFs; use this only if the user insists.) A moving grain layer changes every pixel every frame, and gradient backgrounds band or smear in 256 colours; together they tripled a 24 s GIF. For GIF output, turn off `#grain`, `#vignette` and `.bg-glow`, render crisp, convert at 15 fps without dithering, then `gifsicle -O3 --lossy=15`.

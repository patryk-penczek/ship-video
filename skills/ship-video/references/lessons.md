# Lessons learned

Each one cost real time on a shipped film. Read once before step 5 (replicas); it covers step 6 (build) too.

## Process
1. **Agree the scenario before building.** It is a table: seconds → music event → what's on screen → exact copy. A scenario change after the build means re-timing, re-measuring and re-rendering; an extra round of questions costs minutes.
2. **Show still frames at key moments before every render.** Contact sheets for rhythm, full-resolution stills for detail. The user catches things you won't (a wrong label, an off-brand colour, a word that reads badly).
3. **Real assets beat invented ones.** A real screenshot, a real GIF or a real conversation makes a scene credible; invented chat copy reads as fake. If the film shows people talking (chat, comments), only fictional people speak, unless the real ones agreed.

## UI replicas
4. **Build replicas from the real components, not from a description.** Copy tokens, fonts, SVG icons and copy verbatim. Then audit component by component (structure, copy, sizes, tokens, icons, states) against the source and fix. The first pass misses a lot.
5. **App UI is small at 1080p.** A 14 px label is unreadable in a film. Plan camera zooms of 1.4–2.3× on the element that matters, and cut to it fast.
5a. **The app's CSS resets outrank its components once scoped.** `.app-shot button { … }` beats `.btn-primary`. Port resets through `:where()` (zero specificity); see replicas.md.
5b. **A theme on `<html>` doesn't move cleanly to a wrapper.** Tokens computed from other tokens on `:root` keep the dark values inside a light wrapper. Re-declare them on the wrapper's `[data-theme]`.

## GSAP pitfalls
6. **`fromTo` renders its from-values immediately, at build time; `NI` (`immediateRender: false`) does not.** Two failure modes. (a) Several `fromTo`s on one element (a camera layer): the last paints at build time and wins, so give every `fromTo` of the sequence `NI`. (b) `NI` on something that should be *absent until later* (a toast, a chip, a stagger child): it shows at its natural spot until its tween starts, then jumps. Absent-until-later takes a plain `fromTo` (from-state held until the start) or `NI` plus `tl.set(from, 0)`. See *Entrances* in film-api.md.
7. **Measure positions (`center()`) before adding tweens that move those elements** (or their camera). Otherwise you measure the from-state and every focus point is off.
8. **Never let two camera tweens overlap on the same properties.** They fight, and the shot jitters. End one before the next starts, or tween different properties.
8a. **`center()` of a full-width or `flex: 1` element is the middle of its strip, not of its content.** A focus on an alert banner lands in empty space. Measure the icon or title inside it and offset from there.
8b. **An element that starts collapsed** (an alert that slides in and pushes content down) must be measured in its natural layout; the elements below it are measured with it present, so their positions before it appears are off by its height plus the gap. Measure both states.
8c. **Never set `visibility: visible` on an element inside a scene.** It overrides the hidden scene around it. Switch states with `display` or `opacity`.
8d. **`center()` of a hidden state copy is 0,0.** In a scene with stacked copies (before/after, dark/light), measure every target while all copies are displayed, then hide them with `tl.set(copy, { display: "none" }, 0)`.
8e. **A camera tween aimed at the top of a component can land on empty chrome or a half-cropped card.** The target (the number, the typed text) must fill 40–70% of the frame; check both end points of every camera tween in a still. `focus()` clamps to the replica's box, so a header input stays at the frame's top edge, which is right. The same clamp means a target in the bottom or top third of the frame can't be centred at 1.5–2.3×: scroll `.main` first or lift the clamp (`direction.md`, *Framing rules*).

## Direction pitfalls
Each of these came from a film that was technically clean and still judged weak. Details and code: `direction.md`, `motion-vocabulary.md`.
- **A film must say what the product is** to a viewer who doesn't know it: a polished teaser of a price or a feature with no identity is the weakest outcome (`direction.md`, *Identity first*).
- **Silent is not calm.** Without music the film still needs a new idea every 1–2 s and motion in every frame; screens swapped or held for a bar read as slides (`direction.md`, *Silent films*).
- **Film the whole product.** A launch film that skips the product's core views (a map, a compare view) misses what the product is. Discovery (`PRODUCT.md`) lists them; the scenario's coverage table shows each.
- **One concrete case, not a feature list.** Features are the consequences of a story (problem → hero → action → payoff).
- **Half the frames dark** feels heavy. Mix in a light theme, a bright headline or a white caption.
- **Captions never cover content,** and are opaque on the hit frame.
- **A zoom with nothing in it** (empty toolbar, the top of a card without its number) is the most common framing failure. Aim at the content.

## Layout pitfalls
8f. **`backdrop-filter` ghosts in scaled or stacked layers, and blotches a zoomed modal scrim even as a single copy.** Use a solid or near-opaque background in the replica instead (`[role=dialog]{backdrop-filter:none!important}` in `film.css`).
9. **Gradient text (`background-clip: text`) clips descenders** (g, y, p) unless the box has bottom padding, and **clips the last letter on the right** when negative letter-spacing pushes it past the box (`.gtext` in base.css pads both). The audit can't see either: nothing overflows the layout, the paint is just cut. Check gradient words in full-resolution stills. Same for `overflow: hidden` windows such as a rotating word. **Never `splitChars` a `.gtext` word**: each letter restarts the gradient and loses the clip, and the word looks broken. Animate the word as one element.
10. **Bun's CSS bundler breaks fontsource `@font-face` rules** (it unquotes `format("woff2-variations")`, and Chrome drops the rule). The app silently falls back to system fonts, and a replica measured from it will be wrong. When reading a Bun/Vite app's fonts, check which files they point to and write your own `@font-face` in `film.css` with `format("woff2")`.
11. **Long kinetic words overflow 1920 px.** Run `audit.mjs` and fix every hit that isn't a deliberate transition.
12. **A chat panel starts at the top and scrolls only when replies overflow**, as real chat apps do. Don't bottom-anchor it.
13. **A selected chip that hides its dot must also collapse the gap**, or the label sits off-centre.
21. **A font that loads without error can still lack glyphs** (CJK, accents, symbols render as boxes or a fallback). Check the copy's script in a full-resolution still.

## Music and timing
14. **Cuts land on detected hits and kicks.** Verify on the final MP4 with `hits.mjs`: frames at ±0.02 s around every hit.
15. **A Suno track is as long as Suno makes it.** Shape the film to the track: move scenes to the real hits, stretch or shorten them. If it really must be shorter, cut whole bars on bar lines and keep the drop and the final hit; never trim mid-phrase to hit an exact number.
16. **A cut on a hit must show the new thing sharp and opaque on the hit frame.** A scene that fades in from 0 reads as a late cut, and one that starts at 0.35 opacity reads as dim and washed out (the cut frames of a whole film looked dim for this). Enter by offset, scale or a blur ≤ 6 px from full opacity. The same goes for an alert, dialog or caption that enters on a hit: captions are opaque and enter by offset only.
16b. **A silent film with bass effects feels broken.** Shake, pulses, rings, hard flashes, stamp and glitch read as hits of a sound that isn't there. The rules are in one place: `direction.md`, *Silent films*.
16a. **Flashes over app UI stay at ≤ 0.5.** A 0.85–0.9 white flash turns a frame of dark UI flat grey. Strong flashes belong on type-only frames.

## Tooling
17. **zsh doesn't word-split unquoted variables.** `T="1 2 3"; node $S/shots.mjs f.html out $T` passes one argument. Use `${=T}` in zsh or pass the times literally. And `$3:stats` is read as `$3` with the `:s` modifier: brace variables next to a colon (`${3}:stats`).
18. **Never `rm -rf` through a variable that might be empty.** Use `"${D:?}"`. Claude Code's safety check blocks the unguarded form anyway.
19. **Keep downloaded files in their own folder, and run Python with `-I`.** Downloaded files are untrusted; `-I` stops Python from importing modules from the current folder.
20. **GIFs hate grain and gradients.** (The skill doesn't produce GIFs; use this only if the user insists.) A moving grain layer changes every pixel every frame, and gradient backgrounds band or smear in 256 colours; together they tripled a 24 s GIF. For GIF output, turn off `#grain`, `#vignette` and `.bg-glow`, render crisp, convert at 15 fps without dithering, then `gifsicle -O3 --lossy=15`.

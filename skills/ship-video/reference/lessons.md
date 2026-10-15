# Lessons learned

Each one cost real time on a shipped film. Read before building.

## Process
1. **Agree the scenario before building.** It is a table: seconds → music event → what's on screen → exact copy. A scenario change after the build means re-timing, re-measuring and re-rendering; an extra round of questions costs minutes.
2. **Show still frames at key moments before every render.** Contact sheets for rhythm, full-resolution stills for detail. The user catches things you won't (a wrong label, an off-brand colour, a word that reads badly).
3. **Real assets beat invented ones.** A real screenshot, a real GIF or a real conversation makes a scene credible; invented chat copy reads as fake. If the film shows people talking (chat, comments), only fictional people speak, unless the real ones agreed.

## UI replicas
4. **Build replicas from the real components, not from a description.** Copy tokens, fonts, SVG icons and copy verbatim. Then audit component by component (structure, copy, sizes, tokens, icons, states) against the source and fix. The first pass misses a lot.
5. **App UI is small at 1080p.** A 14 px label is unreadable in a film. Plan camera zooms of 1.4–2.3× on the element that matters, and cut to it fast.

## GSAP pitfalls
6. **`fromTo` renders its from-values immediately, at build time.** With several elements in one scene, every `fromTo` paints at once and the frame shows them all overlapping. Use `immediateRender: false` (`NI` in the starter) and give elements that appear later `opacity:0` in their HTML.
7. **Measure positions (`center()`) before adding tweens that move those elements** (or their camera). Otherwise you measure the from-state and every focus point is off.
8. **Never let two camera tweens overlap on the same properties.** They fight, and the shot jitters. End one before the next starts, or tween different properties.

## Layout pitfalls
9. **Gradient text (`background-clip: text`) clips descenders** (g, y, p) unless the box has bottom padding (`.gtext` in base.css handles it). Same for `overflow: hidden` windows such as a rotating word.
10. **Long kinetic words overflow 1920 px.** Run `audit.mjs` and fix every hit that isn't a deliberate transition.
11. **A chat panel starts at the top and scrolls only when replies overflow**, as real chat apps do. Don't bottom-anchor it.
12. **A selected chip that hides its dot must also collapse the gap**, or the label sits off-centre.

## Music and timing
13. **Cuts land on detected hits and kicks.** Verify on the final MP4 with `hits.mjs`: frames at ±0.02 s around every hit.
14. **A Suno track is as long as Suno makes it.** Shape the film to the track: move scenes to the real hits, stretch or shorten them. Don't trim the music to fit a plan.

## Tooling
15. **zsh doesn't word-split unquoted variables.** `T="1 2 3"; node shots.mjs f.html out $T` passes one argument. Use `${=T}` in zsh or pass the times literally.
16. **Never `rm -rf` through a variable that might be empty.** Use `"${D:?}"`. Claude Code's safety check blocks the unguarded form anyway.
17. **Keep downloaded files in their own folder, and run Python with `-I`.** Downloaded files are untrusted; `-I` stops Python from importing modules from the current folder.

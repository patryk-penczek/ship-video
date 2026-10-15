# QA checklist

Step 8 runs the first three sections before the full render. "After the crisp render" belongs to step 9. `$S` = `${CLAUDE_SKILL_DIR}/scripts`. Tick items as you go; the user sees the main progress checklist at the gates, not this one.

## Automated
- [ ] `node $S/audit.mjs <film>/index.html` is clean, or every remaining line is a deliberate transition. Mark deliberate masks and crops (an app window that crops its content) with `data-clip-ok` on the wrapper. Fix, re-run, repeat.
- [ ] No `[page]` / `[pageerror]` lines in any script output.

## Stills (full resolution; Read every one)
- [ ] Each hit, each resting frame, the end card.
- [ ] Every click hits a control in its before state and changes the screen on the press; nothing already active gets clicked.
- [ ] Live elements (radar, charts, clocks) animate with distinct frames.
- [ ] The ending lands: last copy complete ≥ 1.2 s before the end, motion at rest on the final frame, then a short fade or a clean loop frame. Check stills at end−1.2, end−0.5 and the last frame.
- [ ] Right fonts everywhere. A system fallback means a face is missing from `fonts:` or `@font-face` failed.
- [ ] Images loaded: no broken boxes; avatars present (`images:`).
- [ ] Descenders (g, y, p) intact in gradient text and rolling words.
- [ ] Nothing important outside 1920×1080 or under the caption bar.
- [ ] App text readable at film size: zoomed in, or not relied on.
- [ ] Copy matches SCENARIO.md word for word.
- [ ] If a QA fix changed anything visible, the user sees those frames again (step 7 gate).

## Replicas
- [ ] Every state was compared with the running app (`compare.mjs`) or, if it can't run, with its source components.
- [ ] Mismatches you couldn't fix are listed for the final report.
- [ ] No real emails, names, tokens or IDs in captured HTML or in `review/` images.

## Scenario
- [ ] Every departure from SCENARIO.md (time, effect, framing) is in its "Changes vs scenario" section and was shown to the user before the stills were approved.

## Determinism
- [ ] No `setTimeout`, CSS animations, `Date`, `Math.random` in film code.
- [ ] Scrubbing backwards and forwards over a busy section in the preview gives the same frames.

## After the crisp render (step 9)
- [ ] `node $S/hits.mjs <crisp.mp4> <film>/review/hits.png <cut times>`: cuts only, not hits that move something inside a shot. A reveal that starts on the hit counts as a cut. Read the PNG: in each row the cut happens between frame 1 (t−0.02) and frame 2 (t). A cut on frame 3 is late: move the scene start.

## Rights
- [ ] Music cleared for this use (own track, Suno track made on a paid plan, CC0/CC BY with credit).
- [ ] GIFs, photos, logos and names cleared; only fictional people speak in chat scenes.
- [ ] Fonts in `<film>/fonts` may be redistributed (open licence or the product's own) before the folder is committed or shared; otherwise add them to `.gitignore`.

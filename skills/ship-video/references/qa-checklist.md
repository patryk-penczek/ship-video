# QA checklist (step 8, before the final render)

Script paths are relative to the skill directory. Copy this list into your reply and tick items as you go.

## Automated
- [ ] `node scripts/audit.mjs <film>/index.html` prints "no clipped text", or every remaining line is a deliberate transition. Mark intentional masks with `data-clip-ok`. Fix → re-run → repeat until clean.
- [ ] No `[page]` / `[pageerror]` lines in any script output.
- [ ] After the crisp render: `node scripts/hits.mjs <crisp.mp4> <film>/review/hits.png <cut times>` (cuts only, not hits that move something inside a shot), then Read the PNG. In each row the cut happens between frame 1 (t−0.02) and frame 2 (t). A cut on frame 3 is late: move the scene start.

## Stills (full resolution; Read every one)
- [ ] Each hit, each resting frame, the end card.
- [ ] Right fonts everywhere. A system fallback means a face is missing from `fonts:` or `@font-face` failed.
- [ ] Images loaded: no broken boxes; avatars present (`images:`).
- [ ] Descenders (g, y, p) intact in gradient text and rolling words.
- [ ] Nothing important outside 1920×1080 or under the caption bar.
- [ ] App text readable at film size: zoomed in, or not relied on.
- [ ] Copy matches SCENARIO.md word for word.

## Replicas
- [ ] Every state was compared with the running app (`compare.mjs`) or, if it can't run, with its source components.
- [ ] Mismatches you couldn't fix are listed for the final report.

## Scenario
- [ ] Every departure from SCENARIO.md (time, effect, framing) was listed for the user before the stills were approved.

## Determinism
- [ ] No `setTimeout`, CSS animations, `Date`, `Math.random` in film code.
- [ ] Scrubbing backwards and forwards over a busy section in the preview gives the same frames.

## Rights
- [ ] Music cleared for this use (own track, Suno paid plan, CC0/CC BY with credit).
- [ ] GIFs, photos, logos and names cleared; only fictional people speak in chat scenes.

# QA checklist (before the final render)

## Automated
- [ ] `node $E/audit.mjs <dir>/index.html` → "no clipped text", or every remaining hit is a deliberate transition (mark masks with `data-clip-ok`).
- [ ] No console errors: the render scripts print `[page]` / `[pageerror]` lines. There must be none.
- [ ] `node $E/hits.mjs <crisp.mp4> hits.png <every hit from MUSIC.md>`: each cut changes between the t−0.02 and t frames, never later.

## Stills (full resolution, Read every one)
- [ ] Each hit, each resting frame, the end card.
- [ ] Right fonts everywhere (no system fallback; check `fonts:` in film.js).
- [ ] Images loaded (no broken-image boxes, avatars present; check `images:`).
- [ ] Descenders (g, y, p) intact in gradient text and rolling words.
- [ ] Nothing important outside the 1920×1080 frame or under the caption bar.
- [ ] Text readable at film size: app labels are zoomed or not relied on.
- [ ] Copy matches SCENARIO.md word for word.

## Replicas
- [ ] Every screen was audited against the real components (structure, copy, sizes, tokens, icons, states).
- [ ] Mismatches that couldn't be fixed are listed for the final report.

## Determinism
- [ ] No `setTimeout`, CSS animations, `Date`, `Math.random` in film code.
- [ ] Seeking backwards and forwards gives the same frame (open the preview, scrub back and forth over a busy section).

## Rights
- [ ] Music licensed for this use (Suno paid plan, own track, or licensed).
- [ ] GIFs, photos, logos and names cleared; only fictional people speak in chat scenes.

# Audit, render, deliver

Read at steps 7 and 8. Also: *Sharing the machine*, before starting a dev server or a render.

## Contents
- Audit
- Render
- Verify
- WebP
- Deliver
- Changes after the render
- Sharing the machine

## Audit

`node $S/audit.mjs <film>/index.html` checks the built film without rendering: text cut off at the frame edge, entrances that jump, clicks near the frame edge, a cursor hidden under an overlay, a hard cut into the end card, determinism (`Math.random`, `Date`, timers, frames that differ between seeks), text contrast, emails, phones and keys in the film, `--brand-deny "Other,Names"`. Fix what it prints and re-run until clean. A line you keep on purpose gets a reason in *Changes vs scenario*: mark a deliberate crop with `data-clip-ok` on the element, deliberately dim text with `data-contrast-ok`.

## Render

Run every full render **in the background** (Claude Code: `run_in_background`; elsewhere `nohup … > <out>.log 2>&1 &`, or `Start-Process` on Windows), since long ones outlive a tool call's time limit. Always render **crisp first**: it is several times cheaper and the checks run on it.
```
node $S/render.mjs <film>/index.html <film>/out/film-crisp.mp4
node $S/render.mjs <film>/index.html <film>/out/film-motionblur.mp4 --preset motionblur
```
- Within a minute read `<out>.progress` (`frame n/total, ETA`; `failed: …` means it stopped and why). Poll with short checks, never a long foreground sleep.
- Timing on an idle machine: crisp ~2–3.5 s per film second, motion blur 3–4× that; 2–3× longer when other renders run. Quote a range.
- A file at `<out>` is complete (the render writes `.part` and renames on success). Stop one with `node $S/render.mjs --stop <out.mp4>`.
- **Motion blur** (240 fps blended 4:1) suits kinetic music films; it smears text, so **crisp** suits UI, how-to and silent films. `--preset selective` blurs only frames where something moves fast: the middle ground for UI films with fast camera moves. Offer the choice after the user has seen the crisp film.
- A render dies with the session that started it: before a long motion-blur render, tell the user to keep the session open.
- A quick check while building: `--preset draft --from 0 --to 1`.

## Verify

On the crisp MP4, before showing it:
- `node $S/hits.mjs <crisp.mp4> <film>/review/hits.png <cut times>`: frames around each cut (cuts only, not in-shot moves; skip for silent films). In each row the picture changes between the first and second frame; later means the scene starts late.
- `node $S/motion.mjs <crisp.mp4>`: spans where the picture barely changes. Anything over ~1 s other than the final rest is a fix, often a long static end card.

## WebP

For a README or website (GitHub never autoplays an MP4): `node $S/webp.mjs <film>/out/film-crisp.mp4 <film>/out/film.webp`. Defaults aim under 8 MB and degrade quality, then frame rate, never width below 960 px, because soft text reads worse than a lower frame rate. X and LinkedIn don't take WebP: post the MP4.

## Deliver

Stop the dev servers and processes you started; delete `out/test.mp4` and leftover `*.part`, `*.progress`, `*.pid`. Then tell the user: the path, length and size; how to preview; what couldn't match the real app (approximated screens, placeholder copy or assets); what you'd change with more time. Present it as a first cut: a film rarely lands on the first render, and a few rounds of specific notes are how it gets good. Offer, in one question: *Looks good* / *Change something* / *Render with motion blur* (for music films) / *Make a WebP* (for a README or site). Before a public release, ask the rights question if it's still open (`music.md`, *Rights*). Before the film folder is committed or shared, `.gitignore` `track.*` and `fonts/` unless their licences allow redistribution; photos, GIFs and logos must be the user's to publish, and people shown speaking (chat, comments) are fictional.

## Changes after the render

The user watches and says what to change; that is the normal path, not a failure. Edit, check the changed seconds in stills, re-render crisp, re-run `hits.mjs` if timing moved. A change to the story or the timing of whole acts: update SCENARIO.md and say what moved.

## Sharing the machine

Several sessions may share `~/.ship-video`, the CPU and ports.
- Stop only what you started, by PID (`render.mjs --stop`); never `pkill`/`killall` node, chrome or renders.
- A live `<film>/out/*.pid` is another session's render: leave that folder alone.
- Reuse a dev server that already answers; start one only if none does, note its PID, stop it at the end.
- Delete with absolute paths and guarded variables (`rm -rf "${D:?}"`).
- In zsh, unquoted `$T` doesn't word-split (use `${=T}` or literal arguments), and `$3:stats` is read as a modifier (write `${3}:stats`).

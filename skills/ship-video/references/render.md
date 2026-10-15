# Render, verify, clean up (step 9)

Read at step 9. `$S` = `${CLAUDE_SKILL_DIR}/scripts`, `<film>` = the film folder.

## Contents
- Choose the render
- Run it
- Animated WebP
- Verify
- Clean up and report
- Changes after the render

## Choose the render

Ask with AskUserQuestion:
- *Crisp*: 60 fps, sharp frames. About 2–3.5 s of render per film second on an idle machine (a 30 s film took about a minute).
- *Motion blur*: 240 fps blended 4:1, smoother motion. About 3–4× slower than crisp: a 35 s film takes about 6–8 minutes idle and up to 25 when other renders run.
- *Both, I'll compare*.

Timings are 2–3× longer when other renders run (one 34 s film measured 9 s per film second on a busy machine, and a motion-blur render quoted at 6–8 minutes took about 20) and the ETA in `.progress` is unstable. Tell the user the range, not a promise. **Recommend *Crisp* for UI and instruction films** (how-tos, pricing teasers, anything where the viewer reads app text: motion blur smears text) and for a silent clip or a WebP. Recommend *Motion blur* for kinetic, music-driven launch films. The skill doesn't produce GIFs (`lessons.md` 20 has a manual recipe if they insist; crisp renders convert better).

## Run it

**Always render crisp first**, even if they only want motion blur: it is several times cheaper and the hit check runs on it. Keep the crisp MP4 unless they chose motion blur only; then delete it after the hit check. Run every full render **in the background** (`run_in_background`), since a long one outlives the tool's 10-minute limit:
```
node $S/render.mjs <film>/index.html <film>/out/film-crisp.mp4
node $S/render.mjs <film>/index.html <film>/out/film-motionblur.mp4 --preset motionblur
```
- Within a minute, read `<out>.progress` (`frame n/total, ETA`) before telling the user it's running. `failed: …` means it stopped; the reason follows. Poll with short checks; don't `sleep` for minutes in the foreground.
- The render writes `<out>.part` and renames it only on success, so a file at `<out>` is complete. The done line shows film length and wall time separately.
- Stop a render: `node $S/render.mjs --stop <out.mp4>` (by PID; never `pkill`).
- A render dies with the session that started it: tell the user to keep the session open before a long motion-blur render.
- `--preset draft` or `--from/--to` are for quick checks only.

## Animated WebP

For a README or a post: an animated WebP autoplays and loops in full colour. GitHub never autoplays an uploaded MP4.
```
node $S/webp.mjs <film>/out/film-crisp.mp4 <film>/out/film.webp
```
A WebP is for READMEs and websites; **X and LinkedIn don't accept it: post the MP4** (note it in the report when they said where it's shown). Defaults: `--fps 30 --width 960 --quality 70 --max-mb 8`; if the result is over `--max-mb` it lowers quality, then width, until it fits. Check the printed size. A silent film for a README: *Silent films* in `direction.md`.

## Verify

On the crisp MP4, before saying it's done:
```
node $S/hits.mjs <film>/out/film-crisp.mp4 <film>/review/hits.png <cut times>
```
Pass only the times where the picture **cuts** (a reveal that starts on the hit counts). Read hits.png: in every row the cut falls between the first and second frame. Silent film: skip.

Then `node $S/motion.mjs <film>/out/film-crisp.mp4`: it lists every span where the picture barely changes. Anything over ~1 s except the ending rest is a fix, and a long static end card is the usual one (about 2–2.5 s in total is the target).

## Clean up and report

Stop dev servers and processes you started; delete `out/test.mp4`, leftover `*.part`, `*.progress` and `*.pid` files, and the crisp MP4 only if they chose motion blur only (keep the chosen version(s) and nothing else). Then report: paths, film length, file sizes, how to preview, and **what couldn't match the real app** (missing assets, approximated components, placeholder copy).

## Changes after the render

A change needs a full re-render of the chosen version.
- Copy or look only: edit, show the changed frames, get a yes, re-render, re-run the hit check.
- Timing or a new track: re-time per `music-map.md`; a move over one bar means a new approval.
- A new or removed scene, or any `SCENARIO.md` change: re-approve it (new `Approved:` date), rebuild the affected scenes, show the stills again.

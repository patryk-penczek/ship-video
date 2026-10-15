---
name: ship-video
description: Make a short, music-synced product video (launch film, feature teaser, how-to) for an app, rendered frame-exact from HTML with GSAP, Playwright and ffmpeg. Guides the user from brief → music (own file, Suno, or none) → beat analysis → approved scenario → app replicas → review stills → QA → MP4. Use when the user wants a product video, launch film, app trailer, promo clip, or "a video cut to music" for their app.
---

# ship-video

You are making a short product film as code: one HTML page, one paused GSAP timeline, every frame a pure function of time, rendered to MP4 with the music. The value is the process below. Follow it in order and **do not skip the approval gates** (marked ⛔): rebuilding after a late change costs far more than one more question.

Engine: `${CLAUDE_SKILL_DIR}/engine` (call it `$E` in commands you show the user; write the real path when running).
Python: `~/.ship-video/.venv/bin/python -I` (call it `$PY`). Deps live in `~/.ship-video` (`$SHIP_VIDEO_HOME` overrides).
Read `${CLAUDE_SKILL_DIR}/reference/lessons.md` before you start building. It lists mistakes that already cost hours.

## 0. Setup check

Run `node $E/lib/check.mjs`. If it reports missing deps, run `bash $E/setup.sh` (add `--demucs` only if the user wants stem separation; it pulls in PyTorch, several GB). librosa alone is enough for hits and beats.

## 1. Brief

Ask, in one message, only what you can't find yourself:
- What is the product, and who will watch the video?
- Goal: launch, single feature, or how-to?
- Rough length (15–45 s is the sweet spot) and format (1920×1080 default).
- Is there a repo to read? Point at the UI source (components, tokens, fonts, icons).
- Which **real assets** exist: screenshots, GIFs, avatars, emoji, logos, real copy. Real beats invented every time.
- Music: their own file, a Suno track, or none (see 2).

Create the film folder: `node $E/new-film.mjs <dir>` (outside the product repo unless the user wants it inside). Keep downloaded assets in their own folder (`<dir>/img`, `<dir>/downloads`).

## 2. Music: three paths

Ask which one:

**A. Own file.** Copy it to `<dir>/track.mp3` (any ffmpeg format works, name it `track.*`). Ask the user to confirm they may use it.

**B. Suno.** Fill `${CLAUDE_SKILL_DIR}/reference/suno-prompt.md` with the user: pick a BPM so that one bar is a round number of seconds (120 BPM → 2 s bars, 90 → 2.67 s), map the planned acts to bars, write the style line and the bracketed structure. The user generates a few takes in Suno and drops the best into `<dir>`. **The track is as long as Suno makes it. Shape the film to the track, not the track to the film.** Remind them: free-plan Suno songs can't be used commercially; paid-plan songs can.

**C. None.** Pick a BPM (default 120). Cuts snap to the tempo grid; the preview plays a metronome. Music can be added later: run 3 on the new track and re-time the scenes to its real hits.

## 3. Analysis → music map

With a track:
```
$PY $E/audio/analyze.py <dir>/track.mp3 --json <dir>/music.json
$PY $E/audio/envelope.py <dir>/track.mp3 <dir>/env.js
$PY $E/audio/plot.py <dir>/track.mp3 <dir>/music.png         # look at it
```
Optional stems: `$PY -m demucs -n htdemucs_6s -o <dir>/stems <dir>/track.mp3` then `$PY $E/audio/stems.py <dir>/stems/htdemucs_6s/track`.

Without a track: `node $E/audio/grid.mjs --bpm 120 --duration 30 --out <dir>/env.js`.

Write `<dir>/MUSIC.md`, a table of `t (s) | what happens in the music` (intro, hits, where the groove starts, breaks, the drop, the final hit). Use `hits` for cuts, `kicks` for small moves, `gaps` for breaks/drops, the energy table for sections. Detection is noisy: cross-check with the plot and with what you'd hear. Show the map to the user.

## 4. Scenario ⛔

Write `<dir>/SCENARIO.md` from `${CLAUDE_SKILL_DIR}/reference/scenario-template.md`: acts with **exact seconds**, the music event each one sits on, what is on screen, the camera, and the **final copy, word for word**. Every cut lands on a hit or a kick from the music map.

- Offer 2–3 copy variants wherever wording matters (headline, end card).
- Mark which assets are real and which are placeholders.
- **Stop. Ask the user to approve the scenario before building anything.** Iterate on the table, not on code.

## 5. Replicas

For each app screen in the scenario, build a screen builder in `<dir>/ui.js` + styles in `film.css`:
- Read the **real components** (structure, copy, sizes, tokens, fonts, icons). Copy tokens and SVG icons verbatim. Don't build from a description.
- Copy the product's fonts into `<dir>/fonts` and list them in `fonts:` in `film.js`; list images in `images:` (layout is measured at build time, so everything must be loaded first).
- Then run a **component-by-component audit** against the source: structure, copy, spacing, sizes, colours, icons, states. Fix every mismatch. The first pass always misses things.
- Optional: a static gallery page with one `.frame` (1920×1080) per screen, captured with `node $E/snap.mjs gallery.html <dir>/review/replica.png`, to show the user before animating.

## 6. Build

Edit `<dir>/film.js` (starter shows the patterns). Rules:
- One `scene(html, start, end)` per shot; absolute times from the scenario.
- Camera: `wrap(scene)` then tween its `focus(point, scale)`. App UI is small at 1080p: zoom 1.4–2.3× on what matters.
- Measure `center()` of everything **before** adding tweens that move it.
- Use `NI` (`immediateRender: false`) on `fromTo`s in scenes that share elements, and give elements that appear later `opacity:0` in their HTML.
- Never overlap two camera tweens on the same properties.
- No `setTimeout`, CSS animations, `Date`, or `Math.random`; use `rnd()`, sprite sheets (`.sprite` with `data-n`/`data-fps`) for GIFs and animated emoji, and `hits` for shake.
- Set `duration`, `bpm`, `track` and `hits` in the `Film({...})` config.

Preview: open `<dir>/index.html` in a browser (Space, arrows, Alt+arrows = one beat, Shift+arrows = one frame, `?t=12.5`).

## 7. Review ⛔ (loop)

Before every render, show stills:
```
node $E/sheet.mjs <dir>/index.html <from> <to> 0.25 <dir>/review/sheet-<act>.png
node $E/shots.mjs <dir>/index.html <dir>/review/stills <t1> <t2> ... --label
```
Look at them yourself first (Read the PNGs) and fix the obvious. Then show the user the contact sheet and full-resolution stills of the key moments (each hit, each resting frame, the end card). Collect feedback, fix, repeat until they approve. They will catch things you miss.

## 8. QA

Run `${CLAUDE_SKILL_DIR}/reference/qa-checklist.md`. At minimum:
- `node $E/audit.mjs <dir>/index.html`: fix every clipped-text hit that isn't a deliberate transition (mark intentional masks with `data-clip-ok`).
- After the crisp render: `node $E/hits.mjs <dir>/out/film-crisp.mp4 <dir>/review/hits.png <hit times…>`. Each row is t−0.02 / t / t+0.02; the cut must change between the first and second frame.
- Fonts and images preloaded (no fallback font in any still).

## 9. Render and report

```
node $E/render.mjs <dir>/index.html <dir>/out/film-crisp.mp4                         # 60 fps
node $E/render.mjs <dir>/index.html <dir>/out/film-motionblur.mp4 --preset motionblur  # 240 fps → 60, ~6× slower
```
Use `--preset draft` or `--from/--to` for quick checks. Run the long renders in the background.

Report: the paths, durations and file sizes, how to preview, and **anything that couldn't match the real app** (missing assets, approximated components, placeholder copy).

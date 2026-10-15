---
name: ship-video
description: Directs and builds a short (15-45 s) music-synced video of the user's own web app (launch film, feature teaser, app trailer, how-to clip of its UI) as code: the app's real UI is recreated in one HTML page with a GSAP timeline and rendered frame-exact to a 1080p60 16:9 MP4 with every cut on a beat. Use when the user wants a video, trailer, teaser, promo or launch clip of their app or product, wants their app's screens animated into a clip, wants a film cut to a track, needs a Suno prompt or track for such a film, or wants to re-time or re-render an existing ship-video film. Not for editing existing footage or screen recordings, adding audio to a video, explainer or generic videos not about the user's app, standalone GIFs or animations, Remotion or After Effects work, or vertical 9:16 video.
license: MIT
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Bash(bash ${CLAUDE_SKILL_DIR}/scripts/setup.sh*)
---

# ship-video

You are directing and building a 15–45 s product film. Everything on screen is code: one HTML page, one paused GSAP timeline at absolute seconds, app screens rebuilt from the product's real components, rendered frame by frame to MP4 with the music.

**Core principle: agree on paper, then build.** A table of seconds → music → picture → copy costs minutes to change; a built film costs hours. The two approval gates below exist because every skipped one has meant a rebuild.

Scripts live in `${CLAUDE_SKILL_DIR}/scripts`. Run them; don't read their source. Every script takes `--help`. In this file `$S` means `${CLAUDE_SKILL_DIR}/scripts` and `<film>` means the film folder.

**Terms.** *Hit*: a strong musical event where a cut lands. *Kick*: a smaller beat for moves inside a scene. *Cut*: a scene change. `hits` in `film.js` is the camera-shake list.

## Limits

Say it in the first reply if the request hits one, before any work:
- **16:9, 1920×1080 only.** Vertical (Reels, Shorts, 9:16) is not supported. Offer a 16:9 film; a centred `ffmpeg` crop loses most of the frame.
- **Web UI.** A native or mobile app has no DOM to capture: replicas come from screenshots or design files (`references/replicas.md`), take longer and match less exactly. A phone shows as a phone-width column in the frame.
- **15–45 s.** For a track over ~60 s don't match its length: cut it on bar lines (Analysis step) or confirm a long film and warn about render time.
- **macOS or Linux** (Windows: WSL). **Output** is MP4 and an animated WebP; GIF is not made.

## Start or resume

Look in the film folder (ask for it if unclear) and start at the first step whose output is missing:

| exists in `<film>` | done | start at |
|---|---|---|
| nothing | — | Setup |
| `index.html`, no `PRODUCT.md` | folder | 1b Discovery |
| `PRODUCT.md`, no `MUSIC.md` | product map | Music |
| `MUSIC.md` | music map | Scenario (if its first line says `GRID DRAFT`, the Suno track is still pending: draft the scenario, re-time when the track arrives) |
| `SCENARIO.md` with `Approved:` | scenario | Replicas |
| `review/compare/summary.json` (written by `compare.mjs`) with every state under the threshold, or a hand-built `ui.js` (no starter `.demo-*` screens) with a gallery state per scenario screen | replicas | Build |
| `film.js` with scenes for every act | build | Review |
| `review/APPROVED` (written when the user approves the stills) | review | QA |
| `out/film-crisp.mp4` or `out/film-motionblur.mp4` | render | report, or the changes path in Render |

These are **not** progress markers: `out/test.mp4` (the 1 s test render), the starter's `ui.js`, `film.js` or `app.css`, `screens.js` (Discovery or an early capture writes it: screens are captured, not yet compared), `review/discovery/`, an empty `review/`, `env.js` (the starter creates it).

The user can skip steps ("I have a scenario already", "no music", "just render it"). Skip what they name, say in one line what you're skipping, and keep the gates: approving a skipped gate needs their explicit words.

## Asking the user

**Propose, don't interrogate.** Decide what you can from the product, the code and the brief, write it down (PRODUCT.md, SCENARIO.md with final copy) and ask only the real decisions: goal, length, music source, where it will be shown, which of two directions, copy where the wording is theirs. The gates stay: nothing is built before the scenario is approved, no render before the stills are approved.
- Ask with **AskUserQuestion**, not a prose list: up to 4 questions per call, 2–4 options, recommended option first with "(Recommended)". Put what they compare into `preview` (copy variants, an act, a frame description); keep labels to a few words.
- Before the call, at most ~6 lines of context: what you made and where it is. Details stay in the files.
- Don't ask what the user already said (goal, length, music, audience; a stated length means no "Match the music" question), what you can look up (tokens, copy, routes, track length), or a taste question you have a view on: pick it, say why in one line, and let them change it at the gate.
- Gates are questions too: "Approve the scenario?" with *Approve*, *Change copy*, *Change timing*, *Something else*.
- Without AskUserQuestion (other hosts), fall back to one short numbered list of options.

## Sharing the machine

Several sessions may share `~/.ship-video`, the CPU and dev-server ports.
- **Stop only what you started, by PID.** Renders: `node $S/render.mjs --stop <out.mp4>`. Never `pkill`/`killall` render, chrome or node.
- **One film folder per session.** A live `<film>/out/*.pid` means another session is rendering there: leave it alone.
- **Dev servers:** use the one already answering; start one only if none does, note its PID, stop it when done.
- Use absolute paths when deleting (the shell's cwd resets between calls and `rm` safety checks quote the wrong folder).

## Progress checklist

Show this at the first reply, at each gate and at the end, not after every step:

```
- [ ] 0 Setup: deps ready
- [ ] 1 Brief: product, audience, goal, length, repo, real assets, optional reference film
- [ ] 1b Discovery: PRODUCT.md (every view, wow moments, promise) shown to the user
- [ ] 2 Music: file / Suno / none chosen, track in <film>
- [ ] 3 Analysis: MUSIC.md (env.js only if the film has music)
- [ ] 4 Scenario: SCENARIO.md approved by the user
- [ ] 5 Replicas: screens built from real components, audited
- [ ] 6 Build: film.js follows the scenario
- [ ] 7 Review: stills approved by the user
- [ ] 8 QA: audit clean
- [ ] 9 Render: chosen version(s), hits verified, report sent
```

## 0. Setup

Run `node $S/lib/check.mjs`. It answers instantly once setup has succeeded. Only if it reports something missing, run `bash $S/setup.sh` (installs into `~/.ship-video`, skips what's there). Skip `--demucs` (stem separation, several GB of PyTorch) unless the user asks for stems: no step needs them.

## 1. Brief

Find what you can yourself first (README, package.json, routes, components, existing assets). Then ask what's left in one AskUserQuestion call, typically:
- goal: launch / one feature / how-to;
- length: 15–20 s / 20–30 s / 30–45 s, and *Match the music* (first, recommended) **only if the user stated no length** and a track exists or will come from Suno; the film's `duration` is then the track's length;
- music: own file / Suno / none (step 2). If they pick their own file and you can already see a candidate (the newest audio file in `~/Downloads`), ask step 2's "Where will this film be shown?" in the same call;
- real assets to use, if you found candidates (screenshots, GIFs, avatars, logo). Real beats invented every time;
- **a reference film (optional):** "Is there a film whose feel you want?" If so, follow *Reference film* in `references/direction.md`: borrow techniques, never content.

Direction quality scales with model strength and effort. Say once, in a line, that the scenario and the review benefit from the strongest model at high effort and that it costs more; the user decides.

Create the folder: `node $S/new-film.mjs <film>` (outside the product repo unless the user wants it inside). Put assets in `<film>/img`; keep downloads in their own folder.

**Exit:** you can describe the film in two sentences and the user agrees. **Then:** 1b Discovery.

## 1b. Discovery

Know the whole product before writing about it. A film made from the README shows features; one made from the whole product shows a payoff. Read `references/direction.md` (coverage, story) first.
1. **Inventory** from the router and components: every route (including the 404), every view, empty/error/loading states, modals and palettes, theme and unit toggles, and everything animated or live (charts, maps, canvas, transitions).
2. **See each one.** If the app runs (reuse its server, see *Sharing the machine*): `node $S/capture.mjs <url> <film> --discover [--routes /,/radar] [--depth 2]` writes a full-page screenshot per route to `<film>/review/discovery/*.png` plus `inventory.json` (heights, scroll containers, canvases, buttons, links) and probes an unknown route so the 404 counts as a view. It can't reach interaction-only states (dialogs, palettes, toasts, hover): list those from the code and capture them with a `states.json` (`capture.mjs <url> <states.json> <film>`; step 5 reuses the result). Read the PNGs. Not running: use the app's own screenshots or docs and say so.
3. **Find the 3–5 wow moments:** what moves, what's unique to this product, what a user would show a friend. Not the longest feature list.
4. **Write `<film>/PRODUCT.md`:** the one-sentence promise; the audience; a table of views (view · route · states · screenshot · wow?); the wow moments; the one concrete case (a hero in a real situation) that could carry the film from problem to payoff; what can't be shown.
5. **Show the product map** to the user (a few lines and the path) before the scenario. They correct what you misread.

**Exit:** PRODUCT.md exists, every view has a screenshot or a noted reason, the user has seen it. **Then:** step 2.

## 2. Music

If the brief didn't settle it, ask with AskUserQuestion: own file / Suno / no music.
- **A. Own file.** If they just downloaded it, take the newest audio file in `~/Downloads` and confirm the name. Copy it to `<film>/track.<ext>`.
- **B. Suno.** Read `references/suno-prompt.md`. First ask the rights question below, before anything is generated. Then pick a BPM so whole bars fill the length the user chose (25 s: 96 BPM, 2.5 s bars; 20–24 s: 120 BPM) and give them the Styles line, the Lyrics structure and the Suno settings (Advanced mode, Duration slider, model v6 or v6-mini). They make 4–6 takes and download the best. Suno rarely hits an exact length and treats bar counts as hints: expect to crop the take or cut it (Analysis step).
  **Don't wait idle.** Write `MUSIC.md` from the grid with `GRID DRAFT` on its first line, draft `SCENARIO.md` against it and ask the copy questions. Only the approval waits for the real take; then re-time (`references/music-map.md`).
- **C. None.** Pick a BPM (default 120). Cuts snap to the grid, the preview plays a metronome, and music can be added later by re-timing. If the film stays silent (a muted autoplay, a WebP), don't fake a beat nobody hears: `hits: []`, `env.js` stays `window.ENV = null;`, no shakes, pulses, rings or hard flashes. The rhythm lives in the cuts and the easing.

**Rights (paths A and B).** Ask where the film will be shown, not which license the track has, and ask it **before Suno generates**; the rules (and what blocks publishing) are in `references/music-map.md`, *Rights*. Free plan or "somewhere else" isn't publishable. *Not decided yet* = draft: ask again before step 9.

If `<film>` is inside a git repo, add `track.*` to its `.gitignore` unless the track's license allows sharing the file itself (own work, CC0, CC BY).

Write the track file name and the film `duration` into the header of `MUSIC.md` (they go into `film.js` when you build). **Exit:** a track in `<film>`, or a BPM and a `GRID DRAFT`. **Then:** Analysis.

## 3. Analysis

With a track:
```
node $S/music.mjs analyze <film>/track.<ext> --json <film>/music.json
node $S/music.mjs envelope <film>/track.<ext> <film>/env.js
node $S/music.mjs plot <film>/track.<ext> <film>/review/music.png
```
Without a track: `node $S/music.mjs grid --bpm <bpm> --duration <seconds>` only prints bar and beat times; write `MUSIC.md` from them with `GRID DRAFT` on the first line. For a silent film `env.js` stays `window.ENV = null;` (`--out <film>/env.js` writes exactly that). `--out <film>/env.js --pulse` writes a synthetic beat pulse, only for a beat-reactive preview while a Suno track is pending.

Length was decided in the brief; this step only checks it.
- Track more than ~3 s longer than the chosen length: ask with AskUserQuestion *Use the full track* / *Cut a section* (preview: which bars, e.g. "build → drop → final hit, 9.98–32.02 s"). A cut starts and ends on bar lines, keeps the drop and the final hit, and fades over the last bar: `ffmpeg -ss <start> -to <end> -i <track> -af "afade=t=out:st=<end-start-bar>:d=<bar>" track-cut.mp3`. Re-run the analysis on the cut.
- No length chosen and a track over ~60 s: don't match it. Propose a 30–45 s cut, or confirm a long film and warn about render time.
- The track fades to silence before its end (`audible end` in the analysis): end the film at the audible end plus a short fade, not on dead air.

Read `references/music-map.md`, Read the plot PNG, and write `<film>/MUSIC.md`: one row per event (intro, each strong hit, groove, break, drop, final hit). Show it to the user in a few lines.

**Exit:** MUSIC.md exists and the user has seen it. **Then:** Scenario.

## 4. Scenario

Propose a bold film; don't ask the user to invent one. Read `references/direction.md` and `references/motion-vocabulary.md`, then write `<film>/SCENARIO.md` from `references/scenario-template.md`:
- the **story**: problem → hero → action in the app → payoff that closes the problem, on the drop. One concrete case carries the film; features are its consequences;
- acts with exact seconds, the music event and its role under each, **what moves in every shot**, the camera and framing target, the coverage of every view in PRODUCT.md, and the **final copy word for word**. Every cut sits on a hit or kick from MUSIC.md (silent: on the bar grid).

Run the template's self-critique rubric on it and fix the "no"s before the user sees it. Write 2–3 variants only where the wording is theirs (headline, end card); mark placeholder assets.

Then one AskUserQuestion call with only the real decisions:
- one question per copy slot with variants (options = the variants, `preview` = the line in context);
- open choices the scenario depends on (e.g. end-card theme), only if they're real choices;
- last: "Approve the scenario?" with *Approve*, *Change timing*, *Change scenes*, *Something else*, and `preview` = the story in 3 lines and the act table in 6–10 lines.

<HARD-GATE>
Nothing gets built until the user approves SCENARIO.md. Building means writing scenes in `film.js`, writing `ui.js`, copying app components, or rendering. Reading the product's code, writing PRODUCT.md and MUSIC.md, and setting `film.js` config lines (track, duration) are not building.
When they approve, write the chosen variants into SCENARIO.md and add `Approved: <date>` at the top.
</HARD-GATE>

**Then:** step 5.

## 5. Replicas

Read `references/lessons.md` and `references/replicas.md` first. **Capture first**: if the app runs (reuse its dev server or start one, see *Sharing the machine*), its own DOM and CSS are the replica.
1. Write `<film>/states.json`: one entry per screen the scenario needs (`{name, path?, actions?, continue?, canvas?}`). Use `fill` for inputs (never Control+A), `wait` for timers.
2. `node $S/capture.mjs <url> <film>/states.json <film> --css` writes `screens.js`, `app.css`, `fonts/`, `img/`, and prints the `fonts:` / `images:` lists for `film.js`.
3. `node $S/compare.mjs <url> <film>/gallery.html <film>/review/compare --states <film>/states.json`. Read every PNG (real, replica, diff); fix until every state is under ~2 %.
4. In `film.js` mount states with `UI.stack` / `UI.swap`, measure hidden copies with `UI.measure`, and **tween the real elements inside** `UI.pick(scene, name)`: a film of swapped static screens looks dead.

**No running app:** write builders in `ui.js` from the real components, port CSS with `node $S/port-css.mjs a.css … <film>/app.css`, copy fonts to `<film>/fonts`, and compare against the source and any screenshots the user has. Either way list every font face in `fonts:` and every image in `images:`: layout is measured at build time, so anything still loading is measured wrong.

To show the user replicas before animating: `node $S/snap.mjs <film>/gallery.html <film>/review/replica.png`.

**Exit:** every scenario state exists in the gallery and matches the real app. **Then:** step 6.

## 6. Build

Read `references/film-api.md`, the shot library in `references/direction.md` and `references/motion-vocabulary.md`; the starter film shows each pattern. In `film.js` set `track` and `duration` from the `MUSIC.md` header, replace the starter's sample `hits` with the cut times from `MUSIC.md` as `[t, shake]` (silent film: `hits: []`), then write the scenes in scenario order at the scenario's times. Preview by opening `<film>/index.html` (Space play, ←/→ 1 s, Alt+←/→ one beat, Shift+←/→ one frame, `?t=12.5`).

Density while you build: something changes every beat; the camera is never still for more than a bar; app UI is zoomed 1.4–2.3× on the element that matters and pulls back on the hit; in a montage, cut on every kick; every cut frame is sharp and opaque.

Then a one-second test render, which catches a broken page, a missing track or a bad output path in seconds: `node $S/render.mjs <film>/index.html <film>/out/test.mp4 --preset draft --from 0 --to 1`.

**Exit:** every act exists, plays without console errors, and the test render succeeds. **Then:** step 7.

## 7. Review

Look first, then show:
```
node $S/sheet.mjs <film>/index.html <from> <to> <step> <film>/review/sheet-<act>.png
node $S/shots.mjs <film>/index.html <film>/review/stills <t1> <t2> … --label
```
Use a 0.25 s step for kinetic type and 0.5 s (or `--cols 4`) for acts with app UI, whose text is unreadable in small tiles. `shots.mjs` names files like `008.00.png`.

Read every PNG yourself, then **critique it as a director**, not only as a QA check: is something changing every beat? is the story readable without sound (problem → hero → action → payoff)? does the drop carry the climax? is the camera close to what matters (the target fills 40–70% of the frame, no empty chrome, text ≥ 28 px)? is every view in PRODUCT.md there? are cut frames sharp and opaque? is half the film not dark? Run the rubric at the end of `references/scenario-template.md` on the stills and fix every "no".

Then, before asking, fill **Changes vs scenario** in SCENARIO.md: every place the film departs from it (a time moved, an effect changed, a different framing), one line each. The user approved the scenario, so a silent change is a broken promise. Give the paths to the contact sheets and to full-resolution stills of each hit, each resting frame and the end card, and ask with AskUserQuestion: *Approve, render it* / *Fix something* (they describe it in Other) / *Show me more frames*. When they approve, write `<film>/review/APPROVED`.

<HARD-GATE>
No full render until the user approves the stills. After each round of fixes, show the changed frames again.
</HARD-GATE>

**Then:** step 8.

## 8. QA

Follow `references/qa-checklist.md`. The loop: run `node $S/audit.mjs <film>/index.html`, fix each clipped text that isn't a deliberate transition (mark deliberate crops with `data-clip-ok`), re-run until clean. If a fix changes anything visible, show those frames again (the Review gate applies).

## 9. Render and report

Ask which render they want with AskUserQuestion:
- *Crisp*: 60 fps, sharp frames. About 3.5 s of render per film second on an idle machine.
- *Motion blur*: 240 fps blended 4:1, smoother motion. About 3–4× slower than crisp: a 35 s film takes 6–15 minutes.
- *Both, I'll compare*.

Timings are 2–3× longer when other renders run and the ETA in `.progress` is unstable. Tell the user the range, not a promise. Recommend *Crisp* if the film will become a GIF (blur bands in 256 colours) and *Motion blur* otherwise.

**Always render crisp first**, even if they only want motion blur: it is several times cheaper and the hit check runs on it. Keep only what they chose. Run every full render **in the background** (`run_in_background`), since a long one outlives the tool's 10-minute limit:
```
node $S/render.mjs <film>/index.html <film>/out/film-crisp.mp4
node $S/render.mjs <film>/index.html <film>/out/film-motionblur.mp4 --preset motionblur
```
- Within a minute, read `<out>.progress` (`frame n/total, ETA`) before telling the user it's running. `failed: …` means it stopped; the reason follows. Poll with short checks; don't `sleep` for minutes in the foreground.
- The render writes `<out>.part` and renames it only on success, so a file at `<out>` is complete. The done line shows film length and wall time separately.
- Stop a render: `node $S/render.mjs --stop <out.mp4>`.
- A render dies with the session that started it: tell the user to keep the session open before a long motion-blur render.
- `--preset draft` or `--from/--to` are for quick checks only.

For a README or a post, make an **animated WebP**: it autoplays and loops, in full colour. GitHub never autoplays an uploaded MP4:
```
node $S/webp.mjs <film>/out/film-crisp.mp4 <film>/out/film.webp
```
Defaults: `--fps 30 --width 960 --quality 70 --max-mb 8`; if the result is over `--max-mb` it lowers quality, then width, until it fits. Check the printed size. A silent film for a README: see *Silent-film rules* in `references/direction.md`.

**Verify** on the crisp MP4 before saying it's done:
```
node $S/hits.mjs <film>/out/film-crisp.mp4 <film>/review/hits.png <cut times>
```
Pass only the times where the picture **cuts** (a reveal that starts on the hit counts). Read hits.png: in every row the cut falls between the first and second frame. Silent film: skip.

**Clean up:** stop dev servers and processes you started; delete `out/test.mp4`, leftover `*.part`, `*.progress` and `*.pid` files, and the crisp MP4 if they didn't ask for it. Then report: paths, film length, file sizes, how to preview, and **what couldn't match the real app** (missing assets, approximated components, placeholder copy).

**Changes after the render** need a full re-render of the chosen version. Copy or look only: edit, show the changed frames, get a yes, re-render, re-run the hit check. Timing or new track: re-time per `references/music-map.md`; a move over one bar means a new approval. New or removed scene, or any `SCENARIO.md` change: re-approve it (new `Approved:` date), rebuild the affected scenes.

## Scripts

All in `$S`; every one takes `--help`. `lib/check.mjs` deps · `setup.sh` install · `new-film.mjs` new folder · `music.mjs analyze|envelope|plot|grid` · `capture.mjs` (`--discover`) · `port-css.mjs` · `compare.mjs` · `snap.mjs` replica screenshots · `sheet.mjs` contact sheet · `shots.mjs` stills (`008.00.png`) · `audit.mjs` · `render.mjs` (`--stop`) · `webp.mjs` · `hits.mjs`.

## Gotchas

The costliest ones; the rest is in `references/lessons.md`.
- **`fromTo` paints its from-values at build time; `NI` doesn't.** Absent-until-later elements take a plain `fromTo`; several tweens in sequence on one element (the camera) all take `NI` (film-api.md, *Entrances*).
- **Measure `center()` before adding tweens**, with every stacked copy displayed. Two camera tweens never overlap.
- **App UI is tiny at 1080p:** zoom 1.4–2.3× and land on content, never empty chrome.
- **Nothing time-based outside the timeline** (`setTimeout`, CSS animation, `Math.random`, `Date`).
- **Cut frames are sharp and opaque:** enter by offset or scale, never a fade from 0 or 0.35. Captions are opaque and don't cover content.

## Red flags

| thought | reality |
|---|---|
| "The scenario is obvious, I'll build and show the result" | Changes after the build cost hours. Get the table approved. |
| "I'll invent plausible copy and fix it later" | Final copy is part of the scenario. Propose it, with variants where it's theirs. |
| "The replica looks close enough" | Viewers who use the app notice. Compare component by component. |
| "Stills look fine to me, render straight away" | The user catches what you miss. Show them first. |
| "The analysis says 22.0, ship it" | Verify on the MP4 with `hits.mjs`. |
| "I'll trim the track to fit my plan" | Shape the film to the track. Cutting whole bars on bar lines is allowed (step 3); trimming mid-phrase isn't. |
| "I'll list the open questions at the end of my message" | Prose questions get half-answered. Use AskUserQuestion, and only for real decisions. |
| "I'll show each feature in turn" | A feature list is bland. One concrete case, features as its consequences. |
| "No music, so slow and calm is fine" | Silent needs more motion, not less: something moves in every frame. |
| "The README is enough to plan the film" | Discovery finds the views and wow moments the README doesn't mention. |

## References

| file | read when |
|---|---|
| `references/lessons.md` | before step 5, and before step 6 |
| `references/direction.md` | steps 1b and 4 (structure, story, pacing, framing), step 6 (shot library with code), step 7 |
| `references/motion-vocabulary.md` | steps 4 and 6 (type and camera techniques tied to music events and story roles) |
| `references/replicas.md` | step 5 |
| `references/suno-prompt.md` | step 2, path B |
| `references/music-map.md` | step 3 |
| `references/scenario-template.md` | step 4, and the rubric again in step 7 |
| `references/film-api.md` | before writing `film.js` |
| `references/qa-checklist.md` | step 8 |

---
name: ship-video
description: Makes short, music-synced product videos for a user's app (launch films, feature teasers, app trailers, how-to clips) as code. Each film is one HTML page with a GSAP timeline that recreates the app's real UI, rendered frame-exact to a 1080p60 MP4 with every cut on a beat. Use when the user wants a video, film, trailer, promo, teaser or launch clip for their product or app, wants something cut to music or to a Suno track, or wants their app's screens animated into a clip, even if they don't mention GSAP, HTML or rendering. Not for editing existing footage or screen recordings.
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Bash(bash ${CLAUDE_SKILL_DIR}/scripts/setup.sh*)
---

# ship-video

You are directing and building a 15–45 s product film. Everything on screen is code: one HTML page, one paused GSAP timeline at absolute seconds, app screens rebuilt from the product's real components, rendered frame by frame to MP4 with the music.

**Core principle: agree on paper, then build.** A table of seconds → music → picture → copy costs minutes to change; a built film costs hours. The two approval gates below exist because every skipped one has meant a rebuild.

Scripts live in `${CLAUDE_SKILL_DIR}/scripts`. Run them; don't read their source. Every script takes `--help`. In this file `$S` means `${CLAUDE_SKILL_DIR}/scripts` and `<film>` means the film folder.

## Start or resume

Look in the film folder (ask for it if unclear) and start at the first step whose output is missing:

| exists in `<film>` | done | start at |
|---|---|---|
| nothing | — | 0 Setup |
| `index.html` | folder | 2 Music |
| `MUSIC.md` + `env.js` | music map | 4 Scenario |
| `SCENARIO.md` marked `Approved` | scenario | 5 Replicas |
| `ui.js` with the scenario's screens | replicas | 6 Build |
| `review/` with stills the user approved | review | 8 QA |
| `out/*.mp4` | render | report, or iterate |

The user can skip steps ("I have a scenario already", "no music", "just render it"). Skip what they name, say in one line what you're skipping, and keep the gates: approving a skipped gate needs their explicit words.

## Asking the user

Every decision goes through the **AskUserQuestion** tool, never a list of questions in prose. The user should click, not write an essay: prose questions get partial answers and stall the film.
- Up to 4 questions per call, 2–4 options each, recommended option first with "(Recommended)" in its label. The tool adds "Other" for free text.
- Put what they compare into `preview`: copy variants, a scenario act, a frame description. Keep option labels to a few words.
- Before the call, at most ~6 lines of context: what you made and where it is (`SCENARIO.md`, a stills folder). Details stay in the files.
- Gates are questions too: "Approve the scenario?" with options like *Approve*, *Change copy*, *Change timing*, *Something else*.
- Questions about facts you can look up (tokens, copy, routes, track length) are not questions. Look them up.
- Without AskUserQuestion (other hosts), fall back to one short numbered list of options.

## Progress checklist

Show this at the first reply, at each gate and at the end, not after every step:

```
- [ ] 0 Setup: deps ready
- [ ] 1 Brief: product, audience, goal, length, repo, real assets
- [ ] 2 Music: file / Suno / none chosen, track in <film>
- [ ] 3 Analysis: MUSIC.md + env.js
- [ ] 4 Scenario: SCENARIO.md approved by the user
- [ ] 5 Replicas: screens built from real components, audited
- [ ] 6 Build: film.js follows the scenario
- [ ] 7 Review: stills approved by the user
- [ ] 8 QA: audit clean, hit check passed
- [ ] 9 Render: crisp + motion blur, report sent
```

## 0. Setup

Run `node $S/lib/check.mjs`. It answers instantly once setup has succeeded. Only if it reports something missing, run `bash $S/setup.sh` (installs into `~/.ship-video`, skips what's there). Add `--demucs` only if the user wants stem separation: it pulls in PyTorch, several GB, and librosa alone finds the hits.

## 1. Brief

Find what you can yourself first (README, package.json, routes, components, existing assets). Then ask what's left in one AskUserQuestion call, typically:
- goal: launch / one feature / how-to;
- length: 15–20 s / 20–30 s / 30–45 s;
- music: own file / Suno / none (step 2);
- real assets to use, if you found candidates (screenshots, GIFs, avatars, logo). Real beats invented every time.

Create the folder: `node $S/new-film.mjs <film>` (outside the product repo unless the user wants it inside). Put assets in `<film>/img`; keep downloads in their own folder.

**Exit:** you can describe the film in two sentences and the user agrees. **Then:** step 2.

## 2. Music

If the brief didn't settle it, ask with AskUserQuestion: own file / Suno / no music.
- **A. Own file.** If they just downloaded it, take the newest audio file in `~/Downloads` and confirm the name. Copy it to `<film>/track.<ext>`. Ask about rights in the same AskUserQuestion call: *I made or licensed it* / *Suno paid plan* / *CC0 or CC BY* / *Not sure*. "Not sure" means it's fine for a private draft but not for publishing; say so. If the film folder is inside a git repo, add `track.*` to its `.gitignore` unless the license allows redistribution.
- **B. Suno.** Read `references/suno-prompt.md`, pick a BPM so a bar is a round number of seconds, map the planned acts to bars, and give the user the style line and the bracketed structure to paste. They generate 2–4 takes and download the best. **The track is as long as Suno makes it: shape the film to the track.** Free-plan songs can't be used commercially; paid-plan songs can.
- **C. None.** Pick a BPM (default 120). Cuts snap to the grid, the preview plays a metronome, and music can be added later by re-timing.

Set `track` and `duration` in `film.js`. **Exit:** a track in `<film>`, or a BPM. **Then:** step 3.

## 3. Analysis

```
node $S/music.mjs analyze <film>/track.mp3 --json <film>/music.json
node $S/music.mjs envelope <film>/track.mp3 <film>/env.js
node $S/music.mjs plot <film>/track.mp3 <film>/review/music.png
```
No track: `node $S/music.mjs grid --bpm 120 --duration 20 --out <film>/env.js`.

Read `references/music-map.md`, Read the plot PNG, and write `<film>/MUSIC.md`: one row per event (intro, each strong hit, groove, break, drop, final hit). Show it to the user in a few lines.

**Exit:** MUSIC.md exists and the user has seen it. **Then:** step 4.

## 4. Scenario

Write `<film>/SCENARIO.md` from `references/scenario-template.md`: acts with exact seconds, the music event under each, what's on screen, the camera, and the **final copy word for word**. Every cut sits on a hit or kick from MUSIC.md. Write 2–3 variants wherever wording matters (headline, captions, end card), and mark placeholder assets.

Then one AskUserQuestion call:
- one question per copy slot with variants (options = the variants, `preview` = the line in context);
- open choices the scenario depends on (e.g. end-card theme), only if they're real choices;
- last: "Approve the scenario?" with *Approve*, *Change timing*, *Change scenes*, *Something else*, and `preview` = the act table in 6–10 lines.

<HARD-GATE>
Nothing gets built until the user approves SCENARIO.md. Building means writing ui.js or film.js, copying app components, or rendering. Reading the product's code is fine.
When they approve, write the chosen variants into SCENARIO.md and add `Approved: <date>` at the top.
</HARD-GATE>

**Then:** step 5.

## 5. Replicas

Read `references/lessons.md` first. For each screen in the scenario:
1. Read the real component: structure, copy, sizes, tokens, fonts, icons. Copy tokens and SVG icons verbatim into `film.css` / `ui.js`.
2. Write a builder in `ui.js` that returns the screen's HTML.
3. Compare against the source, component by component, and fix every mismatch. The first pass always misses things.

Copy the product's font files to `<film>/fonts`, declare them in `film.css`, and list every face in `fonts:` and every image in `images:` in `film.js`. Layout is measured at build time, so anything still loading is measured wrong.

Optional: a static gallery page with one `.frame` (1920×1080) per screen, captured with `node $S/snap.mjs gallery.html <film>/review/replica.png`, to show the user before animating.

**Exit:** every scenario screen exists and the audit found nothing left to fix. **Then:** step 6.

## 6. Build

Read `references/film-api.md`, then write the scenes in `film.js` in scenario order, at the scenario's times. The starter film shows each pattern. Preview by opening `<film>/index.html` (Space play, ←/→ 1 s, Alt+←/→ one beat, Shift+←/→ one frame, `?t=12.5`).

**Exit:** every act exists and plays without console errors. **Then:** step 7.

## 7. Review

Look first, then show:
```
node $S/sheet.mjs <film>/index.html <from> <to> 0.25 <film>/review/sheet-<act>.png
node $S/shots.mjs <film>/index.html <film>/review/stills <t1> <t2> … --label
```
Read every PNG yourself and fix what's obviously wrong. Then give the user the paths to the contact sheets and to full-resolution stills of each hit, each resting frame and the end card, and ask with AskUserQuestion: *Approve, render it* / *Fix something* (they describe it in Other) / *Show me more frames*.

<HARD-GATE>
No full render until the user approves the stills. After each round of fixes, show the changed frames again.
</HARD-GATE>

**Then:** step 8.

## 8. QA

Follow `references/qa-checklist.md`. The loop: run `node $S/audit.mjs <film>/index.html` → fix each clipped text that isn't a deliberate transition → re-run until clean.

## 9. Render and report

Crisp first (≈4 s per second of film); motion blur takes ~6× longer, so run it in the background:
```
node $S/render.mjs <film>/index.html <film>/out/film-crisp.mp4
node $S/render.mjs <film>/index.html <film>/out/film-motionblur.mp4 --preset motionblur
```
Use `--preset draft` or `--from/--to` for quick checks while iterating.

Before saying it's done, verify on the crisp MP4:
```
node $S/hits.mjs <film>/out/film-crisp.mp4 <film>/review/hits.png <hit times from MUSIC.md>
```
Read hits.png: in every row the cut falls between the first and second frame. Then report: paths, duration, file sizes, how to preview, and **what couldn't match the real app** (missing assets, approximated components, placeholder copy).

## Scripts

| command | does |
|---|---|
| `lib/check.mjs [--full]` | deps ready? (cached after setup) |
| `setup.sh [--demucs] [--force]` | install into `~/.ship-video`; skips what's there |
| `new-film.mjs <dir>` | new film folder from the starter |
| `music.mjs analyze\|envelope\|plot\|grid\|stems\|separate` | music analysis; runs Python in the venv |
| `sheet.mjs <html> <from> <to> <step> <out.png>` | time-stamped contact sheet |
| `shots.mjs <html> <dir> t… [--label]` | full-resolution stills |
| `snap.mjs <page.html> <out.png>` | screenshots of `.frame` elements (replica gallery) |
| `audit.mjs <html>` | clipped-text scan every 1/8 s |
| `render.mjs <html> <out.mp4> [--preset crisp\|motionblur\|draft]` | frame-exact MP4 with the track |
| `hits.mjs <mp4> <out.png> t…` | frames at t−0.02 / t / t+0.02 per hit |

## Gotchas

The ones that cost the most; the full list is in `references/lessons.md`.
- **`fromTo` paints its from-values at build time.** Without `NI` (`immediateRender: false`) every element of a shared scene shows at once.
- **Measure `center()` before adding tweens** that move the element or its camera, or every focus point is off.
- **Two camera tweens overlapping on the same properties** fight and the shot jitters.
- **App UI is tiny at 1080p.** Zoom 1.4–2.3× on what matters.
- **Anything time-based outside the timeline** (`setTimeout`, CSS animation, `Math.random`, `Date`) makes the render differ from the preview.
- **Gradient text clips descenders** unless the box has bottom padding (`.gtext` handles it).

## Red flags

| thought | reality |
|---|---|
| "The scenario is obvious, I'll build and show the result" | Changes after the build cost hours. Get the table approved. |
| "I'll invent plausible copy and fix it later" | Final copy is part of the scenario. Ask, or offer variants. |
| "The replica looks close enough" | Viewers who use the app notice. Compare component by component. |
| "Stills look fine to me, render straight away" | The user catches what you miss. Show them first. |
| "The analysis says 22.0, ship it" | Verify on the MP4 with `hits.mjs`. |
| "I'll trim the track to fit my plan" | Shape the film to the track. |
| "I'll list the open questions at the end of my message" | Prose questions get half-answered. Use AskUserQuestion. |

## References

| file | read when |
|---|---|
| `references/lessons.md` | before step 5, and before step 6 |
| `references/suno-prompt.md` | step 2, path B |
| `references/music-map.md` | step 3 |
| `references/scenario-template.md` | step 4 |
| `references/film-api.md` | before writing `film.js` |
| `references/qa-checklist.md` | step 8 |

---
name: ship-video
description: Directs and builds a short (15-45 s) video of the user's own web app as code: a launch film, feature or pricing teaser, app trailer, product demo, how-to or help-center clip, or landing-page hero loop, with the app's real UI recreated in HTML and rendered frame-exact to a 1080p60 16:9 MP4, cut to a track or silent. Use when the user wants a video, trailer, teaser, promo or demo of their app or product, wants its screens animated into a clip, wants a film cut to a track, needs a Suno prompt or beat for such a film, or wants to re-time or re-render an existing ship-video film. Not for editing existing footage or screen recordings, adding audio to a video, explainer or generic videos not about the user's app, standalone GIFs or animations, Remotion or After Effects work, or vertical 9:16 video.
license: MIT
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Bash(bash ${CLAUDE_SKILL_DIR}/scripts/setup.sh*)
---

# ship-video

You are directing and building a 15–45 s product film. Everything on screen is code: one HTML page, one paused GSAP timeline at absolute seconds, the app's screens rebuilt from its real components, rendered frame by frame to MP4.

**Core principle: agree on paper, then build.** A table of seconds → music → picture → copy costs minutes to change; a built film costs hours. The two approval gates below exist because every skipped one has meant a rebuild.

Scripts live in `${CLAUDE_SKILL_DIR}/scripts`. Run them; don't read their source. Every script takes `--help`. Here `$S` means that folder and `<film>` the film folder. References (`references/`, listed at the end) name the step that needs each.

**Terms.** *Hit*: a strong musical event where a cut lands. *Kick*: a smaller beat for moves inside a scene. *Cut*: a scene change. `hits` in `film.js` is the camera-shake list.

## Limits

Say it in the first reply if the request hits one, before any work:
- **16:9, 1920×1080 only.** Vertical (Reels, Shorts, 9:16) is not supported: offer a 16:9 film.
- **Web UI.** A mobile web app or PWA captures fine (`film-types.md`). A native app has no DOM: replicas come from screenshots (`replicas.md`) and match less exactly.
- **Feeds.** 16:9 is small on a phone, so type is sized up. Post the MP4; WebP is for READMEs and sites.
- **15–45 s.** For a track over ~60 s cut it on bar lines (step 3) or confirm a long film and its render time.
- **macOS or Linux** (Windows: WSL). **Output** is MP4 and an animated WebP; GIF is not made.

## Start or resume

Look in the film folder (ask if unclear). Find the **lowest row** whose files exist; its right-hand column is where you start.

| exists in `<film>` | done | start at |
|---|---|---|
| nothing | — | 0 Setup |
| `index.html`, no `PRODUCT.md` | folder | 1b Discovery |
| `PRODUCT.md`, no `track.*`, no `MUSIC.md` | product map | 2 Music |
| `PRODUCT.md` and `track.*`, no `MUSIC.md` | track chosen | 3 Analysis |
| `MUSIC.md` (first line `GRID DRAFT`: Suno track pending, re-time when it arrives; `SILENT, …`: a silent film) | music map | 4 Scenario |
| `SCENARIO.md` with `Approved:` | scenario | 5 Replicas |
| `review/compare/summary.json` with every state under the threshold, or a hand-built `ui.js` (no starter `.demo-*` screens) with a gallery state per scenario screen | replicas | 6 Build |
| `film.js` with scenes for every act | build | 7 Review |
| `review/APPROVED` (written when the user approves the stills) | review | 8 QA |
| `out/film-crisp.mp4` or `out/film-motionblur.mp4` | render | report, or the changes path in `render.md` |

**Not** progress markers: `out/test.mp4`, the starter's `ui.js`, `film.js` or `app.css`, `screens.js` (an early capture writes it, not yet compared), `review/discovery/`, an empty `review/`, `env.js`.

The user can skip steps ("I have a scenario", "no music", "just render it"). Skip what they name, say in one line what you skip, and keep the gates: approving a skipped gate needs their explicit words.

## Asking the user

**Propose, don't interrogate.** Decide what you can from the product and the code, write it down (PRODUCT.md, SCENARIO.md with final copy) and ask only the real decisions: goal, length, music source, where it will be shown, which of two directions, copy where the wording is theirs.
- Ask with **AskUserQuestion**, not a prose list: at most 4 questions per call (if more are missing, ask the ones the rest depend on first), 2–4 options, recommended first with "(Recommended)". Put what they compare into `preview` (copy variants, an act, a frame description).
- Before the call, at most ~6 lines of context. Details stay in the files.
- Don't ask what the user already said, what you can look up, or a taste question you have a view on: pick it, say why in one line, and let them change it at the gate.
- Gates are questions too: "Approve the scenario?" with *Approve*, *Change timing*, *Change scenes*, *Something else*.
- Without AskUserQuestion (other hosts), fall back to one short numbered list of options.

**Sharing the machine.** Stop only what you started, by PID (`render.mjs --stop`); never `pkill`/`killall`; reuse a dev server that answers; a live `<film>/out/*.pid` is another session's. Details: `sharing.md`.

## Progress checklist

Show this at the first reply, at each gate and at the end, not after every step:

```
- [ ] 0 Setup: deps ready
- [ ] 1 Brief: goal, audience, length, music, assets
- [ ] 1b Discovery: PRODUCT.md shown to the user
- [ ] 2 Music: file / Suno / generated beat / none
- [ ] 3 Analysis: MUSIC.md
- [ ] 4 Scenario: SCENARIO.md approved
- [ ] 5 Replicas: screens from real components
- [ ] 6 Build: film.js follows the scenario
- [ ] 7 Review: stills approved
- [ ] 8 QA: audit clean
- [ ] 9 Render: hits verified, report sent
```

## 0. Setup

Run `node $S/lib/check.mjs`. It answers instantly once setup has succeeded. Only if it reports something missing, run `bash $S/setup.sh` (installs into `~/.ship-video`, skips what's there). Skip `--demucs` (stems, several GB of PyTorch): no step needs it.

## 1. Brief

Find what you can yourself first (README, package.json, routes, components, existing assets). Then ask what is still missing in one AskUserQuestion call, at most four questions:
1. **Goal and film type**: launch / one feature or pricing teaser / how-to / landing page (`film-types.md`).
2. **Who watches, what they already know, and where it is shown**: a feed (text 56 px, post the MP4), a website hero (muted, loop?), a README, a help center.
3. **Length**: 10–15 / 15–20 / 20–30 / 30–45 s (propose the shortest that shows the product's one change, `film-types.md`, *What has worked*), with *Match the music* (recommended) only if the user stated no length, a track exists or will come from Suno or the generated beat, and it is under ~60 s; the film's `duration` is then the track's length. **Content decides, not the track:** if PRODUCT.md has material for ~15–20 s and the track runs 34, recommend cutting a section of the track (build → drop → final hit) over stretching the film; a long film with little to show is the most common way to bore.
4. **Music**: own file / Suno / generated beat (free, ours) / none. If you already see a candidate file (the newest audio file in `~/Downloads`), add step 2's "Where will this film be shown?" to this call.

Real assets you found (screenshots, GIFs, avatars, logo) are used without asking. A film whose feel the user wants: *Reference film* in `film-types.md` (borrow techniques, never content). Copy, a storyboard or brand rules from the user are the scenario's starting point.

For a large product, or if the user asks about quality, say once that the scenario and review benefit from the strongest model at high effort (it costs more); the user decides.

Create the folder: `node $S/new-film.mjs <film>` (outside the product repo unless the user wants it inside; add `--theme light|dark` if the app's look is known, otherwise it follows the capture). Put assets in `<film>/img`; keep downloads in their own folder.

Every film must let its intended viewer say what this is, why it matters and what to do next (`film-types.md`, *Identity first*): strangers and new docs readers get the name and promise on the working product by ~3 s, existing users a 1 s anchor, a personal site a person's name and role. Take promise and audience from the product's own words (README, site, store listing).
If the topic is narrow and the repo doesn't say what's new, or no call to action is known (a personal site may have no URL), ask that one question.

**Exit:** you can describe the film in two sentences and the user agrees. **Then:** 1b Discovery.

## 1b. Discovery

Know the whole product before writing about it: a film made from the README shows features, one made from the whole product shows a payoff. Read `film-types.md` (film types, story, coverage).
If you can run subagents and the product is not tiny, split this step into three parallel ones (code map, product research, capture) as `subagents.md` describes; a single page or a repo under ~30 source files is done inline.
1. **Inventory** from the router and components: every route, every view, empty/error/loading states, modals and palettes, theme and unit toggles, and everything animated or live (charts, maps, canvas, transitions).
2. **See each one.** If the app runs (reuse its server, see *Sharing the machine*): `node $S/capture.mjs <url> <film> --discover [--routes /,/radar] [--depth 2]` writes a screenshot per route to `<film>/review/discovery/*.png` plus `inventory.json`. Read the PNGs.
   Login, landing pages, hash routes and interaction-only states (dialogs, palettes, toasts): `replicas.md`, *Capture options*; list those from the code. Not running: use the app's own screenshots or docs and say so. Capturing here is research, not building: the gate below doesn't apply.
   Also read what changed lately: `CHANGELOG.md`, release notes and, if `gh` is installed and the repo has a remote, `gh pr list --state merged --limit 30` (read-only). For a launch or feature film find the one change that matters and note it in PRODUCT.md (`subagents.md`, *Product research*).
3. **Find the 3–5 wow moments:** what moves, what's unique to this product, what a user would show a friend. Not the longest feature list.
4. **Write `<film>/PRODUCT.md`:** the one-sentence promise; the audience; a table of views (view · route · states · screenshot · **core / aside / skip**: core carries the film, aside earns a 1–2 s glimpse, skip is plumbing; your judgment, not a checklist); the wow moments; the one concrete case that could carry the film; what can't be shown.
5. **Show the product map** to the user (a few lines and the path) before the scenario. They correct what you misread.

**Exit:** PRODUCT.md exists, every view (or section) has a screenshot or a noted reason, the user has seen it. If an approved `SCENARIO.md` already exists (a legacy folder), list the core views it does not cover and ask whether to add them; don't rewrite it. **Then:** step 2.

## 2. Music

If the brief didn't settle it, ask with AskUserQuestion: own file / Suno / generated beat / no music.
- **A. Own file.** If they just downloaded it, take the newest audio file in `~/Downloads` and confirm the name. Copy it to `<film>/track.<ext>`.
- **B. Suno.** Read `suno-prompt.md`; ask the rights question below before anything is generated. Give the user the Styles line, the Lyrics structure and the settings; they make 4–6 takes and download the best. Suno rarely hits an exact length: expect to crop or cut the take (step 3).
  **Don't wait idle:** write `MUSIC.md` from the grid (command in step 3) with `GRID DRAFT` on its first line, draft `SCENARIO.md` against it and ask the copy questions. Only the approval waits for the real take; then re-time (`music-map.md`).
- **C. None.** Pick a BPM (default 120; `music-map.md`, *No music*). Cuts snap to the grid, the preview plays a metronome, and music can be added later by re-timing. A film that stays silent (muted autoplay, WebP) follows `direction.md`, *Silent films* (step 4).
- **D. Generated beat.** Read `synth.md`, write `<film>/beat.json` from the planned acts, then `node $S/music.mjs synth --plan <film>/beat.json --out <film>/track.wav`. Step 3 analyzes it like any track. It is ours: no rights check. It is a functional score, not a song: say so, and offer Suno for a richer final.

**Rights (paths A and B).** Ask where the film will be shown, not which license the track has, **before Suno generates**. The decision tree is in `music-map.md`, *Rights*; the plan facts in `suno-prompt.md` §0. *Not decided yet* = draft: ask again before step 9.
If `<film>` is inside a git repo, add `track.*` to `.gitignore` unless the license allows sharing the file.

**Exit:** a track in `<film>`, or a BPM. **Then:** Analysis.

## 3. Analysis

With a track:
```
node $S/music.mjs analyze <film>/track.<ext> --json <film>/music.json
node $S/music.mjs envelope <film>/track.<ext> <film>/env.js
node $S/music.mjs plot <film>/track.<ext> <film>/review/music.png
```
Without a track: `node $S/music.mjs grid --bpm <bpm> --duration <seconds>` prints bar and beat times; write `MUSIC.md` from them (first line `SILENT, <bpm> BPM, duration <s> s`, or `GRID DRAFT` while a Suno track is pending; format in `music-map.md`, *No music*).

Length was decided in the brief; this step only checks it.
- Track more than ~3 s longer than the chosen length: ask *Use the full track* / *Cut a section* (preview: which bars, e.g. "build → drop → final hit, 9.98–32.02 s").
  A cut starts and ends on bar lines, keeps the drop and the final hit, and fades over the last bar: `ffmpeg -ss <start> -to <end> -i <track> -af "afade=t=out:st=<end-start-bar>:d=<bar>" track-cut.mp3`. Re-run the analysis on it.
- No length chosen and a track over ~60 s: propose a 30–45 s cut, or confirm a long film and warn about render time.
- The track fades out early (`audible end`) or a Suno take runs long: end the film at the audible end plus a short fade, or crop on a bar line and re-analyse; not on dead air.
- Confirm the `drop:` guess on the plot: it can pick an early riser.

Read `music-map.md`, Read the plot PNG, and write `<film>/MUSIC.md`: one row per event (intro, each strong hit, groove, break, drop, final hit). Show it to the user in a few lines.

**Exit:** MUSIC.md exists and the user has seen it. **Then:** Scenario.

## 4. Scenario

Propose a bold film; don't ask the user to invent one. Read `film-types.md`, `direction.md` (silent films too, if silent) and `motion-vocabulary.md`, then write `<film>/SCENARIO.md` from `scenario-template.md` (silent film: its silent variant):
- the **story**: problem → hero → action in the app → payoff that closes the problem, on the drop (silent: the strongest bar). One concrete case carries the film; features are its consequences. A **how-to** uses the template's Steps variant; a **teaser** or **landing page** names every skipped feature or section;
- acts with exact seconds, the music event and its role under each, **what moves in every shot**, the camera and framing target, the coverage of every view in PRODUCT.md, and the **final copy word for word**. Every cut sits on a hit or kick from MUSIC.md (silent: on the bar grid).

Run the template's self-critique rubric (hype rows are marked by film type) on it and fix the "no"s before the user sees it. **Say plainly if the length is wrong for the material**: "this has about 15 s of real content; at 34 s the middle will drag — cut the track to 15–18 s?" (or the reverse: "two steps need more time to read, 25 s instead of 20"), and offer it as an option in the gate. Do the same at the stills review if the frames show it. The user decides; you advise. Write 2–3 variants only where the wording is theirs (headline, end card); mark placeholder assets.

Then one AskUserQuestion call with only the real decisions:
- one question per copy slot with variants (options = the variants, `preview` = the line in context);
- open choices the scenario depends on (e.g. end-card theme), only if they're real choices;
- last: "Approve the scenario?" with *Approve*, *Change timing*, *Change scenes*, *Something else*, and `preview` = the story in 3 lines and the act table in 6–10 lines.

<HARD-GATE>
Nothing gets built until the user approves SCENARIO.md. Building means writing scenes in `film.js`, writing `ui.js`, copying app components, or rendering.
Reading code, running `capture.mjs` for Discovery, writing PRODUCT.md and MUSIC.md, and setting `film.js` config lines (track, duration) are not building.
When they approve, write the chosen variants into SCENARIO.md and add `Approved: <date>` at the top.
</HARD-GATE>

**Then:** step 5.

## 5. Replicas

Read `lessons.md` (once; it covers step 6 too) and `replicas.md`. **Capture first**: if the app runs (reuse its dev server or start one, see *Sharing the machine*; warm each route first, or capture a production build if the dev server is slow), its own DOM and CSS are the replica.
1. Write `<film>/states.json`: one entry per screen the scenario needs (`{name, path?, actions?, continue?, canvas?}`). Use `fill` for inputs (never Control+A), `wait` for timers.
2. `node $S/capture.mjs <url> <film>/states.json <film> --css` writes `screens.js`, `app.css`, `fonts/`, `img/`, and prints the `fonts:` / `images:` lists for `film.js`.
3. `node $S/compare.mjs <url> <film>/gallery.html <film>/review/compare --states <film>/states.json`, with the same `--storage/--viewport/--scheme/--touch` flags you captured with. Read every PNG (real, replica, diff); fix until every state is under ~2 %.
4. In `film.js` mount states with `UI.stack` / `UI.swap`, measure hidden copies with `UI.measure`, and **tween the real elements inside** `UI.pick(scene, name)`: a film of swapped static screens looks dead.

**No running app** (or one that needs a login or backend): ask for a test account or a seeded dev mode; otherwise build from source and screenshots (`replicas.md`, *Without a running app*) and say so in the report.
Either way list every font face in `fonts:` and every image in `images:`: layout is measured at build time, so anything still loading is measured wrong.

To see replicas before animating: `node $S/snap.mjs <film>/gallery.html <film>/review/replica.png` writes `replica-1.png`, `replica-2.png`, … Read them.

**Exit:** every scenario state exists in the gallery and matches the real app. **Then:** step 6.

## 6. Build

Read `film-api.md`, `shots.md` (the shot library) and `motion-vocabulary.md`; the starter film shows each pattern.
In `film.js` set `track` and `duration` from the `MUSIC.md` header, replace the starter's sample `hits` with the cut times from `MUSIC.md` as `[t, shake]`, then write the scenes in scenario order at the scenario's times. Silent film: `hits: []`, and delete the starter's `flash`, `rings` and shake too.

Camera and pointer defaults: `autoCam` plans close-ups from the clicks, cursor steps target selectors, `spot`/`loupe` pick out a detail in dense UI, a framed stage suits a landing or README hero (not feeds) — all in `film-api.md`.

Re-read `direction.md`, *Pacing* and *Framing*, while you build: they hold the reasons behind the numbers. Judge by the intended viewer; when you break a default, say why in *Changes vs scenario*. The costly tooling pitfalls (entrances, measuring before tweening, camera overlap) are `lessons.md` 7–9 and `film-api.md`.

Preview: tell the user to open `<film>/index.html` (Space play, ←/→ 1 s, Alt+←/→ one beat, Shift+←/→ one frame, `?t=12.5`).
Then a one-second test render, which catches a broken page, a missing track or a bad output path in seconds: `node $S/render.mjs <film>/index.html <film>/out/test.mp4 --preset draft --from 0 --to 1`.

**Exit:** every act exists, plays without console errors, and the test render succeeds. **Then:** step 7.

## 7. Review

Look first, then show:
```
node $S/sheet.mjs <film>/index.html <from> <to> <step> <film>/review/sheet-<act>.png
node $S/shots.mjs <film>/index.html <film>/review/stills <t1> <t2> … --label
```
Step 0.25 s for kinetic type, 0.5 s (or `--cols 4`) for app UI, whose text is unreadable in small tiles; at most ~24 tiles per sheet, one sheet per act. For a cut shoot cut + 0.01 s (the exact cut time shows the previous scene).

Read every PNG yourself and **critique it as a director**, not only as QA: does something change every beat, can the intended viewer say what this is muted, does the payoff carry the climax, is every click readable? Run the rubric at the end of `scenario-template.md` on the stills and fix every "no".
Then get a second opinion from a fresh critic subagent that is told the intended viewer and sees PRODUCT.md, SCENARIO.md and **full-resolution stills** for any text-size call (`subagents.md`); fix what holds up.

Before asking, fill **Changes vs scenario** in SCENARIO.md: every departure from it, one line each; a silent change breaks the promise the approval made.
Give the paths to the contact sheets and to full-resolution stills of each hit, each resting frame and the end card, and ask: *Approve, render it* / *Fix something* / *Show me more frames*. When they approve, write `<film>/review/APPROVED`.

<HARD-GATE>
No full render until the user approves the stills. After each round of fixes, show the changed frames again.
</HARD-GATE>

**Then:** step 8.

## 8. QA

Follow `qa-checklist.md`. The loop: run `node $S/audit.mjs <film>/index.html`, fix each clipped text that isn't a deliberate transition (mark deliberate crops with `data-clip-ok`) and each jump, click-placement or hidden-cursor line it prints, re-run until clean. A line that stays needs a written reason in SCENARIO.md (*Changes vs scenario*) before the render; no audit line ends unexplained. The audit also lints determinism (Math.random, Date, timers, `repeat: -1`), pixel-compares repeated seeks, reports text contrast below WCAG AA and greps the film for emails, phones and keys; real customer data never goes in a public film (capture with `--redact`, `replicas.md`).
If a fix changes anything visible, delete `review/APPROVED`, show those frames again and get approval again. Static spans are measured in step 9, on the crisp render.

## 9. Render and report

Read `render.md`. It covers choosing the render with AskUserQuestion (*Crisp* for UI and how-to films, *Motion blur* for kinetic music films), rendering crisp first in the background (several times cheaper, and the checks run on it), `hits.mjs` and `motion.mjs`, the WebP (README or website only), clean-up, the report, and *Changes after the render*.

## Red flags

| thought | reality |
|---|---|
| "The scenario is obvious, I'll build and show the result" | Changes after the build cost hours. Get the table approved. |
| "I'll trim the track to fit my plan" | Shape the film to the track. Cutting whole bars on bar lines is allowed (step 3); trimming mid-phrase isn't. |
| "I'll list the open questions at the end of my message" | Prose questions get half-answered. Use AskUserQuestion, and only for real decisions. |
| "No music, so slow and calm is fine" | Silent needs more motion, not less: something moves in every frame. |

## References

| file | read when |
|---|---|
| `references/film-types.md` | steps 1, 1b and 4: identity by audience, film types, story, coverage, reference film |
| `references/direction.md` | step 4 (structure by length, silent films), step 6 and 7 (pacing, framing), red flags |
| `references/scenario-template.md` | step 4, and the rubric again in step 7 |
| `references/motion-vocabulary.md` | steps 4 and 6 (type and camera techniques tied to music events and story roles) |
| `references/suno-prompt.md` | step 2, path B |
| `references/synth.md` | step 2, path D (generated beat) |
| `references/music-map.md` | steps 2 (paths B, C) and 3 |
| `references/lessons.md` | once, before step 5 (covers step 6) |
| `references/replicas.md` | step 5 (and step 1b for capture options) |
| `references/film-api.md` | step 6, before writing `film.js` |
| `references/shots.md` | step 6 (the shot library with code) |
| `references/subagents.md` | steps 1b and 7, if you can run subagents |
| `references/qa-checklist.md` | step 8 (its last section is step 9) |
| `references/render.md` | step 9 |
| `references/sharing.md` | before starting a dev server or a render |

Scripts (all in `$S`, all take `--help`): `lib/check.mjs`, `setup.sh`, `new-film.mjs`, `music.mjs`, `capture.mjs`, `port-css.mjs`, `compare.mjs`, `snap.mjs`, `sheet.mjs`, `shots.mjs`, `audit.mjs`, `motion.mjs`, `render.mjs`, `webp.mjs`, `hits.mjs`.

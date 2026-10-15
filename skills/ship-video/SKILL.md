---
name: ship-video
description: Directs and builds a short (15-45 s) music-synced video of the user's own web app (launch film, feature teaser, app trailer, product demo, walkthrough or social clip of its UI) as code: the app's real UI is recreated in one HTML page with a GSAP timeline and rendered frame-exact to a 1080p60 16:9 MP4 with every cut on a beat. Use when the user wants a video, trailer, teaser, promo or launch clip of their app or product, wants their app's screens animated into a clip, wants a film cut to a track, needs a Suno prompt or track for such a film, or wants to re-time or re-render an existing ship-video film. Not for editing existing footage or screen recordings, adding audio to a video, explainer or generic videos not about the user's app, standalone GIFs or animations, Remotion or After Effects work, or vertical 9:16 video.
license: MIT
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Bash(bash ${CLAUDE_SKILL_DIR}/scripts/setup.sh*)
---

# ship-video

You are directing and building a 15–45 s product film. Everything on screen is code: one HTML page, one paused GSAP timeline at absolute seconds, app screens rebuilt from the product's real components, rendered frame by frame to MP4 with the music.

**Core principle: agree on paper, then build.** A table of seconds → music → picture → copy costs minutes to change; a built film costs hours. The two approval gates below exist because every skipped one has meant a rebuild.

Scripts live in `${CLAUDE_SKILL_DIR}/scripts`. Run them; don't read their source. Every script takes `--help`. In this file `$S` means `${CLAUDE_SKILL_DIR}/scripts` and `<film>` means the film folder. References are in `references/`, listed at the end.

**Terms.** *Hit*: a strong musical event where a cut lands. *Kick*: a smaller beat for moves inside a scene. *Cut*: a scene change. `hits` in `film.js` is the camera-shake list.

## Limits

Say it in the first reply if the request hits one, before any work:
- **16:9, 1920×1080 only.** Vertical (Reels, Shorts, 9:16) is not supported. Offer a 16:9 film; a centred `ffmpeg` crop loses most of the frame.
- **Web UI.** A mobile web app or PWA has a DOM and captures fine (phone-width column: `direction.md`, *Phone and narrow apps*). A native app has none: replicas come from screenshots or design files (`references/replicas.md`), take longer and match less exactly.
- **Feeds.** 16:9 plays on X, LinkedIn and Instagram but is small on a phone: type is sized up (56 px). Post the MP4; WebP is for READMEs and sites.
- **15–45 s.** For a track over ~60 s don't match its length: cut it on bar lines (Analysis step) or confirm a long film and warn about render time.
- **macOS or Linux** (Windows: WSL). **Output** is MP4 and an animated WebP; GIF is not made.

## Start or resume

Look in the film folder (ask for it if unclear) and start at the first step whose output is missing:

| exists in `<film>` | done | start at |
|---|---|---|
| nothing | — | 0 Setup |
| `index.html`, no `PRODUCT.md` | folder | 1b Discovery |
| `PRODUCT.md`, no `track.*`, no `MUSIC.md` | product map | 2 Music |
| `PRODUCT.md` and `track.*`, no `MUSIC.md` | track chosen | 3 Analysis |
| `MUSIC.md` (first line `GRID DRAFT`: the Suno track is pending, draft the scenario and re-time when it arrives; `SILENT, …`: a silent film) | music map | 4 Scenario |
| `SCENARIO.md` with `Approved:` | scenario | 5 Replicas |
| `review/compare/summary.json` (from `compare.mjs`) with every state under the threshold, or a hand-built `ui.js` (no starter `.demo-*` screens) with a gallery state per scenario screen | replicas | 6 Build |
| `film.js` with scenes for every act | build | 7 Review |
| `review/APPROVED` (written when the user approves the stills) | review | 8 QA |
| `out/film-crisp.mp4` or `out/film-motionblur.mp4` | render | report, or the changes path in `references/render.md` |

These are **not** progress markers: `out/test.mp4` (the 1 s test render), the starter's `ui.js`, `film.js` or `app.css`, `screens.js` (Discovery or an early capture writes it: captured, not yet compared), `review/discovery/`, an empty `review/`, `env.js` (the starter creates it).

The user can skip steps ("I have a scenario already", "no music", "just render it"). Skip what they name, say in one line what you're skipping, and keep the gates: approving a skipped gate needs their explicit words.

## Asking the user

**Propose, don't interrogate.** Decide what you can from the product, the code and the brief, write it down (PRODUCT.md, SCENARIO.md with final copy) and ask only the real decisions: goal, length, music source, where it will be shown, which of two directions, copy where the wording is theirs.
- Ask with **AskUserQuestion**, not a prose list: up to 4 questions per call, 2–4 options, recommended option first with "(Recommended)". Put what they compare into `preview` (copy variants, an act, a frame description); keep labels to a few words.
- Before the call, at most ~6 lines of context: what you made and where it is. Details stay in the files.
- Don't ask what the user already said (goal, length, music, audience; a stated length means no "Match the music" question), what you can look up (tokens, copy, routes, track length), or a taste question you have a view on: pick it, say why in one line, and let them change it at the gate.
- Gates are questions too: "Approve the scenario?" with *Approve*, *Change copy*, *Change timing*, *Something else*.
- Without AskUserQuestion (other hosts), fall back to one short numbered list of options.

**Sharing the machine.** Other sessions may use the same CPU, ports and `~/.ship-video`. Stop only what you started, by PID (`node $S/render.mjs --stop <out.mp4>`); never `pkill`/`killall`. Reuse a dev server that already answers. A live `<film>/out/*.pid` is another session's render: leave it. Details: `references/sharing.md`.

## Progress checklist

Show this at the first reply, at each gate and at the end, not after every step:

```
- [ ] 0 Setup: deps ready
- [ ] 1 Brief: product, audience, goal, length, repo, real assets, optional reference film
- [ ] 1b Discovery: PRODUCT.md (views or sections, wow moments, promise) shown to the user
- [ ] 2 Music: file / Suno / generated beat / none chosen, track in <film>
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
- goal and **film type**: launch / one feature or pricing teaser / how-to / landing page (`direction.md`, *Film types*);
- **who watches and what they already know** (strangers, or existing users), and **where it is shown**: a feed (text 56 px, post the MP4), website hero (muted, loop?), README, help center;
- length: 15–20 s / 20–30 s / 30–45 s, and *Match the music* (first, recommended) **only if the user stated no length**, a track exists or will come from Suno or the generated beat, and it is under ~60 s; the film's `duration` is then the track's length;
- music: own file / Suno / generated beat (free, ours) / none (step 2). If they pick their own file and you can already see a candidate (the newest audio file in `~/Downloads`), ask step 2's "Where will this film be shown?" in the same call;
- real assets to use, if you found candidates (screenshots, GIFs, avatars, logo). Real beats invented every time;
- **a reference film (optional):** "Is there a film whose feel you want?" If so, follow *Reference film* in `references/direction.md`: borrow techniques, never content.

If they give copy, a storyboard or brand rules, use them as the scenario's starting point. Direction quality scales with model strength and effort: say once, in a line, that the scenario and the review benefit from the strongest model at high effort and cost more; the user decides.

Create the folder: `node $S/new-film.mjs <film>` (outside the product repo unless the user wants it inside). Put assets in `<film>/img`; keep downloads in their own folder.

Every film, launch included, must let its intended viewer say what this is, why it matters and what to do next (`direction.md`, *Identity first*): strangers get name, promise and the product working by ~3 s (the name sits on the live UI, not a logo card), existing users a 1 s anchor. The promise and audience come from the product's own words (README, site, store listing: the research subagent). If the topic is narrow (a pricing change, one feature) and the repo doesn't say what's new, or no call to action is known, ask that one question.

**Exit:** you can describe the film in two sentences and the user agrees. **Then:** 1b Discovery.

## 1b. Discovery

Know the whole product before writing about it. A film made from the README shows features; one made from the whole product shows a payoff. Read `references/direction.md` (coverage, story) first. If you can run subagents and the product is not tiny, split this step into three parallel ones (code map, product research, capture) as `references/subagents.md` describes and merge their reports into PRODUCT.md; for a single page or a repo under ~30 source files do it inline.
1. **Inventory** from the router and components: every route, every view, empty/error/loading states, modals and palettes, theme and unit toggles, and everything animated or live (charts, maps, canvas, transitions).
2. **See each one.** If the app runs (reuse its server, see *Sharing the machine*): `node $S/capture.mjs <url> <film> --discover [--routes /,/radar] [--depth 2]` writes a full-page screenshot per route to `<film>/review/discovery/*.png` plus `inventory.json` (heights, scroll containers, canvases, buttons, links). **Behind a login** it screenshots the login page: seed auth first (storage key or a login state, then `continue:true` states; `replicas.md`). **Landing pages:** sections are the views (`--root body`); scroll-reveal sections look blank until scrolled to: scroll, wait, then capture. Hash routes need `--routes /#/x`. It can't reach interaction-only states (dialogs, palettes, toasts, hover): list those from the code and capture them with a `states.json` (`capture.mjs <url> <states.json> <film>`; step 5 reuses the result). Read the PNGs. Not running: use the app's own screenshots or docs and say so. **Capturing here is research, not building:** the gate below doesn't apply to it.
3. **Find the 3–5 wow moments:** what moves, what's unique to this product, what a user would show a friend. Not the longest feature list.
4. **Write `<film>/PRODUCT.md`:** the one-sentence promise; the audience; a table of views (view · route · states · screenshot · **core / aside / skip**: core = what the product is for and must carry the film, aside = worth a 1–2 s glimpse at most, skip = settings, errors, plumbing; your judgment from the research, not a checklist); the wow moments; the one concrete case (a hero in a real situation) that could carry the film from problem to payoff; what can't be shown.
5. **Show the product map** to the user (a few lines and the path) before the scenario. They correct what you misread.

**Exit:** PRODUCT.md exists, every view (or section) has a screenshot or a noted reason, the user has seen it. **Then:** step 2.

## 2. Music

If the brief didn't settle it, ask with AskUserQuestion: own file / Suno / generated beat / no music.
- **A. Own file.** If they just downloaded it, take the newest audio file in `~/Downloads` and confirm the name. Copy it to `<film>/track.<ext>`.
- **B. Suno.** Read `references/suno-prompt.md`. First ask the rights question below, before anything is generated. Then pick a BPM so whole bars fill the length the user chose (25 s: 96 BPM, 2.5 s bars; 20–24 s: 120 BPM) and give them the Styles line, the Lyrics structure and the Suno settings (Advanced mode, Duration slider, model v6 or v6-mini). They make 4–6 takes and download the best. Suno rarely hits an exact length and treats bar counts as hints: expect to crop the take or cut it (Analysis step).
  **Don't wait idle.** Write `MUSIC.md` from the grid with `GRID DRAFT` on its first line, draft `SCENARIO.md` against it and ask the copy questions. Only the approval waits for the real take; then re-time (`references/music-map.md`).
- **C. None.** Pick a BPM (default 120). Cuts snap to the grid, the preview plays a metronome, and music can be added later by re-timing. If the film stays silent (a muted autoplay, a WebP, a feed), follow *Silent films* in `references/direction.md`: no fake beat or "drop", `hits: []`, `env.js` stays `window.ENV = null;`. Pick a BPM whose beat is whole frames and whose bars fill the length (15 s: 144 BPM, 9 bars; 20 s: 120 BPM; `music-map.md`).
- **D. Generated beat.** Read `references/synth.md`. Pick a round BPM so whole bars fill the length, write `<film>/beat.json` from the planned acts (sections as bars, the drop on the climax, `hits` for extra accents), then `node $S/music.mjs synth --plan <film>/beat.json --out <film>/track.wav` (`.mp3` and `.m4a` work too). Step 3 analyzes it like any track. The track is ours: no rights check, free to publish. It is a functional score, not a song: say so, and offer Suno for a richer final (re-time after).

**Rights (paths A and B; D needs none).** Ask where the film will be shown, not which license the track has, and ask it **before Suno generates**; the rules (and what blocks publishing) are in `references/music-map.md`, *Rights*. Free plan or "somewhere else" isn't publishable. *Not decided yet* = draft: ask again before step 9.

If `<film>` is inside a git repo, add `track.*` to its `.gitignore` unless the track's license allows sharing the file itself (own work, CC0, CC BY).

Note the track file name and the film `duration`; they go into the header of `MUSIC.md` in step 3 (path B writes `MUSIC.md` now, with `GRID DRAFT`). **Exit:** a track in `<film>`, or a BPM. **Then:** Analysis.

## 3. Analysis

With a track:
```
node $S/music.mjs analyze <film>/track.<ext> --json <film>/music.json
node $S/music.mjs envelope <film>/track.<ext> <film>/env.js
node $S/music.mjs plot <film>/track.<ext> <film>/review/music.png
```
Without a track: `node $S/music.mjs grid --bpm <bpm> --duration <seconds>` only prints bar and beat times; write `MUSIC.md` from them: first line `SILENT, <bpm> BPM, duration <s> s` for a silent film, `GRID DRAFT` while a Suno track is pending (format and roles: `references/music-map.md`). For a silent film `env.js` stays `window.ENV = null;` (`--out <film>/env.js` writes exactly that); `--out <film>/env.js --pulse` writes a synthetic beat pulse, only for a beat-reactive preview while a Suno track is pending.

Length was decided in the brief; this step only checks it.
- Track more than ~3 s longer than the chosen length: ask with AskUserQuestion *Use the full track* / *Cut a section* (preview: which bars, e.g. "build → drop → final hit, 9.98–32.02 s"). A cut starts and ends on bar lines, keeps the drop and the final hit, and fades over the last bar (`ffmpeg` asks for permission once): `ffmpeg -ss <start> -to <end> -i <track> -af "afade=t=out:st=<end-start-bar>:d=<bar>" track-cut.mp3`. Re-run the analysis on the cut.
- No length chosen and a track over ~60 s: don't match it. Propose a 30–45 s cut, or confirm a long film and warn about render time.
- The track fades to silence before its end (`audible end` in the analysis), or the Suno take is longer than asked (21.0 s take, 20 s requested): end the film at the audible end plus a short fade, or crop on a bar line with a fade and re-analyse; not on dead air.
- Confirm the `drop:` guess on the plot: it can pick an early riser.

Read `references/music-map.md`, Read the plot PNG, and write `<film>/MUSIC.md`: one row per event (intro, each strong hit, groove, break, drop, final hit). Show it to the user in a few lines.

**Exit:** MUSIC.md exists and the user has seen it. **Then:** Scenario.

## 4. Scenario

Propose a bold film; don't ask the user to invent one. Read `references/direction.md` and `references/motion-vocabulary.md`, then write `<film>/SCENARIO.md` from `references/scenario-template.md` (silent film: its silent variant):
- the **story**: problem → hero → action in the app → payoff that closes the problem, on the drop (silent: the strongest bar). One concrete case carries the film; features are its consequences. A **how-to** uses the template's Steps variant instead: numbered steps in a caption band, payoff = the visible changed state. A **teaser** or **landing page** names every skipped feature or section;
- acts with exact seconds, the music event and its role under each, **what moves in every shot**, the camera and framing target, the coverage of every view in PRODUCT.md, and the **final copy word for word**. Every cut sits on a hit or kick from MUSIC.md (silent: on the bar grid).

Run the template's self-critique rubric (hype rows are marked by film type) on it and fix the "no"s before the user sees it. Write 2–3 variants only where the wording is theirs (headline, end card); mark placeholder assets.

Then one AskUserQuestion call with only the real decisions:
- one question per copy slot with variants (options = the variants, `preview` = the line in context);
- open choices the scenario depends on (e.g. end-card theme), only if they're real choices;
- last: "Approve the scenario?" with *Approve*, *Change timing*, *Change scenes*, *Something else*, and `preview` = the story in 3 lines and the act table in 6–10 lines.

<HARD-GATE>
Nothing gets built until the user approves SCENARIO.md. Building means writing scenes in `film.js`, writing `ui.js`, copying app components, or rendering. Reading the product's code, running `capture.mjs` for Discovery (research; its output may be reused in step 5), writing PRODUCT.md and MUSIC.md, and setting `film.js` config lines (track, duration) are not building.
When they approve, write the chosen variants into SCENARIO.md and add `Approved: <date>` at the top.
</HARD-GATE>

**Then:** step 5.

## 5. Replicas

Read `references/lessons.md` (once; it covers step 6 too) and `references/replicas.md` first. **Capture first**: if the app runs (reuse its dev server or start one, see *Sharing the machine*), its own DOM and CSS are the replica.
1. Write `<film>/states.json`: one entry per screen the scenario needs (`{name, path?, actions?, continue?, canvas?}`). Use `fill` for inputs (never Control+A), `wait` for timers.
2. `node $S/capture.mjs <url> <film>/states.json <film> --css` writes `screens.js`, `app.css`, `fonts/`, `img/`, and prints the `fonts:` / `images:` lists for `film.js`.
3. `node $S/compare.mjs <url> <film>/gallery.html <film>/review/compare --states <film>/states.json`. Read every PNG (real, replica, diff); fix until every state is under ~2 %.
4. In `film.js` mount states with `UI.stack` / `UI.swap`, measure hidden copies with `UI.measure`, and **tween the real elements inside** `UI.pick(scene, name)`: a film of swapped static screens looks dead.

**No running app:** write builders in `ui.js` from the real components, port CSS with `node $S/port-css.mjs a.css … <film>/app.css`, copy fonts to `<film>/fonts`, and compare against the source and any screenshots the user has. If the app needs a login or backend, ask for a test account or a seeded dev mode, or inject state with an `eval` action in `states.json`; otherwise fall back to source and screenshots and say so in the report. Either way list every font face in `fonts:` and every image in `images:`: layout is measured at build time, so anything still loading is measured wrong.

To show the user replicas before animating: `node $S/snap.mjs <film>/gallery.html <film>/review/replica.png` writes one file per gallery frame: `replica-1.png`, `replica-2.png`, … Read them.

**Exit:** every scenario state exists in the gallery and matches the real app. **Then:** step 6.

## 6. Build

Read `references/film-api.md`, `references/shots.md` (the 14-shot library) and `references/motion-vocabulary.md`; the starter film shows each pattern. In `film.js` set `track` and `duration` from the `MUSIC.md` header, replace the starter's sample `hits` with the cut times from `MUSIC.md` as `[t, shake]` (silent film: `hits: []`), then write the scenes in scenario order at the scenario's times. Preview by opening `<film>/index.html` (Space play, ←/→ 1 s, Alt+←/→ one beat, Shift+←/→ one frame, `?t=12.5`).

Density while you build (`references/direction.md`, *Pacing* and *Framing*): something changes every beat; no span over ~1 s without a visible change except the end card's landing rest; bring things in with `enter`; the story thread (hero, situation) is set up before the payoff; the end card is about 2–2.5 s in total; dense or canvas-first UI: `direction.md`, *Film types*; app UI is zoomed 1.4–2.3× on the element that matters and pulls back on the hit; in a montage, cut on every kick; every cut frame is sharp and opaque; the payoff is the peak of the film. The costliest pitfalls (`fromTo` vs `NI`, measuring before tweening, camera overlap, determinism): `references/lessons.md` 5–8 and 16, `references/film-api.md`.

Then a one-second test render, which catches a broken page, a missing track or a bad output path in seconds: `node $S/render.mjs <film>/index.html <film>/out/test.mp4 --preset draft --from 0 --to 1`.

**Exit:** every act exists, plays without console errors, and the test render succeeds. **Then:** step 7.

## 7. Review

Look first, then show:
```
node $S/sheet.mjs <film>/index.html <from> <to> <step> <film>/review/sheet-<act>.png
node $S/shots.mjs <film>/index.html <film>/review/stills <t1> <t2> … --label
```
Use a 0.25 s step for kinetic type and 0.5 s (or `--cols 4`) for acts with app UI, whose text is unreadable in small tiles; at most ~24 tiles per sheet, one sheet per act. `shots.mjs` names files like `008.00.png`; for a cut shoot cut + 0.01 s (the exact cut time shows the previous scene).

Read every PNG yourself, then **critique it as a director**, not only as a QA check: is something changing every beat? can the intended viewer say what this is and what to do, muted? is the story readable without sound (how-to: do the steps teach the task)? does the payoff carry the climax (how-to: the changed state, held)? is the camera close to what matters (target 40–70% of the frame, no empty chrome, text ≥ 28 px, 56 for a feed)? is everything that serves the film type there, skipped parts named? are cut frames sharp and opaque? (dark-UI hype films: is half the film not dark?) Run the rubric at the end of `references/scenario-template.md` on the stills and fix every "no". Then get a second opinion from a fresh critic subagent that is told the intended viewer and sees PRODUCT.md, SCENARIO.md and **full-resolution stills** for any text-size call, not only tiles (`references/subagents.md`); fix what holds up.

Then, before asking, fill **Changes vs scenario** in SCENARIO.md: every place the film departs from it (a time moved, an effect changed, a different framing), one line each. The user approved the scenario, so a silent change is a broken promise. Give the paths to the contact sheets and to full-resolution stills of each hit, each resting frame and the end card, and ask with AskUserQuestion: *Approve, render it* / *Fix something* (they describe it in Other) / *Show me more frames*. When they approve, write `<film>/review/APPROVED`.

<HARD-GATE>
No full render until the user approves the stills. After each round of fixes, show the changed frames again.
</HARD-GATE>

**Then:** step 8.

## 8. QA

Follow `references/qa-checklist.md`. The loop: run `node $S/audit.mjs <film>/index.html`, fix each clipped text that isn't a deliberate transition (mark deliberate crops with `data-clip-ok`) and each jump, click-placement or hidden-cursor line it prints, re-run until clean. Then `node $S/motion.mjs <mp4>` on a render for static spans. If a fix changes anything visible, show those frames again (the Review gate applies).

## 9. Render and report

Read `references/render.md`. In short:
1. Ask which render they want (*Crisp*, ~2–3.5 s per film second, recommended for UI and how-to films since blur smears text; *Motion blur*, 3–4× slower, for kinetic launch films; or both) and give the range, not a promise (on a shared machine it can be 2–3× the idle estimate).
2. **Always render crisp first**, in the background (`run_in_background`); read `<out>.progress` within a minute. Never `pkill`; stop with `render.mjs --stop`.
3. For a README or post, make an animated WebP with `webp.mjs` (GitHub never autoplays an MP4).
4. **Verify** the crisp MP4 with `hits.mjs <mp4> <film>/review/hits.png <cut times>` and read it (silent film: skip). Run `node $S/motion.mjs <mp4>` too: nothing over ~1 s static except the ending rest.
5. **Clean up** (processes you started, `out/test.mp4`, `*.part`, `*.progress`, `*.pid`) and **report**: paths, length, sizes, how to preview, and what couldn't match the real app.

**Changes after the render** need a re-render of the chosen version: copy or look only → show changed frames, get a yes, re-render, re-run the hit check; timing or a new track → re-time (`music-map.md`), a move over one bar means a new approval; a new or removed scene or any `SCENARIO.md` change → re-approve (new `Approved:` date) and rebuild the affected scenes.

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
| `references/lessons.md` | once, before step 5 (covers step 6) |
| `references/direction.md` | steps 1b and 4 (structure, story, pacing, framing, silent films), step 7 |
| `references/shots.md` | step 6 (the 14-shot library with code) |
| `references/motion-vocabulary.md` | steps 4 and 6 (type and camera techniques tied to music events and story roles) |
| `references/replicas.md` | step 5 |
| `references/suno-prompt.md` | step 2, path B |
| `references/music-map.md` | steps 2C and 3 |
| `references/synth.md` | step 2, path D (generated beat) |
| `references/scenario-template.md` | step 4, and the rubric again in step 7 |
| `references/film-api.md` | before writing `film.js` |
| `references/subagents.md` | step 1b and step 7, if you can run subagents |
| `references/qa-checklist.md` | step 8 |
| `references/render.md` | step 9 |
| `references/sharing.md` | before starting a dev server or a render |

Scripts (all in `$S`, all take `--help`): `lib/check.mjs`, `setup.sh`, `new-film.mjs`, `music.mjs`, `capture.mjs`, `port-css.mjs`, `compare.mjs`, `snap.mjs`, `sheet.mjs`, `shots.mjs`, `audit.mjs`, `motion.mjs`, `render.mjs`, `webp.mjs`, `hits.mjs`.

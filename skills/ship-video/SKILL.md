---
name: ship-video
description: Makes a launch video, trailer, teaser, demo or how-to clip of the user's own web app, as code. Recreates the app's real UI in HTML, animates it with GSAP to a music track or silent, and renders a frame-exact 1080p60 16:9 MP4 (plus a WebP for READMEs). Use when the user wants a video, promo, trailer, teaser, demo or product film of their app, site or product, a film cut to a track, a Suno prompt or generated beat for such a film, or to change or re-render an existing ship-video film. Not for editing existing footage or screen recordings, generic explainers unrelated to their app, vertical 9:16 video, or Remotion and After Effects projects.
license: MIT
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
---

# ship-video

You direct and build a 10–45 s film of the user's product. Everything on screen is code: one HTML page, one paused GSAP timeline in absolute seconds, the app's real screens captured from its DOM and animated, rendered frame by frame to MP4.

**How the work is shaped.** A film lives or dies on choices made before any code: which viewer, which one change the product makes, which story, how long. Those choices go into a one-page scenario the user approves; it costs minutes to change on paper and hours once built. After that, build well, check your own work hard, render, and show the film: the user watches it and tells you what to change. Don't stop for approvals beyond the scenario.

**Scripts** are in `scripts/` next to this file. In Claude Code that folder is `${CLAUDE_SKILL_DIR}/scripts`; elsewhere resolve it against this file's directory and call it by absolute path. Below, `$S` is that folder and `<film>` the film folder. Run scripts, don't read their source; each takes `--help`.

**Asking.** Decide what you can from the product and the code, write it down, and ask only real decisions (viewer, length, music, the user's own wording). Use a structured question tool if your host has one (Claude Code: AskUserQuestion, at most 4 questions, 2–4 options each, your recommendation first), otherwise one short numbered list. A taste question you have a view on is not a question: pick, say why in a line, let them change it at the gate.

## Limits

Say it up front if the request hits one: 16:9 only (no 9:16); web UI (a native app can only be rebuilt from screenshots, less exactly); 10–45 s; macOS, Linux or Windows; output MP4 and animated WebP, no GIF. Setup downloads Chromium and Python packages into `~/.ship-video`: a sandboxed host (Codex) needs network access and write access there; if a command is blocked, tell the user which permission it needs instead of retrying.

## Start or resume

Check the film folder (ask which if unclear) and start at the first missing piece:

| exists in `<film>` | start at |
|---|---|
| nothing | 0 Setup |
| `index.html`, no `PRODUCT.md` | 2 Discovery |
| `PRODUCT.md`, no `MUSIC.md` | 3 Music |
| `MUSIC.md`, no approved `SCENARIO.md` (`Approved:` line) | 4 Scenario |
| approved `SCENARIO.md`, no `screens.js` (or states not yet compared) | 5 Replicas |
| `screens.js` and `review/compare/` with every state matching, starter `film.js` | 6 Build |
| `film.js` with every act built, no `out/film-*.mp4` | 7 Review |
| `out/film-crisp.mp4` or `out/film-motionblur.mp4` | ask what to change (`render.md`, *Changes after the render*) |

The user may skip steps ("I have a scenario", "no music", "just build it"): skip them and say so in one line. Skipping the scenario gate needs their explicit words.

Show this checklist in the first reply and when you deliver:
```
- [ ] 0 Setup   - [ ] 1 Brief   - [ ] 2 Discovery   - [ ] 3 Music
- [ ] 4 Scenario (approved)   - [ ] 5 Replicas   - [ ] 6 Build
- [ ] 7 Review   - [ ] 8 Render and deliver
```

## 0. Setup

`node $S/lib/check.mjs`: instant once setup has run. Only if it reports something missing: `node $S/setup.mjs` (installs into `~/.ship-video`, skips what's there).

## 1. Brief

Look first: README, package.json, routes, components, the site, existing screenshots and logos (real assets are used without asking). Then ask what's still missing, in one round:
1. **Who watches and where** (a feed, a website hero, a README, a help center) and what they already know. This sets the opening (`direction.md`, *The viewer test*) and the minimum text size.
2. **Film type**: launch, one-feature teaser, how-to, landing page.
3. **Length**: recommend the shortest that shows the product's one change; 10–15 s is often best. *Match the music* only when a track exists or is coming.
4. **Music**: own file / Suno / generated beat (free, ours) / none. If a fresh audio file sits in `~/Downloads`, offer it.

A film whose feel they want: break it into a contact sheet (`ffmpeg -i ref.mp4 -vf "fps=2,scale=480:-1,tile=6x5" <film>/review/reference.png`), list its techniques, borrow those, never its content.

Create the folder: `node $S/new-film.mjs <film>` (outside the product repo unless they want it inside; `--theme light|dark` if known; `--silent` for a film without music).

## 2. Discovery

A film made from the README shows features; one made from the whole product shows a payoff. Know the product first. For anything beyond a small app, split this into three parallel subagents if you can (`subagents.md`).
1. **Inventory** every route and view from the router, with the states that matter (dialogs, palettes, toasts, empty states, themes) and everything live (charts, maps, canvases).
2. **See each one**: with the app running (reuse its server, `render.md`, *Sharing the machine*) `node $S/capture.mjs <url> <film> --discover` writes a screenshot per route to `<film>/review/discovery/`; Read them. Logins, phones, landing pages: `replicas.md`, *Options*. Not running: use its screenshots and docs, and say so.
3. **Find what's new and what's special**: the changelog, release notes, `gh pr list --state merged --limit 30` if available; the 3–5 moments a user would show a friend; the **one change that is the product**.
4. **Write `<film>/PRODUCT.md`**: the promise in the product's own words, the viewer, views (core / aside / skip, with screenshot paths), wow moments, the one concrete case that could carry the film, what can't be shown. Show it in a few lines; the user corrects what you misread.

## 3. Music

Read `music.md`.
- **Own file**: copy it to `<film>/track.<ext>`.
- **Suno**: ask the rights question first, then give the prompt from `suno-prompt.md`. Don't wait idle: write MUSIC.md from a `GRID DRAFT` and draft the scenario while they generate.
- **Generated beat**: write `beat.json` from the planned acts and run `music.mjs synth`.
- **None**: a BPM grid; read `direction.md`, *Silent films*.

Analyse the track, read the plot, confirm the drop yourself, and write `<film>/MUSIC.md` with the story role of each section. If the track is longer than the material, propose cutting a section on bar lines.

## 4. Scenario

Read `direction.md` and write `<film>/SCENARIO.md` from `scenario-template.md`: the viewer, the story (problem → hero → action → payoff on the drop), every shot with its seconds, what moves and where the camera lands, the final copy word for word. Run the template's self-check and fix the "no"s first. **Tell the user if the length doesn't fit the material** and offer the better one.

Then ask, in one round: variants only where the wording is theirs, and "Approve the scenario?" (*Approve* / *Change timing* / *Change scenes* / *Something else*) with the story in three lines and the shot table.

<HARD-GATE>
Nothing is built until the user approves SCENARIO.md: no scenes in `film.js`, no replicas, no renders. Reading code, Discovery captures, PRODUCT.md, MUSIC.md and the `track`/`duration` lines of `film.js` are not building. On approval write the chosen variants in and add `Approved: <date>` at the top.
</HARD-GATE>

## 5. Replicas

Read `replicas.md`. With the app running, its own DOM and CSS are the replica: write `<film>/states.json` with every state the scenario needs (both sides of each interaction), run `capture.mjs … --css`, then `compare.mjs`, and Read the comparison PNGs until each state matches. Without a running app, build from the components and say so in the report.

## 6. Build

Read `film-api.md` and `shots.md`. Set `track`, `duration`, `hits` (`music.md`) and `fonts`/`images` from the capture output, then write the scenes in scenario order at the scenario's seconds. Tween the real elements inside the captured screens (`direction.md`). Where you depart from the scenario, add a line to *Changes vs scenario*.

Check as you go: `node $S/render.mjs <film>/index.html <film>/review/test.mp4 --preset draft --from 0 --to 1` catches a broken page in seconds; the user can open `<film>/index.html` to preview (Space plays, arrows step, `?t=12.5`).

## 7. Review

Look at the film as a director before anyone else does:
```
node $S/sheet.mjs <film>/index.html <from> <to> <step> <film>/review/sheet-<act>.png
node $S/shots.mjs <film>/index.html <film>/review/stills <t1> <t2> … --label
```
One contact sheet per act (0.25 s steps for type, 0.5 s for UI), full-resolution stills of each cut + 0.01 s, the payoff and the end card. Read every image and run the self-check from `scenario-template.md` on the frames; zoom into every interaction at 0.1 s steps, since most "unfinished" feel lives in those half seconds. Then get one fresh critic's opinion (`subagents.md`) and fix what holds up. Finish with `node $S/audit.mjs <film>/index.html` until clean (`render.md`, *Audit*).

## 8. Render and deliver

Read `render.md`: render crisp in the background, verify it (`hits.mjs`, `motion.mjs`), fix and re-render if needed, then deliver (*Deliver*: the folder opens, a first cut, one question).

## References

| file | read at |
|---|---|
| `references/direction.md` | 4, and again in 6 and 7: the viewer test, story, structure, pacing, framing, film types |
| `references/scenario-template.md` | 4 (template and self-check), 7 (self-check on the frames) |
| `references/music.md` | 3: analysis, MUSIC.md, silent grid, generated beat, rights |
| `references/suno-prompt.md` | 3, when the music comes from Suno |
| `references/replicas.md` | 2 (capture options) and 5 |
| `references/film-api.md` | 6, before writing `film.js` |
| `references/shots.md` | 6: recipes with code |
| `references/subagents.md` | 2 and 7, if your host can run subagents |
| `references/render.md` | 7 (audit) and 8; *Sharing the machine* before starting servers or renders |

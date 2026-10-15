# ship-video

**Turn your app into a music-synced launch film, as code, from one Claude Code prompt.**

<p align="center">
  <img src="docs/hero.webp" alt="Typing /ship-video: it asks how long and which music, hears the hits, then Plan, Build, Review, Render, one word a bar, and Shipped." width="900">
</p>

<p align="center"><sub>Made with ship-video itself: one HTML page on a 120 BPM grid. <a href="docs/hero">View source</a>.</sub></p>

ship-video is a [Claude Code skill](https://code.claude.com/docs/en/skills) that directs and builds a 15–45 s product video for your app. Claude reads your UI code, finds the hits in your music, agrees a shot-by-shot scenario with you, rebuilds your screens in HTML and animates them with GSAP. A small engine then renders the page frame by frame to MP4. No video editor, no After Effects.

## Quick start

In Claude Code:

```
/plugin marketplace add patryk-penczek/ship-video
/plugin install ship-video@ship-video
```

Then, in your app's repo:

> Make a 30-second launch video for this app. No music yet.

On first use Claude installs the engine's dependencies into `~/.ship-video` (about 2 minutes, once). You'll get a scenario to approve, stills to review, and then `film/out/film-crisp.mp4`.

<details>
<summary>Install without the plugin system</summary>

```bash
git clone https://github.com/patryk-penczek/ship-video.git
cp -R ship-video/skills/ship-video ~/.claude/skills/
bash ~/.claude/skills/ship-video/scripts/setup.sh   # optional: Claude runs it on first use
```
</details>

## What happens

1. **Brief.** Claude reads your repo, then asks a few clickable questions: goal, length, music.
2. **Music.** It analyses your track's tempo, hits and drop, and writes a music map.
3. **Scenario.** It writes a table of seconds, music, picture and exact copy. **Nothing is built until you approve it.**
4. **Build.** It recreates your screens from your real components and animates them on the beat.
5. **Review.** It shows contact sheets and stills. **Nothing is rendered until you approve them.**
6. **Render.** You get a crisp 60 fps MP4 and a motion-blur version, and a check that every cut lands on its hit.

Already partway through? Claude picks up from the files in the film folder, and you can tell it to skip steps.

## Music

Pick one of three paths when Claude asks:

| path | what you do | good for |
|---|---|---|
| **Your track** | drop in an audio file | music you made or licensed |
| **Suno** | paste the style and structure Claude writes into [Suno](https://suno.com), download the best take | a track shaped to your film's bars |
| **None** | nothing | drafts. Cuts snap to a tempo grid and the preview plays a metronome; add music later |

> [!IMPORTANT]
> **Suno licensing:** songs made on Suno's **free plan can't be used commercially**. Songs made while on a **paid plan** can. Check [Suno's terms](https://suno.com) before publishing. Claude asks where the film will be shown and flags tracks that aren't safe to publish.

## Try it on the demo app

[`demo-app/`](demo-app) is **Breeze**, a weather app (Bun + React, static data) with enough going on to film a 35-second trailer: a ⌘K command palette, weather alerts, minute-by-minute rain, an hourly chart you can scrub, a 7-day forecast, air quality, wind, sun and moon, "best time to…" activity picks, an animated rain radar with a timeline, a compare view that ranks your places, °C/°F, and a light/dark theme that switches with a circular reveal.

```bash
cd demo-app && bun install && bun run dev   # http://localhost:4783
```

Then ask Claude: *"Make a 35-second trailer for the weather app in demo-app/."*

## Requirements

macOS or Linux with **Node 20+**, **ffmpeg** and **Python 3** ([uv](https://docs.astral.sh/uv/) recommended). The setup script installs the rest into `~/.ship-video`, so it survives skill updates, and skips anything already there:

| installed | used for |
|---|---|
| Playwright + Chromium | rendering every frame of the film page |
| GSAP, Inter, JetBrains Mono | the film's timeline and default fonts |
| Python venv with librosa | tempo, beats, hits, the audio envelope |
| demucs *(optional, `--demucs`)* | stem separation; pulls in PyTorch, several GB |

## How it works

- **One HTML page per film.** A paused GSAP timeline holds every tween at absolute seconds.
- **Preview in the browser.** The track drives the timeline. Use Space to play, the arrows to scrub, Alt+arrows to jump a beat and Shift+arrows to step a frame.
- **Frame-exact render.** With `?render=1` the page exposes `window.__seek(t)`. Playwright seeks to every frame, screenshots it and pipes it into ffmpeg with the music. Motion blur renders at 240 fps and blends 4:1 down to 60.
- **Deterministic.**
  - Everything is a pure function of time: no timers, no CSS animations.
  - GIFs become sprite sheets.
  - Camera shake comes from a hash of the frame number.
  - Audio-reactive effects read a precomputed envelope.

<details>
<summary>Repository layout</summary>

```
skills/ship-video/
├─ SKILL.md            the guided flow: steps, approval gates, scripts, gotchas
├─ references/         read on demand: lessons, film API, music map, templates, QA checklist
├─ scripts/            render, stills, replica compare, audit, hit check, music analysis (all take --help)
└─ assets/starter/     the film template
demo-app/              Breeze, the demo weather app
evals/                 test prompts for the skill
```
</details>

## Compared to other tools

| | ship-video | [HyperFrames](https://github.com/heygen-com/hyperframes) | [Remotion](https://github.com/remotion-dev/remotion) | [OpenMontage](https://github.com/calesthio/OpenMontage) |
|---|---|---|---|---|
| What it is | one skill: a guided workflow for product films | HTML → MP4 framework for agents | React → video framework | agentic video production system |
| Writes in | HTML + GSAP | HTML + seekable animations | React | many pipelines |
| Music sync | built in: hit detection, music map, hit check | bring your own | bring your own | varies by pipeline |
| Recreates your app's UI | yes, from your real components | not the focus | not the focus | not the focus |
| Best for | one polished launch or feature film for your app | general HTML video, templates | programmatic video at scale | broad AI video production |

The renderer here is deliberately small and could be swapped for HyperFrames. What this repo adds is the workflow and the lessons around it.

## Troubleshooting

<details>
<summary>Claude doesn't use the skill</summary>

Start a new session after installing, then mention a video, trailer or launch film, or type `/ship-video`.
</details>

<details>
<summary>Setup fails installing librosa</summary>

Your Python may be too new for librosa's dependencies. Install [uv](https://docs.astral.sh/uv/) (`brew install uv`) and run `bash scripts/setup.sh --force`. uv uses Python 3.12.
</details>

<details>
<summary>The render uses the wrong font</summary>

Every font face must be listed in `fonts:` in `film.js` and declared with `@font-face` in `film.css`. Apps bundled with Bun can ship broken `@font-face` rules, so point at the font files directly.
</details>

<details>
<summary>A cut is a frame late</summary>

Run `node scripts/hits.mjs film.mp4 hits.png <times>`. Each row shows t−0.02, t and t+0.02, and the cut should fall between the first two. Move the scene's start time to the detected hit.
</details>

## License

[MIT](LICENSE). Films you make with it are yours. Music, fonts and assets you add keep their own licenses.

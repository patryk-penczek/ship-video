# ship-video

**Turn your app into a music-synced launch film, as code, from one Claude Code prompt.**

<p align="center">
  <a href="#quick-start"><img src="docs/hero.webp" alt="Typing /ship-video: it asks how long and which music, hears the hits, then Plan, Build, Review, Render, one word a bar, and Shipped." width="900"></a>
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

On first use Claude installs the engine's dependencies into `~/.ship-video` (about 2 minutes, once). You'll get a scenario to approve, stills to review, and then an MP4 in the film folder's `out/` (for example `film-crisp.mp4`). Or give it a track: *Make a 30-second launch video for this app, cut to ~/Downloads/track.mp3.*

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
5. **Review.** It shows contact sheets and stills. **No full render until you approve them.**
6. **Render.** You pick crisp (60 fps, about 3.5 s of render per second of film), motion blur (smoother, 3–4× slower) or both. You also get a check that every cut lands on its hit, and an animated WebP for READMEs.

Already partway through? Claude picks up from the files in the film folder, and you can tell it to skip steps. Changes after a render mean a full re-render, after you re-approve whatever changed.

## Limits

- 16:9, 1920×1080 only. No vertical (Reels, Shorts) output.
- Web UI. For a native or mobile app, replicas are built from screenshots and match less exactly.
- 15–45 s films. Very long tracks get cut to a section.
- Output is MP4 and animated WebP, not GIF.
- macOS or Linux (Windows: WSL).

## Music

Pick one of three paths when Claude asks:

| path | what you do | good for |
|---|---|---|
| **Your track** | drop in an audio file | music you made or licensed |
| **Suno** | paste the style and structure Claude writes into [Suno](https://suno.com) (Advanced mode), download the best of 4–6 takes. Needs a Suno account, and a paid plan for public use | a track shaped to your film's bars |
| **None** | nothing | drafts. Cuts snap to a tempo grid and the preview plays a metronome; add music later |

> [!IMPORTANT]
> **Suno licensing:** per Suno's terms at the time of writing, songs made on the **free plan can't be used commercially**, and upgrading later doesn't change that. Songs made while on a **paid plan** can. Check [Suno's terms](https://suno.com) before publishing. Claude asks where the film will be shown, and which plan you'll generate on, before you generate anything.

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
| Bun *(demo app only)* | running the Breeze demo app |

## How it works

- **One HTML page per film.** A paused GSAP timeline holds every tween at absolute seconds.
- **Preview in the browser.** The track drives the timeline. Use Space to play, the arrows to scrub, Alt+arrows to jump a beat and Shift+arrows to step a frame.
- **Frame-exact render.** With `?render=1` the page exposes `window.__seek(t)`. Playwright seeks to every frame, screenshots it and pipes it into ffmpeg with the music. Motion blur renders at 240 fps and blends 4:1 down to 60.
- **Deterministic.**
  - Everything is a pure function of time: no timers, no CSS animations.
  - GIF inputs (animated emoji, loaders) become sprite sheets.
  - Camera shake comes from a hash of the frame number.
  - Audio-reactive effects read a precomputed envelope.

<details>
<summary>Repository layout</summary>

```
skills/ship-video/
├─ SKILL.md            the guided flow: steps, approval gates, scripts, gotchas
├─ references/         read on demand: lessons, replicas, film API, music map, Suno prompt, scenario template, QA checklist
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

What this repo adds is the workflow and the lessons around a small renderer. Comparison as of October 2026; check the other projects for what they do today.

## Troubleshooting

<details>
<summary>Claude doesn't use the skill</summary>

Start a new session after installing (or reload plugins), then mention a video, trailer or launch film of your app, or type `/ship-video`. It does not trigger for editing existing footage.
</details>

<details>
<summary>Setup fails installing librosa</summary>

Your Python may be too new for librosa's dependencies. Install [uv](https://docs.astral.sh/uv/) (`brew install uv`) and run `bash ~/.claude/skills/ship-video/scripts/setup.sh --force` (plugin installs: the same `scripts/setup.sh` under the plugin's `skills/ship-video` folder). uv uses Python 3.12.
</details>

<details>
<summary>The render uses the wrong font</summary>

Every font face must be listed in `fonts:` in `film.js` and declared with `@font-face` in `film.css`. Apps bundled with Bun can ship broken `@font-face` rules, so point at the font files directly.
</details>

<details>
<summary>A cut is a frame late</summary>

Run `node <skill folder>/scripts/hits.mjs film.mp4 hits.png <times>` (the skill folder is `~/.claude/skills/ship-video` for a manual install). Each row shows t−0.02, t and t+0.02, and the cut should fall between the first two. Move the scene's start time to the detected hit.
</details>

## License

[MIT](LICENSE). Films you make with it are yours. Music, fonts and assets you add keep their own licenses.

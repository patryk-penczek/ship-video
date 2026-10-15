# ship-video

**Turn your app into a music-synced launch film, as code, from a Claude Code or Codex conversation.**

<p align="center">
  <a href="#quick-start"><img src="docs/hero.webp" alt="Typing /ship-video: it asks how long and which music, hears the hits, then Plan, Build, Review, Render, one word a bar, and Shipped." width="900"></a>
</p>

<p align="center"><sub>Made with ship-video itself: one HTML page on a 120 BPM grid. <a href="docs/hero">View source</a>.</sub></p>

ship-video is an [agent skill](https://code.claude.com/docs/en/skills) for Claude Code and Codex that directs and builds a 10–45 s product video for your app. The agent reads your UI code, finds the hits in your music, agrees a shot-by-shot scenario with you, rebuilds your screens in HTML and animates them with GSAP. A small engine then renders the page frame by frame to MP4. No video editor, no After Effects.

## Quick start

In Claude Code:

```
/plugin marketplace add patryk-penczek/ship-video
/plugin install ship-video@ship-video
```

Then, in your app's repo:

> Make a 30-second launch video for this app. No music yet.

On first use Claude installs the engine's dependencies into `~/.ship-video` (about 2 minutes, once). You'll get a scenario to approve, then a first cut as an MP4 in the film folder's `out/` (for example `film-crisp.mp4`), which you refine by saying what to change. Or give it a track: *Make a 30-second launch video for this app, cut to ~/Downloads/track.mp3.*

<details>
<summary>Codex</summary>

```bash
npx skills add patryk-penczek/ship-video -a codex -g
```
or copy `skills/ship-video` into `~/.agents/skills/`. Then ask for a video, or type `$ship-video`. Setup downloads Chromium and Python packages into `~/.ship-video`, so the first run needs network access and write access to that folder: approve it when Codex asks, or run `bash ~/.agents/skills/ship-video/scripts/setup.sh` yourself once.
</details>

<details>
<summary>Claude Code without the plugin system</summary>

```bash
git clone https://github.com/patryk-penczek/ship-video.git
cp -R ship-video/skills/ship-video ~/.claude/skills/
bash ~/.claude/skills/ship-video/scripts/setup.sh   # optional: Claude runs it on first use
```
</details>

## What happens

A film is a long guided session: a scenario to approve, then a build and a render of a few minutes. It works best with a strong model at high effort.

1. **Brief.** Claude reads your repo, then asks a few clickable questions (only what it can't find itself): goal and film type (launch, how-to, one-feature teaser, landing page), who watches and what they already know, where it will be posted, length, music.
2. **Discovery.** It opens every view of your app and finds the moments worth filming, then shows you a product map.
3. **Music.** It analyses your track's tempo, hits and drop (or the generated beat's) and writes a music map; with no music it works on a tempo grid.
4. **Scenario.** It writes a table of seconds, music, picture and exact copy. **Nothing is built until you approve it.**
5. **Replicas.** It captures your running app's real DOM and CSS (or rebuilds from source) and compares each screen with the real thing.
6. **Build.** It animates those screens on the beat.
7. **Review.** It critiques its own contact sheets and stills like a director (plus a fresh second opinion) and runs an automated audit.
8. **Render.** It renders a crisp 60 fps MP4, checks that every cut lands on its hit, and shows you the film. Then you say what to change, or ask for a motion-blur render (smoother, for music films) or an animated WebP for a README.

Already partway through? Claude picks up from the files in the film folder, and you can tell it to skip steps. After the render, tell it what to change; it edits and re-renders.

## Iterate: the first render is a first cut

Don't judge the skill by its first render. Films get good the way edits do: you watch, say what bothers you, and it changes that. Two to four rounds are normal, and the notes that work best are specific:

> The intro drags, start on the search. · The drop needs more punch. · Hold the end card longer. · Show the dark mode. · Make it 15 seconds.

It keeps the scenario and the music map, so each round re-renders in minutes, not from scratch.

## Limits

- 16:9, 1920×1080 only. No vertical (Reels, Shorts) output.
- Web UI. A mobile-first web app (PWA) captures fine; a native app has no DOM, so replicas are built from screenshots and match less exactly.
- Social feeds: 16:9 plays but is small on a phone, so text is sized up (56 px or more). Post the MP4: X and LinkedIn don't take the WebP.
- 10–45 s films. Very long tracks are cut to a section (or you confirm a long film and its render time).
- Output is MP4 and animated WebP, not GIF.
- macOS or Linux (Windows: WSL).

## Music

Pick one of four paths when Claude asks:

| path | what you do | good for |
|---|---|---|
| **Your track** | drop in an audio file | music you made or licensed |
| **Suno** | paste the style and structure Claude writes into [Suno](https://suno.com) (Advanced mode), download the best of 4–6 takes. Needs a Suno account, and a paid plan for public use | a track shaped to your film's bars |
| **Generated beat** | nothing | a free, license-free score from your film's own bar plan (`music.mjs synth`): a functional beat, not a song |
| **None** | nothing | drafts and silent films. Cuts snap to a tempo grid and the preview plays a metronome; add music later |

> [!IMPORTANT]
> **Suno licensing:** per Suno's terms at the time of writing, songs made on the **free plan can't be used commercially**, and upgrading later doesn't change that. Songs made while on a **paid plan** can. Check [Suno's terms](https://suno.com) before publishing. Claude asks where the film will be shown, and which plan you'll generate on, before you generate anything.

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
  - GIF inputs (animated emoji, loaders) become sprite sheets.
  - Camera shake comes from a hash of the frame number.
  - Audio-reactive effects read a precomputed envelope.

<details>
<summary>Repository layout</summary>

```
skills/ship-video/
├─ SKILL.md            the guided flow: steps, approval gates, limits, resume table
├─ references/         read on demand: film types, direction, shots, motion vocabulary, film API, replicas, lessons, music map, Suno prompt, synth, scenario template, subagents, QA checklist, render, sharing
├─ scripts/            render, stills, replica compare, audit, hit check, music analysis (all take --help)
└─ assets/starter/     the film template
evals/                 test prompts for the skill
```
</details>

## Compared to other tools

Closest alternatives: [HyperFrames](https://github.com/heygen-com/hyperframes), [Remotion](https://github.com/remotion-dev/remotion) and [OpenMontage](https://github.com/calesthio/OpenMontage). As we understand them (October 2026), they are general frameworks or production systems for video; this repo is one guided workflow for a single job: a film of your own app, with its real UI recreated and every cut tied to the music. It adds the workflow and the lessons around a small renderer. Check the other projects for what they do today.

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

[MIT](LICENSE). Films you make with it are yours. Music, fonts and assets you add keep their own licenses. The hero film's Inter and JetBrains Mono fonts are SIL OFL; GSAP is under its own license ([gsap.com/standard-license](https://gsap.com/standard-license)).

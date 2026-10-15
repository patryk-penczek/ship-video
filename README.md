<h1 align="center">ship-video</h1>

<p align="center">
  <b>Turn your app into a music-synced launch film, as code.</b><br>
  An agent skill for Claude Code and Codex.
</p>

<p align="center">
  <a href="#quick-start"><img src="docs/hero.webp" alt="Typing /ship-video: it asks how long and which music, hears the hits, then Plan, Build, Review, Render, and Iterate: a change typed in, the next version." width="820"></a>
</p>

<p align="center"><sub>Made with ship-video itself: one HTML page on a 120 BPM grid · <a href="docs/hero">source</a></sub></p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#iterate">Iterate</a> ·
  <a href="docs/guide.md">Guide</a> ·
  <a href="#troubleshooting">Troubleshooting</a>
</p>

<br>

- **Your real UI.** It captures your running app's screens and animates them, not mockups.
- **Cut to the beat.** It finds the hits in your track, or makes a beat, and lands every cut on one.
- **You approve the plan.** A shot-by-shot scenario comes before anything is built.
- **A frame-exact MP4.** 1080p60, plus an animated WebP for your README. No video editor.

<br>

## Quick start

In Claude Code:

```
/plugin marketplace add patryk-penczek/ship-video
/plugin install ship-video@ship-video
```

Then, in your app's repo:

```
/ship-video 20-second launch video, no music yet
```

The first run installs the engine into `~/.ship-video` (about 2 minutes, once). You approve a scenario, then get a first cut in the film folder's `out/`.

<details>
<summary>Codex</summary>

<br>

```bash
npx skills add patryk-penczek/ship-video -a codex -g
```

Or copy `skills/ship-video` into `~/.agents/skills/`. Then type `$ship-video 20-second launch video, no music yet`. Setup downloads Chromium and Python packages, so the first run needs network access and write access to `~/.ship-video`: approve it when Codex asks, or run `bash ~/.agents/skills/ship-video/scripts/setup.sh` once yourself.
</details>

<details>
<summary>Claude Code without the plugin system</summary>

<br>

```bash
git clone https://github.com/patryk-penczek/ship-video.git
cp -R ship-video/skills/ship-video ~/.claude/skills/
```
</details>

<br>

## Iterate

**The first render is a first cut.** Watch it, say what bothers you, and it changes that and renders again in minutes. Two to four rounds are normal; specific notes work best:

> Start on the search. · The drop needs more punch. · Show the dark mode too. · Make it 15 seconds.

<br>

## Good to know

- **Music:** your own track, a [Suno](https://suno.com) prompt it writes for you, a generated beat, or none. Songs made on Suno's free plan can't be used commercially.
- **Limits:** 16:9 at 1080p, 10–45 s, web apps (a native app only from screenshots), macOS or Linux.
- **Needs:** Node 20+, ffmpeg and Python 3; setup installs the rest.

Every step, the music paths, requirements and how the renderer works: **[the guide](docs/guide.md)**.

<br>

## Troubleshooting

<details>
<summary>The agent doesn't use the skill</summary>

<br>

Start a new session after installing (or reload plugins), then ask for a video, trailer or launch film of your app, or type `/ship-video` (Codex: `$ship-video`). It does not trigger for editing existing footage.
</details>

<details>
<summary>Setup fails installing librosa</summary>

<br>

Your Python may be too new for librosa's dependencies. Install [uv](https://docs.astral.sh/uv/) (`brew install uv`) and run `scripts/setup.sh --force` from the skill folder; uv uses Python 3.12.
</details>

<details>
<summary>The render uses the wrong font</summary>

<br>

Every font face must be listed in `fonts:` in `film.js` and declared with `@font-face` in `film.css`. Some bundlers ship broken `@font-face` rules: point at the font files directly.
</details>

<br>

## License

[MIT](LICENSE). Films you make are yours; music, fonts and assets you add keep their own licenses. The hero uses Inter and JetBrains Mono (SIL OFL) and [GSAP](https://gsap.com/standard-license).

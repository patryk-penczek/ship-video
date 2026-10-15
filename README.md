# ship-video

A Claude Code skill that makes short, music-synced product videos for your app: a launch film, a feature teaser, a how-to clip. No video editor, no After Effects. Claude writes the film as one HTML page (GSAP timeline), and a small engine renders it frame-exact to MP4 with Playwright and ffmpeg, with every cut on a beat.

What you get is the **workflow**: brief → music → beat analysis → a scenario you approve → replicas of your real UI → review stills → QA → render. The skill walks you through it and stops for your approval at the steps where changes get expensive.

## Install

**As a plugin** (in Claude Code):
```
/plugin marketplace add patryk-penczek/ship-video
/plugin install ship-video@ship-video
```

**Or as a personal skill:**
```bash
git clone https://github.com/patryk-penczek/ship-video.git
cp -R ship-video/skills/ship-video ~/.claude/skills/
```

Then install the engine's dependencies once (they go to `~/.ship-video`):
```bash
bash ~/.claude/skills/ship-video/engine/setup.sh          # or ask Claude: "set up ship-video"
bash ~/.claude/skills/ship-video/engine/setup.sh --demucs # optional stem separation (PyTorch, several GB)
```

### Requirements
- macOS or Linux, **Node 20+**, **ffmpeg**, **Python 3** (or [uv](https://docs.astral.sh/uv/), recommended).
- `setup.sh` installs Playwright + Chromium, GSAP, fonts, and a Python venv with librosa.
- demucs is optional; librosa alone finds tempo, beats and hits.

## Quick start

In your app's repo, ask Claude Code:

> Make a 30-second launch video for this app with ship-video.

Claude asks for a short brief, sets up a film folder, and takes it from there. To see the engine work first, ask for the sample film:

> Use ship-video to create the sample film in ./film and render it.

Learn it in about 30 minutes: [TUTORIAL.md](TUTORIAL.md) *(coming soon)*.

## Music: three paths

1. **Your own track**: drop in a file you have the rights to. Claude analyses tempo, hits, breaks and drops, and cuts to them.
2. **Suno**: Claude writes the Suno style line and a bracketed song structure whose sections land on the film's bars. You generate a few takes, pick one, and Claude re-times the film to the real hits.
3. **No music**: cuts snap to a fixed tempo grid (default 120 BPM), and the preview plays a metronome. Add music later and re-time.

### Suno licensing
Songs made on Suno's **free plan can't be used commercially**. Songs made while on a **paid plan (Pro/Premier) can**. Check [Suno's current terms](https://suno.com) before you publish anything.

## How it works

- **One HTML page per film.** A paused GSAP timeline holds every tween at absolute seconds.
- **Preview:** open `index.html`. The track drives the timeline. Use Space to play, the arrows to scrub, Alt+arrows to jump one beat and Shift+arrows to step one frame.
- **Render:** `?render=1` exposes `window.__seek(t)`. The renderer steps `t = i / fps`, screenshots each frame and pipes it to ffmpeg with the track.
  - `crisp`: 60 fps.
  - `motionblur`: 240 fps blended 4:1 (`tmix`).
- **Deterministic:** everything is a pure function of `t`.
  - There are no timers or CSS animations.
  - GIFs become sprite sheets.
  - Shake comes from a hash of the frame number.
  - Audio-reactive values come from a precomputed 60 fps envelope.

```
skills/ship-video/
├─ SKILL.md            the guided flow
├─ reference/          lessons learned, scenario template, Suno prompt template, QA checklist
└─ engine/
   ├─ render.mjs shots.mjs sheet.mjs audit.mjs hits.mjs snap.mjs new-film.mjs setup.sh
   ├─ audio/           analyze.py envelope.py stems.py plot.py grid.mjs
   └─ starter/         index.html engine.js base.css film.css ui.js film.js
```

## Compared to HyperFrames

[HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen) does the same HTML → frame-exact video rendering, and could replace this repo's engine. The point of this repo is the workflow and the lessons around the renderer, not the renderer itself.

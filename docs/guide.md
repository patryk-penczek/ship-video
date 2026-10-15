# ship-video guide

Everything the [README](../README.md) leaves out: the steps of a film, music, requirements and how the renderer works.

- [What happens, step by step](#what-happens-step-by-step)
- [Music](#music)
- [Limits](#limits)
- [Requirements](#requirements)
- [How it works](#how-it-works)

## What happens, step by step

A film is one guided session. It works best with a strong model at high effort.

1. **Brief.** The agent reads your repo, then asks only what it can't find itself: who watches and where, the film type (launch, one-feature teaser, how-to, landing page), length, music.
2. **Discovery.** It opens every view of your app, finds the moments worth filming and shows you a short product map.
3. **Music.** It finds your track's tempo, hits and drop and writes a music map; with no music it works on a tempo grid.
4. **Scenario.** A table of seconds, music, picture and exact copy. **Nothing is built until you approve it.**
5. **Replicas.** It captures your running app's real DOM and CSS (or rebuilds from source) and compares each screen with the real thing.
6. **Build.** It animates those screens on the beat.
7. **Review.** It critiques its own frames like a director, gets a fresh second opinion and runs an automated audit.
8. **Render.** A crisp 60 fps MP4, with a check that every cut lands on its hit. Then you watch and say what to change, or ask for a motion-blur render or an animated WebP.

Stopped halfway? It picks up from the files in the film folder. You can also tell it to skip steps ("I have a scenario", "no music").

## Music

| path | what you do | good for |
|---|---|---|
| **Your track** | drop in an audio file | music you made or licensed |
| **Suno** | paste the style and structure the agent writes into [Suno](https://suno.com) (Advanced mode), download the best of 4–6 takes | a track shaped to your film's bars |
| **Generated beat** | nothing | a free, license-free score built from the film's own bar plan: a functional beat, not a song |
| **None** | nothing | drafts and silent films; cuts sit on a tempo grid, music can be added later |

> [!IMPORTANT]
> **Suno licensing:** per Suno's terms at the time of writing, songs made on the **free plan can't be used commercially**, and upgrading later doesn't change that. Songs made while on a **paid plan** can. Check [Suno's terms](https://suno.com) before publishing. The agent asks where the film will be shown before you generate anything.

## Limits

- 16:9 at 1920×1080 only; no vertical (Reels, Shorts).
- Web UI. A phone-first web app (PWA) captures fine; a native app has no DOM, so its screens are rebuilt from screenshots and match less exactly.
- 10–45 s films. Long tracks are cut to a section.
- Social feeds: 16:9 is small on a phone, so text is sized up. Post the MP4; X and LinkedIn don't take WebP.
- Output is MP4 and animated WebP, not GIF.

## Requirements

macOS or Linux (Windows: WSL) with **Node 20+**, **ffmpeg** and **Python 3** ([uv](https://docs.astral.sh/uv/) recommended). The setup script installs the rest into `~/.ship-video`, so it survives skill updates, and skips anything already there:

| installed | used for |
|---|---|
| Playwright + Chromium | rendering every frame of the film page |
| GSAP, Inter, JetBrains Mono | the film's timeline and default fonts |
| Python venv with librosa | tempo, beats, hits, the audio envelope |
| demucs *(optional, `--demucs`)* | stem separation; pulls in PyTorch, several GB |

## How it works

- **One HTML page per film.** A paused GSAP timeline holds every tween at absolute seconds.
- **Preview in the browser.** Space plays, the arrows scrub, Alt+arrows jump a beat, Shift+arrows step a frame.
- **Frame-exact render.** The page exposes `window.__seek(t)`; Playwright seeks to every frame, screenshots it and pipes it into ffmpeg with the music. Motion blur renders at 240 fps and blends 4:1 down to 60.
- **Deterministic.** Everything on screen is a pure function of time: no timers, no CSS animations, shake from a hash of the frame number, audio-reactive effects from a precomputed envelope.

**Compared to other tools.** [Remotion](https://github.com/remotion-dev/remotion), [HyperFrames](https://github.com/heygen-com/hyperframes) and [OpenMontage](https://github.com/calesthio/OpenMontage) are general frameworks or production systems for video. ship-video is one guided workflow for one job: a film of your own app, its real UI recreated, every cut tied to the music.

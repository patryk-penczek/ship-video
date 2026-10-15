<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/logo-dark.png">
  <img src="docs/readme/logo-light.png" alt="/ship-video">
</picture>

### Turn your app into a music-synced launch film, as code.

An agent skill for **Claude Code** and **Codex**. It captures your real UI, cuts it to the beat and renders a frame-exact 1080p60 MP4. No video editor, no After Effects.

[![Claude Code skill](https://img.shields.io/badge/Claude_Code-skill-D97757?style=flat-square)](https://code.claude.com/docs/en/skills)
[![Codex skill](https://img.shields.io/badge/Codex-skill-10A37F?style=flat-square)](#install-in-codex)
![1080p60 MP4 and WebP](https://img.shields.io/badge/output-1080p60_MP4_%2B_WebP-ff6a3d?style=flat-square)
[![MIT license](https://img.shields.io/badge/license-MIT-6c8cff?style=flat-square)](LICENSE)

[![Typing /ship-video: it asks how long and which music, hears the hits, then Plan, Build, Review, Render, and Iterate: a change typed in, the next version.](docs/hero.webp)](#-quick-start)

<sub>This film was made with ship-video itself: one HTML page on a 120 BPM grid. [View the source](docs/hero).</sub>

## 📖 Contents

- [✨ What you get](#-what-you-get)
- [🚀 Quick start](#-quick-start)
- [🎬 How it works](#-how-it-works)
- [🔁 Iterate](#-iterate)
- [🎞️ What you can make](#️-what-you-can-make)
- [🎵 Music](#-music)
- [📏 Limits](#-limits)
- [❓ FAQ](#-faq)
- [🩺 Troubleshooting](#-troubleshooting)
- [⭐ Like it?](#-like-it)
- [🤝 Contributing](#-contributing)

## ✨ What you get

| | |
|---|---|
| ![The repo's files scroll past a reading lens; what it found is listed beside them](docs/readme/reads.webp) | ![A timeline: shots above, music below, every shot boundary on a hit](docs/readme/beat.webp) |
| **🔍 Reads your app first.** It reads your repo and opens every view of your running app, then asks only what it can't find: who it's for, how long, which music. | **🥁 Cut to the beat.** It finds the tempo, hits and drop of your track, or writes a beat for you, and lands every cut on one. The payoff hits on the drop. |
| ![An approved scenario scrolling like a document](docs/readme/plan.webp) | ![A film strip of app frames, 1920×1080 at 60 fps](docs/readme/real.webp) |
| **📋 You approve the plan first.** A shot-by-shot scenario (seconds, music, picture, exact copy) comes before anything is built. Changing a table costs minutes; a film costs hours. | **🎯 Your real UI, frame-exact.** Your app's own DOM and CSS, captured and animated, never mockups. Rendered frame by frame to a 1080p60 MP4, plus a WebP for READMEs. |

## 🚀 Quick start

**1. Install** in Claude Code:

```
/plugin marketplace add patryk-penczek/ship-video
/plugin install ship-video@ship-video
```

**2. Run it** in your app's repo:

```
/ship-video
```

**3. Answer, approve, watch.** It asks what it can't find in your code, shows you a scenario to approve, then renders a first cut into the film folder's `out/`.

> [!NOTE]
> The first run installs the engine into `~/.ship-video` (Chromium, GSAP, a Python audio toolkit; about 2 minutes, once). You need **Node 20+**, **ffmpeg** and **Python 3** on macOS or Linux.

### Install in Codex

```bash
npx skills add patryk-penczek/ship-video -a codex -g
```

Or copy `skills/ship-video` into `~/.agents/skills/`. Then type `$ship-video`.

> [!WARNING]
> Codex's sandbox blocks network access and writes outside your project by default, and the first-run setup needs both. Approve it when Codex asks, or run `bash ~/.agents/skills/ship-video/scripts/setup.sh` once yourself.

### Install in Claude Code without the plugin system

```bash
git clone https://github.com/patryk-penczek/ship-video.git
cp -R ship-video/skills/ship-video ~/.claude/skills/
```

## 🎬 How it works

```mermaid
flowchart LR
    A["💬 Brief<br/><small>a few questions</small>"] --> B["🔍 Discovery<br/><small>every view of your app</small>"]
    B --> C["🎵 Music<br/><small>tempo, hits, drop</small>"]
    C --> D{"📋 Scenario<br/><small>you approve</small>"}
    D --> E["🧩 Replicas<br/><small>your real DOM + CSS</small>"]
    E --> F["🛠️ Build<br/><small>animated on the beat</small>"]
    F --> G["👀 Review<br/><small>critique + audit</small>"]
    G --> H["🎞️ Render<br/><small>you watch</small>"]
    H -. "your notes" .-> F
```

Everything on screen is code: one HTML page, one paused GSAP timeline, rendered frame by frame with Playwright and ffmpeg, so the MP4 matches the preview exactly. Stopped halfway? It picks up from the files in the film folder.

**Every step in detail: [the guide](docs/guide.md).**

## 🔁 Iterate

> [!TIP]
> **The first render is a first cut.** Films get good the way edits do: you watch, say what bothers you, and it changes that and renders again in minutes. Two to four rounds are normal.

![A film plays; a note is typed; it re-renders and plays again with the change: brand colors, opening on the search, a click on Export, a 15-second cut](docs/readme/iterate.webp)

Specific notes work best:

- *Start on the search.*
- *The drop needs more punch.*
- *Show the dark mode too.*
- *Hold the end card longer.*
- *Make it 15 seconds.*

## 🎞️ What you can make

| | film | length | for |
|:---:|---|:---:|---|
| 🚀 | **Launch film** | 20–45 s | a launch post, Product Hunt, your landing page |
| 🎯 | **Feature teaser** | 10–20 s | one feature or a pricing change, for X or LinkedIn |
| 🧭 | **How-to** | 20–45 s | a help center or docs page: numbered steps, readable holds |
| 🖥️ | **Landing hero** | 10–20 s | a muted, looping clip at the top of your site |
| 📄 | **README clip** | 10–20 s | an animated WebP like the one above |

> [!TIP]
> Shorter usually wins. A clear 12-second clip of the one thing your product changes beats a 30-second tour, and the skill tells you when your material would fit a shorter film.

## 🎵 Music

| | path | what you do |
|:---:|---|---|
| 🎧 | **Your track** | point it at an audio file you made or licensed |
| 🤖 | **Suno** | paste the prompt it writes into [Suno](https://suno.com), download the best take |
| 🥁 | **Generated beat** | nothing: it writes a license-free beat from the film's own plan |
| 🔇 | **None** | nothing: cuts sit on a tempo grid, add music later |

> [!IMPORTANT]
> **Suno licensing:** songs made on Suno's **free plan can't be used commercially**, and upgrading later doesn't change that. Generate on a paid plan for anything public, and check [Suno's terms](https://suno.com). The skill asks where the film will be shown before you generate anything.

## 📏 Limits

| | |
|---|---|
| **Format** | 16:9 at 1920×1080. No vertical (Reels, Shorts). |
| **Length** | 10–45 s. Longer tracks are cut to a section. |
| **Apps** | Web apps and sites, phone-sized PWAs included. A native app only from screenshots. |
| **System** | macOS or Linux (Windows: WSL). Node 20+, ffmpeg, Python 3. |

## ❓ FAQ

<details>
<summary><b>Does my app have to be running?</b></summary>

It's best if it is: the skill captures the real DOM and CSS of each screen, so the film looks exactly like your app. Without a running app it rebuilds screens from your components and says which ones are approximated.

</details>

<details>
<summary><b>How long does a render take?</b></summary>

A crisp render takes about 2–3.5 seconds per second of film on an idle machine, so a 20 s film is about a minute. Motion blur is 3–4× slower and is offered after you've seen the crisp cut.

</details>

<details>
<summary><b>Can I edit the film myself?</b></summary>

Yes. A film is a folder with `index.html`, `film.js` and `film.css`. Open `index.html` to preview it (Space plays, the arrows scrub, Shift+arrow steps a frame), change anything, and render again.

</details>

<details>
<summary><b>Does anything leave my machine?</b></summary>

No. Capture, analysis and rendering run locally; setup downloads its dependencies once. Only the agent you're using sees your code, as it always does.

</details>

<details>
<summary><b>Is it free?</b></summary>

The skill is MIT and everything it installs is free. You pay only for the agent you run it in, and for Suno if you want a Suno track for public use.

</details>

## 🩺 Troubleshooting

<details>
<summary><b>The agent doesn't use the skill</b></summary>

Start a new session after installing (or reload plugins), then type `/ship-video` (Codex: `$ship-video`). It does not trigger for editing existing footage.

</details>

<details>
<summary><b>Setup fails installing librosa</b></summary>

Your Python may be too new for librosa's dependencies. Install [uv](https://docs.astral.sh/uv/) (`brew install uv`) and run `scripts/setup.sh --force` from the skill folder; uv uses Python 3.12.

</details>

<details>
<summary><b>The render uses the wrong font</b></summary>

Every font face must be listed in `fonts:` in `film.js` and declared with `@font-face` in `film.css`. Some bundlers ship broken `@font-face` rules: point at the font files directly.

</details>

## ⭐ Like it?

If ship-video made you a film you like, **star the repo**: it's the simplest way to help other people find it. And show us the film: [open a discussion or an issue](https://github.com/patryk-penczek/ship-video/issues/new/choose) with a link.

## 🤝 Contributing

The most useful contributions come from making a real film with it. [Open an issue](https://github.com/patryk-penczek/ship-video/issues/new/choose) with what you asked for and where it went wrong, or read [CONTRIBUTING.md](CONTRIBUTING.md) to change the code.

---

[Guide](docs/guide.md) · [Contributing](CONTRIBUTING.md) · [MIT License](LICENSE)

Films you make are yours; music, fonts and assets you add keep their own licenses. The hero uses Inter and JetBrains Mono (SIL OFL) and [GSAP](https://gsap.com/standard-license).


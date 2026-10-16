# Music: analysis, MUSIC.md, silent grid, generated beat, rights

Read at step 3. Suno prompts are in `suno-prompt.md`.

## Contents
- Reading the analysis
- Writing MUSIC.md
- Fitting the track to the film
- No music (grid)
- Generated beat
- Re-timing to a new take
- Rights

## Reading the analysis

```
node $S/music.mjs analyze <film>/track.<ext> --json <film>/music.json
node $S/music.mjs envelope <film>/track.<ext> <film>/env.js
node $S/music.mjs plot <film>/track.<ext> <film>/review/music.png
```

| line | use | trust |
|---|---|---|
| `tempo`, `bar`, `bars:` | most cuts land on bar starts | high on steady tracks |
| `hits:` (`*` = strong) | scene cuts | candidates: a weak one can be a hi-hat, a real cut point can be unstarred |
| `cuts:` | strong hits on bar lines plus the last hit | a good first draft |
| `kicks:` | small moves inside a shot: presses, typing, pops | dense in busy sections |
| `gaps:`, `drop:`, `sections:` | the break, the drop, intro / groove / build / outro | a guess: confirm on the plot |
| `audible end` | where the sound really stops | high |

**Read the plot and confirm the drop yourself.** Bright vertical stripes in the low band are hits; a dark gap or a rising riser followed by a bright wall is a break into the drop. The loudest hit is not always the drop: a quiet intro often opens with its loudest stab, while the drop is the first full-band wall after the build. The drop carries the payoff, so getting it wrong moves the climax.

## Writing MUSIC.md

One row per musical event, seconds to 2 decimals. First line: `# Track: <file> · Duration: <s> s`, or `GRID DRAFT` (a Suno track is pending), or `SILENT, <bpm> BPM, duration <s> s`.

```
# Track: track.mp3 · Duration: 33.0 s
| t (s) | music | role in the story |
|---|---|---|
| 0.00–1.92 | intro pad, swell | problem |
| 1.92 | hit* | hero enters |
| 5.76 | hit* | action starts |
| 17.28–21.12 | break, snare roll | the last step before the result |
| 21.12 | drop* | payoff |
| 30.72 | final hit | end card |
```
The **role** column ties each section to the story, so the climax lands on the drop; a section with no role is one the film has no use for (cut it, or give it one). If a strong hit is 0.05–0.1 s off a bar line, use the detected time: that's where the sound is.

Cuts land on the hits; the screen itself does not move to them. In `film.js`, `hits` (`[t, shake px]`, camera shake) holds only the film's one breaking moment, usually the drop under the payoff (8–12 px), a second at most for a real "it broke" beat; a calm track or a how-to gets `[]`. Shaking or pulsing the whole frame on every hit fights the UI motion and makes a calm track feel frantic. `pulse` (the whole frame breathing with the bass) stays off unless the user asks for it.

## Fitting the track to the film

- **Longer than the film needs:** cut a section on bar lines that keeps the build, the drop and the final hit, and fade over the last bar:
  `ffmpeg -ss <start> -to <end> -i track.mp3 -af "afade=t=out:st=<end-start-bar>:d=<bar>" track-cut.mp3`, then re-analyse. Never trim mid-phrase.
- **Over ~60 s with no length chosen:** propose a 15–30 s cut.
- **Fades out early or a Suno take runs long:** end at the audible end plus a short fade; never on dead air.

## No music (grid)

`node $S/music.mjs grid --bpm <bpm> --duration <s>` prints bar and beat times (`--out <film>/env.js` writes `window.ENV = null;`). Pick a BPM whose beat is a whole number of frames and whose whole bars fill the film: 120 (0.5 s beat), 144, 90, 72. In code compute `t = n * 60 / bpm` rather than copying the rounded printout. MUSIC.md is then the bar grid with a role per bar (`direction.md`, *Silent films*).

While a Suno track is pending, the same grid with `GRID DRAFT` lets the scenario be written; when the take arrives, analyse it and re-time (below).

## Generated beat

`node $S/music.mjs synth --plan <film>/beat.json --out <film>/track.wav` writes a deterministic score (drums, bass, pad, motif, riser into the drop, an impact on each hit, a resolved ending) in seconds. No samples, no licence questions: the file is the user's. It is a functional score, not a song: say so, and offer Suno for a richer final.

```json
{
  "bpm": 120, "duration": 20, "preset": "pulse",
  "sections": [
    {"from_bar": 0, "to_bar": 1, "role": "intro"},
    {"from_bar": 1, "to_bar": 6, "role": "groove"},
    {"from_bar": 6, "to_bar": 7, "role": "build"},
    {"from_bar": 7, "to_bar": 9, "role": "drop"},
    {"from_bar": 9, "to_bar": 10, "role": "outro"}
  ],
  "hits": ["bar:3", 9.0]
}
```
Write it from the planned acts: problem → `intro`, action → `groove`, the step before the payoff → `build`, payoff → `drop`, end card → `outro`; give other cuts that need an accent a `hits` entry. Bars are 0-based, `to_bar` exclusive. Presets: `pulse` (bright electro, 120–128), `punchy` (halftime hip-hop, 90–105), `calm` (lo-fi, 80–100), `cinematic` (drums and strings, 80–100). `end`: `ring` (default), `stinger`, `fade`. Omit `sections` for an automatic arc (drop at ~62%). A hit is seconds, `"bar:N"`, or `{"bar": N, "beat": B, "strength": 0.9}`; below ~0.8 strength it may not show as strong in `analyze`. Optional `key` (`Am`, `F major`), section `energy` 0–1, `gapBeforeDrop` (default true: a short gap after a riser). The final chord needs ~1.5 s to ring, so a plan that leaves less moves the end hit back whole bars (a `warn:` says so); a bad plan prints one `bad plan:` line. Synth writes `<out>.plan.json`, which `analyze` reads so the drop and hits come out exact; write MUSIC.md from the analysis as usual.

## Re-timing to a new take

Re-run `analyze`, compare old and new MUSIC.md row by row, shift each scene and its tweens by the difference. A constant per act (`const A2 = 9.60;`, tweens at `A2 + 0.36`) makes this a one-line change. If an act moves by more than a bar, show the user the new timing before building on it.

## Rights

Where the film will be shown decides, not which licence the track has. The Brief's place question usually answers it; ask only what it leaves open, inside the opening or the source question, never as a round of its own:
- *Just me / a draft*: no check; the track stays local.
- *Public or for a client*: publishable are a generated beat, an own or licensed file, a free library track (CC0, or CC BY with a credit line) and Suno from a paid plan; anything else is not. For Suno the plan **at generation time** decides: songs made on the free plan stay non-commercial even after upgrading, so settle it before they generate; a company film needs the company's paid account, so say so in the option. Keep the clip ID and date. AI music can draw automated claims on YouTube and Meta; say so once.
- *Not decided*: treat as a draft; it is asked again with the delivery question (`render.md`, *Deliver*).

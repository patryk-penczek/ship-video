# Generated beat (step 2, option D)

`node $S/music.mjs synth --plan <film>/beat.json --out <film>/track.wav` writes a synthesized score from a bar plan: drums, sub bass, pad, plucked motif, a riser into the drop, an impact on every hit, a clean ending. No samples, no model, no license: the file is yours, free to publish, and the same plan and seed always give the same bytes. It is a functional score (a groove that hits where the film needs it), not a song. Say so, and offer Suno for a richer final.

`--out` takes `.wav` (16-bit), `.mp3`, `.m4a`, `.flac`. Also `--sr 44100|48000` (default 44100), `--seed N`, `--preset NAME`, `--lufs -14`. Output is normalized to about -14 LUFS with a true-peak ceiling of -1.5 dB (no clipping). It prints the drop, riser, gap, hits and end times it planned. Takes 2–5 s.

## beat.json

```json
{
  "bpm": 120, "duration": 20,
  "preset": "pulse", "key": "Am",
  "sections": [
    {"from_bar": 0, "to_bar": 1, "role": "intro",  "energy": 0.3},
    {"from_bar": 1, "to_bar": 4, "role": "groove", "energy": 0.7},
    {"from_bar": 4, "to_bar": 6, "role": "build",  "energy": 0.8},
    {"from_bar": 6, "to_bar": 9, "role": "drop",   "energy": 1},
    {"from_bar": 9, "to_bar": 10, "role": "outro", "energy": 0.4}
  ],
  "hits": ["bar:3", 9.0, {"bar": 5, "beat": 2, "strength": 1}],
  "silenceBeforeDrop": true,
  "end": "ring"
}
```

| field | meaning |
|---|---|
| `bpm` | 40–220; pick one whose whole bars fill the length (120 BPM = 2 s bars, 100 BPM = 2.4 s) |
| `duration` or `bars` | film length in seconds, or a bar count (`duration` wins) |
| `preset` (alias `style`, `mood`) | `pulse` (default), `punchy`, `calm`, `cinematic` |
| `key` | `Am`, `F# minor`, `C`, `Bb major`; optional, each preset has its own. `mode`: `minor` / `major` |
| `sections` | bars are **0-based**, `from_bar` inclusive, `to_bar` exclusive (bar 0 starts at 0 s). Roles: `intro`, `build`, `break`, `drop`, `groove`, `outro`. `energy` 0–1 (default per role). Bars not covered continue the previous role. Omitted: an automatic arc (intro, groove, a 2-bar build, drop at about 62 %, outro) |
| `hits` | extra impacts: a number = seconds, `"bar:N"` = the start of bar N (can be fractional), or `{"bar":N,"beat":B}` / `{"t":S}` with optional `strength` 0–1 (default 0.9; below ~0.8 may not be flagged strong by the analysis). A short dip just before each hit makes it stand out of a busy groove |
| `silenceBeforeDrop` | default true: a quarter bar (max 0.6 s) of near silence before each drop (not at 0 s), so the drop lands from nothing. Each drop gets a riser (about 2 s) before the gap and a full impact |
| `end` | `ring` (default): everything stops on the last bar, one impact and a chord ringing out; `stinger`: same with a short chord and quick decay; `fade`: groove continues and fades out over the last 1.5 bars. For ring and stinger the last bar's start is the final hit |

## Presets

| preset | sound | default key | try BPM |
|---|---|---|---|
| `pulse` | bright electro: four on the floor, offbeat sub, clap on 2 and 4, 16th saw arp | A minor | 120–128 |
| `punchy` | halftime hip-hop: 808 glide bass, snare on beat 3, swung hats, bell pluck | G minor | 90–105 |
| `calm` | soft lo-fi: gentle kick, rim, brushed hats, electric-piano arp over a warm pad, 7th chords | F major | 80–100 |
| `cinematic` | taiko and strings: low drums, long pad swells, 8th-note bass ostinato, big impacts, sparse bells | D minor | 80–100 |

## From the scenario to beat.json

Write it from the planned acts: one section per act (problem: `intro`; promise and action: `groove`; the last step before the payoff: `build`; payoff: `drop`; end card: `outro`). The drop is where `SCENARIO.md` puts the climax; give each other cut that needs an accent a `hits` entry. Then run `synth`, and step 3 analyzes the file like any track (`analyze`, `plot`, `envelope`): confirm the `drop:` and `hits:` it prints match the plan (within a frame or two: the analysis times are quantized to about 12 ms), and write `MUSIC.md` from the analysis as usual. Place the scenario's images to the beat's structure (the drop, riser and hits it printed), not the other way round. Be honest with the user that this is a functional score ("swap in Suno later": the film re-times, `music-map.md`); **Suno stays the recommended path for a final film**, because a real song gives the best result. To change timing, edit `beat.json` and rerun; the film's cuts follow `MUSIC.md`.

## Notes (validation, sidecar, ending)

- A bad plan gives one line, `bad plan: ...`, never a traceback. `energy` and hit `strength` are clamped to 0..1, `--lufs` must be -30..-6, `--seed` any whole number, `from_bar`/`to_bar` whole bars, the output extension is checked before synthesis. Sections or hits past the end of the film print a `warn:` and are ignored.
- The last chord rings at least 1.5 s inside the film and resolves on the tonic. If the plan leaves less (a 25 s film at 2.4 s bars), the end hit moves back whole bars and a `warn:` says so; later sections are cut. Hits within a beat of the end hit, or in the ring-out, are dropped with a warning; off-grid hits in the outro snap to the beat. The file closes with a 0.3 s fade.
- Explicit hits scale with `strength` and stay below the drop impact. The intro always pulses (soft kick). `calm` has 4-bar phrases, an 8-bar chord cycle and upper bells; `punchy` changes chords and opens the filter at the drop.
- `synth` also writes `<out>.plan.json` (bpm, bars, sections, drops, risers, gaps, hits, end). `analyze` and `plot` read it when it sits next to the track (and the duration matches): tempo, grid, drop, riser, sections and strong hits then come from the plan, exact. `analyze --no-plan` ignores it, `--plan FILE` names one. Keep it next to `track.wav`; a real track has none and is analyzed from the audio as before.

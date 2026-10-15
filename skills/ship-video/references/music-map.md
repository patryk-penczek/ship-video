# Reading the analysis → MUSIC.md

Read this in step 3, after `node $S/music.mjs analyze`. `$S` = `${CLAUDE_SKILL_DIR}/scripts`.

## What each line means

| line | use it for | trust |
|---|---|---|
| `tempo`, `bar` | bar length; most cuts land on bar starts | high for steady tracks |
| `bars:` | bar start times, up to the audible end (downbeat picked from where the hits are) | check against the plot: bold lines should sit on the big hits |
| `audible end` | where the sound really stops | high. A film that matches the file's full length can end on dead air: end at the audible end plus a short fade |
| `hits:` | big moments: scene cuts, flashes, shakes. `*` = strong | `*` are candidates, not orders. Weak ones can be hi-hat accents, and real cut points are sometimes unstarred |
| `cuts:` | suggested cut times: strong hits on bar lines plus the last hit | a good first draft; confirm with the energy table |
| `kicks:` | small moves inside a scene: presses, pops, captions | medium; dense in busy sections |
| `gaps:` | breaks before a drop; silence or near-silence | high when present. A break can also be a riser with no gap |
| `sections:`, `drop:` | the analysis's guess at intro / groove / build / drop / outro and which hit is the drop (when your version prints them) | a guess: confirm on the plot |
| energy table, section lifts | sections: where the groove starts, the drop, the outro | high; `rms` and `sub` columns rise at the drop |

**The loudest hit is not always the drop.** A track with a quiet intro often has its loudest stab right at the start (the intro hit); the drop is the first full-band wall after the riser or break, usually later and not always the loudest. Don't put the climax on the intro stab. The drop is where the story's payoff goes. If `sections:`/`drop:` and the plot disagree, trust the plot and say which hit you picked.

To see what plays when (kick, bass, hi-hat, riser, melody), read the spectrogram plot: the low band shows kicks and bass, the high band hats and risers, and a dark gap before a bright wall is a break into a drop. With stems (`music.mjs stems`, needs `--demucs`) you can see each instrument's onsets alone; without them the plot and the `kicks:` list are enough. Use kick onsets for typing and counters (`motion-vocabulary.md`), hits for cuts.

Detection is a starting point. Open the plot (`music.mjs plot`, then Read the PNG): bright vertical stripes in the low band are hits; a bright wall after a dark gap or a rising riser is a break, then a drop.

## Writing MUSIC.md

One row per musical event, in seconds, 2 decimals (terms *hit*, *kick*, *cut*: SKILL.md). The first line is the header: `# Track: <file> · Duration: <s> s`, or `GRID DRAFT` (a Suno track is pending), or `SILENT, <bpm> BPM, duration <s> s` (no music: see *No music* below). This table is an example from one track; your numbers will differ.

```
# Track: track.mp3 · Duration: 34.0 s
| t (s) | music | use | role in the story |
|---|---|---|---|
| 0.00–2.02 | intro pad, swell | opening line types itself | problem |
| 2.02 | hit* | first cut, flash | hero enters |
| 2.02–6.01 | motif, kick every beat | word per beat | promise |
| 6.01 | hit* | cut to the app | action starts |
| 9.98 | hit*, groove starts | … | action: step 2 |
| 18.00–21.99 | break, snare roll | build tension, push in | the last step before the result |
| 21.99 | drop* | the big moment | payoff = climax |
| 32.02 | final hit | end card | resolution |
```
The **role in the story** column is mandatory: it ties each musical section to a beat of the story in `scenario-template.md` (problem → hero → action → payoff). **The climax lands on the drop.** If the drop is early, move the payoff there and put the tour before it; if the track has no drop, use the strongest hit after the build. Fill the roles provisionally here, by position (problem first, payoff on the drop); the scenario may adjust them. A section with no role is a section the film has no use for: cut it or give it a role.

Then sanity-check: the strong hits usually sit on bar starts; if one is 0.05–0.1 s off a bar line, prefer the detected hit time (that's where the sound is). Cuts between two hits (a word every 0.5 s) are then the hit time plus n × the beat, not the printed grid time, which can be 0.04 s early.

Copy the cut times into `hits` in `film.js` as `[t, shakePx]` (strong hit 10–14 px, kick 3–6). The starter's sample `hits` are placeholders: replace them.

## No music (grid)

`node $S/music.mjs grid --bpm <bpm> --duration <seconds>` prints bar and beat times. It writes nothing unless you pass `--out` (`--out <film>/env.js` writes `window.ENV = null;`, add `--pulse` for a synthetic beat pulse). Write MUSIC.md from the times: bar starts for cuts, beats for moves.
- **Silent film:** first line `SILENT, <bpm> BPM, duration <s> s`, then the bar grid and a role per bar (the resume table treats any MUSIC.md as the music step done). Leave `env.js` as `window.ENV = null;`; no pulses, no shakes (`direction.md`, *Silent films*). Fill the same **role in the story** column on the bar grid: problem on bars 1, action across the middle bars, payoff on the strongest bar (about 60–75% in), end card on the last.
- **Suno pending:** first line `GRID DRAFT`; the grid is a stand-in. Pass `--out <film>/env.js --pulse` only if you want a beat-reactive preview, and expect to regenerate `env.js` from the real track.
- When the track arrives, run the analysis, replace `GRID DRAFT` with the track name, and move each cut to the nearest real hit.

## Generated beat

A beat made with `music.mjs synth` (`synth.md`) is analyzed like any track, but you know what is in it: the drop, riser, gap and hits it prints are its plan, and `analyze` should show the same times within a frame or two (its times are quantized to about 12 ms; a weak planned hit may show unstarred). If the `drop:` line disagrees with the plan, trust the plan, then fix `beat.json` (a hit with `strength` under 0.8 inside a loud groove is the usual miss) and rerun. Write `MUSIC.md` from the analysis, header `# Track: track.wav`. No rights check; a later swap to Suno means *Re-timing* below.

## Re-timing to a new take

Suno takes and edits change timings. Re-run `analyze`, compare old and new MUSIC.md row by row, and shift each scene's `start`/`end` and its tweens by the difference. A helper constant per act (`const A2 = 9.98;` and tweens at `A2 + 0.36`) makes this a one-line change. If any act moves by more than one bar, show the user the new act table and ask for approval again.

## Rights

Ask where the film will be shown, not which license the track has:
- *Just me / internal draft*: no rights check; the track stays local.
- *Public or for a client*: ask "Where does the track come from?" → *I made it / bought a license* · *Suno, paid plan* · *Free library (CC0 / CC BY)* · *Somewhere else*. For Suno ask **before they generate**: the plan active at generation time decides, and upgrading later does not cover songs made on the free plan. Free plan or "somewhere else" isn't publishable: offer to generate after upgrading, or a silent film. CC BY needs a credit line in the film's description.
- *Not decided yet*: treat it as a draft and ask again before the render.

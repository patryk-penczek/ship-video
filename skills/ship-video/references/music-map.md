# Reading the analysis → MUSIC.md

Read this in step 3, after `node scripts/music.mjs analyze`.

## What each line means

| line | use it for | trust |
|---|---|---|
| `tempo`, `bar` | bar length; most cuts land on bar starts | high for steady tracks |
| `bars:` | bar start times (downbeat picked from where the hits are) | check against the plot: bold lines should sit on the big hits |
| `hits:` | big moments: scene cuts, flashes, shakes. `*` = strong | high for `*`; weak ones can be hi-hat accents |
| `kicks:` | small moves inside a scene: presses, pops, captions | medium; dense in busy sections |
| `gaps:` | breaks before a drop; silence or near-silence | high when present |
| energy table | sections: where the groove starts, the drop, the outro | high; `rms` and `sub` columns rise at the drop |

Detection is a starting point. Open the plot (`music.mjs plot`, then Read the PNG): bright vertical stripes in the low band are hits; a dark gap followed by a bright wall is a break → drop.

## Writing MUSIC.md

One row per musical event, in seconds, 2 decimals:

```
| t (s) | music | use |
|---|---|---|
| 0.00–2.02 | intro pad, swell | opening line types itself |
| 2.02 | hit* | first cut, flash |
| 2.02–6.01 | motif, kick every beat | word per beat |
| 6.01 | hit* | cut to the app |
| 9.98 | hit*, groove starts | … |
| 18.00–21.99 | break, snare roll | build tension, push in |
| 21.99 | drop* | the big moment |
| 32.02 | final hit | end card |
```

Then sanity-check: the strong hits usually sit on bar starts; if one is 0.05–0.1 s off a bar line, prefer the detected hit time (that's where the sound is).

## No music (grid)

`music.mjs grid --bpm 120 --duration 20 --out <film>/env.js` prints bar and beat times. Write MUSIC.md from them: bar starts for cuts, beats for moves. When a track arrives later, run the analysis and move each cut to the nearest real hit.

## Re-timing to a new take

Suno takes and edits change timings. Re-run `analyze`, compare old and new MUSIC.md row by row, and shift each scene's `start`/`end` and its tweens by the difference. A helper constant per act (`const A2 = 9.98;` and tweens at `A2 + 0.36`) makes this a one-line change.

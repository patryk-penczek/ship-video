# Suno prompt template

Goal: a track whose sections land on round-second bars, so the scenario can be written before the music exists.

## 1. Pick the tempo
One bar (4 beats) = 240 / BPM seconds.

| BPM | beat | bar | feel |
|---|---|---|---|
| 90 | 0.667 s | 2.67 s | calm, how-to |
| 100 | 0.6 s | 2.4 s | warm |
| 120 | 0.5 s | **2.0 s** | default, easiest maths |
| 128 | 0.469 s | 1.875 s | energetic |

## 2. Style (Suno "Style of Music" field)
```
<genre>, product launch, <BPM> BPM, <lead instrument> motif, <low end e.g. warm sub hits>, <build e.g. rising strings, ticking hi-hats, snare roll build>, big drop, <mood e.g. hopeful, confident>, clean ending, instrumental, no vocals
```
Example: `uplifting electronic, product launch, 120 BPM, bright pluck motif, deep sub hits, swelling pads, crisp hi-hats, snare roll build, big drop, optimistic, clean ending, instrumental, no vocals`

## 3. Structure (Suno "Lyrics" field)
Map acts to bars. Bracketed tags only, no lyrics. Example for ~30 s at 120 BPM:
```
[Instrumental]
[Intro: airy pad, single pluck, slow swell, 1 bar]
[Hit: warm sub boom]
[Verse: pluck motif, light tension, 2 bars]
[Hit: impact, hi-hats start]
[Build: hi-hats get denser, pads rise, 2 bars]
[Groove: syncopated kick, confident pulse, 2 bars]
[Break: sudden stop, short silence, accelerating snare roll and riser, 2 bars]
[Drop: big hit, full groove, 4 bars]
[Final Hit: soft impact, sustained chord, clean ending]
[End]
```
Each `[Hit]` is where a cut will go. A `[Break]` before a `[Drop]` gives the film its big moment.

## 4. Generate
- Make 3–4 takes; pick the one with the clearest hits (listen for the drop).
- Keep it as it is. Any length is fine; trim only a long silent tail.
- Then analyse it (SKILL.md step 3). Suno follows the structure loosely: always re-detect the hits and re-time the scenario to them.

## Licensing
- **Free plan:** songs are for non-commercial use only. Not for a product launch, ads, or a client.
- **Paid plan (Pro/Premier):** you may use songs made while subscribed commercially.
- Check suno.com's current terms before publishing. If in doubt, use a track you've licensed or path C (no music).

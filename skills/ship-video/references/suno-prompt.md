# Suno prompt template

Goal: a short track whose sections land near round-second bars, so the scenario can be drafted before the music exists. Suno does not count bars. Treat every bar count below as a hint, and always re-detect the real hits (`music.md`).

Facts about Suno's UI and models were checked in October 2026 and can change. If a field is not where this file says, look for the closest one.

## 0. Rights first
Settled before the user generates anything (`music.md`, *Rights*). Terms change; check suno.com.

## 1. Pick the tempo and the length
One bar (4 beats) = 240 / BPM seconds. Pick the BPM so a whole number of bars fills the target length.

| BPM | bar | bars in 24 s | feel |
|---|---|---|---|
| 80 | 3.0 s | 8 | calm, how-to |
| 96 | 2.5 s | 10 (25 s) | warm, short teasers |
| 120 | **2.0 s** | 12 | default, easiest maths |
| 128 | 1.875 s | 12.8 | energetic, bars are not round |

Rule: bars = length / bar. 25 s fits 96 BPM (10 bars of 2.5 s). With 120 BPM, 25 s is 12 bars plus a 1 s tail: fine, the tail is the end card.

## 2. Suno setup
1. Create, Songs tab, switch **Simple** to **Advanced**. Advanced shows two fields: **Lyrics** and **Styles**.
2. Model (top right): at the time of writing **v6** (paid, most precise) or **v6-mini** (free); check which models your plan offers. Avoid any *wild* variant: it ignores tight cues.
3. Lyrics field: the bracketed structure only (section 4), with `[Instrumental]` first. (An empty Lyrics field also means instrumental, but then there is no structure.)
4. Styles field: the style line (section 3), about 1000 characters at most.
5. **More Options**, **Duration** (if their plan shows it): a starting value with headroom, not the film's exact length, about 0:30 for a 15–20 s film, since you cut on bar lines anyway (`music.md`). It is theirs to adjust by ear: a take that feels too slow or drawn out, shorter; too rushed, with the drop crammed in, longer. Optional: Variety Normal, Weirdness about 30%, Style Influence about 65%.
6. Each Create gives 2 clips.

## 3. Style line (Styles field)
Order: genre, mood, 2 or 3 instruments, production, BPM. 4 to 7 strong descriptors. No "product launch": Suno has no idea what that means.
```
<genre>, <mood>, <lead instrument> motif, <low end>, <build device>, <production>, <BPM> BPM, clean ending, instrumental
```
Example: `uplifting electronic, optimistic, bright pluck motif, deep sub hits, snare roll build, crisp hi-hats, big drop, 120 BPM, clean ending, instrumental`

## 4. Structure (Lyrics field)
Brackets only, no words outside brackets (Suno sings them). Put each `[Hit: ...]` inside the preceding section's line or directly after it. `[Intro]`, `[Outro]` and `[End]` are followed reliably, `[Break]` sometimes, `[Build]`, `[Drop]`, `[Hit]` and bar counts are only hints.

Proven structure (calm, hopeful, about 25 to 36 s):
```
[Instrumental]
[Intro: soft pulsing synth, gentle piano motif, light tension, 2 bars]
[Build: strings rising, ticking pulse, soft riser, 2 bars]
[Break: sudden stop, short silence, half beat]
[Hit: warm impact, soft sub boom, strings and synths open up]
[Main: confident pulse, piano motif, light cinematic percussion, hopeful, 4 bars]
[Final Hit: soft impact, sustained chord, clean ending]
[End]
```

A real 25 s example (120 BPM, bars 0 to 12, drop at 16 s):
```
Styles: uplifting electronic, optimistic, bright pluck motif, deep sub hits, swelling pads, crisp hi-hats, snare roll build, big drop, 120 BPM, clean ending, instrumental

[Instrumental]
[Intro: airy pad, single pluck, slow swell, 1 bar]
[Hit: warm sub boom]
[Verse: pluck motif, light tension, 2 bars]
[Hit: impact, hi-hats start]
[Build: hi-hats get denser, pads rise, 2 bars]
[Hit: impact, kick enters]
[Groove: syncopated kick, confident pulse, 2 bars]
[Break: sudden stop, short silence, accelerating snare roll and riser, 1 bar]
[Drop: big hit, full groove, 3 bars]
[Final Hit: soft impact, sustained chord, clean ending]
[End]
```
Planned times: intro 0 to 2 s, verse 2 to 6, build 6 to 10, groove 10 to 14, break 14 to 16, drop 16 to 22, final hit 22, tail to 25. Real takes drift.

## 5. Generate and pick
- When the take arrives, check it: clear hits and a clean ending. The quiet gap before a hit is the most fragile part: Suno rarely leaves real space there, so a riser instead of a gap is fine.
- Suno often runs longer than asked and may ignore `[End]`: you cut it on a bar line (`music.md`, *Fitting*), never leaving a long silent tail; then re-time (`music.md`, *Re-timing*).
- When they say no take works, change the prompt: fewer sections, shorter sections, clearer instrument words.

## 6. Walking the user through
Sections 1 to 5 are for you; the user gets one message they can follow with Suno open in another window, never a summary of this file. Write it in their language:
1. The plan they generate on (the rights answer).
2. Numbered steps in UI order (section 2): open suno.com, Create, Advanced, the model to pick, then each field with its content in its own copy-paste block (Styles, Lyrics) and the values from section 2 as a starting point they adjust by ear, not as an order.
3. Generate until a take sounds right to them (no count: it's their taste); what to listen for, as a hint, in plain words: a clear drop, a clean end, no singing; exact times don't matter, you cut on bars.
4. Download it as WAV or MP3 and tell you its file name, or just say "done" if it went to `~/Downloads`.
5. What you do meanwhile (the scenario on a `GRID DRAFT`) and that if nothing sounds right they just say so: you change the prompt, they don't.

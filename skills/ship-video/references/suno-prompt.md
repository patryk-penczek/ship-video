# Suno prompt template

Goal: a short track whose sections land near round-second bars, so the scenario can be drafted before the music exists. Suno does not count bars. Treat every bar count below as a hint, and always re-detect the real hits (SKILL.md step 3).

Facts about Suno's UI and models were checked in October 2026 and can change. If a field is not where this file says, look for the closest one.

## 0. Ask about rights first
Ask this BEFORE the user generates anything, because the plan at generation time decides what they may do with the song.
- Where will the film be shown? *Just me / draft*, *Public or for a client*, *Not decided*.
- If public or client: which Suno plan will they generate on? Per Suno's terms (check suno.com yourself, they change): songs made on the free plan stay non-commercial, and upgrading later does not cover them. Songs made while on a paid plan are the user's to use commercially, also after they cancel. Remixes of other people's songs are non-commercial. So: upgrade first, then generate.
- AI music can still get automated copyright claims on some platforms. Say so once.

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
2. Model (top right): **v6** (paid, most precise) or **v6-mini** (free). Do not use **v6-wild**: it ignores tight cues.
3. Lyrics field: the bracketed structure only (section 4), with `[Instrumental]` first. (An empty Lyrics field also means instrumental, but then there is no structure.)
4. Styles field: the style line (section 3), about 1000 characters at most.
5. **More Options**: set the **Duration** slider to the target (for example 0:25 or 0:30), put 2 or 3 unwanted things in **Exclude Styles** (for example `vocals, spoken word, long outro`). Optional: Variety Normal, Weirdness about 30%, Style Influence about 65%.
6. Each Create gives 2 clips. Generate 3 times: you want **4 to 6 takes** before touching the prompt.

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
Exclude: vocals, spoken word

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
- Audition all takes. Pick by the clearest hits and the cleanest ending. The silence before a hit is the most fragile part: Suno rarely makes true silence, so a riser instead of a gap is fine.
- Suno often runs longer than asked and may ignore `[End]`. Use Suno's crop on the take, or cut on a bar line later (SKILL.md step 3). Do not leave a long silent tail.
- **While the user generates, don't wait idle.** Write MUSIC.md from the grid, mark its first line `GRID DRAFT`, draft SCENARIO.md against it and ask the copy questions. Only the approval waits for the real take. When the take arrives, analyse it, re-time (music-map.md), and ask the approval again if any act moved by more than one bar.
- If after 6 takes the structure is wrong, change the prompt: fewer sections, shorter sections, clearer instrument words.

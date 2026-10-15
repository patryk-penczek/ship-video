# Scenario: <product> · <goal> · <length> s

**Approved:** (date; Claude sets it when the user approves)
**Audience:** who watches, where (launch post, landing page, onboarding).
**Music:** file / Suno take N / none at <BPM> BPM. Bar = <s> s. Duration <s> s. (Silent film: see *Silent variant* at the end.)
**Look:** palette, fonts, background, theme (dark / light / reveal from one to the other; both themes need states in `states.json`), from the product's tokens.
**Real assets:** list. **Placeholders:** list (replace before the final render).
**Sources:** `PRODUCT.md` (views, wow moments, promise), `MUSIC.md` (events, roles).
**Character:** one line on the film's attitude (e.g. "fast, dry, big type") and the reference it borrows techniques from, if the user gave one.

## Story (mandatory)

One concrete case carries the film; features appear only as consequences of it. A list of features is not a story.

| beat | what happens | where in the film |
|---|---|---|
| Problem | a real, specific situation the audience knows (one sentence, one image) | hook |
| Hero | the person/thing in that situation (a user, a number, a city, a file) | hook → promise |
| Action | the hero uses the product, 2–3 steps, every step a shot | tour |
| Payoff | the result that closes the problem, the biggest frame of the film | climax (the drop) |

Promise (one sentence, from PRODUCT.md): "…"
Test: say the film aloud in three sentences, without naming a feature. If you can't, the story isn't there yet.

## Music map and roles
| t (s) | music | role in the story |
|---|---|---|
| 0–2 | intro, swell | problem |
| 2.00 | hit | hero enters |
| … | … | … |
| 16.00 | drop | payoff (climax) |

The climax lands on the drop (or on the strongest bar of the grid in a silent film).

## Act I · <the problem / the hook>
| t (s) | cut or in-shot | music | on screen | what moves in this shot | on the hit frame | camera + framing target | min text px | source (feature → component) | copy (final) |
|---|---|---|---|---|---|---|---|---|---|
| 0.0–2.0 | cut | intro swell | a line types itself | the caret, the typing | first word full size | slow push 1.0→1.06; word fills 60% | 120 | — | "…" |
| 2.0 | cut | hit | accent flood, one word per beat | each word enters | the first word, sharp | static layer + drift | 200 | — | "…" |

## Act II · <the product does the thing>
| t (s) | cut or in-shot | music | on screen | what moves in this shot | on the hit frame | camera + framing target | min text px | source (feature → component) | copy (final) |
|---|---|---|---|---|---|---|---|---|---|
| … | in-shot | kick | button pressed | cursor arrives, ripple, list fills | button at 0.92 scale | focus 2.0× on the input; the input fills 50% | 28 | search → `SearchBar` | — |

## Act III · <payoff>
| t (s) | cut or in-shot | music | on screen | what moves in this shot | on the hit frame | camera + framing target | min text px | source | copy (final) |
|---|---|---|---|---|---|---|---|---|---|

## End card
| t (s) | music | on screen | copy (final) |
|---|---|---|---|
| … | final hit | logo + tagline + CTA | "…" |
| last 1.5 s | decay | everything fades | — |

Column rules:
- **cut or in-shot:** *cut* = the picture changes (the hit check will verify it); *in-shot* = something moves inside a shot on a kick (an alert slides in, a button presses). In-shot events are not listed in `hits.mjs`.
- **what moves in this shot:** never empty, never "static". Nothing may be fully still for more than a bar (`direction.md`, *Pacing rules* 1).
- **on the hit frame:** what the viewer sees on the exact frame of the cut: the new scene, sharp and opaque. Never "fading in".
- **camera + framing target:** which element fills 40–70% of the frame and the zoom (1.4–2.3× on UI). The target is content (a number, a chart, an input with its text), never empty chrome.
- **min text px:** smallest text the viewer must read, after the camera zoom (≥ 28).
- **source:** the product feature and the component/route that implements it (from PRODUCT.md), so replicas know what to copy.

## Coverage
Every view and wow moment in PRODUCT.md and the shot that shows it (or why it is skipped):
| PRODUCT.md item | shot (t) |
|---|---|
| … | … |

## Copy variants (pick one)
- Headline: A "…" · B "…" · C "…"
- End card: A "…" · B "…"

## Open questions
- Only real decisions the user must make. Everything else is decided and written above.

## Changes vs scenario
Filled during build and review (step 7): every place the film departs from this scenario, one line each: what, why. Empty = no departures. The user approved the table above, so a silent change is a broken promise.
- …

## Silent variant
For a film with no music (`direction.md`, *Silent films*): drop the **music** and **on the hit frame** columns, add a **beat** column (bar.beat, e.g. 3.1) before **on screen**, keep every other column. The music map table becomes the bar grid with a role per bar. Cuts on bar lines, payoff on the strongest bar (60–75% in).

## Self-critique rubric
Run it on the scenario before the gate (answer from the table) and on the stills before the second gate (answer from the frames). Fix every "no" or say why it stays.

| # | question | scenario | stills |
|---|---|---|---|
| 0 | Stranger test: watching muted, can someone who never heard of the product say what it is, who it's for, why they'd want it and what to do next? Is the product itself seen working by ~3 s, whatever the film's topic? | | |
| 1 | Hook in the first second: is the strongest image sharp and moving on frame 1? | | |
| 2 | Is the story readable without sound: problem → hero → action → payoff, in three sentences? | | |
| 3 | Coverage: does every major view/wow moment from PRODUCT.md appear? | | |
| 4 | Motion: does something move in every shot and every beat (nothing fully still for more than a bar)? | | |
| 5 | Framing: does the camera land on content that fills 40–70% of the frame, no empty chrome (exceptions: `direction.md` *Framing rules*: tilt, split screen, zoom-through, dialogs ≥ 50%)? | | |
| 6 | Is all text ≥ 28 px on screen after zoom, and not covered by a caption? | | |
| 7 | Do cut frames show the new thing sharp and opaque (no 0.35-opacity entrances)? | | |
| 8 | Does the payoff land on the drop and is it the peak: tightest framing, biggest motion, longest hold? | | |
| 9 | Is at least half the film bright/rich, not all dark UI? | | |
| 10 | Does anything on screen show something the real app doesn't do? | | |
| 11 | Causality: does every click/keypress hit a control in its *before* state and change the screen on that frame (no clicking an already-active tab, toggle or selected item)? | | |
| 12 | Is everything that is live in the app (map/radar, chart, spinner, clock, typing) alive in the film, with distinct frames, not a still or a crossfade? | | |
| 13 | Does the ending land: last copy complete ≥ 1.2 s before the end, motion at rest, short fade or clean loop frame? | | |

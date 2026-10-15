# Scenario: <product> · <goal> · <length> s

**Approved:** (date; Claude sets it when the user approves)
**Audience:** who watches, where it is shown (launch post, landing page, feed, help center), **and what they already know** (stranger or existing user: decides the opening, `film-types.md`, *Identity first*). **Film type:** launch / how-to / one-feature teaser / landing page. **Min text:** 28 px (README, website) or 56 px (social feed).
**Music:** file / Suno take N / none at <BPM> BPM. Bar = <s> s. Duration <s> s. (Silent film: see *Silent variant* at the end.)
**Look:** palette, fonts, background, theme (dark / light / reveal from one to the other; both themes need states in `states.json`), from the product's tokens.
**Real assets:** list. **Placeholders:** list (replace before the final render).
**Sources:** `PRODUCT.md` (views, wow moments, promise), `MUSIC.md` (events, roles).
**Character:** one line on the film's attitude (e.g. "fast, dry, big type") and the reference it borrows techniques from, if the user gave one.

## Story (mandatory)

*How-to film:* use the **Steps variant** below instead of this table.

One concrete case carries the film; features appear only as consequences of it. A list of features is not a story.

| beat | what happens | where in the film |
|---|---|---|
| Problem | a real, specific situation the audience knows (one sentence, one image) | hook |
| Hero | the person/thing in that situation (a user, a number, a city, a file) | hook → promise |
| Action | the hero uses the product, 2–3 steps, every step a shot | tour |
| Payoff | the result that closes the problem, the biggest frame of the film | climax (the drop, or the strongest bar in a silent film) |

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
| t (s) | cut or in-shot | music | on screen | what moves in this shot | on the hit frame | camera + framing target | min text px | source (feature → component) | copy (optional) |
|---|---|---|---|---|---|---|---|---|---|
| 0.0–2.0 | cut | intro swell | a line types itself | the caret, the typing | first word full size | slow push 1.0→1.06; word fills 60% | 120 | — | "…" |
| 2.0 | cut | hit | accent flood, one word per beat | each word enters | the first word, sharp | static layer + drift | 200 | — | "…" |

## Act II · <the product does the thing>
| t (s) | cut or in-shot | music | on screen | what moves in this shot | on the hit frame | camera + framing target | min text px | source (feature → component) | copy (optional) |
|---|---|---|---|---|---|---|---|---|---|
| … | in-shot | kick | button pressed | cursor arrives, ripple, list fills | button at 0.92 scale | focus 2.0× on the input; the input fills 50% | 28 | search → `SearchBar` | — |

## Act III · <payoff>
| t (s) | cut or in-shot | music | on screen | what moves in this shot | on the hit frame | camera + framing target | min text px | source | copy (optional) |
|---|---|---|---|---|---|---|---|---|---|

## End card
Call to action: <real next step: URL or button text; ask the owner if none is known>
| t (s) | music | on screen | copy (final) |
|---|---|---|---|
| … | final hit | logo + tagline + CTA (brand line held longer than any caption; existing users: a recap line) | "…" |
| ~2–2.5 s card | final hit | lines in by +0.6 s, readable rest ≥ 1.2 s, landing | — |

Column rules:
- **cut or in-shot:** *cut* = the picture changes (the hit check will verify it); *in-shot* = something moves inside a shot on a kick (an alert slides in, a button presses). In-shot events are not listed in `hits.mjs`.
- **copy (optional):** fill it only where the picture can't say the thing (a number's meaning, a headline, the end card). Most shots have none; the final wording of whatever copy exists is fixed here before the gate (`direction.md`, *Framing*, *Fewer words*).
- **what moves in this shot:** never empty, never "static". Nothing holds one picture for more than ~1 s (`direction.md`, *Pacing rules* 1).
- **on the hit frame:** what the viewer sees on the exact frame of the cut: the new scene, sharp and opaque. Never "fading in".
- **camera + framing target:** which element fills 40–70% of the frame and the zoom (1.4–2.3× on UI). The target is content (a number, a chart, an input with its text), never empty chrome.
- **min text px:** smallest text the viewer must read, after the camera zoom: ≥ 28 for README/website, **≥ 56 for a social feed** (16:9 on a phone is ~390 px wide).
- **margin copy** (phone and narrow apps only): add this column; big words in the side margin outside the camera layer, one side per act, ≤ 112 px per word (`film-types.md`, *Phone and narrow apps*).
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
Filled during build and review (step 7), and in QA (step 8) for each audit line that stays: what it is and why. Every place the film departs from this scenario, one line each: what, why. Empty = no departures. The user approved the table above, so a silent change is a broken promise.
- …

## Silent variant
For a film with no music (`direction.md`, *Silent films*): drop the **music** and **on the hit frame** columns, add a **beat** column (bar.beat, e.g. 3.1) before **on screen** and an **on the cut frame** column (what the viewer sees on the cut: sharp, opaque), keep every other column. Use "peak", not "drop". The music map table becomes the bar grid with a role per bar. Cuts on bar lines, payoff on the strongest bar (60–75% in).

## Steps variant (how-to films)
Replaces the Story table and the three Acts. Opening = identity anchor + task title; then one row per step; then the end card.

| step | t (s) | action | cursor/finger target | result frame (the visible changed state) | caption (in the band) | hold (s, ≥ 1.5) | what moves | min text px |
|---|---|---|---|---|---|---|---|---|
| 1 | 3.0–6.5 | press and hold the card | card "…" | card lifted, column highlights | "1 Press and hold the card" | 1.5 | ghost card follows cursor | 28 |

Payoff = the final state of the task, held ≥ 1.5 s and called out. Skipped views named in Coverage.

## Self-critique rubric
Run it on the scenario before the gate (answer from the table) and on the stills before the second gate (answer from the frames). Fix every "no" or say why it stays. Rows marked *(launch/teaser)* are hype rules: for a how-to they read as given in the last column of the row, or are n/a.

| # | question | scenario | stills |
|---|---|---|---|
| 0 | Intended-viewer test (audience in the header): watching muted, could that viewer say what this is, why it matters to them and what to do next? Strangers: product named and seen working by ~3 s. Existing users: a 1 s anchor, then the task. | | |
| 1 | Hook in the first second: is the strongest image sharp and moving on frame 1? (how-to: the anchor and title) | | |
| 2 | Is the story readable without sound: problem → hero → action → payoff, in three sentences? (how-to: do the numbered steps alone teach the task?) | | |
| 3 | Coverage: does every view/wow moment that serves this film type appear, and is every skipped one named with a reason? | | |
| 4 | Motion: does something move in every shot (launch/teaser: every beat, nothing still for more than ~1 s; how-to: something moves even during a 1.5–2 s result hold)? | | |
| 5 | Framing: does the camera land on content that fills 40–70% of the frame, no empty chrome (exceptions: `direction.md` *Framing rules*: tilt, split screen, zoom-through, dialogs ≥ 50%)? | | |
| 6 | Is all text the film adds ≥ 28 px on screen (≥ 56 px for a social feed), and not covered by a caption? Real app UI text can't reach 56 px: its key word or number is lifted out as type and ambient chrome counts as imagery, not chased with zoom. | | |
| 7 | Do cut frames show the new thing sharp and opaque (no 0.35-opacity entrances)? | | |
| 8 | Launch/teaser: does the payoff land on the drop (silent: the strongest bar) and is it the peak: tightest framing, biggest motion, longest hold? How-to: is the final state of the task clear and held ≥ 1.5 s? | | |
| 9 | Dark-UI launch/teaser: is at least half the film bright/rich? (n/a for a how-to or a light app) | | |
| 10 | Does anything on screen show something the real app doesn't do? | | |
| 11a | Is every click target framed in the central ~60% of the frame, readable, with a visible cursor path (no clicks at the edge, in a corner or off-screen)? | | |
| 11 | Causality: does every click/keypress hit a control in its *before* state and change the screen on that frame (no clicking an already-active tab, toggle or selected item)? | | |
| 12 | Is everything that is live in the app (map/radar, chart, spinner, clock, typing) alive in the film, with distinct frames, not a still or a crossfade? | | |
| 13 | Does the ending land (`direction.md`, *End card*): about 2–2.5 s in total, last copy complete ≥ 1.2 s before the end, motion at rest, short fade or clean loop frame, brand line held longer than any caption? Existing users: a recap line or the end card, with no pitch. | | |
| 14 | Static spans: is there any span over ~1 s without a visible change other than the landing rest (`motion.mjs` on the render; from the table: no row holds one picture for more than ~1 s)? | | |
| 15 | Is the story thread set up in the first act (the hero and the situation shown before the payoff, not first named in the payoff caption)? | | |
| 16 | Dense or plain UI: are the key numbers lifted into big type, table shots ≤ 1.5 s, no run of near-identical shots? (n/a for a visual product) | | |

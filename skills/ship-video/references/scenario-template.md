# Scenario: <product> · <film type> · <length> s

**Approved:** (date; set when the user approves)
**Viewer:** who watches, where (feed, landing page, README, help center) and what they already know. **Min text:** <px> (`direction.md`, *Framing and text*).
**Music:** <file> / Suno take / generated beat / silent at <BPM> BPM. Bar = <s> s. Duration <s> s.
**Look:** palette, fonts and theme, from the product's own tokens. **Cursor:** yes / no / only in act II, and why.
**Assets:** real ones used; placeholders to replace before the final render.

## Story
| beat | what happens | where |
|---|---|---|
| Problem | a real, specific situation the viewer knows | hook |
| Hero | the person or thing in it (a user, a number, a city, a file) | hook → promise |
| Action | the hero uses the product, 2–3 steps, each a shot | tour |
| Payoff | the result that closes the problem; the biggest frame of the film | the drop (silent: the strongest bar) |

Promise (from PRODUCT.md): "…"
In three sentences, without naming a feature: …

## Shots
One table for the whole film; split it by act with a heading if it gets long.

| t (s) | cut? | music / beat | on screen | what moves | camera target (fills 40–70%) | copy |
|---|---|---|---|---|---|---|
| 0.0–1.9 | cut | intro swell | "Lost?" over the live map | the word rises; map drifts | the word, 60% wide | "Lost?" |
| 1.9 | cut | hit* | the app, search focused | typing "Lisbon" on the kicks | the input with its text, 2.0× | — |
| … | | | | | | |

- **cut?** *cut* = the picture changes (checked by `hits.mjs`); blank = a move inside the shot.
- **what moves** is never empty: nothing holds still for more than about a second.
- **copy** only where the picture can't say it, final wording.
- Phone-sized apps add a **margin copy** column; how-tos use the *Steps* table instead of Story and Shots.

## End card
Next step: <URL or button text; ask if unknown>. Into the card: <reveal from the last click / payoff flies to headline / tile>. Copy: "…".

## Coverage
Each core view and wow moment from PRODUCT.md and the shot that shows it, or why it is left out.

## Copy variants
Only where the wording is the user's call: headline A / B / C, end card A / B.

## Changes vs scenario
Filled while building: every departure from the approved table, one line each, what and why. The approval was for the table above, so a silent change breaks it.

## Steps (how-to films)
| step | t (s) | action | pointer target | visible result | caption in the band | hold (s) |
|---|---|---|---|---|---|---|
| 1 | 3.0–6.5 | drag the card to *Done* | card "Fix login" | card in *Done*, counter 4 → 5 | "1 Drag the card to Done" | 1.5 |

## Self-check
Run it on this table before the gate and on the stills before the render. Fix every "no" or say why it stays.
1. **Viewer test:** muted, could the intended viewer say what this is, why it matters and what to do next? Strangers: name and promise on the working product by ~3 s.
2. **Story:** problem → hero → action → payoff readable without sound, hero set up in act I? (How-to: do the steps alone teach the task?)
3. **Length:** does every second earn its place, or would the film be better shorter?
4. **Motion:** something changes about every second, and a new idea arrives every couple of seconds?
5. **Framing:** every camera target is content, 40–70% of the frame; text big enough for where it's shown?
6. **Cuts:** the new picture sharp and opaque on every cut frame?
7. **Payoff:** on the drop or strongest bar, and the peak: tightest, biggest, longest?
8. **Honesty:** everything on screen is something the real app does, live elements alive, counters end on real values?
9. **Interactions** (if there is a pointer): each click on a control in its before state, in the central part of the frame, changing the screen on the press?
10. **Ending:** flows into the end card, last line readable ≥ 1.2 s, motion at rest on the last frame?

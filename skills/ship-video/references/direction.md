# Direction

Read before the scenario (step 4) and again while building and reviewing. This file is the taste of the skill: what makes a product film land, and why. Numbers are defaults from films that worked; break one on purpose when the shot is better for it, and say so in *Changes vs scenario*.

## Contents
- The viewer test
- Choosing the film (one change, length, coverage)
- Story
- Structure: hook, tour, payoff, end card
- Motion and pacing
- Framing and text
- Interactions and the cursor
- Silent films
- Film types: how-to, teaser, landing page, phone, dense UI, canvas
- Techniques by story role
- What has worked, and what hasn't

## The viewer test

Every decision answers to one question: **could the intended viewer, watching muted, say what this is, why it matters to them and what to do next?** Settle who that viewer is in the Brief, because the answer changes the opening:
- **Strangers** (launch post, feed, landing page, README; the default): by about 3 s they have the product's name and its one-sentence promise *over the working product* (a headline on the live UI, a name badge in the margin), not on a logo card. The promise comes from the product's own words (README, site), not your guess.
- **Existing users** (changelog, onboarding): a 1 s anchor (name, where in the app we are), then the task. A pitch would be padding.
- **New users reading docs**: 2–3 s of identity, then the task.
- **A person** (portfolio): name and what they do; the closing ask may be "send me a message", not a URL.
- **A developer tool**: the product is what you build with it; name the tool early and keep naming it.

A "no" on the viewer test is a rewrite, not a polish: a beautiful pricing teaser that never says what the product is fails strangers.

## Choosing the film

**Choosing the film is half the result.** Before writing anything, find the one change that *is* the product (a file shrinks from megabytes to kilobytes, tiles merge into a bigger number, a diagram draws itself) and pick the type and length that show it best. The films that land show one mechanic plainly, with real data, and stop once it is understood: a clear 12 s clip beats a 30 s tour.

**Content decides the length, not the track.** If the material holds 15 s, a 34 s film drags in the middle however polished it is. Say so ("this has about 15 s of real content; cut the track to 15–18 s?") and offer it at the scenario gate; also the reverse, when steps need more time to read. The user decides; you advise.

**Coverage follows the film type.** A launch film shows every *core* view of PRODUCT.md at least briefly; a teaser shows its feature and payoff; a how-to the task's views; a landing page the 2–4 sections that carry the message. Name what you leave out in SCENARIO.md with a reason. Error and 404 pages stay out unless they are the point.

## Story

Every film is one story: **problem → hero → action in the app → payoff that closes the problem.** One concrete case carries it (a person, a city, a file, a number in a real situation); features appear only as steps of that case, which is why a feature list feels bland and a case feels like a film. Set up the hero and the problem in the first act: a payoff that meets its hero for the first time has nothing to close. Test: tell the film in three sentences without naming a feature.

How-tos replace the story with numbered steps; the payoff is the task's finished state.

## Structure

For launch and teaser films (how-tos: *Film types*):

| length | hook | promise | tour | payoff | end card |
|---|---|---|---|---|---|
| 15 s | 0–1.5 | 1.5–3 | 3–10, 3–4 shots | 10–12.5 | 12.5–15 |
| 20 s | 0–1.5 | 1.5–4 | 4–15, 6–7 shots | 15–18 | 18–20 |
| 30 s | 0–2 | 2–6 | 6–23, 8–10 shots, one breather | 23–27 | 27–30 |
| 45 s | 0–2 | 2–8 | 8–36, 12–15 shots in 2–3 chapters | 36–42 | 42–45 |

Under 15 s: drop the separate promise and tour; identity rides on the one mechanic, which pays off around 60–70% in, then a short card.

- **Hook.** Frame 1 already shows the strongest image, sharp and moving: viewers decide in a second whether to stay. Never black or a logo alone. Good hooks: the product's most distinctive moving thing, one big word with the app rising over it, a question typed into the app's own input. On a dark UI open on a bright type card or a flood of colour and bring the app in on the first beat; a dark canvas with a chrome strip is the weakest opening there is.
- **Tour.** One shot per core view or wow moment, ordered by what the viewer needs to understand, not by the sidebar.
- **Payoff.** The result of using the product (the answer arrives, the number lands), and the **peak of the film**: tightest framing (the result fills 60–70% of the frame), biggest motion, longest hold (about 1 s with motion still running). With music it lands on the drop; silent, on the strongest bar 60–75% in. If an earlier shot is bigger, the film peaked too early: shrink that one.
- **Into the end card, carry the motion.** A hard cut from busy UI to a flat card reads as the film running out of time. Overlap the last shot and the card by ~0.6 s and connect them with one motion (`toCard` in `film-api.md`: the card's colour grows from the last click while the camera pulls back, or the payoff number flies into the headline). A smooth ending beats an exact length: run a second over rather than cut hard.
- **End card.** Name, promise, a real next step (a URL, "Start free"; ask if none is known). About 2–2.5 s: a plain entrance (~0.6 s), a readable rest of at least 1.2 s, then the film lands (motion decelerates to rest, a short fade to the card's own colour). A 4–5 s static card reads as stalled; letters that wobble on the one frame everyone remembers look odd.

## Motion and pacing

- **Something visibly changes about every second.** That is where a viewer starts to read a picture as frozen. A slow camera drift (1.0 → 1.06) counts; a shot with nothing moving does not. The end card's final rest is the exception. `motion.mjs` measures it on the render.
- **Motion is not novelty.** A looping visualizer keeps pixels changing while nothing new happens. In launch films a new idea (cut, view, zoom target, interaction) arrives every 1–2 s; if the viewer could look away for 3 s and miss nothing, the shot is too long. Running out of ideas before the music ends means the film is too long.
- **One idea per shot**, 1.2–2.2 s in hype films (how-to steps run 2–5 s). Longer needs a second thing happening.
- **Interactions, not swaps.** Whole screens appearing are the weakest thing a film can do: show the route transitioning, the list filling, the number counting.
- **Live stays live.** Whatever moves in the real app (charts, maps, clocks, typing, spinners) moves in the film. A still or a crossfade of two frames reads as broken.
- **The cut frame is crisp.** The new picture is sharp and fully opaque on the cut frame and enters by offset, scale or a little blur. A fade from 0 reads as a late cut, from 0.35 as a dim one.
- **Easing carries energy.** Fast in, soft out (`expo.out`, `power3.out`) for arrivals; `power2.inOut` or the `smooth`/`focused` springs for camera moves; linear only for slow drifts.
- **The quiet before a drop needs a tense image** (a slow push on the thing about to change, a cursor hovering), so the drop releases something.
- **Dark UI gets light.** A dark app on screen for more than ~4 s feels heavy: alternate with a bright number, a light type card, the light theme.

## Framing and text

- **The camera lands on content.** The target (a number, a chart, an input with its text) fills 40–70% of the frame. Empty toolbar, empty margin or the top of a card whose number is below the fold are the classic misses: aim at the thing inside, not the strip around it, and check the end point of every camera move in a still. Dialogs fill at least half the frame, or the scrim turns the shot into a dark rectangle.
- **Don't zoom past native resolution.** A canvas captured at DPR 2 stays sharp to about 1.9×.
- **Text size by where it's watched.** Copy the film adds is at least ~28 px on screen for README and web, **56 px for social feeds** (a 16:9 video on a phone is ~390 px wide). Real app UI text can't reach that by zoom: lift the one number or word that matters out as big type and let the chrome be imagery that proves the product is real.
- **Fewer words.** A caption earns its place only when the picture can't say it; two or three in a 20–30 s film are plenty. Captions sit in a free margin or corner, opaque, never over the content; how-tos use a persistent step band.
- **Numbers are honest.** Counters end on the app's real value; nothing shows what the real app doesn't do.

## Interactions and the cursor

**Decide per film whether there is a cursor.** Use one (a finger on touch UIs, keycaps for keyboard-driven apps) when the viewer must *learn the action*: how-tos, onboarding, drag and drop, "it's one click". Leave it out when *the result is the point*: launch and hype films where the UI changes by itself on the beat. A cursor that wanders in for one click looks like a mistake. Mixed works when one act is clearly "watch me do it".

When there is one:
- **Causality.** It travels to a control in its *before* state and the screen changes on the press. Clicking a tab that is already active looks fake; if you only have the after state, cut to it.
- **Every click is readable.** The control sits in the central ~60% of the frame at a readable size when pressed. A click at the frame edge or in a corner can't be followed: frame the control, then move to the result. `autoCam` does this from the clicks.

## Silent films

Silent does not mean calm: without music, motion, cuts and easing are the whole rhythm, so a silent film needs *more* motion, not less.
- No sound-coded effects: no shake, flashes, beat pulses, shockwave rings, stamps or glitches. They read as hits of a sound that isn't there.
- Create the folder with `new-film.mjs <film> --silent` (no shake, no beat demo); remove any `flash` or `rings` left in your scenes.
- Cuts stay on a bar grid (`music.md`, *No music*), so music can be added later by re-timing.
- The biggest move of the film (a whip pan, a zoom-through) is the peak, 60–75% in, and the payoff lands on it.
- A muted website hero may loop: ask, and match the last frame to the first if it does.

## Film types

**How-to.** Identity anchor, a title that names the task, then numbered steps, one idea each, 2–5 s per step with a 1.5–2 s hold on the visible result (keep something moving in the hold). The instruction stays on screen in a step band while the viewer watches. Payoff = the finished task, held and called out. No hype, no drop.

**One-feature or pricing teaser (15–20 s).** Identity first (name, promise, the core view moving), then the feature with its payoff (the number changes, the plan is chosen), then the end card. Don't spend half the film touring the page.

**Landing page or site.** Sections are not views: inventory them with their scroll-reveal animations and drawn effects (a chart that draws itself is a wow moment), pick the 2–4 that carry the promise, and use the page's own headline and copy. A portfolio is the same with a person as the hero; its payoff is the closing ask.

**Phone-sized web app.** In 16:9 it is a column ~22% of the frame wide. Zoom 2.0–2.4× to reach readable text, put big copy in the side margins outside the camera layer so it doesn't zoom with the app, and use a finger, not a cursor. A pale column on a pale page needs a coloured backdrop.

**Dense or plain UI** (tables, forms, admin). Zooming into a table only shows more table. Lift the key number out as big type over the dimmed UI, zoom into the one cell that changes, keep table shots under ~1.5 s. The moment of change carries the film.

**Canvas-first** (whiteboards, maps, editors, games). The canvas is the product, so it must move for real: record real pointer frames with `capture.mjs` (`replicas.md`, *Canvas*) instead of rebuilding drawings. Turn-based games: run the game's own logic with a seeded PRNG to get the moves, tween the real tiles, show keycaps.

## Techniques by story role

Code for each is in `shots.md`.

| technique | lands on | story role | silent film |
|---|---|---|---|
| Flood colour + big word | hit | hook, chapter | yes (a colour cut, no flash) |
| Word per beat | each beat | the promise in four words | yes, on the grid |
| Letter drop | bar start | product name | yes |
| Typing on onsets | kicks | the action begins | yes, with human timing |
| Focus zoom, pull back on the hit | build → hit | action → payoff | yes |
| Screen wall | every kick | the whole product, fast | yes |
| Zoom-through, match cut | the peak | climax | yes |
| Stamp, glitch, shockwave | one hit | verdict, "it broke", climax | no: sound-coded |
| Caret ending | final hit | resolution | yes |

Effects are seasoning: each once per film at most.

## What has worked, and what hasn't

Owner verdicts on test films of very different products. Taste, not rules.

| landed | why |
|---|---|
| 12 s clip of a puzzle game | one mechanic driven by the game's own logic; ends the moment it's understood |
| 15 s teaser of an image tool | one transformation with real numbers landing on the drop, before/after as proof |
| 20 s teaser of a whiteboard | the product drawing itself with its real renderer; one delightful interaction |
| 20 s launch of a notes app | a verb rhythm (*Type it. Save it. Find it.*) beside a phone-sized UI |

| fell flat | why |
|---|---|
| a pricing teaser | never said what the product is |
| a tour of static zooms | the camera landed on empty chrome; nothing moved |
| clicks on already-active controls, at the frame edge | cause and effect unreadable; looks fake |
| a live radar shown frozen | the product looked broken |
| a 34 s film with 15 s of material | half the film nothing new happened |
| a detour to an error page, extra captions, a long static end card | time spent on nothing |
| a calm generated beat with the whole frame shaking and pulsing on every hit | the screen fought the UI motion; one jolt on the drop is enough |

Films cut to a real song (own track or Suno) consistently came out best; a generated beat is a good functional score.

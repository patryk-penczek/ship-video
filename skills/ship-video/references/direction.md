# Direction: structure, pacing, framing

Read at step 4 (structure by length; silent films if silent), and again while building (step 6) and reviewing (step 7): *Pacing*, *Framing* and *Red flags*. Identity by audience, film types, story and coverage are in `film-types.md`; the shot library with code is `shots.md`.

The numbers in this file (28 px, 40–70%, 2–2.5 s, 1.2–2.2 s) are defaults from films that worked, each with its reason next to it. When a shot is better broken, break it on purpose and note it in the scenario; the intended-viewer test (`film-types.md`) decides. Silent does not mean calm: without music, motion, cuts and easing are the whole rhythm.

## Contents
- Film structure by length (hook, promise, tour, payoff, end card, causality, landing)
- Pacing rules
- Framing rules
- Silent films
- Red flags

## Film structure by length

The table assumes the stranger default (`film-types.md`, *Identity first*): 0-3 s identity, then the topic, then an end card with name and promise. It is for launch and hype films; other types are in `film-types.md`. In a silent film the payoff sits on the strongest bar 60–75% in; for 15 s that is 10–12.5 s, which is why that row ends the tour at 10.

| length | hook | promise | tour | payoff | end card |
|---|---|---|---|---|---|
| 15 s | 0–1.5 | 1.5–3 | 3–10, 3–4 shots of ~2 s | 10–12.5 | 12.5–15 |
| 20 s | 0–1.5 | 1.5–4 | 4–15, 6–7 shots | 15–18 | 18–20 |
| 30 s | 0–2 | 2–6 | 6–23, 8–10 shots, one breather | 23–27 | 27–30 |
| 45 s | 0–2 | 2–8 | 8–36, 12–15 shots in 2–3 chapters | 36–42 | 42–45 |

- **Hook (first second).** The first frame already shows the strongest image or word, full size and sharp, and something is already moving: a viewer decides in a second whether to stay. Never a black or logo-only opening. Good hooks: the product's most distinctive moving thing (a live chart, a map, a canvas), a one-word headline with the app rising over it, a question typed into the app's own input.
  - *Data or map product on a dark UI:* a dark soft canvas with a chrome strip is the weakest opening. Put a big question (60–70% of the frame width, light on dark) over the zoomed live canvas plus one counter that changes, and cut to the crisp app on the first hit. Don't let a caption cover the canvas controls.
  - *Any dark-UI product:* open on a bright type card or a flood colour with the first word, and bring the app in on the first kick.
- **Promise.** One line of copy, the sentence from PRODUCT.md. On screen with motion, not as a held title.
- **Tour.** One shot per view or wow moment from PRODUCT.md, ordered by what the viewer needs to understand, not by the sidebar. Every shot has one thing that moves in it (`shots.md`).
- **Payoff.** The result of using the product, not another feature: the answer arrives, the alert fires, the number lands. It is the **peak of the film**: the tightest framing (the result fills 60-70% of the frame), the biggest motion (the largest zoom, count or pull-back) and the longest hold (about 1 s with slow motion still running). Nothing earlier is bigger or tighter, or the film peaks too early.
- **End card.** Logo, tagline, call to action. The CTA is a real next step (a URL, "Start free", "Try it in your help center"); if none is known, ask the owner. Same crisp rules (letters rise from an offset, no blur, no fade from nothing). **About 2–2.5 s in total**: entrance ~0.6 s, a readable rest of at least 1.2 s, then the landing. Four or five seconds of a static card reads as stalled (`motion.mjs` reports it). The brand line is held longer than any caption, because it is what the viewer takes away. Keep the entrance plain: letters that wobble or restart look odd on the one frame everybody remembers.
- **Causality.** An interaction is a promise: the cursor travels to a control in its *before* state, presses it, and the screen changes on that press. Capture both states (`tab-overview` → `tab-radar`, `toggle-off` → `toggle-on`) and swap on the click frame. Clicking a tab that is already active, a toggle already on or an item already selected makes the film look fake. If you only have the *after* state, cut to it instead of faking a click.
- **Live stays live.** Whatever moves in the real app (map or radar loops, live charts, clocks, spinners, typing) moves in the film: capture enough distinct frames (`capture.mjs` warns on identical ones) or rebuild the motion with tweens. A still or a crossfade of two frames reads as broken.
- **Polish pass.** Before the stills gate, check every interaction at 0.1 s steps (`sheet.mjs <html> <t-0.3> <t+0.5> 0.1`): cursor arrives, press, state change, settle. Most "unfinished" feedback comes from these 0.5 s windows.
- **Landing.** The last line of copy is complete at least 1.2 s before the end, so it can be read. Over that last stretch motion decelerates to rest (a camera push with an `out` ease that stops on the final frame, not a linear push running into the last frame) and the film resolves: a 0.3–0.5 s fade to the card's own colour (the background colour only for a neutral card: fading an amber flood to the page colour leaves a washed last frame), or, for a looping WebP, a final frame that matches the first. A film that is still moving or typing on its last frame reads as a hard cut. The rest itself is not a still hold of more than about 1.5 s: a slow push or a glow keeps it alive. With music, the final hit lands before this rest, not on the last frame.

## Pacing rules

1. **Something moves in every frame, and something changes every beat.** Camera drift, a counter, a cursor, a chart (a 1.0 → 1.07 drift counts as moving; a held camera needs something else moving). This is the one stillness rule, and the number is about 1 s because that is where a viewer starts to read a picture as frozen: no span longer than about 1 s without a visible change, except the end card's landing rest. `motion.mjs` measures it on the MP4. A how-to result hold (1.5–2 s) keeps a ring, counter or cursor moving, so it passes.
2. *(launch, teaser, hype)* **A new visual idea every 1–2 s in a 20 s film** (every 2–3 s at 45 s). Cut, new view, new zoom target, new interaction.
3. **Interactions, not swaps.** Whole screens appearing instantly is the weakest thing a film can do. Show the cursor moving and clicking, the route transitioning, the list filling, the number counting.
4. *(launch, teaser, hype; how-to steps run 2–5 s)* **One idea per shot**, shot length 1.2–2.2 s. Longer than 2.5 s needs two moving things in sequence.
5. **The cut frame is crisp.** On a cut the new thing is already sharp and fully opaque, entering by offset, scale or a small blur, never a fade from 0 or 0.35 (it reads as dim or late). The rule and the code: `film-api.md`, *Cut on a hit*.
6. *(dark-UI products, hype films)* **Don't leave the frame dark.** At least two thirds of the frames of a dark-UI film should have a bright, large element (a number, a light panel, a headline). Continuous dark UI past about 4 s feels heavy: alternate with a light or kinetic card (a flood-colour word, a white caption card, a light-theme screen, the theme reveal). A dark-only app has no light theme to fall back on, so the kinetic cards are the tool. A dialog or palette shot is dark by default: zoom onto it.
7. **Easing carries energy.** Fast in, soft out (`expo.out`, `power3.out`) for arrivals; `power2.inOut` for camera moves; `none` only for slow continuous drifts and scrubs.
8. **A silence gap before the drop needs a tense image.** The gap is where anticipation builds, so don't fill it with the flattest shot: use an anticipation shot (a slow push on the thing about to change, a cursor hovering, a counter about to tick, type held mid-word) so the drop releases something.
9. **One scene per hard cut.** A montage or screen wall made of camera cuts inside a single scene reads as a pile of jumps to the audit (dozens of lines); build each cut as its own scene (`shots.md`, 8).

## Framing rules

- **The camera always lands on content.** The target (a number, a chart, an input with its text) fills 40–70% of the frame: smaller reads as distant, larger crops what the viewer needs. Exceptions: tilt (shot 11, window at 85–95%), split screen (shot 8, three panels), zoom-through (shot 9, the number at 5×) and a dialog or palette, which fills at least 50% (zoom onto it, the scrim must not make the frame dark). Never zoom onto empty toolbar, empty margin, or the top of a card whose number is below the fold. Check each end point of a camera tween in a still.
- **`focus()` clamps to the replica's box**, which keeps stage margins out of frame but pins the view to the app's edge: a target near the top or bottom (below y ≈ 800 or above y ≈ 280 at 1.5–2.3×) can't be centred, and an input with typed text wants its aim point a third into the frame. Scroll `.main` first (`shots.md` 7), or lift the clamp (`film-api.md`, *Helpers*, `focus`).
- **Don't zoom content beyond its native resolution.** A canvas captured at DPR 2 stays sharp up to about 1.9× on screen; beyond that it softens, and a canvas captured at DPR 1 is soft from 1.0×. Check the end point of a push in a full-resolution still. Past the limit, hold it at most a bar and keep things moving (cursor, a counter, a cut-in of a crisp detail).
- **Aim at the thing, not at the strip.** `center()` of a full-width element is the middle of its strip. Measure the number, the icon or the text inside it.
- **Text on screen is at least ~28 px after zoom** (UI text × camera scale) for README, website and desktop viewing. **Social feeds (X, LinkedIn, Instagram, muted autoplay): at least 56 px**, key claim 90 px or more, because a 16:9 video on a phone feed is about 390 px wide and 28 px shrinks to about 6 px. Ask in the Brief where it will be posted and write the minimum into the scenario's *min text px* column. 56 px is for **copy the film adds** (captions, headlines, type cards). Real app UI text (16 px body, 14 px nav) can't reach it by zoom without losing the frame: lift the one key word or number out as type (`shots.md`, *Key number over dimmed UI*), treat ambient chrome (labels, nav, card text) as imagery that proves the product is real, and don't chase it with zoom.
- **Frame a rectangle, not a point:** to fit a column, card or form use `focusRect` (`shots.md`, *Frame a rect*) so padding and edges come out right.
- **Overlays far from the action** (a fixed toast in the bottom-right corner) end up outside a zoomed frame: move the captured overlay next to its target inside the scene (`shots.md`).
- **Every click is readable.** Before the press, the camera frames the control so it sits in the central ~60% of the frame at a readable size, and the cursor travels a visible path to it: the viewer must see what is clicked and what changes. A control at the frame edge, in a corner, cropped or off-screen can't be read (a sidebar nav at 1.1× sits in the outer 15%): frame the control for the press, then move to the result. A control stuck at the window's or app's edge (a size badge and download button at the bottom, a toggle at the side) can't be centred while the camera is clamped to the replica: for the press pass the stage box (0..1920) as `box` or use `over` (`film-api.md`, `focus`) so the margin shows as stage, or cut to a big overlay of the result (a copy of the badge, a key number). Two camera tweens in sequence, never overlapping.
- **Every swap or reveal hides the copy it covers**, or glass cards show the old state through the new one (`replicas.md`, *Pitfalls*).
- **Counters on captured DOM end on the app's real value and never show one the app doesn't**: a number that overshoots, or a total the real screen doesn't compute, reads as fake to anyone who uses the product.
- **Fewer words.** A caption earns its place only when the picture can't say it (a number's meaning, a step in a how-to): two or three lines in a 20–30 s film are plenty. Spend the time on the end card, where the name and line stay up longer.
- **Captions go in the margin or the empty corner, never over content,** are opaque white or solid dark, and are appended to the scene after `wrap()` so they don't zoom (how: `film-api.md`, *Captions*). Full-bleed UI has no free margin: put the line in the cut-in before or after the shot, or a short kinetic word card, never over stats or numbers. A how-to needs the instruction to persist: reserve a caption band (`shots.md`, *Step-bar caption*). A caption must be fully visible on the cut frame, so its entrance is a small offset, never −500 px.
- **Theme reveal** with the toggle far from the content: `shots.md` 12.

## Silent films

The one place for silent guidance (other files link here). For a film with no music (muted autoplay, a README WebP, music coming later):
- **No sound-coded effects:** no `hits` (`hits: []`), no shake, no pulse on every beat, no rings, no hard flashes, no stamp thud, no glitch. They read as hits of a sound that isn't there. `env.js` stays `window.ENV = null;`.
- **Energy comes from** camera moves, fast cuts, counters, cursor motion and easing. Silent needs *more* motion, not less.
- **A personal site's payoff is its closing contact ask** (`film-types.md`, *Landing page*): the peak (best work shown big) comes before it, not at 60–75 %.
- **Pick the BPM for the length** (`music-map.md`, *No music*): a beat that is a whole number of frames and whole bars that fill the film.
- **Cuts stay on the bar grid** (`music.mjs grid` prints it) so music can be added later by re-timing. `MUSIC.md` is a short file, first line `SILENT, <bpm> BPM, duration <s> s`, then the bar grid and the role of each bar. `GRID DRAFT` is only for a Suno track that is still pending.
- **The biggest move is the silent film's peak** (launch or teaser; a how-to's payoff is the changed state): a whip pan, zoom-through or route transition at 60–75% of the film, and the payoff lands on it.
- **Scenario:** use the normal template with its silent variant (a *beat* column, *on the cut frame*: sharp and opaque). Say "peak" or "payoff", not "drop".
- **Website hero or muted autoplay:** ask whether it loops; a loop wants a last frame that matches the first, and the story must read without sound.
- **Motion vocabulary:** use word per beat, letter drop, typing (jittered human timing, not onsets), focus zoom (pull back on the beat, no shake), screen wall and caret ending. Skip stamp, glitch and shockwave: they are sound-coded.
- **Captions** carry the story more than in a film with music: opaque, in a free corner.
- **For a README:** render crisp, then `webp.mjs` (`render.md`).

## Red flags

Each of these came from a film that was technically clean and still judged weak.

| in the stills or the scenario | fix |
|---|---|
| A viewer can't tell what the product is | Add the identity opening that fits the audience (`film-types.md`) |
| The hero and situation appear only in the payoff caption | Set the thread up in the first act |
| A feature tour instead of one concrete case | Rewrite as problem → hero → action → payoff |
| A view from PRODUCT.md missing from the film | Add it to a montage (shot 8) or name why it is skipped |
| A zoom whose end frame shows empty chrome or the top of a card | Re-aim at the content; measure the number or text, not the container |
| A shot still for over ~1 s | Add the moving thing (shots 3, 4, 5) or cut it to 0.8 s |
| A screen that appears with no interaction | Add cursor + click, or a route transition (shots 2, 6) |
| A click on a control at the frame edge or in a corner | Frame the control for the press first |
| Half the film is dark UI, or a dialog shot is mostly scrim | Add the light theme, a bright number, a white caption, a light end card; zoom onto the dialog |
| Dense or plain UI carries the film | Lift the numbers into big type, zoom one changing cell, keep table shots short |
| The payoff is not the biggest, tightest, longest shot | Re-frame it tighter and hold it longest; shrink what outranks it |
| An end card that is a static hold of 4–5 s | About 2–2.5 s including the entrance |
| Dim cut frames (opacity 0.35) | Enter by offset/scale from full opacity |
| A caption over the content, or half-faded on its first frame | Move it to the margin; offset-only entrance |
| Words/UI text under ~28 px after zoom (56 in a social feed) | Zoom further or carry it by a type card |
| A swapped state with the old one showing through (glass ghosting) | Hide the covered copy |
| Fake beat effects in a silent film | Remove; use motion and cuts (*Silent films*) |
| A shot that animates something that isn't in the real app | Replace with what the real app does |

**Camera defaults.** One framing per burst of clicks, not one zoom per click: `autoCam` (`film-api.md`) merges clicks closer than 2.5 s, keeps each click in the central 60 % and stays wide when a click cannot be framed. Pointers keep their size under zoom; use `spot`/`loupe` instead of a camera move for a tiny detail.

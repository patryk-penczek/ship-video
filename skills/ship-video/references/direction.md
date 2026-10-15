# Direction: structure, pacing, framing

Read at step 1b (coverage, story), before writing the scenario (step 4) and in the review (step 7). The 14-shot library with code is `shots.md`, read at step 6. Silent does not mean calm: without music, motion, cuts and easing are the whole rhythm.

## Contents
- Film structure by length
- Film types: how-to, one-feature teaser, landing page, phone and narrow apps
- Story
- Pacing rules
- Framing rules
- Silent films
- Reference film
- Coverage rule
- Shot library (pointer to `shots.md`)
- Red flags

## Film structure by length

**Identity first: decide by who watches.** A film that doesn't say what the product is cannot persuade anyone who doesn't already know it: a teaser that says "here is a price, here is how to buy it" fails strangers however polished it is. So Brief and Discovery must settle **who the intended viewer is and what they already know**, and the scenario states it in its header.
- **Strangers** (launch, social feed, landing page, README, ads; the default when unsure): by about 3 s they know **what the product is, who it's for and what it does**, and have seen the product itself doing its main job: name + the one-sentence promise + a real glimpse of its core view moving. Only then the topic. This doesn't contradict "never a logo-only opening": identity is the name and promise **on the product working** (a headline over the live UI, a name badge in the margin), not a logo card. A launch film needs it as much as a pricing teaser. The audience and promise come from the product's own words (README, site, store listing: the research subagent), not from your guess. The end card repeats name + promise.
- **People who already use the product** (help-center how-to, changelog or release note, in-app onboarding): they don't need a pitch. A **1 s anchor** (product name and where in the app we are) is enough, then the task. Identity copy here would be padding.
- Either way the viewer must be able to say, muted, what this is for them, why it matters and what to do next.

**Intended-viewer test** (run it on the scenario and on the stills; the critic is told who the viewer is): could that viewer, watching muted, say (1) what is this, (2) why does it matter to me, (3) what should I do next? For strangers add "who is it for". A "no" is a rewrite, not a polish. The table below assumes the stranger default; for a one-feature, pricing or how-to film that means 0-3 s identity, then the topic, then an end card with name + promise.

| length | hook | promise | tour | payoff | end card |
|---|---|---|---|---|---|
| 15 s | 0–1.5 | 1.5–3 | 3–10, 3–4 shots of ~2 s | 10–12.5 | 12.5–15 |
| 20 s | 0–1.5 | 1.5–4 | 4–15, 6–7 shots | 15–18 | 18–20 |
| 30 s | 0–2 | 2–6 | 6–23, 8–10 shots, one breather | 23–27 | 27–30 |
| 45 s | 0–2 | 2–8 | 8–36, 12–15 shots in 2–3 chapters | 36–42 | 42–45 |

The table is for launch and hype films (other types: *Film types* below). In a silent film the payoff sits on the strongest bar 60–75% in; for 15 s that is 10–12.5 s, which is why that row ends the tour at 10.

- **Hook (first second).** The first frame already shows the strongest image or word, full size and sharp, and something is already moving. Never a black or logo-only opening. Good hooks: the product's most distinctive moving thing (a live chart, a map, a canvas), a one-word headline with the app rising over it, a question typed into the app's own input.
  - *Data or map product on a dark UI:* a dark soft canvas with a chrome strip is the weakest opening. Put a big question (60–70% of the frame width, light on dark) over the zoomed live canvas plus one counter that changes, and cut to the crisp app on the first hit. Don't let a caption cover the canvas controls.
  - *Any dark-UI product:* open on a bright type card or a flood colour with the first word, and bring the app in on the first kick.
- **Promise.** One line of copy, the sentence from PRODUCT.md. On screen with motion, not as a held title.
- **Tour.** One shot per view or wow moment from PRODUCT.md, ordered by what the viewer needs to understand, not by the sidebar. Every shot has one thing that moves in it (see `shots.md`).
- **Payoff.** The result of using the product, not another feature: the answer arrives, the alert fires, the number lands. It is the **peak of the film**: the tightest framing (the result fills 60-70% of the frame), the biggest motion (the largest zoom, count or pull-back of the film) and the longest hold (about 1 s with slow motion still running). Nothing earlier is bigger or tighter.
- **End card.** Logo, tagline, call to action. The CTA is a real next step (a URL, "Start free", "Try it in your help center"); if none is known, ask the owner. The same crisp rules apply: letters rise from an offset, no blur, no fade from nothing.
- **Causality.** An interaction is a promise: the cursor travels to a control in its *before* state, presses it, and the screen changes on that press. Capture both states (`tab-overview` → `tab-radar`, `toggle-off` → `toggle-on`) and swap on the click frame. Never click a tab that is already active, a toggle already on, or an item already selected: viewers notice instantly and the film looks fake. If you only have the *after* state, cut to it instead of faking a click.
- **Live stays live.** Whatever moves in the real app (map or radar loops, live charts, clocks, spinners, typing) moves in the film: capture enough distinct frames (`capture.mjs` warns on identical ones) or rebuild the motion with tweens. A still or a crossfade of two frames reads as broken.
- **Polish pass.** Before the stills gate, check every interaction at 0.1 s steps (`sheet.mjs <html> <t-0.3> <t+0.5> 0.1`): cursor arrives, press, state change, settle. Most "unfinished" feedback comes from these 0.5 s windows.
- **Landing.** The last line of copy is complete at least 1.2 s before the end, so it can be read. Over that last stretch motion decelerates to rest (camera push with an `out` ease that stops on the final frame, never a linear push running into the last frame) and the film resolves: a 0.3–0.5 s fade to the card's own colour (the background colour only for a neutral card: fading an amber flood to the page colour leaves a washed last frame), or, for a looping WebP, a final frame that matches the first. A film that is still moving or still typing on its last frame reads as a hard cut, as if it didn't fit. With music, the final hit lands before this rest, not on the last frame.

## Film types

Pick the type in the Brief; it decides which rules apply. **Pacing rules 2, 4 and 6 are for launch, teaser and hype films** (marked there); a how-to is exempt from them but never from rule 1 (something always moves).

### How-to / tutorial
- **Opening:** identity per the audience rule (a 1 s anchor for existing users), then a title that names the task ("Move a task, then open its details").
- **Numbered steps**, one idea each, **2-5 s per step**, with a **readable hold of 1.5-2 s** at the end of each so the result can be read. Steps are numbered in a **persistent caption band** (`shots.md`, *Step-bar caption*): the instruction stays while the viewer watches the action, so it is not a pill over content.
- Every step is cursor (or finger) arrives, press, **visible result**. Slower pacing is fine, but still motion: cursor travel, a ring on the changed element, counters updating.
- **Payoff = the visible changed state** of the task, held 1.5 s or more (the card in its new column, the plan now selected) and called out, not a bigger zoom. No hooks, no hype, no drop. End with a recap line or the end card.
- Text rules still hold: band text 28 px or more (56 for feeds).

### One-feature / pricing teaser (15-20 s)
- **0-3 s identity** (name, promise, the core view moving), **then the feature** with its payoff (the number changes, the plan is chosen), **then identity + CTA** as the end card.
- Coverage is the feature's own view plus its payoff. Name every other view or section as skipped in SCENARIO.md with "not this feature". If the repo doesn't say what's new, ask that one question in the Brief.
- Say the benefit once in type and once in the end card at most; don't spend half the film touring the page.

### Landing page / marketing site
- **Sections are not views.** Discovery inventories every section (hero, features, pricing, proof, FAQ, footer) with its **scroll-reveal animations and CSS-drawn effects** (a chart that draws itself is a wow moment); sections hidden until scrolled are captured after scrolling to them (`replicas.md`).
- Coverage = what serves the message. Don't tour the page top to bottom: pick the 2-4 sections that carry the promise and **name every skipped section** in SCENARIO.md. Tall pages: `shots.md` 7.
- The page already has its own headline and copy: use it, and don't invent claims it contradicts (list conflicting claims in PRODUCT.md and use the one the prices support).

### Phone and narrow apps
A web app built for a phone (390x844, a PWA) captures fine; only a native app has no DOM. In 16:9 it is a column about 22% of the frame wide, so:
- **Zoom 2.0-2.4x** to reach text of 28 px or more (56 for feeds); a lower zoom leaves tiny text in a big empty frame.
- **Big copy goes in the side margins, outside the camera layer**, so it doesn't zoom with the app: one side per act, words no wider than the margin (about 112 px or less per word), alternating sides between acts. The app column stays the hero.
- **A finger, not a cursor** (a round dot with a ripple; a swipe = the dot moving with the row). A phone frame or soft shadow gives the column depth.
- A pale column on a pale page is a weak hook: put a flood colour or a bright type card behind it.
- Scenario template: use the *margin copy* column.
- Any app narrower than the frame (a centred board, a top-heavy dashboard): crop windows that align to column or card edges (`rect(col)` as the box, the rect-framing helper) and never slice a word at the frame edge.

## Story

Every film is one story: **problem → hero → action in the app → payoff that closes the problem.** One concrete case carries it (a person, a city, a file, a number in a real situation); features appear only as steps of that case. PRODUCT.md (Discovery) supplies the case and the promise. The payoff lands on the drop (silent: the strongest bar, 60–75% in). Test: tell the film in three sentences without naming a feature. Type and camera techniques that serve each beat, with code and music events, are in `motion-vocabulary.md`.

## Pacing rules

1. **Something moves in every frame, and something changes every beat.** Camera drift, a counter, a cursor, a chart. This is the one stillness rule (other files link here): no shot is fully still for more than a bar (2 s at 120 BPM). A camera drift of 1.0 → 1.07 over the shot counts as moving; a held camera needs something else moving.
2. *(launch, teaser, hype)* **A new visual idea every 1–2 s in a 20 s film** (every 2–3 s at 45 s). Cut, new view, new zoom target, new interaction.
3. **Interactions, not swaps.** Whole screens appearing instantly is the weakest thing a film can do. Show the cursor moving and clicking, the route transitioning, the list filling, the number counting.
4. *(launch, teaser, hype; how-to steps run 2–5 s)* **One idea per shot**, shot length 1.2–2.2 s. Longer than 2.5 s needs two moving things in sequence.
5. **Entrances are crisp on cut frames.** The frame of a cut shows the new thing sharp and fully opaque. Enter by position (offset), scale (0.9–1.2) or a small blur (≤ 6 px) from full opacity. Never a fade from 0 or 0.35: it reads as dim.
6. *(dark-UI products, hype films)* **Don't leave the frame dark.** At least two thirds of the frames of a dark-UI film should have a bright, large element (a number, a light panel, a headline). Limit continuous dark UI to about 4 s: alternate with a light or kinetic card (a flood-colour word, a white caption card, a light-theme screen, the theme reveal). A dark-only app has no light theme to fall back on, so the kinetic cards are the tool. A dialog or palette shot is dark by default: zoom onto it.
7. **Easing carries energy.** Fast in, soft out (`expo.out`, `power3.out`) for arrivals; `power2.inOut` for camera moves; `none` only for slow continuous drifts and scrubs.

## Framing rules

- **The camera always lands on content.** The target (a number, a chart, an input with its text) fills 40–70% of the frame. Exceptions, stated once here: tilt (shot 11, window at 85–95%), split screen (shot 8, three panels), zoom-through (shot 9, the number at 5×) and a dialog or palette, which fills at least 50% (zoom onto it, the scrim must not make the frame dark). Never zoom onto empty toolbar, empty margin, or the top of a card whose number is below the fold. Check each end point of a camera tween in a still.
- **`focus()` can't centre what is near the frame's top or bottom edge** (below y ≈ 800 or above y ≈ 280 of the 1080 frame at 1.5–2.3×): the clamp stops the view at the app's edge, so the zoom lands off-target. Scroll `.main` first (shots 7, *target at the bottom*, you may scroll past the page's end), then aim, subtracting the scroll; or use `focus()` without the clamp (`clamp: false`, or the unclamped variant in `film-api.md`, *Captured DOM recipes*) when the shot may show the stage margin.
- **Don't zoom blurry content beyond its native resolution.** A canvas captured as frames (a radar, a map) is soft: at 2× it is blobs. Show it at ≤ 1.3×, hold it at most a bar, and keep things moving (cursor, a counter, a cut-in of a crisp detail) instead of a long push on the canvas.
- **Aim at the thing, not at the strip.** `center()` of a full-width element is the middle of its strip. Measure the number, the icon or the text inside it.
- **Text on screen is at least ~28 px after zoom** (UI text × camera scale) for README, website and desktop viewing. **Social feeds (X, LinkedIn, Instagram, muted autoplay): at least 56 px**, key claim 90 px or more, because a 16:9 video on a phone feed is about 390 px wide and 28 px shrinks to about 6 px. Ask in the Brief where it will be posted and write the minimum into the scenario's *min text px* column. If the label you care about is smaller, zoom more or carry it by a type card. An animated WebP isn't postable to X or LinkedIn: post the MP4.
- **Frame a rectangle, not a point:** to fit a column, card or form use the engine's rect-framing helper (`shots.md`, *Frame a rect*) so padding and edges come out right.
- **Overlays far from the action** (a fixed toast in the bottom-right corner) end up outside a zoomed frame: move the captured overlay next to its target inside the scene (`shots.md`).
- **Keep the click target in frame until the click lands**, then move the camera to the result. Two camera tweens in sequence, never overlapping.
- **`focus()` clamps to the replica's rect** (`box`). That keeps stage margins out of frame but also pins the view to the app's edge: aim at the point you want 1/3 into the frame, not at its centre, if the left part matters (e.g. an input with typed text).
- **Every click is readable.** Before the press, the camera frames the control so it sits in the central ~60% of the frame at a readable size, and the cursor travels a visible path to it; the viewer must see what is clicked and what changes. Never click something at the frame edge, in a corner, cropped or off-screen: if the control and its result are far apart, frame the control for the press, then move to the result.
- **Fewer words.** A caption earns its place only when the picture can't say it (a number's meaning, a step in a how-to). Don't add one per shot by habit: two or three lines in a 20–30 s film are plenty. Spend the time saved on the end card: the product's name and line stay up longer (about 2–2.5 s readable, then the landing).
- **Captions go in the margin or the empty corner, never over content,** are opaque white or solid dark, and are appended to the scene after `wrap()` so they don't zoom. The engine default is the bottom-left corner: if that covers content in the shot, put the caption in a free corner (`film-api.md`, *Captions*). **Full-bleed UI has no free margin:** then don't use a pill. Put the line in the cut-in just before or after the shot, or as a short kinetic word card, never over stats or numbers. A how-to needs the instruction to persist: reserve a caption band (`shots.md`, *Step-bar caption*) and frame the action in the rest. A caption must be fully visible on the cut frame: use the default small offset (the pill is already mostly on-screen) or no x-offset at all on that frame; a −500 px offset leaves it half out on the hit.

### Theme reveal when the toggle and the content are far apart
On real dashboards the toggle sits in a corner and the number that shows the theme is a thousand pixels away, so one camera can't frame both at 1.4× or more. Either reveal at 1.0–1.2× with both in frame (small text is acceptable for 0.5 s) and push in on the content afterwards, or cut to the toggle (cursor press), then reveal on a cut that already frames the content. Keep the reveal short (about 0.45 s) and hide the covered copy at its end: translucent glass cards of the old theme show the new one through them while both are visible (`shots.md` 12).

## Silent films

The one place for silent guidance (SKILL.md, scenario, lessons and motion vocabulary link here). For a film with no music (muted autoplay, a README WebP, music coming later):
- **No sound-coded effects:** no `hits` (`hits: []`), no shake, no pulse on every beat, no rings, no hard flashes, no stamp thud, no glitch. They read as hits of a sound that isn't there. `env.js` stays `window.ENV = null;`.
- **Energy comes from** camera moves, fast cuts, counters, cursor motion and easing. Silent needs *more* motion, not less.
- **Pick the BPM for the length** (`music-map.md`, *No music*): a beat that is a whole number of frames and whole bars that fill the film (15 s: 144 BPM = 9 bars; 20 s: 120 BPM = 10 bars).
- **Cuts stay on the bar grid** (`music.mjs grid` prints it) so music can be added later by re-timing: at 120 BPM a cut every 0.5, 1.0 or 2.0 s. `MUSIC.md` is a 3-line file, first line `SILENT, <bpm> BPM, duration <s> s`, then the bar grid and the role of each bar (problem on bar 1, payoff on the strongest bar). `GRID DRAFT` is only for a Suno track that is still pending.
- **The biggest move is the silent film's peak** (launch or teaser; a how-to's payoff is the changed state instead): a whip pan, zoom-through or route transition at 60–75% of the film, and the payoff lands on it.
- **Scenario:** use the normal template; drop the Music column and the "on the hit frame" column, add a *beat* column (bar.beat) and keep *on the cut frame*: sharp and opaque (`scenario-template.md`, silent variant). Say "peak" or "payoff", not "drop".
- **Website hero or muted autoplay:** ask whether it loops; a loop wants a last frame that matches the first, and the story must read without sound.
- **Motion vocabulary:** use word per beat, letter drop, typing (jittered human timing, not onsets), focus zoom (pull back on the beat, no shake), screen wall and caret ending. Skip stamp, glitch and shockwave: they are sound-coded.
- **Captions** carry the story more than in a film with music: opaque, in a free corner, text ≥ 28 px.
- **For a README:** render crisp, then `webp.mjs` (SKILL.md step 9).

## Coverage rule

Coverage depends on the film type. A **launch film** shows every major view in PRODUCT.md at least briefly, and every wow moment; if they don't fit in sequence, use a split-screen montage or a 0.8 s-per-view run (shots 6, 8, 10). A **one-feature teaser** covers the feature's view and its payoff; a **how-to** covers the task's views; a **landing page** covers the sections that carry the message. **Error pages are not product.** Real product films almost never show a 404 or an error state, and a viewer learns nothing from one. Discovery still inventories them (they can hide a visual worth borrowing), but leave them out by default. Only if one contains something genuinely striking (an animation, a mini-game, an illustration) may it appear as a **1–2 s aside**, never a scene of its own and never in place of a real feature (shot 13). Empty states ("no tasks yet") are worth showing only when the film is about getting started. **Everything you skip is named in SCENARIO.md with a reason** ("not this feature", "outside the two tasks"); an unexplained gap is a bug.

## Shot library

The 14 shots with code (hook, cursor and typing, counters, scrubbed chart, list stagger, route transition, tall-page scroll, split screen, zoom-through, whip pan, tilt, theme reveal, 404, end card, plus dialog and payoff shots) are in `shots.md`, read at step 6. Shot numbers in this file refer to it.


## Reference film

When the user has a film whose feel they want: break it into a frame sheet (`sheet.mjs` reads film pages, not MP4s): `ffmpeg -i ref.mp4 -vf "fps=2,scale=480:-1,tile=6x5" <film>/review/reference.png`, Read it, list its techniques (cut rhythm, type, camera, colour, what moves) and propose your own character that borrows the techniques, never the content.

## Red flags

| in the stills or the scenario | fix |
|---|---|
| A zoom whose end frame shows empty chrome or the top of a card | Re-aim at the content; measure the number or text, not the container |
| A shot fully still for a bar | Add the moving thing (shots 3, 4, 5) or cut it to 0.8 s |
| A screen that appears with no interaction | Add cursor + click, or a route transition (shots 2, 6) |
| Half the film is dark UI, or a dialog shot is mostly scrim | Add the light theme, a bright number, a white caption, a light end card; zoom onto the dialog |
| The payoff is not the biggest, tightest, longest shot | Re-frame it tighter and hold it longest; shrink what outranks it |
| A view from PRODUCT.md missing from the film | Add it to a montage (shot 8) or name why it is skipped |
| Dim cut frames (opacity 0.35) | Enter by offset/scale from full opacity |
| A caption over the content, or half-faded on its first frame | Move it to the margin; offset-only entrance |
| Words/UI text under ~28 px after zoom (56 in a social feed) | Zoom further or caption it |
| A viewer can't tell what the product is | Add the identity opening that fits the audience (*Identity first*) |
| Fake beat effects in a silent film | Remove; use motion and cuts (*Silent films*) |
| A shot that animates something that isn't in the real app | Replace with what the real app does |

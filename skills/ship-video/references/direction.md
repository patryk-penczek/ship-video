# Direction: structure, pacing, framing

Read at step 1b (coverage, story), before writing the scenario (step 4) and in the review (step 7). The 14-shot library with code is `shots.md`, read at step 6. Silent does not mean calm: without music, motion, cuts and easing are the whole rhythm.

## Contents
- Film structure by length
- Story
- Pacing rules
- Framing rules
- Silent films
- Reference film
- Coverage rule
- Shot library (pointer to `shots.md`)
- Red flags

## Film structure by length

| length | hook | promise | tour | payoff | end card |
|---|---|---|---|---|---|
| 15 s | 0–1.5 | 1.5–3 | 3–11, 4 shots of ~2 s | 11–13 | 13–15 |
| 20 s | 0–1.5 | 1.5–4 | 4–15, 6–7 shots | 15–18 | 18–20 |
| 30 s | 0–2 | 2–6 | 6–23, 8–10 shots, one breather | 23–27 | 27–30 |
| 45 s | 0–2 | 2–8 | 8–36, 12–15 shots in 2–3 chapters | 36–42 | 42–45 |

- **Hook (first second).** The first frame already shows the strongest image or word, full size and sharp, and something is already moving. Never a black or logo-only opening. Good hooks: the product's most distinctive moving thing (a live chart, a map, a canvas), a one-word headline with the app rising over it, a question typed into the app's own input.
  - *Data or map product on a dark UI:* a dark soft canvas with a chrome strip is the weakest opening. Put a big question (60–70% of the frame width, light on dark) over the zoomed live canvas plus one counter that changes, and cut to the crisp app on the first hit. Don't let a caption cover the canvas controls.
  - *Any dark-UI product:* open on a bright type card or a flood colour with the first word, and bring the app in on the first kick.
- **Promise.** One line of copy, the sentence from PRODUCT.md. On screen with motion, not as a held title.
- **Tour.** One shot per view or wow moment from PRODUCT.md, ordered by what the viewer needs to understand, not by the sidebar. Every shot has one thing that moves in it (see `shots.md`).
- **Payoff.** The result of using the product, not another feature: the answer arrives, the alert fires, the number lands. It is the **peak of the film**: the tightest framing (the result fills 60-70% of the frame), the biggest motion (the largest zoom, count or pull-back of the film) and the longest hold (about 1 s with slow motion still running). Nothing earlier is bigger or tighter.
- **End card.** Logo, tagline, call to action. The same crisp rules apply: letters rise from an offset, no blur, no fade from nothing.
- **Causality.** An interaction is a promise: the cursor travels to a control in its *before* state, presses it, and the screen changes on that press. Capture both states (`tab-overview` → `tab-radar`, `toggle-off` → `toggle-on`) and swap on the click frame. Never click a tab that is already active, a toggle already on, or an item already selected: viewers notice instantly and the film looks fake. If you only have the *after* state, cut to it instead of faking a click.
- **Live stays live.** Whatever moves in the real app (map or radar loops, live charts, clocks, spinners, typing) moves in the film: capture enough distinct frames (`capture.mjs` warns on identical ones) or rebuild the motion with tweens. A still or a crossfade of two frames reads as broken.
- **Polish pass.** Before the stills gate, check every interaction at 0.1 s steps (`sheet.mjs <html> <t-0.3> <t+0.5> 0.1`): cursor arrives, press, state change, settle. Most "unfinished" feedback comes from these 0.5 s windows.
- **Landing.** The last line of copy is complete at least 1.2 s before the end, so it can be read. Over that last stretch motion decelerates to rest (camera push with an `out` ease that stops on the final frame, never a linear push running into the last frame) and the film resolves: a 0.3–0.5 s fade to the background colour, or, for a looping WebP, a final frame that matches the first. A film that is still moving or still typing on its last frame reads as a hard cut, as if it didn't fit. With music, the final hit lands before this rest, not on the last frame.

## Story

Every film is one story: **problem → hero → action in the app → payoff that closes the problem.** One concrete case carries it (a person, a city, a file, a number in a real situation); features appear only as steps of that case. PRODUCT.md (Discovery) supplies the case and the promise. The payoff lands on the drop (silent: the strongest bar, 60–75% in). Test: tell the film in three sentences without naming a feature. Type and camera techniques that serve each beat, with code and music events, are in `motion-vocabulary.md`.

## Pacing rules

1. **Something moves in every frame, and something changes every beat.** Camera drift, a counter, a cursor, a chart. This is the one stillness rule (other files link here): no shot is fully still for more than a bar (2 s at 120 BPM). A camera drift of 1.0 → 1.07 over the shot counts as moving; a held camera needs something else moving.
2. **A new visual idea every 1–2 s in a 20 s film** (every 2–3 s at 45 s). Cut, new view, new zoom target, new interaction.
3. **Interactions, not swaps.** Whole screens appearing instantly is the weakest thing a film can do. Show the cursor moving and clicking, the route transitioning, the list filling, the number counting.
4. **One idea per shot**, shot length 1.2–2.2 s. Longer than 2.5 s needs two moving things in sequence.
5. **Entrances are crisp on cut frames.** The frame of a cut shows the new thing sharp and fully opaque. Enter by position (offset), scale (0.9–1.2) or a small blur (≤ 6 px) from full opacity. Never a fade from 0 or 0.35: it reads as dim.
6. **Don't leave the frame dark.** At least two thirds of the frames of a dark-UI film should have a bright, large element (a number, a light panel, a headline). Limit continuous dark UI to about 4 s: alternate with a light or kinetic card (a flood-colour word, a white caption card, a light-theme screen, the theme reveal). A dark-only app has no light theme to fall back on, so the kinetic cards are the tool. A dialog or palette shot is dark by default: zoom onto it.
7. **Easing carries energy.** Fast in, soft out (`expo.out`, `power3.out`) for arrivals; `power2.inOut` for camera moves; `none` only for slow continuous drifts and scrubs.

## Framing rules

- **The camera always lands on content.** The target (a number, a chart, an input with its text) fills 40–70% of the frame. Exceptions, stated once here: tilt (shot 11, window at 85–95%), split screen (shot 8, three panels), zoom-through (shot 9, the number at 5×) and a dialog or palette, which fills at least 50% (zoom onto it, the scrim must not make the frame dark). Never zoom onto empty toolbar, empty margin, or the top of a card whose number is below the fold. Check each end point of a camera tween in a still.
- **`focus()` can't centre what is near the frame's top or bottom edge** (below y ≈ 800 or above y ≈ 280 of the 1080 frame at 1.5–2.3×): the clamp stops the view at the app's edge, so the zoom lands off-target. Scroll `.main` first (shots 7, *target at the bottom*, you may scroll past the page's end), then aim, subtracting the scroll; or use `focus()` without the clamp (`clamp: false`, or the unclamped variant in `film-api.md`, *Captured DOM recipes*) when the shot may show the stage margin.
- **Don't zoom blurry content beyond its native resolution.** A canvas captured as frames (a radar, a map) is soft: at 2× it is blobs. Show it at ≤ 1.3×, hold it at most a bar, and keep things moving (cursor, a counter, a cut-in of a crisp detail) instead of a long push on the canvas.
- **Aim at the thing, not at the strip.** `center()` of a full-width element is the middle of its strip. Measure the number, the icon or the text inside it.
- **Text on screen is at least ~28 px after zoom** (UI text × camera scale). If the label you care about is smaller, zoom more or show it as a caption.
- **Keep the click target in frame until the click lands**, then move the camera to the result. Two camera tweens in sequence, never overlapping.
- **`focus()` clamps to the replica's rect** (`box`). That keeps stage margins out of frame but also pins the view to the app's edge: aim at the point you want 1/3 into the frame, not at its centre, if the left part matters (e.g. an input with typed text).
- **Captions go in the margin or the empty corner, never over content,** are opaque white or solid dark, and are appended to the scene after `wrap()` so they don't zoom. The engine default is the bottom-left corner: if that covers content in the shot, put the caption in a free corner (`film-api.md`, *Captions*). **Full-bleed UI has no free margin:** then don't use a pill. Put the line in the cut-in just before or after the shot, or as a short kinetic word card, never over stats or numbers. A caption must be fully visible on the cut frame: use the default small offset (the pill is already mostly on-screen) or no x-offset at all on that frame; a −500 px offset leaves it half out on the hit.

### Theme reveal when the toggle and the content are far apart
On real dashboards the toggle sits in a corner and the number that shows the theme is a thousand pixels away, so one camera can't frame both at 1.4× or more. Either reveal at 1.0–1.2× with both in frame (small text is acceptable for 0.5 s) and push in on the content afterwards, or cut to the toggle (cursor press), then reveal on a cut that already frames the content. Keep the reveal short (about 0.45 s) and hide the covered copy at its end: translucent glass cards of the old theme show the new one through them while both are visible (`shots.md` 12).

## Silent films

The one place for silent guidance (SKILL.md, scenario, lessons and motion vocabulary link here). For a film with no music (muted autoplay, a README WebP, music coming later):
- **No sound-coded effects:** no `hits` (`hits: []`), no shake, no pulse on every beat, no rings, no hard flashes, no stamp thud, no glitch. They read as hits of a sound that isn't there. `env.js` stays `window.ENV = null;`.
- **Energy comes from** camera moves, fast cuts, counters, cursor motion and easing. Silent needs *more* motion, not less.
- **Cuts stay on the bar grid** (`music.mjs grid` prints it) so music can be added later by re-timing: at 120 BPM a cut every 0.5, 1.0 or 2.0 s. `MUSIC.md` is a 3-line file, first line `SILENT, <bpm> BPM, duration <s> s`, then the bar grid and the role of each bar (problem on bar 1, payoff on the strongest bar). `GRID DRAFT` is only for a Suno track that is still pending.
- **The biggest move is the silent film's drop:** a whip pan, zoom-through or route transition at 60–75% of the film, and the payoff lands on it.
- **Scenario:** use the normal template; drop the Music column and the "on the hit frame" column, and add a *beat* column (bar.beat) instead (`scenario-template.md`, silent variant).
- **Motion vocabulary:** use word per beat, letter drop, typing (jittered human timing, not onsets), focus zoom (pull back on the beat, no shake), screen wall and caret ending. Skip stamp, glitch and shockwave: they are sound-coded.
- **Captions** carry the story more than in a film with music: opaque, in a free corner, text ≥ 28 px.
- **For a README:** render crisp, then `webp.mjs` (SKILL.md step 9).

## Coverage rule

A launch film shows **every major view in PRODUCT.md at least briefly**, and every wow moment. If the views don't fit in sequence, use a split-screen montage or a 0.8 s-per-view run (shots 6, 8, 10). Error and empty states (a 404, "no results") earn a beat when they carry personality (shot 13). Views you skip must be named in SCENARIO.md with a reason.

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
| Words/UI text under ~28 px after zoom | Zoom further or caption it |
| Fake beat effects in a silent film | Remove; use motion and cuts (*Silent films*) |
| A shot that animates something that isn't in the real app | Replace with what the real app does |

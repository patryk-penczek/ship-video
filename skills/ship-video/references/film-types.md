# Film types, identity, story, coverage

Read at the Brief (step 1), Discovery (1b) and before writing the scenario (step 4). Structure, pacing, framing and silent films are in `direction.md`, read at step 4 and again while building and reviewing.

## Contents
- Identity first: decide by who watches
- Film types: how-to, one-feature teaser, landing page, phone and narrow apps, dense UI, canvas-first
- Story
- What has worked, and what hasn't (owner verdicts)
- Coverage rule
- Reference film

## Identity first: decide by who watches

A film that doesn't say what the product is cannot persuade anyone who doesn't already know it: a teaser that says "here is a price, here is how to buy it" fails strangers however polished it is. So the Brief and Discovery settle **who the intended viewer is and what they already know**, and the scenario states it in its header.
- **Strangers** (launch, social feed, landing page, README, ads; the default when unsure): by about 3 s they know **what the product is, who it's for and what it does**, and have seen the product doing its main job. That means the name and the one-sentence promise **on the working product** (a headline over the live UI, a name badge in the margin, a brand pill over the live canvas plus the hero's question), not a logo card. The hook is still the strongest moving image; identity rides on it. A launch film needs this as much as a pricing teaser. Promise and audience come from the product's own words (README, site, store listing: the research subagent), not from a guess. The end card repeats name and promise.
- **People who already use the product** (changelog, in-app onboarding, a how-to for current users): they don't need a pitch. A **1 s anchor** (product name and where in the app we are) is enough, then the task; identity copy here would be padding, and the film ends on a recap line or the end card without a sales pitch.
- **New users reading docs** (a how-to on a docs page, "your first request"): they know the page, not the interface. Give **2–3 s of identity** (the name and a one-line promise on the live UI), then the task. A 1 s anchor is too little for them.
- **A person, not a product** (personal site, portfolio): the identity is a name and what they do (role, city, what they build), taken from the hero. The Brief asks whose name it is and what they do. The call to action may have no URL ("Send me a message"): ask for the handle or address instead of inventing one.
- **A developer tool or framework demo** (a component library, an admin framework): the product is what you build with it, and the demo app is the evidence. Name the tool in the first 3 s and keep naming it (a badge, the end card). Show each example once (a montage followed by the same apps again reads as padding). The payoff is the tightest, biggest frame of the film (`direction.md`, *Payoff*).

**Intended-viewer test** (run it on the scenario and on the stills; the critic is told who the viewer is): could that viewer, watching muted, say (1) what is this, (2) why does it matter to me, (3) what should I do next? For strangers add "who is it for". A "no" is a rewrite, not a polish.

## Film types

Pick the type in the Brief; it decides which rules apply. *Pacing* rules 2, 4 and 6 in `direction.md` are for launch, teaser and hype films (marked there); a how-to is exempt from them but never from rule 1 (something always moves). Text sizes everywhere follow *Framing* in `direction.md`.

### How-to / tutorial
- **Opening:** identity per the audience (2–3 s for new users such as docs readers, a 1 s anchor for existing ones), then a title that names the task ("Move a task, then open its details").
- **Numbered steps**, one idea each, **2-5 s per step**, with a **readable hold of 1.5-2 s** at the end of each so the result can be read. Steps are numbered in a **persistent caption band** (`shots.md`, *Step-bar caption*): the instruction stays while the viewer watches the action, so it is not a pill over content.
- Every step is cursor (or finger) arrives, press, **visible result**. Slower pacing is fine, but still motion: cursor travel, a ring on the changed element, counters updating.
- **Payoff = the visible changed state** of the task, held 1.5 s or more (the card in its new column, the plan now selected) and called out, not a bigger zoom. No hooks, no hype, no drop. End with a recap line or the end card.

### One-feature / pricing teaser (15-20 s)
- **0-3 s identity** (name, promise, the core view moving), **then the feature** with its payoff (the number changes, the plan is chosen), **then identity + CTA** as the end card.
- Coverage is the feature's own view plus its payoff. Name every other view or section as skipped in SCENARIO.md with "not this feature". If the repo doesn't say what's new, ask that one question in the Brief.
- Say the benefit once in type and once in the end card at most; don't spend half the film touring the page.

### Landing page / marketing site
- **Sections are not views.** Discovery inventories every section (hero, features, pricing, proof, FAQ, footer) with its **scroll-reveal animations and CSS-drawn effects** (a chart that draws itself is a wow moment); sections hidden until scrolled are captured after scrolling to them (`replicas.md`).
- Coverage = what serves the message. Don't tour the page top to bottom: pick the 2-4 sections that carry the promise and **name every skipped section** in SCENARIO.md. Tall pages: `shots.md` 7.
- **A personal site or portfolio** is the same selection with a person as the hero: identity = name, role, city; the end card repeats them with the contact ask. Its payoff is that ask at the end; the best work shown big is the peak just before it (the silent "peak at 60–75 %" is a launch default, not a law).
- The page already has its own headline and copy: use it, and don't invent claims it contradicts (list conflicting claims in PRODUCT.md and use the one the prices support).

### Phone and narrow apps
A web app built for a phone (390x844, a PWA) captures fine; only a native app has no DOM. In 16:9 it is a column about 22% of the frame wide, so:
- **Zoom 2.0-2.4x** to reach readable text; a lower zoom leaves tiny text in a big empty frame.
- **Big copy goes in the side margins, outside the camera layer**, so it doesn't zoom with the app: one side per act, words no wider than the margin (about 112 px or less per word), alternating sides between acts. The app column stays the hero. Scenario template: use the *margin copy* column.
- **A finger, not a cursor** (a round dot with a ripple; a swipe = the dot moving with the row). A phone frame or soft shadow gives the column depth.
- A pale column on a pale page is a weak hook: put a flood colour or a bright type card behind it.
- Any app narrower than the frame (a centred board, a top-heavy dashboard): crop windows that align to column or card edges (`focusRect`) and never slice a word at the frame edge.

### Dense, dated or plain UI (tables, forms, admin tools)
Rows of numbers don't present well, and zooming into a table only shows more table. Carry the film with the story and the moment something changes, not with the UI.
- **Lift the key numbers out** as big kinetic type (60–70% of the frame width) over the UI dimmed behind it. The UI proves it is real; the type is what the viewer reads (`shots.md`, *Key number over dimmed UI*).
- **Zoom into one cell or row, on what changes** (the balance that updates, the status that flips), then pull back: press, change, settle.
- **Table shots last at most ~1.5 s**, and three views of the same grid are one shot: keep the one where something changes.
- The payoff is the moment of change and the number it produces, not another screen of rows. Everything else is an aside.

### Canvas-first products (whiteboards, maps, editors, games)
The canvas is the product, so it has to move for real.
- **Record real mouse frames.** `capture.mjs` has a `record` state that drives the page with the real mouse (drags, strokes) and grabs a frame per step plus the pointer path (`replicas.md`; replay with `UI.recording`, `follow`). Canvas apps often stack several canvas layers: composite the frames across them. Real recorded frames are exact and cheaper than rebuilding the drawing in SVG.
- **Chrome stays DOM.** Toolbars, panels and menus are captured markup, tweened as usual; only the canvas area is frames. Fonts the app registers through `FontFace` come from `document.fonts`, not from CSS `@font-face`: take them from there or the replica falls back to a system face.
- **Turn-based games and keyboard-driven apps** (2048, puzzles): the moves can't be planned by eye. Run the app's own logic headless with a seeded PRNG to get a move trace, tween the real tile or sprite markup from that trace, and verify against the captured states (`shots.md`, *Turn-based game*). There is no cursor: show the key press as a keycap.
- Frame the drawing happening (the stroke, the shape arriving) with the real tool pick and cursor, within the sharp-resolution limit in `direction.md`, *Framing*.

## Story

Every film is one story: **problem → hero → action in the app → payoff that closes the problem.** One concrete case carries it (a person, a city, a file, a number in a real situation); features appear only as steps of that case. PRODUCT.md (Discovery) supplies the case and the promise. The payoff lands on the drop (silent: the strongest bar, 60–75% in; a personal site pays off with its closing ask, see *Landing page*).

**Simplest wins.** The films that land best show one mechanic or one transformation, plainly and with real data: a file drops from megabytes to kilobytes, tiles slide and merge into a bigger number, a diagram draws itself and its arrows follow a dragged box. Pick the one change that is the product, show it happening, and stop when it has been understood: a 12 s film that shows that change clearly beats a 30 s tour. Add views only when they serve that change.

**The thread is set up before the payoff**: the hero and the problem appear in the first act (a line of copy, the hero's name or city in the hook, a glimpse of the situation), not only in the payoff caption. A payoff that meets its hero for the first time has nothing to close. Test: tell the film in three sentences without naming a feature. Type and camera techniques for each beat are in `motion-vocabulary.md`.

## What has worked, and what hasn't

Owner verdicts across many test films, on very different products. Use them as taste, not rules.

| landed well | why |
|---|---|
| 12 s clip of a puzzle game | one mechanic (slide, merge, score climbs) driven by the game's own logic; words in the margins; ends the moment it's understood |
| 15 s teaser of an image tool | one transformation with real numbers (2.79 MB → 276 kB) landing on the drop, a before/after slider as proof |
| 20 s teaser of a whiteboard | the product drawing itself with its real renderer and fonts, one delightful interaction (arrows follow a dragged box) |
| 20 s launch of a notes app | a verb rhythm (*Type it. Save it. Swipe it away. Find it.*) beside a phone-sized UI |

| fell flat | why |
|---|---|
| a pricing teaser | never said what the product is |
| a tour of static zooms | the camera lands on empty chrome, nothing moves |
| clicks on controls already active, at the frame edge, or under a popover | the viewer can't follow cause and effect, and it looks fake |
| a live element frozen (a radar, a chart) | the product looks broken |
| dense tables shown as tables | lift the number that changes out of them instead |
| a detour to an error page, extra captions, a 4–5 s static end card | time spent on nothing |

**Choosing the film is half the result.** Before writing the scenario, find the one change that is the product and propose the type and length that show it best, even if it is shorter than asked ("this reads best as a 12–15 s clip"). Tell the director, and the critic, what the intended viewer must come away with: that bar matters more than any technique.

## Coverage rule

Coverage depends on the film type. A **launch film** shows every major view in PRODUCT.md at least briefly, and every wow moment; if they don't fit in sequence, use a split-screen montage or a 0.8 s-per-view run (`shots.md` 6, 8). A **one-feature teaser** covers the feature's view and its payoff; a **how-to** covers the task's views; a **landing page** covers the sections that carry the message. Coverage follows PRODUCT.md's core / aside / skip column, not the router: core views carry the film, an aside gets 1–2 s at most, everything else stays out. **Everything you skip is named in SCENARIO.md with a reason** ("not this feature", "outside the two tasks"); an unexplained gap is a bug.

## Reference film

When the user has a film whose feel they want: break it into a frame sheet (`sheet.mjs` reads film pages, not MP4s): `ffmpeg -i ref.mp4 -vf "fps=2,scale=480:-1,tile=6x5" <film>/review/reference.png`, Read it, list its techniques (cut rhythm, type, camera, colour, what moves) and propose your own character that borrows the techniques, never the content.

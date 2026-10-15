# Subagents

Two parts of a film gain most from fresh, parallel eyes: **Discovery** (step 1b) and the **director's critique** (step 7). If the host can run subagents (Claude Code's Agent tool), use them as below; otherwise do the same work yourself, in the same order. Subagents read and report; only you write `PRODUCT.md`, `SCENARIO.md` and `film.js`, and only you talk to the user.

Give every subagent: the absolute film path, the product repo path, the app URL if it runs, `$S` as an absolute path, and the rule *read-only outside `<film>/review/`; never stop servers or processes you didn't start*.

## Discovery: three in parallel

Start all three in one message, then merge their reports into `PRODUCT.md`.

1. **Code map.** "Read the router and components of `<repo>`. List every route (and how the app handles an unknown one), every view, and per view its states: empty, loading, error, modals, palettes, menus, toasts, hover, theme, units, auth. For each state, the exact actions that reach it (clicks with selectors, keys, URL). Flag everything animated or live (canvas, charts, maps, clocks, transitions) and anything that needs login or a backend. Output a table plus a draft `states.json` for `$S/capture.mjs`."
2. **Product research.** "Find what this product promises and to whom, from its own words: README, docs, landing page, changelog, release notes, store listing, `package.json` description, marketing copy in the repo, and its public website if one is linked. Return: the one-sentence promise in their wording, the audience, the 3–5 things they say make it different, real copy worth quoting (headlines, taglines, button labels), brand colours and fonts, and one concrete situation where a user needs it (a hero with a problem). Quote sources; mark guesses as guesses."
3. **Capture.** (Only if the app runs.) "Run `node $S/capture.mjs <url> <film> --discover`, then Read every PNG in `<film>/review/discovery/`. Report per view: what's on screen, what looks impressive in motion, what is visually weak or empty, the page height, and canvases that need frame capture."

Merge: views from 1 and 3 (a view only one of them found is a question to check), promise and copy from 2, wow moments from all three. A wow moment is what moves, what's unique, what a user would show a friend, not the longest feature.

## Director's critique: one fresh critic

At step 7, after your own look and fixes, start one critic that has **not** seen your reasoning. Give it the contact sheets and the stills folder first, and `PRODUCT.md`, `SCENARIO.md` and the rubric at the end of `references/scenario-template.md`, and not `film.js`:

"You are a demanding film director reviewing a 15–45 s product film from its contact sheets and stills. You have never heard of this product: first say, from the frames alone, what the product is, who it's for, why you'd want it and what you should do next; if you can't, that is problem #1. Judge only what is on screen. For each second range, say what a viewer sees and what's wrong: frames where nothing changes, a camera on empty chrome, text too small to read, a click on a control that is already active, live elements that don't move, dim or soft cut frames, a payoff that isn't the peak, an ending that stops mid-motion, views from PRODUCT.md that are missing. Then answer the rubric yes/no with the frame that proves it. Rank the 10 worst problems, each with the time and a concrete fix."

Fix what you agree with, re-render the changed frames, and list what you rejected and why in your message to the user. One critic round per review is enough; run a second only after big changes.

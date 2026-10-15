# Subagents

Two parts of a film gain most from fresh, parallel eyes: Discovery (step 2) and the critique before the render (step 7). If your host can run subagents, use them as below; otherwise do the same work yourself in the same order. Subagents read and report; only you write PRODUCT.md, SCENARIO.md and film.js, and only you talk to the user.

Give each one: the absolute film and repo paths, the app URL if it runs, the absolute scripts path, and the rule *read-only outside `<film>/review/`; never stop processes you didn't start*.

## Discovery: three in parallel

Worth it for anything beyond a single page or ~30 source files (three agents cost ~150k tokens); smaller, do it inline.
1. **Code map.** "Read the router and components of `<repo>`. List every route and view, and per view its states (empty, loading, error, modals, palettes, toasts, hover, theme), with the exact actions that reach each (selectors, keys, URL). Flag everything animated or live and anything that needs login or a backend. Output a table and a draft `states.json`."
2. **Product research.** "From the product's own words (README, docs, landing page, changelog, release notes, package description, linked website) find: the one-sentence promise in their wording, the audience, the 3–5 things they say make it different, quotable copy, brand colours and fonts, and one concrete situation where a user needs it. If `gh` is installed and the repo has a remote, read `gh pr list --state merged --limit 30` and name the one recent change that matters. Quote sources; mark guesses."
3. **Capture** (if the app runs). "Run `node <scripts>/capture.mjs <url> <film> --discover`, Read every PNG in `<film>/review/discovery/`, and report per view: what's on screen, what would impress in motion, what is visually weak or empty, page height, canvases."

Merge: views from 1 and 3 (one found by only one of them is worth checking), promise and copy from 2, wow moments from all three.

## Critique: one fresh critic

After your own look and fixes, start a critic that has not seen your reasoning. Tell it who the intended viewer is and where the film is shown; give it the contact sheets, **full-resolution stills** of each act's key frames and the end card, PRODUCT.md, SCENARIO.md and the self-check at the end of `scenario-template.md`, not `film.js`:

"You are a demanding film director and you are <the intended viewer>. From the frames alone, say what this is, why it matters to you and what you'd do next; if you can't, that is problem #1. Then go second by second: what you see and what's weak. Judge text size only from the full-resolution stills (a contact-sheet tile shrinks everything). Answer the self-check yes/no with the frame that proves it. Rank the 10 worst problems, each with its time and a concrete fix."

Weigh its advice against the film type (a how-to may hold a step that a teaser wouldn't). Fix what holds up; tell the user in one line what you rejected and why. One round is enough unless you changed a lot.

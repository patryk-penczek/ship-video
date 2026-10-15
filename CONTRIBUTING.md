# Contributing

Thanks for helping make ship-video better. The most useful contributions come from making a real film with it.

## Report a problem

Open an issue with:
- what you asked for, and the step the skill was on (brief, music, scenario, replicas, build, review, QA, render);
- the command that failed and its output (every script prints why it stopped; render failures are also in `<out>.progress`);
- your OS, Node version and `node skills/ship-video/scripts/lib/check.mjs --full`.

Don't attach music or app screenshots you can't share publicly.

## Suggest a lesson

`skills/ship-video/references/lessons.md` holds what went wrong on real films and how to avoid it. A good lesson is one bold sentence that names the problem, then the fix and why. If you hit a new pitfall, a PR adding it is very welcome.

## Change the code

1. Install once: `bash skills/ship-video/scripts/setup.sh`.
2. Make a test film: `node skills/ship-video/scripts/new-film.mjs /tmp/film`, then run `audit.mjs` and a short `render.mjs --preset draft` on it.
3. Keep scripts dependency-free beyond what `setup.sh` installs, give each one a `--help` header, and make failures exit non-zero with a clear message.
4. If you change the flow, update `SKILL.md` and, where it matters, `evals/evals.json` (prompts, files and what a good run does, including prompts that should not trigger the skill).
5. Run each prompt in `evals/evals.json` with the skill installed and check its expectations, and run `node .github/scripts/validate.mjs` before a PR.
6. Keep `SKILL.md` short (about 250 lines at most): details go in `references/`, flags stay in each script's `--help`. Use `$S/...` for script paths in every reference.

Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat(render): …`, `fix(audio): …`, `docs: …`.

## Rights

Only contribute music, fonts, images or app copy you're allowed to publish under this repository's MIT license or their own open license.

# Contributing

Thanks for helping make ship-video better. The most useful contributions come from making a real film with it.

## Report a problem

Open an issue with:
- what you asked for, and the step the skill was on (brief, music, scenario, replicas, build, review, QA, render);
- the command that failed and its output (every script prints why it stopped; render failures are also in `<out>.progress`);
- your OS, Node version and `node skills/ship-video/scripts/lib/check.mjs --full`.

Don't attach music or app screenshots you can't share publicly.

## Suggest a direction rule

`skills/ship-video/references/direction.md` holds what makes a film land. If a film taught you something, propose the general principle and the reason behind it, not a fix for that one film: a rule like "frame the control before the click, because a click at the edge can't be followed" helps every product; "move the radar toggle 40 px left" helps none. Verdicts on real films go in its *What has worked* tables.

## Change the code

1. Install once: `bash skills/ship-video/scripts/setup.sh`.
2. Make a test film: `node skills/ship-video/scripts/new-film.mjs /tmp/film`, then run `audit.mjs` and a short `render.mjs --preset draft` on it.
3. Keep scripts dependency-free beyond what `setup.sh` installs, give each one a `--help` header, and make failures exit non-zero with a clear message.
4. If you change the flow, update `SKILL.md` and, where it matters, `evals/evals.json` (prompts, files and what a good run does, including prompts that should not trigger the skill).
5. Run each prompt in `evals/evals.json` with the skill installed and check its expectations (`app/` and `site/` in the prompts stand for any small web app or marketing page you put or link there; the repo ships none), and run `node .github/scripts/validate.mjs` before a PR.
6. Keep `SKILL.md` small (about 12 KB): it is loaded on every activation, so details go in `references/`, flags stay in each script's `--help`, and each rule lives in one file that the others link to. Prefer a principle with its reason over another rule; remove what no longer earns its place. Use `$S/...` for script paths in every reference.
7. Keep it portable: the same `SKILL.md` runs in Claude Code and Codex. Name capabilities, not one host's tools ("a structured question tool if your host has one"), and keep `${CLAUDE_SKILL_DIR}` to the frontmatter and the one line that explains script paths.

Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat(render): …`, `fix(audio): …`, `docs: …`.

## Rights

Only contribute music, fonts, images or app copy you're allowed to publish under this repository's MIT license or their own open license.

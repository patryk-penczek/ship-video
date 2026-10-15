# AGENTS.md

Working on this repository (not using the skill): see `CONTRIBUTING.md`.

- The skill is `skills/ship-video/`: `SKILL.md` (the workflow), `references/` (read on demand), `scripts/` (run, each has `--help`), `assets/starter/` (the film template, copied by `new-film.mjs`).
- `SKILL.md` must stay portable between Claude Code and Codex and small; each rule lives in one reference file.
- Check before a PR: `node .github/scripts/validate.mjs`, a draft render of a fresh `new-film.mjs` folder, and the relevant prompts in `evals/evals.json`.
- Commits follow Conventional Commits. Never commit music, fonts or app screenshots you may not publish.

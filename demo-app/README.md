# Breeze

A small weather app to try ship-video on. It has no backend: every forecast is static data in `src/data.ts`, so every film of it is reproducible.

```bash
bun install
bun run dev        # http://localhost:4783
```

Then, from the repository root, ask Claude Code:

> Make a 20-second launch video for the weather app in demo-app/.

There's plenty to film: a ⌘K command palette, weather alerts, minute-by-minute rain, an hourly chart you can scrub, a 7-day forecast, an animated rain radar, a compare view, °C/°F and a light/dark theme.

Bun + React + TypeScript. `bun run typecheck` checks the types; `bun run build` writes a static build to `dist/`.

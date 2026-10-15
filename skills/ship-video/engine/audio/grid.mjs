// No-music path: a fixed tempo grid. Prints beat/bar times to cut on and writes a synthetic env.js
// (a sub pulse on every beat, stronger on bar starts) so audio-reactive effects still move.
// usage: node grid.mjs --bpm 120 --duration 20 [--out film/env.js]
import { writeFileSync } from "node:fs";
import { args } from "../lib/common.mjs";

const a = args();
const bpm = Number(a.bpm ?? 120);
const duration = Number(a.duration);
if (!duration) { console.error("usage: node grid.mjs --bpm 120 --duration 20 [--out film/env.js]"); process.exit(1); }
const beat = 60 / bpm;
const fps = 60;
const n = Math.ceil(duration * fps);
const sub = [], mid = [], high = [], rms = [];
for (let i = 0; i < n; i++) {
  const t = i / fps;
  const k = Math.floor(t / beat + 1e-6);
  const d = t - k * beat;
  const down = k % 4 === 0;
  const s = Math.exp(-d * (down ? 9 : 14)) * (down ? 1 : 0.6);
  sub.push(+s.toFixed(3));
  mid.push(0.3);
  high.push(+(Math.exp(-((t - (k + 0.5) * beat) ** 2) * 400) * 0.5).toFixed(3));
  rms.push(+(0.4 + s * 0.4).toFixed(3));
}
const fmt = (xs) => xs.map((x) => x.toFixed(2)).join(" ");
const beats = Array.from({ length: Math.floor(duration / beat) + 1 }, (_, i) => i * beat);
console.log(`grid ${bpm} bpm  beat ${beat.toFixed(3)}s  bar ${(beat * 4).toFixed(3)}s  duration ${duration}s`);
console.log("bars: ", fmt(beats.filter((_, i) => i % 4 === 0)));
console.log("beats:", fmt(beats));
if (a.out) {
  writeFileSync(a.out, `window.ENV=${JSON.stringify({ fps, sub, mid, high, rms })};`);
  console.log(`→ ${a.out}`);
}

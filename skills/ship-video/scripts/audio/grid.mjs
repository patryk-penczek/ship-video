// No-music path: a fixed tempo grid. Prints beat/bar times to cut on.
// usage: node music.mjs grid --bpm 120 --duration 20 [--out film/env.js [--pulse]]   (bpm 30..300, duration 0..600 s)
// --out alone writes `window.ENV = null;` (a silent film has nothing to react to). Add --pulse to write a synthetic
// envelope instead (a sub pulse on every beat, stronger on bar starts) for films that want audio-reactive motion anyway.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { help, args, die, num } from "../lib/common.mjs";
help(import.meta.url);

const a = args();
const USAGE = "usage: node music.mjs grid --bpm 120 --duration 20 [--out film/env.js [--pulse]]";
if (a.duration === undefined) die(USAGE);
const bpm = num(a, "bpm", 120, { min: 30, max: 300 });
const duration = num(a, "duration", 0, { min: 0.1, max: 600 });
if (a.out === true) die("--out needs a file path\n" + USAGE);
if (a.pulse && !a.out) die("--pulse needs --out <env.js>");
const beat = 60 / bpm;
const fps = 60;
const n = a.pulse ? Math.ceil(duration * fps) : 0;
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
  mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true });
  writeFileSync(a.out, a.pulse ? `window.ENV=${JSON.stringify({ fps, sub, mid, high, rms })};` : "window.ENV = null; // silent film: no audio-reactive envelope\n");
  console.log(`→ ${a.out}${a.pulse ? " (synthetic beat pulse)" : " (window.ENV = null)"}`);
}

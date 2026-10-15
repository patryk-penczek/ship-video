// Static checks on a film folder, run first by audit.mjs: determinism of film.js / ui.js / data.js (+ CSS) and personal data left in the sources.
// Every finding is one line: "determinism film.js:42  Math.random()  fix: ...". Pure text analysis, no browser.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PII, isFake, mask } from "./redact.mjs";

// Comments -> spaces and string/template/regex-free "code view" (contents of '…' "…" `…` blanked), line numbers preserved.
function views(src) {
  let nocom = "", code = "", i = 0, q = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (q) {
      if (c === "\\") { nocom += c + (n ?? ""); code += "  "; i += 2; continue; }
      if (c === q) { q = null; nocom += c; code += c; i++; continue; }
      nocom += c; code += c === "\n" ? "\n" : " "; i++; continue;
    }
    if (c === "/" && n === "/" && src[i - 1] !== ":") { while (i < src.length && src[i] !== "\n") { nocom += " "; code += " "; i++; } continue; }
    if (c === "/" && n === "*") { while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) { const ch = src[i] === "\n" ? "\n" : " "; nocom += ch; code += ch; i++; } nocom += "  "; code += "  "; i += 2; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; nocom += c; code += c; i++; continue; }
    nocom += c; code += c; i++;
  }
  return { nocom, code };
}
const lineOf = (s, idx) => s.slice(0, idx).split("\n").length;
// the text of a balanced () / {} group starting at s[open]
function group(s, open) {
  const pairs = { "(": ")", "{": "}", "[": "]" }, o = s[open], cl = pairs[o]; let d = 0;
  for (let i = open; i < s.length; i++) { if (s[i] === o) d++; else if (s[i] === cl && --d === 0) return [open, i]; }
  return [open, Math.min(s.length - 1, open + 400)];
}

const RULES = [
  [/\bMath\.random\s*\(/g, "Math.random()", "use ctx.rnd() (seeded, same on every render) or hard-code the values"],
  [/\bcrypto\.(?:getRandomValues|randomUUID)\s*\(/g, "crypto random", "use ctx.rnd() or a fixed id"],
  [/\bDate\.now\s*\(/g, "Date.now()", "the film clock is the timeline: derive from t, or hard-code the date shown (new Date('2026-01-15T10:00:00Z'))"],
  [/\bnew\s+Date\s*\(\s*\)/g, "new Date()", "hard-code the date shown: new Date('2026-01-15T10:00:00Z'); a live clock differs on every render"],
  [/\bperformance\.now\s*\(/g, "performance.now()", "never read wall time: drive from the timeline time t"],
  [/\b(?:setTimeout|setInterval)\s*\(/g, "setTimeout/setInterval", "put it on the timeline: tl.call(fn, [], t) / tl.set(el, {...}, t); timers do not follow seek()"],
  [/\b(?:requestAnimationFrame|requestIdleCallback)\s*\(/g, "requestAnimationFrame", "per-frame work belongs in react(t, ctx) (called by every seek), not in a rAF loop"],
  [/\brepeat\s*:\s*-1\b/g, "repeat: -1", "an infinite tween makes the film length undefined: use a finite repeat (duration / cycle) or a time-driven react(t)"],
];

export function lintFilm(dir) {
  const out = [], files = ["film.js", "ui.js", "data.js"];
  const hasFreeze = existsSync(path.join(dir, "base.css")) && /animation\s*:\s*none\s*!important/.test(readFileSync(path.join(dir, "base.css"), "utf8"));
  for (const f of files) {
    const p = path.join(dir, f); if (!existsSync(p)) continue;
    const { nocom, code } = views(readFileSync(p, "utf8"));
    for (const [re, what, fix] of RULES) { re.lastIndex = 0; for (let m; (m = re.exec(code));) out.push({ kind: "determinism", file: f, line: lineOf(code, m.index), what, fix }); }
    // tweening display: GSAP flips it at the tween start, so a seek backwards leaves it wrong. Use autoAlpha / visibility via tl.set, or scene()/show().
    for (const m of code.matchAll(/\.(to|from|fromTo)\s*\(/g)) {
      const [a, b] = group(code, m.index + m[0].length - 1), body = code.slice(a, b), d = body.match(/\bdisplay\s*:/);
      if (d) out.push({ kind: "determinism", file: f, line: lineOf(code, a + d.index), what: `tween of display (.${m[1]}())`, fix: "tween opacity/autoAlpha, or tl.set(el, { display }, t); show(el, t0, t1) hides and shows on the timeline" });
    }
    // measuring inside a tween callback reads layout at whatever time the callback fires (scrub order changes the answer): measure once in build, before tweening
    const MEAS = /\b(getBoundingClientRect|center|rect|offsetWidth|offsetHeight|offsetLeft|offsetTop|clientWidth|clientHeight)\s*\(|\.(offsetWidth|offsetHeight|clientWidth|clientHeight)\b/;
    for (const m of code.matchAll(/\b(onUpdate|onStart|onComplete|onRepeat|onReverseComplete|onInterrupt)\s*:|\.call\s*\(/g)) {
      const from = m.index + m[0].length, brace = code.indexOf("{", from), paren = code.indexOf("(", from);
      let a = m[0].endsWith("(") ? m.index + m[0].length - 1 : (brace >= 0 && (paren < 0 || brace < paren + 12) ? brace : from);
      const [s, e] = a === from ? [from, (code.indexOf("\n", from) + 1 || code.length) - 1] : group(code, a), body = code.slice(s, e + 1), hit = body.match(MEAS);
      if (hit) out.push({ kind: "determinism", file: f, line: lineOf(code, s + hit.index), what: `${hit[1] ?? hit[2]} inside a ${m[1] ?? "call"} callback`, fix: "measure once in build() before tweening (const P = center(el)) and use the stored numbers in the callback" });
    }
    if (f === "film.js") {
      const measures = /\b(getBoundingClientRect|center|rect|splitChars)\s*\(/.test(code), fontsCfg = code.match(/\bfonts\s*:\s*\[([^\]]*)\]/);
      if (/\bgsap\.timeline\s*\(/.test(code) && !/\bFilm\s*\(/.test(code)) out.push({ kind: "determinism", file: f, line: lineOf(code, code.search(/\bgsap\.timeline\s*\(/)), what: "timeline built outside Film({ build })", fix: "build inside Film({ ..., build(ctx) { ... } }): the engine waits for fonts and images first" });
      else if (measures && /\bFilm\s*\(/.test(code) && !(fontsCfg && fontsCfg[1].trim())) out.push({ kind: "determinism", file: f, line: lineOf(code, code.search(/\bFilm\s*\(/)), what: "build() measures text but `fonts:` is empty", fix: "list every face in fonts: [\"800 40px 'Inter Variable'\"]: boxes are measured before the font loads otherwise (fallback metrics)" });
    }
  }
  // CSS that animates on its own (film.css / app.css): base.css normally freezes it (animation/transition: none !important)
  for (const f of ["film.css", "app.css"]) {
    const p = path.join(dir, f); if (!existsSync(p)) continue;
    const css = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
    const hits = [...css.matchAll(/(?:^|[;{\s])(animation(?:-name)?|transition(?:-property)?)\s*:\s*([^;}]+)/g)].filter((m) => !/^\s*(none|initial|unset)\b/.test(m[2]) && !/^\s*0s\b/.test(m[2]));
    if (hits.length) out.push({ kind: hasFreeze ? "note" : "determinism", file: f, line: lineOf(css, hits[0].index + hits[0][0].search(/\S/)), what: `${hits.length}x CSS ${hits[0][1]}`, fix: hasFreeze ? "base.css freezes it (animation/transition: none !important), so it never runs: delete it" : "base.css no longer freezes CSS animation: restore `*{animation:none!important;transition:none!important}` or move the motion to the timeline" });
  }
  out.push(...scanSources(dir));
  return out;
}

// Emails and keys left in the film's own source files (screens.js too: unused states ship with a public repo). Phones are only checked on rendered text.
export function scanSources(dir, { allow = [] } = {}) {
  const out = [], ok = new Set(allow.map((s) => s.toLowerCase()));
  for (const f of ["screens.js", "data.js", "film.js", "ui.js"]) {
    const p = path.join(dir, f); if (!existsSync(p)) continue;
    const lines = readFileSync(p, "utf8").split("\n");
    lines.forEach((ln, i) => {
      if (/pii-ok/.test(ln)) return;
      for (const [kind, src, flags] of PII) {
        if (kind === "phone") continue;
        for (const m of ln.matchAll(new RegExp(src, flags))) {
          if (isFake(kind, m[0]) || ok.has(m[0].toLowerCase()) || /\.(png|jpe?g|webp|svg|gif|woff2?|css|js)$/i.test(m[0]) || /@\d+x\b/.test(m[0])) continue;
          out.push({ kind: "privacy", file: f, line: i + 1, what: `${kind} ${mask(m[0])}`, fix: "re-capture with capture.mjs --redact (or replace it by hand); real customer data must never appear in a public film" });
        }
      }
    });
  }
  return out;
}

export const fmt = (r) => `${r.kind === "note" ? "note" : r.kind} ${r.file}:${r.line}  ${r.what}  fix: ${r.fix}`;

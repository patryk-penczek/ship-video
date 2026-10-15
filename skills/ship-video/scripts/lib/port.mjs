// Shared by capture.mjs and port-css.mjs: finds the app root, collects its CSS (CSSOM of the running page, or css files)
// and rewrites it so it can live in a film: scoped under .app-shot, 1920x1080 viewport units, fonts/images copied locally.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const W = 1920, H = 1080;

// A selector for the app's root element: first child of #root/#app/#__next…, else the first real child of <body>.
export const detectRoot = (page) => page.evaluate(() => {
  for (const c of ["#root", "#app", "#__next", "#svelte", "#app-root", "main#main"]) {
    const e = document.querySelector(c);
    if (e?.firstElementChild) return `${c} > :nth-child(${[...e.children].indexOf(e.firstElementChild) + 1})`;
  }
  const k = [...document.body.children].findIndex((e) => !/^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(e.tagName));
  return k < 0 ? "body" : `body > :nth-child(${k + 1})`;
});

// What the CSS rewrite needs to know about the live page.
export const pageInfo = (page, rootSel) => page.evaluate((sel) => {
  const root = document.querySelector(sel), de = document.documentElement, b = document.body;
  const cs = getComputedStyle(b), bg = [b, de].map((e) => getComputedStyle(e).backgroundColor).find((c) => c && c !== "rgba(0, 0, 0, 0)") ?? "";
  const attrs = (e) => Object.fromEntries([...e.attributes].filter((a) => !["lang", "id", "dir"].includes(a.name)).map((a) => [a.name, a.value]));
  const merged = { ...attrs(de), ...attrs(b) };
  merged.class = [de.className, b.className].filter(Boolean).join(" ") || undefined;
  if (de.getAttribute("style") && b.getAttribute("style")) merged.style = `${de.getAttribute("style")};${b.getAttribute("style")}`;
  if (!merged.class) delete merged.class;
  const p = root?.parentElement;
  return {
    attrs: merged,
    container: p && p.id ? `#${CSS.escape(p.id)}` : null,
    rootPos: root ? getComputedStyle(root).position : "static",
    rootFont: parseFloat(getComputedStyle(de).fontSize),
    base: { color: cs.color, fontFamily: cs.fontFamily, fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontWeight: cs.fontWeight, background: bg },
  };
}, rootSel);

// Every stylesheet of the live page as { base, text }, in cascade order. Source text is used where there is one (<style> content,
// the linked file): Chrome's rule.cssText drops `background: var(--x)` when a longhand follows it. CSSOM text is the fallback
// for sheets without source (CSS-in-JS insertRule, constructed sheets).
export async function collectSheets(page) {
  const raw = await page.evaluate(() => [...document.styleSheets, ...(document.adoptedStyleSheets ?? [])]
    .filter((s) => !s.disabled && !s.ownerNode?.hasAttribute?.("data-ship-video-freeze") && (!s.media?.mediaText || matchMedia(s.media.mediaText).matches))
    .map((s) => ({ href: s.href, base: s.href || document.baseURI, text: s.ownerNode instanceof HTMLStyleElement && s.ownerNode.textContent.trim() ? s.ownerNode.textContent : null,
      css: (() => { try { return [...s.cssRules].map((r) => r.cssText).join("\n"); } catch { return null; } })() })));
  const out = [];
  const add = async (base, text, depth = 0) => { // @import: the imported file's rules come first
    if (depth < 4) for (const [, , u] of text.matchAll(/@import\s+(?:url\()?\s*(["']?)([^"')\s;]+)\1/g)) {
      try { const href = new URL(u, base).href, r = await fetch(href); if (r.ok) await add(href, await r.text(), depth + 1); } catch {}
    }
    out.push({ base, text });
  };
  for (const s of raw) {
    let text = s.text;
    if (text == null && s.href) { try { const r = await fetch(s.href); if (r.ok) text = await r.text(); } catch {} }
    text ??= s.css;
    if (text == null) console.error(`port-css: could not read ${s.href ?? "a stylesheet"}`);
    else await add(s.base, text);
  }
  return out;
}

export const sheetsFromFiles = (files) => files.map((f) => ({ base: pathToFileURL(path.resolve(f)).href, text: readFileSync(f, "utf8") }));

// Runs in a blank page at 1920x1080 so @media/@supports resolve for the film's viewport.
function transform({ sheets, info, W, H }) {
  const SC = ".app-shot", esc = (s) => s.replace(/[^\w-]/g, "\\$&");
  const attrNames = Object.keys(info.attrs).filter((a) => a !== "class" && a !== "style");
  const classes = (info.attrs.class ?? "").split(/\s+/).filter(Boolean);
  const out = [], fonts = [], stats = { keyframes: 0, media: 0, fixed: 0 };
  const split = (s) => { const r = []; let d = 0, q = null, cur = ""; for (const c of s) { if (q) { cur += c; if (c === q) q = null; continue; } if (c === '"' || c === "'") { q = c; cur += c; continue; } if ("([".includes(c)) d++; if (")]".includes(c)) d--; if (c === "," && !d) { r.push(cur.trim()); cur = ""; continue; } cur += c; } if (cur.trim()) r.push(cur.trim()); return r; };
  const unit = { vh: H, vw: W, vmin: Math.min(W, H), vmax: Math.max(W, H) };
  const val = (s, base) => s
    .replace(/position:\s*fixed/g, () => { stats.fixed++; return "position: absolute"; })
    .replace(/(-?\d*\.?\d+)[dsl]?(vh|vw|vmin|vmax)\b/g, (m, n, u) => `${+(n * unit[u] / 100).toFixed(3)}px`)
    .replace(/(-?\d*\.?\d+)rem\b/g, (m, n) => info.rootFont === 16 ? m : `${+(n * info.rootFont).toFixed(3)}px`)
    .replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (m, q, u) => /^(data:|#)/.test(u) ? m : `url("${new URL(u, base).href}")`);
  const lead = new RegExp(`^(?:html|body|:root${info.container ? `|${info.container.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` : ""})(?![\\w-])`);
  function scope(s) {
    if (/::view-transition|^:host|^::backdrop|^@/.test(s)) return null;
    let m = s.match(lead);
    if (m) { let rest = s.slice(m[0].length), n; while ((n = rest.match(/^\s+(?:body|#root)(?![\w-])|^\s*>\s*body(?![\w-])/))) rest = rest.slice(n[0].length); return SC + rest; }
    if (attrNames.some((a) => s.startsWith(`[${a}`) && /^\[[\w-]+[\]~|^$*=]/.test(s))) return SC + s;
    if ((m = s.match(/^\.([\w-]+)/)) && classes.includes(m[1])) return SC + s;
    return `:where(${SC}) ${s}`;
  }
  // tiny CSS tokenizer: [{ prelude, body }] at one nesting level (comments stripped; strings and (…) respected)
  function parse(src) {
    const nodes = []; let i = 0;
    const end = (from, stops) => { let d = 0, q = null; for (let k = from; k < src.length; k++) { const c = src[k]; if (q) { if (c === "\\") k++; else if (c === q) q = null; continue; } if (c === '"' || c === "'") q = c; else if (c === "(") d++; else if (c === ")") d--; else if (!d && stops.includes(c)) return k; } return src.length; };
    while (i < src.length) {
      while (/\s/.test(src[i] ?? "")) i++;
      if (i >= src.length) break;
      const k = end(i, "{;"), prelude = src.slice(i, k).trim().replace(/\s+/g, " ");
      if (src[k] !== "{") { if (prelude) nodes.push({ prelude }); i = k + 1; continue; }
      let d = 1, j = k + 1, q = null;
      for (; j < src.length && d; j++) { const c = src[j]; if (q) { if (c === "\\") j++; else if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === "{") d++; else if (c === "}") d--; }
      nodes.push({ prelude, body: src.slice(k, j) }); i = j;
    }
    return nodes;
  }
  function walk(nodes, base) {
    for (const { prelude, body } of nodes) {
      if (body == null) continue; // @import, @charset, @namespace, @layer a, b;
      if (!prelude.startsWith("@")) {
        const sels = [...new Set(split(prelude).map(scope).filter(Boolean))];
        if (sels.length) out.push(`${sels.join(", ")} ${val(body, base)}`);
        continue;
      }
      const at = prelude.match(/^@([\w-]+)\s*(.*)$/), name = at[1].replace(/^-\w+-/, ""), cond = at[2];
      if (name === "media") { let ok = false; try { ok = matchMedia(cond).matches; } catch {} if (ok) walk(parse(body.slice(1, -1)), base); else stats.media++; }
      else if (name === "supports") { let ok = true; try { ok = CSS.supports(cond); } catch {} if (ok) walk(parse(body.slice(1, -1)), base); }
      else if (name === "font-face") fonts.push(val(`@font-face ${body}`, base));
      else if (name === "keyframes") stats.keyframes++;
      else if (name === "property") out.push(`${prelude} ${body}`);
      else if (["layer", "container", "scope"].includes(name)) walk(parse(body.slice(1, -1)), base); // contents kept; layer order is lost
    }
  }
  for (const s of sheets) walk(parse(s.text.replace(/\/\*[\s\S]*?\*\//g, "")), s.base);
  const b = info.base;
  const head = `:where(${SC}) { color: ${b.color}; font: ${b.fontWeight} ${b.fontSize}/${b.lineHeight} ${b.fontFamily}; ${b.background ? `background: ${b.background}; ` : ""}-webkit-font-smoothing: antialiased; }
:where(${SC} *:not(button, input, select, textarea, progress, meter)), :where(${SC} *:not(button, input, select, textarea, progress, meter))::before, :where(${SC} *:not(button, input, select, textarea, progress, meter))::after { box-sizing: content-box; }
:where(${SC}) :where(h1) { margin: .67em 0; font-size: 2em; font-weight: 700; } :where(${SC}) :where(h2) { margin: .83em 0; font-size: 1.5em; font-weight: 700; } :where(${SC}) :where(h3) { margin: 1em 0; font-size: 1.17em; font-weight: 700; }
:where(${SC}) :where(h4) { margin: 1.33em 0; font-weight: 700; } :where(${SC}) :where(h5) { margin: 1.67em 0; font-size: .83em; font-weight: 700; } :where(${SC}) :where(h6) { margin: 2.33em 0; font-size: .67em; font-weight: 700; }
:where(${SC}) :where(p, dl, pre) { margin: 1em 0; } :where(${SC}) :where(ul, ol) { margin: 1em 0; padding-inline-start: 40px; } :where(${SC}) :where(blockquote, figure) { margin: 1em 40px; } :where(${SC}) :where(dd) { margin-inline-start: 40px; }
:where(${SC}) :where(ul) { list-style: disc; } :where(${SC}) :where(ol) { list-style: decimal; } :where(${SC}) :where(b, strong) { font-weight: bolder; } :where(${SC}) :where(code, pre, kbd, samp) { font-family: monospace; } :where(${SC}) :where(a) { color: -webkit-link; text-decoration: underline; }`;
  const tail = `/* film adaptations */
${SC} { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; margin: 0; overflow: hidden; box-sizing: border-box; }${info.rootPos === "relative" ? `\n${SC} > :first-child { position: static; } /* fixed overlays anchor to the ${W}x${H} wrapper */` : ""}`;
  return { css: `${head}\n${out.join("\n")}\n${tail}\n`, fonts, stats };
}

// Copies every url("http…"/"file:…") in `css` into <film>/fonts or <film>/img and points the css at the copy.
export async function localize(css, film, { quiet = false } = {}) {
  const used = new Map(), names = new Set(), copied = [], failed = [];
  // bundlers inline small fonts as data: URIs; move them out so app.css stays readable and fonts can be listed
  css = css.replace(/url\("data:(?:font|application)\/([\w.+-]+);base64,([^"]+)"\)/g, (m, kind, b64) => {
    const ext = /woff2/.test(kind) ? "woff2" : /woff/.test(kind) ? "woff" : /ttf|truetype/.test(kind) ? "ttf" : /otf|opentype/.test(kind) ? "otf" : null;
    if (!ext) return m;
    const rel = `fonts/${createHash("sha1").update(b64).digest("hex").slice(0, 8)}.${ext}`;
    mkdirSync(path.join(film, "fonts"), { recursive: true });
    writeFileSync(path.join(film, rel), Buffer.from(b64, "base64")); copied.push(rel);
    return `url("${rel}")`;
  });
  for (const [, u] of css.matchAll(/url\("((?:https?|file):[^"]+)"\)/g)) {
    if (used.has(u)) continue;
    const url = new URL(u), ext = path.extname(url.pathname).toLowerCase();
    const dir = /^\.(woff2?|ttf|otf|eot)$/.test(ext) ? "fonts" : "img";
    let name = path.basename(url.pathname) || "asset", n = 1;
    while (names.has(`${dir}/${name}`)) name = `${path.basename(url.pathname, ext)}-${++n}${ext}`;
    try {
      mkdirSync(path.join(film, dir), { recursive: true });
      const dest = path.join(film, dir, name);
      if (url.protocol === "file:") copyFileSync(fileURLToPath(url), dest);
      else { const r = await fetch(u); if (!r.ok) throw new Error(`HTTP ${r.status}`); writeFileSync(dest, Buffer.from(await r.arrayBuffer())); }
      names.add(`${dir}/${name}`); used.set(u, `${dir}/${name}`); copied.push(`${dir}/${name}`);
    } catch (e) { failed.push(u); if (!quiet) console.error(`port-css: could not copy ${u}: ${e.message}`); }
  }
  return { css: css.replace(/url\("((?:https?|file):[^"]+)"\)/g, (m, u) => used.has(u) ? `url("${used.get(u)}")` : m), copied, failed };
}

// Main entry: sheets → <film>/app.css. Returns a summary and the font faces to list in film.js `fonts:`.
export async function portCss(browser, sheets, info, film, out = path.join(film, "app.css")) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: "reduce" });
  let r;
  try { await page.setContent("<!doctype html><html><head></head><body></body></html>"); r = await page.evaluate(transform, { sheets, info, W, H }); }
  finally { await page.close(); }
  const faces = r.fonts.map((f) => f.replace(/\s+/g, " "));
  const loc = await localize(`${faces.join("\n")}\n${r.css}`, film);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `/* Ported from the running app by scripts/port-css.mjs: scoped under .app-shot, ${W}x${H} viewport units. Regenerate, don't hand-edit. */\n${loc.css}`);
  // variable fonts declare a range ("font-weight: 200 800"): list the heaviest weight (one file covers the whole range) and report the range
  const ranges = [];
  const fontList = [...loc.css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => {
    if (/url\("(?:https?|file):/.test(m[0])) return null; // its file was not copied: don't list a face that cannot load offline
    const fam = m[0].match(/font-family:\s*"?([^";]+?)"?\s*;/)?.[1], ws = (m[0].match(/font-weight:\s*([^;]+);/)?.[1] ?? "400").trim().split(/\s+/);
    if (fam && ws.length > 1 && ws[0] !== ws.at(-1)) ranges.push(`${fam} ${ws[0]}-${ws.at(-1)}`);
    return fam && `${ws.at(-1)} 40px '${fam}'`;
  }).filter(Boolean);
  if (loc.failed.length) console.error(`port-css: ${loc.failed.length} file(s) could not be copied; app.css still points at them (absolute URLs): fix the paths, the film would not render offline`);
  return { out, rules: r.css.split("\n").length, fontFaces: faces.length, copied: loc.copied, stats: r.stats, fonts: [...new Set(fontList)], variable: [...new Set(ranges)], failed: loc.failed };
}

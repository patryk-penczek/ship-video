// Shared by capture.mjs and port-css.mjs: finds the app root, collects its CSS (CSSOM of the running page, or css files)
// and rewrites it so it can live in a film: scoped under .app-shot, 1920x1080 viewport units, fonts/images copied locally.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const W = 1920, H = 1080;

// A selector for the app's root element. Default: the app container (#root/#app/#__next...): its single child when that is the whole app,
// the container itself when it has several element children (toasts and portals are siblings of the app). When visible elements sit
// outside the container (portals mounted on <body>), or there is no container (a static page), the root is body.
export const detectRoot = (page) => page.evaluate(() => {
  const SKIP = /^(SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE)$/;
  const shows = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== "none" && cs.visibility !== "hidden" && (r.width > 0 && r.height > 0 || cs.position === "fixed") && (e.textContent.trim() || e.querySelector("img,svg,canvas,video")); };
  const kids = (e) => [...e.children].filter((c) => !SKIP.test(c.tagName));
  for (const c of ["#root", "#app", "#__next", "#svelte", "#app-root", "main#main"]) {
    const e = document.querySelector(c);
    if (!e?.firstElementChild) continue;
    const outside = kids(document.body).filter((x) => x !== e && !x.contains(e) && shows(x));
    if (outside.length) return "body";
    const k = kids(e);
    if (k.length > 1) return c;
    return `${c} > :nth-child(${[...e.children].indexOf(k[0] ?? e.firstElementChild) + 1})`;
  }
  return "body"; // no app container: a static page. body keeps every section, header and footer
});

// Visible elements next to the chosen root (siblings of it and of its ancestors): toasts, portals, cookie banners that it does not contain.
export const outsideRoot = (page, sel) => page.evaluate((sel) => {
  const SKIP = /^(SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE)$/, root = document.querySelector(sel);
  if (!root || root === document.body) return { out: [], over: [], rootH: root?.getBoundingClientRect().height ?? 0, pageH: document.documentElement.scrollHeight };
  const name = (e) => `${e.id ? "#" + e.id : e.tagName.toLowerCase() + (e.classList.length ? "." + [...e.classList].slice(0, 2).join(".") : "")}${(e.textContent || "").trim() ? ` "${e.textContent.trim().replace(/\s+/g, " ").slice(0, 30)}"` : ""}`;
  const out = [], over = [];
  for (let p = root.parentElement; p; p = p.parentElement) {
    for (const x of p.children) {
      if (SKIP.test(x.tagName) || x === root || x.contains(root)) continue;
      const r = x.getBoundingClientRect(), cs = getComputedStyle(x);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if ((r.width > 0 && r.height > 0 || cs.position === "fixed") && (x.textContent.trim() || x.querySelector("img,svg,canvas,video"))) { out.push(name(x)); if (/^(fixed|absolute|sticky)$/.test(cs.position)) over.push(name(x)); }
    }
    if (p === document.body) break;
  }
  return { out, over, rootH: root.getBoundingClientRect().height, pageH: document.documentElement.scrollHeight };
}, sel);

// What the CSS rewrite needs to know about the live page.
export const pageInfo = (page, rootSel) => page.evaluate((sel) => {
  const root = document.querySelector(sel), de = document.documentElement, b = document.body;
  const cs = getComputedStyle(b);
  // the page background: the first painted background walking from the app root up through its containers (#root often paints it), then body, then html
  const chain = []; for (let e = root; e; e = e.parentElement) chain.push(e); chain.push(de);
  const bg = chain.map((e) => getComputedStyle(e).backgroundColor).find((c) => c && c !== "rgba(0, 0, 0, 0)" && !/rgba\(.*, 0\)$/.test(c)) ?? "";
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
    rootW: root ? root.getBoundingClientRect().width : innerWidth, viewW: innerWidth, rootIsBody: !root || root === b || root === de,
    scheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    // a fingerprint of the theme: every custom property on :root plus the theme attributes. Apps inject ONE theme block at a time, so a run that
    // switches themes would otherwise keep only the last theme's variables. Colour variables only: sizes and Tailwind's per-element --tw-* change from state to state
    sig: (() => { const c = getComputedStyle(de), v = []; for (const n of c) { const x = c.getPropertyValue(n).trim(); if (n.startsWith("--") && !/^--(tw|radix|rdp|framer|sv)-/.test(n) && /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color\()/i.test(x)) v.push(`${n}:${x}`); } return `${v.sort().join(";")}|${de.getAttribute("data-theme") ?? ""}|${de.className}|${b.className}`; })(),
    lum: (() => { // luminance 0..1 of the page background, whatever colour syntax it uses (oklch, rgb, hex)
      try { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d", { willReadFrequently: true }); x.fillStyle = "#fff"; x.fillStyle = bg || "#fff"; x.fillRect(0, 0, 1, 1); const [r, g, b] = x.getImageData(0, 0, 1, 1).data; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; } catch { return 1; }
    })(),
    rootFont: parseFloat(getComputedStyle(de).fontSize),
    bodyMargin: ["Top", "Right", "Bottom", "Left"].map((k) => parseFloat(cs["margin" + k]) || 0), // body { margin: 8px } is lost on the wrapper (margin 0): carried as padding
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
  const add = async (base, text, depth = 0, alt = null) => { // @import: the imported file's rules come first
    if (depth < 4) for (const [, , u] of text.matchAll(/@import\s+(?:url\()?\s*(["']?)([^"')\s;]+)\1/g)) {
      try { const href = new URL(u, base).href, r = await fetch(href); if (r.ok) await add(href, await r.text(), depth + 1); } catch {}
    }
    out.push({ base, text, alt });
  };
  for (const s of raw) {
    let text = s.text;
    if (text == null && s.href) { try { const r = await fetch(s.href); if (r.ok) text = await r.text(); } catch {} }
    const alt = s.css; text ??= s.css;
    if (text == null) console.error(`port-css: could not read ${s.href ?? "a stylesheet"}`);
    else await add(s.base, text, 0, alt);
  }
  return out;
}

export const sheetsFromFiles = (files) => files.map((f) => ({ base: pathToFileURL(path.resolve(f)).href, text: readFileSync(f, "utf8") }));

// Runs in a blank page at 1920x1080 so @media/@supports resolve for the film's viewport.
function transform({ sheets, info, W, H, SC, tail: withTail }) {
  const esc = (s) => s.replace(/[^\w-]/g, "\\$&"), THEME_CLS = /^(dark|light|theme-dark|theme-light|dark-mode|light-mode|dark-theme|light-theme)$/;
  const attrNames = Object.keys(info.attrs).filter((a) => a !== "class" && a !== "style");
  const classes = (info.attrs.class ?? "").split(/\s+/).filter(Boolean);
  const out = [], fonts = [], stats = { keyframes: 0, media: 0, fixed: 0 }, seen = { media: 0, container: 0, property: 0 };
  let keyframes = null; const uses = [];
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
    if ((m = s.match(/^\.([\w-]+)/)) && (classes.includes(m[1]) || THEME_CLS.test(m[1]))) return SC + s; // .dark / .light on <html>: the class sits on the wrapper (set per state from the captured attrs)
    return `:where(${SC}) ${s}`;
  }
  // tiny CSS tokenizer: [{ prelude, body }] at one nesting level (comments stripped; strings and (…) respected)
  function parse(src) {
    const nodes = []; let i = 0;
    const end = (from, stops) => { let d = 0, q = null; for (let k = from; k < src.length; k++) { const c = src[k]; if (q) { if (c === "\\") k++; else if (c === q) q = null; continue; } if (c === "\\") { k++; continue; } if (c === '"' || c === "'") q = c; else if (c === "(") d++; else if (c === ")") d--; else if (!d && stops.includes(c)) return k; } return src.length; };
    while (i < src.length) {
      while (/\s/.test(src[i] ?? "")) i++;
      if (i >= src.length) break;
      const k = end(i, "{;"), prelude = src.slice(i, k).trim().replace(/\s+/g, " ");
      if (src[k] !== "{") { if (prelude) nodes.push({ prelude }); i = k + 1; continue; }
      let d = 1, j = k + 1, q = null;
      for (; j < src.length && d; j++) { const c = src[j]; if (q) { if (c === "\\") j++; else if (c === q) q = null; } else if (c === "\\") j++; else if (c === '"' || c === "'") q = c; else if (c === "{") d++; else if (c === "}") d--; }
      nodes.push({ prelude, body: src.slice(k, j) }); i = j;
    }
    return nodes;
  }
  function walk(nodes, base) {
    for (const { prelude, body } of nodes) {
      if (body == null) continue; // @import, @charset, @namespace, @layer a, b;
      if (!prelude.startsWith("@")) {
        const am = body.match(/(?:^|[;{\s])animation(?:-name)?\s*:\s*([^;}]+)/);
        if (am) uses.push([prelude.slice(0, 60), am[1].split(/[\s,]+/).filter((t) => /^[a-zA-Z_][\w-]*$/.test(t))]);
        const sels = [...new Set(split(prelude).map(scope).filter(Boolean))];
        if (sels.length) out.push(`${sels.join(", ")} ${val(body, base)}`);
        continue;
      }
      const at = prelude.match(/^@([\w-]+)\s*(.*)$/), name = at[1].replace(/^-\w+-/, ""), cond = at[2];
      if (name in seen) seen[name]++;
      if (name === "media") { let ok = false; try { ok = matchMedia(cond).matches; } catch {} if (ok) walk(parse(body.slice(1, -1)), base); else stats.media++; }
      else if (name === "supports") { let ok = true; try { ok = CSS.supports(cond); } catch {} if (ok) walk(parse(body.slice(1, -1)), base); }
      else if (name === "font-face") fonts.push(val(`@font-face ${body}`, base));
      else if (name === "keyframes") { stats.keyframes++; (keyframes ??= []).push(cond.trim()); }
      else if (name === "property") out.push(`${prelude} ${body}`);
      else if (["layer", "container", "scope"].includes(name)) walk(parse(body.slice(1, -1)), base); // contents kept; layer order is lost
    }
  }
  // Sanity: an independent count of top-level style blocks (quotes ignored, so a tokenizer that mis-reads a string cannot fool it) against what parse() found
  const naiveTop = (src) => { let d = 0, n = 0, at = false, start = true; for (let i = 0; i < src.length; i++) { const c = src[i]; if (c === "\\") { i++; start = false; continue; } if (c === "{") { if (!d && !at) n++; d++; } else if (c === "}") { d = Math.max(0, d - 1); if (!d) { start = true; at = false; } } else if (c === ";" && !d) { start = true; at = false; } else if (!d && start && !/\s/.test(c)) { start = false; at = c === "@"; } } return n; };
  const check = { parsed: 0, naive: 0, seen, src: { media: 0, container: 0, property: 0 }, tokens: [] };
  for (const s of sheets) {
    const text = s.text.replace(/\/\*[\s\S]*?\*\//g, ""), nodes = parse(text);
    check.parsed += nodes.filter((n) => n.body != null && !n.prelude.startsWith("@")).length; check.naive += naiveTop(text);
    for (const k of Object.keys(check.src)) check.src[k] += (text.match(new RegExp(`@${k}\\b`, "g")) ?? []).length;
    for (const [, n] of text.matchAll(/(?:^|[;{}\s])(--[\w-]+)\s*:/g)) if (/^--(background|foreground|primary|card|border|muted|accent|ring|bg|fg|color-background)$/.test(n)) check.tokens.push(n);
    walk(nodes, s.base);
  }
  check.tokens = [...new Set(check.tokens)];
  check.css = out.join("\n");
  const b = info.base, bm = info.bodyMargin ?? [0, 0, 0, 0];
  const head = `:where(${SC}) { color: ${b.color}; font: ${b.fontWeight} ${b.fontSize}/${b.lineHeight} ${b.fontFamily}; ${b.background ? `background: ${b.background}; ` : ""}${bm.some((v) => v) ? "display: flow-root; " : ""}-webkit-font-smoothing: antialiased; }
:where(${SC} *:not(button, input, select, textarea, progress, meter)), :where(${SC} *:not(button, input, select, textarea, progress, meter))::before, :where(${SC} *:not(button, input, select, textarea, progress, meter))::after { box-sizing: content-box; }
:where(${SC}) :where(h1) { margin: .67em 0; font-size: 2em; font-weight: 700; } :where(${SC}) :where(h2) { margin: .83em 0; font-size: 1.5em; font-weight: 700; } :where(${SC}) :where(h3) { margin: 1em 0; font-size: 1.17em; font-weight: 700; }
:where(${SC}) :where(h4) { margin: 1.33em 0; font-weight: 700; } :where(${SC}) :where(h5) { margin: 1.67em 0; font-size: .83em; font-weight: 700; } :where(${SC}) :where(h6) { margin: 2.33em 0; font-size: .67em; font-weight: 700; }
:where(${SC}) :where(p, dl, pre) { margin: 1em 0; } :where(${SC}) :where(ul, ol) { margin: 1em 0; padding-inline-start: 40px; } :where(${SC}) :where(blockquote, figure) { margin: 1em 40px; } :where(${SC}) :where(dd) { margin-inline-start: 40px; }
:where(${SC}) :where(ul) { list-style: disc; } :where(${SC}) :where(ol) { list-style: decimal; } :where(${SC}) :where(b, strong) { font-weight: bolder; } :where(${SC}) :where(code, pre, kbd, samp) { font-family: monospace; } :where(${SC}) :where(a) { color: -webkit-link; text-decoration: underline; }`;
  // The wrapper is the capture viewport (1920x1080 unless --viewport), centred on the 1920x1080 stage. A root that spans the whole viewport
  // becomes static so fixed overlays (turned absolute) anchor to the wrapper; a narrower root (a centred column) keeps its position:
  // making it static would stretch its tab bar / FAB / toast to the wrapper width.
  const full = info.rootW >= info.viewW - 1;
  const pad = bm.some((v) => v) ? ` padding: ${bm.map((v) => v + "px").join(" ")};` : ""; // body margin → wrapper padding (flow-root in the head keeps children's margins inside)
  const tail = withTail ? `/* film adaptations */
.app-shot { isolation: isolate; position: absolute; left: ${(1920 - W) / 2}px; top: ${(1080 - H) / 2}px; width: ${W}px; height: ${H}px; margin: 0; overflow: hidden; box-sizing: border-box;${pad} }${!full && !info.rootIsBody && info.rootW > 100 ? `\n:where(.app-shot > :first-child) { width: ${Math.round(info.rootW)}px; max-width: 100%; margin-left: auto; margin-right: auto; } /* the real root is ${Math.round(info.rootW)} px wide, not the ${info.viewW} px viewport */` : ""}${info.rootPos === "relative" && full ? `\n.app-shot > :first-child { position: static; } /* fixed overlays anchor to the ${W}x${H} wrapper */` : ""}` : "";
  return { css: `${head}\n${out.join("\n")}\n${tail}\n`, check, rules: out, fonts, stats, keyframes: keyframes ?? [], animations: uses.flatMap(([sel, toks]) => toks.filter((t) => (keyframes ?? []).includes(t)).map((t) => `${t} on ${sel}`)) };
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
// extra = [{ sheets, info, key }]: the app in another theme (colour scheme, or a JS-switched variable set). Only the rules that differ from the base
// are kept, scoped under .app-shot[data-tk="<key>"] (UI.shot sets the attribute), so a theme reveal can show both. viewport = [w, h] of the capture (the wrapper gets that size).
export async function portCss(browser, sheets, info, film, out = path.join(film, "app.css"), { viewport = [W, H], extra = [], faces: jsFaces = [] } = {}) {
  const [vw, vh] = viewport, run = async (sh, inf, SC, tail) => {
    const page = await browser.newPage({ viewport: { width: vw, height: vh }, reducedMotion: "reduce", colorScheme: inf.scheme });
    try { await page.setContent("<!doctype html><html><head></head><body></body></html>"); return await page.evaluate(transform, { sheets: sh, info: inf, W: vw, H: vh, SC, tail }); }
    finally { await page.close(); }
  };
  const bad = (c) => c.naive >= 20 && c.parsed < c.naive * 0.8 || [...Object.keys(c.src)].some((k) => c.src[k] >= 10 && c.seen[k] < c.src[k] * 0.8);
  let r = await run(sheets, info, ".app-shot", true);
  if (bad(r.check) && sheets.every((x) => x.alt)) { // the stylesheet text defeated the tokenizer: the browser's own serialisation (CSSOM) of the same rules is cleaner
    const r2 = await run(sheets.map((x) => ({ ...x, text: x.alt })), info, ".app-shot", true);
    if (!bad(r2.check) || r2.rules.length > r.rules.length) { console.error(`note port-css: the stylesheet text was only partly parsed (${r.check.parsed}/${r.check.naive} rules); used the browser's CSSOM copy of the rules instead (${r2.rules.length} rules)`); r = r2; }
  }
  const selOf = (q) => q.slice(0, q.indexOf("{")).trim(), lastBase = new Map(r.rules.map((q) => [selOf(q), q])); // the last rule per selector wins in the cascade: an extra theme keeps what differs from THAT, not from any earlier rule
  for (const x of extra) { const e = await run(x.sheets, x.info, ".app-shot", false), keep = e.rules.filter((q) => lastBase.get(selOf(q)) !== q).map((q) => q.replace(/\.app-shot(?![\w-])/g, `.app-shot[data-tk="${x.key}"]`)); r.css += `\n/* theme ${x.key} (${keep.length} rules differ) */\n${keep.join("\n")}\n`; r.fonts.push(...e.fonts); r.stats.keyframes += e.stats.keyframes; r.keyframes.push(...e.keyframes); r.animations.push(...e.animations); }
  // @font-face rules for fonts the page registered through the FontFace API (capture.mjs collects them); skipped when the CSS already has the file
  for (const f of jsFaces) { const u = f.match(/url\("([^"]+)"\)/)?.[1]; if (!u || !r.css.includes(u) && !r.fonts.some((x) => x.includes(u))) r.fonts.push(f); }
  const faces = [...new Set(r.fonts.map((f) => f.replace(/\s+/g, " ")))];
  const loc = await localize(`${faces.join("\n")}\n${r.css}`, film);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `/* Ported from the running app by scripts/port-css.mjs: scoped under .app-shot, ${W}x${H} viewport units. Regenerate, don't hand-edit. */\n${loc.css}`);
  // variable fonts declare a range ("font-weight: 200 800"): list the heaviest weight (one file covers the whole range) and report the range
  const ranges = [];
  const fontList = [...loc.css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => {
    if (/url\("(?:https?|file):/.test(m[0])) return null; // its file was not copied: don't list a face that cannot load offline
    const fam = m[0].match(/font-family:\s*([^;]+);/)?.[1].trim().replace(/^["']+|["']+$/g, "").replace(/"/g, ""), ws = (m[0].match(/font-weight:\s*([^;]+);/)?.[1] ?? "400").trim().split(/\s+/);
    if (fam && ws.length > 1 && ws[0] !== ws.at(-1)) ranges.push(`${fam} ${ws[0]}-${ws.at(-1)}`);
    return fam && `${ws.at(-1)} 40px '${fam.replace(/'/g, "")}'`;
  }).filter(Boolean);
  if (loc.failed.length) console.error(`port-css: ${loc.failed.length} file(s) could not be copied; app.css still points at them (absolute URLs): fix the paths, the film would not render offline`);
  { const c = r.check, short = Object.keys(c.src).filter((k) => c.src[k] >= 10 && c.seen[k] < c.src[k] * 0.8);
    if (short.length) console.error(`WARNING port-css: ${short.map((k) => `${c.seen[k]} of ${c.src[k]} @${k} blocks`).join(", ")} were ported: responsive rules went missing, the replica would show the mobile layout. Check app.css for md:/lg: rules; report the stylesheet if they are absent.`);
    const miss = c.tokens.filter((n) => !c.css.includes(`${n}:`)); if (miss.length) console.error(`WARNING port-css: design token(s) ${miss.join(", ")} are defined in the app's CSS but missing from app.css: colours will fall back to the film's own tokens.`); }
  if (r.check.naive >= 20 && r.check.parsed < r.check.naive * 0.8) console.error(`WARNING port-css: only ${r.check.parsed} of ${r.check.naive} top-level CSS rules were parsed: the tokenizer lost most of the stylesheet (an exotic selector or string). The replica will be badly broken: report the stylesheet, or write the missing rules by hand.`);
  return { out, check: r.check, rules: r.css.split("\n").length, fontFaces: faces.length, copied: loc.copied, stats: r.stats, keyframes: [...new Set(r.keyframes)], animations: [...new Set(r.animations)], fonts: [...new Set(fontList)], variable: [...new Set(ranges)], failed: loc.failed };
}

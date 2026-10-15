// Privacy redaction shared by capture.mjs (--redact), compare.mjs and audit.mjs (PII scan of the finished film).
// Real customer data must never end up in a film that is shared or committed: capture replaces it with consistent fakes
// (same input -> same fake, in every state and every run), audit greps what is left.
export const PII = [
  ["email", "[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}", "g"],
  ["key", "\\b(?:sk|pk|rk)[-_](?:live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{20,}|\\bgh[pousr]_[A-Za-z0-9]{30,}|\\bgithub_pat_[A-Za-z0-9_]{30,}|\\bglpat-[A-Za-z0-9_-]{16,}|\\bxox[abprs]-[A-Za-z0-9-]{10,}|\\bAKIA[0-9A-Z]{16}\\b|\\bAIza[0-9A-Za-z_-]{35}|\\beyJ[A-Za-z0-9_-]{8,}\\.eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}|\\bnpm_[A-Za-z0-9]{30,}|\\bBearer\\s+[A-Za-z0-9._~+/-]{24,}|(?:api[_-]?key|secret|token|passwd|password)[\"']?\\s*[:=]\\s*[\"']?[A-Za-z0-9_\\-]{20,}", "gi"],
  ["phone", "\\+\\d{1,3}[\\s.-]?\\(?\\d{1,4}\\)?(?:[\\s.-]?\\d{2,4}){2,4}|\\(\\d{3}\\)\\s?\\d{3}[\\s.-]\\d{4}|(?<![\\d.])\\d{3}[-. ]\\d{3}[-. ]\\d{4}(?![\\d.])|(?<![\\d.])\\d{3}[ -]\\d{3}[ -]\\d{3}(?![\\d.])", "g"],
];
const FAKE_MAIL = /@(?:[\w-]+\.)*example\.(?:com|org|net)$/i;
// the fakes capture writes are recognisable, so audit does not flag them: example.* mail, phones containing 55501
export function isFake(kind, s) {
  if (kind === "email") return FAKE_MAIL.test(s);
  if (kind === "phone") return /55501/.test(s.replace(/\D/g, ""));
  return false;
}
export const mask = (s) => s.length <= 4 ? "***" : `${s.slice(0, 2)}***${s.slice(-2)}`;

// Which kinds to redact: --redact alone = emails, phones, keys. A states.json block `"redact": true | { emails, phones, keys, names: [...], allow: [...], patterns: [{ regex, flags, replace }] }`.
export function redactConfig(block, flag, namesFlag) {
  if (!block && !flag && !namesFlag) return null;
  const b = block && typeof block === "object" ? block : {};
  const names = [...(Array.isArray(b.names) ? b.names : []), ...(typeof namesFlag === "string" ? namesFlag.split(",") : [])].map((s) => String(s).trim()).filter(Boolean);
  return {
    emails: b.emails !== false, phones: b.phones !== false, keys: b.keys !== false, names,
    allow: (b.allow ?? []).map(String), patterns: (b.patterns ?? []).map((p) => ({ regex: String(p.regex), flags: String(p.flags ?? "g"), replace: String(p.replace ?? "REDACTED") })),
  };
}
export function checkRedactBlock(block, where) {
  if (block === undefined || typeof block === "boolean") return null;
  if (!block || typeof block !== "object" || Array.isArray(block)) return `${where}: "redact" must be true or an object { emails, phones, keys, names, allow, patterns }`;
  for (const k of Object.keys(block)) if (!["emails", "phones", "keys", "names", "allow", "patterns"].includes(k)) return `${where}: unknown redact key "${k}" (emails, phones, keys, names, allow, patterns)`;
  for (const k of ["names", "allow", "patterns"]) if (block[k] !== undefined && !Array.isArray(block[k])) return `${where}: redact.${k} must be an array`;
  for (const p of block.patterns ?? []) { try { new RegExp(p.regex, p.flags ?? "g"); } catch (e) { return `${where}: redact.patterns: ${e.message}`; } }
  return null;
}

// Runs in the page (self-contained: it is serialised). Replaces PII in text nodes and in the attributes value, title, alt, placeholder,
// aria-label and mailto:/tel: hrefs; never touches class, id, style, <style> or <script>. Returns { counts, total, unique, samples }.
export function redactInPage({ cfg, pii }) {
  const FIRST = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Quinn", "Robin", "Drew", "Reese", "Rowan", "Skyler", "Emery", "Harper", "Finley", "Sage", "Dana"];
  const LAST = ["Rivera", "Nguyen", "Okafor", "Lindqvist", "Moreau", "Tanaka", "Silva", "Kowalski", "Bennett", "Haddad", "Novak", "Fischer", "Costa", "Larsen", "Patel", "Weber", "Duarte", "Ortiz", "Sato", "Brandt"];
  const h32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const rng = (seed) => { let x = seed || 1; return () => { x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0; x = Math.imul(x ^ (x >>> 13), 3266489917) >>> 0; x ^= x >>> 16; return (x >>> 0) / 4294967296; }; };
  const fakeName = (real) => { const r = rng(h32("name|" + real.toLowerCase())); return [FIRST[Math.floor(r() * FIRST.length)], LAST[Math.floor(r() * LAST.length)]]; };
  const casing = (src, out) => src === src.toUpperCase() && /[A-Z]/.test(src) ? out.toUpperCase() : src === src.toLowerCase() ? out.toLowerCase() : out;
  const ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const fake = {
    email: (m) => { const [f, l] = fakeName(m); return `${f}.${l}@example.com`.toLowerCase(); },
    phone: (m) => { // keep the shape and a leading country code; the rest becomes 555 01xx-style digits (audit recognises 55501)
      const r = rng(h32("phone|" + m.replace(/\D/g, ""))); const cc = m.startsWith("+") ? m.match(/^\+\d{1,3}/)[0] : "";
      const digs = m.slice(cc.length).replace(/\D/g, "").length; let seq = "55501"; while (seq.length < digs) seq += Math.floor(r() * 10); seq = seq.slice(0, digs);
      let k = 0; return cc + m.slice(cc.length).replace(/\d/g, () => seq[k++]);
    },
    key: (m) => { // keep the prefix (sk_live_, ghp_, AKIA, eyJ..., token=) and the length, swap the secret part
      const r = rng(h32("key|" + m)), pre = m.match(/^(?:(?:api[_-]?key|secret|token|passwd|password)["']?\s*[:=]\s*["']?|Bearer\s+|(?:sk|pk|rk)[-_](?:live|test|proj|ant)?[-_]?|gh[pousr]_|github_pat_|glpat-|xox[abprs]-|AKIA|AIza|npm_|eyJ)/i)?.[0] ?? "";
      let out = ""; for (let i = pre.length; i < m.length; i++) out += /[.\-_]/.test(m[i]) ? m[i] : ALNUM[Math.floor(r() * ALNUM.length)];
      return pre + out;
    },
  };
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rules = []; // [kind, RegExp, replacer]
  const allow = new Set(cfg.allow.map((s) => s.toLowerCase()));
  for (const [kind, src, flags] of pii) { if ((kind === "email" && !cfg.emails) || (kind === "phone" && !cfg.phones) || (kind === "key" && !cfg.keys)) continue; rules.push([kind, new RegExp(src, flags), fake[kind]]); }
  const nameMap = new Map(); // whole word (lower) -> fake word
  for (const n of cfg.names) {
    const toks = n.split(/\s+/).filter(Boolean), [f, l] = fakeName(n);
    nameMap.set(n.toLowerCase(), `${f} ${l}`);
    toks.forEach((t, i) => { if (t.length >= 3 && !nameMap.has(t.toLowerCase())) nameMap.set(t.toLowerCase(), i === 0 ? f : l); });
  }
  if (nameMap.size) rules.unshift(["name", new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...nameMap.keys()].sort((a, b) => b.length - a.length).map(esc).join("|")})(?![\\p{L}\\p{N}])`, "giu"), (m) => casing(m, nameMap.get(m.toLowerCase()))]);
  for (const p of cfg.patterns) rules.push(["custom", new RegExp(p.regex, p.flags.includes("g") ? p.flags : p.flags + "g"), () => p.replace]);
  const counts = {}, uniq = new Map(), samples = [];
  const mk = (s) => s.length <= 4 ? "***" : `${s.slice(0, 2)}***${s.slice(-2)}`;
  const run = (s) => {
    let out = s;
    for (const [kind, re, fn] of rules) {
      re.lastIndex = 0;
      out = out.replace(re, (m) => {
        if (allow.has(m.toLowerCase())) return m;
        if (kind === "email" && /@(?:[\w-]+\.)*example\.(?:com|org|net)$/i.test(m)) return m;
        if (kind === "phone" && /55501/.test(m.replace(/\D/g, ""))) return m;
        const f = fn(m); if (f === m) return m;
        counts[kind] = (counts[kind] ?? 0) + 1; if (!uniq.has(kind + m)) { uniq.set(kind + m, kind); if (samples.length < 40) samples.push(`${kind} ${mk(m)}`); }
        return f;
      });
    }
    return out;
  };
  const skip = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/;
  const wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; while (wk.nextNode()) nodes.push(wk.currentNode);
  for (const n of nodes) { if (skip.test(n.parentElement?.tagName ?? "") || !n.nodeValue.trim()) continue; const v = run(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  for (const e of document.body.querySelectorAll("*")) {
    if (e instanceof HTMLInputElement && e.type === "password") continue;
    for (const at of ["value", "title", "alt", "placeholder", "aria-label"]) {
      const cur = e.getAttribute(at); if (cur == null) continue;
      const v = run(cur); if (v !== cur) e.setAttribute(at, v);
    }
    if ((e instanceof HTMLInputElement && !/^(checkbox|radio|file)$/.test(e.type)) || e instanceof HTMLTextAreaElement) { const v = run(e.value); if (v !== e.value) e.value = v; }
    const href = e.getAttribute("href"); if (href && /^(mailto|tel):/i.test(href)) { const v = run(href); if (v !== href) e.setAttribute("href", v); }
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return { counts, total, unique: uniq.size, samples };
}

// Node side: run it on a Playwright page and collect a summary across states.
export async function redactPage(page, cfg, summary, name) {
  const r = await page.evaluate(redactInPage, { cfg, pii: PII });
  if (r.total) { summary.states.push({ name, ...r }); for (const [k, n] of Object.entries(r.counts)) summary.counts[k] = (summary.counts[k] ?? 0) + n; r.samples.forEach((s) => summary.seen.add(s)); }
  return r;
}
export const newSummary = () => ({ states: [], counts: {}, seen: new Set() });
export function printSummary(sum, log = console.log) {
  const parts = Object.entries(sum.counts).map(([k, n]) => `${k} ${n}`).join(", ");
  log(`redacted ${Object.values(sum.counts).reduce((s, n) => s + n, 0)} value(s) in ${sum.states.length} state(s)${parts ? ` (${parts})` : ""}; ${sum.seen.size} distinct, each mapped to the same fake everywhere`);
  for (const s of sum.states) log(`  ${s.name.padEnd(18)} ${Object.entries(s.counts).map(([k, n]) => `${k} ${n}`).join(", ")}`);
  log("redaction covers text, value/title/alt/placeholder/aria-label and mailto:/tel: links; NOT pixels (canvas, image states, avatars, photos): check review/ images by eye");
}

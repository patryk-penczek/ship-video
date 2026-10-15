// Real app vs replica, one state at a time: screenshots the running app after each state's actions and the matching
// .frame[data-state] of the replica gallery, prints a pixel-diff % per state and stacks real / replica / diff into <outDir>/<state>.png
// (the diff alone: <state>-diff.png). Read every PNG. Target: under ~2 % per state; text anti-aliasing alone is about 0.3 %.
// usage: node compare.mjs <app-url> <film>/gallery.html <outDir> --states states.json [--width 1920 --height 1080] [--scale 0.5] [--full] [--max-diff 2]
//   states.json is the file capture.mjs reads (actions: click fill type press hover select check set scroll waitFor wait goto eval;
//   `continue: true` reuses the previous state's page). Each state name must match a gallery .frame[data-state].
//   --scale   size of the images in the stacked PNG (default 0.5; 1 = pixel for pixel)
//   --full    compare the whole page height instead of the 1080 viewport (replica frame is stretched to the real page's height)
//   --max-diff N  mark states above N % as OVER (default 2)
//   --max-block N mark a state OVER when any 64x64 cell differs on more than N % of its pixels (default 30): a stretched tab bar or a wrong
//                 toast is a small area, so the whole-page % stays low; the worst cell is printed and outlined in yellow in the diff image
//   Also checked per state, not just pixels: visible text of the real page that is MISSING in the replica (a dropped toast / portal), text only in the
//   replica, and the number of images/svg/canvas. Any missing text marks the state OVER.
//   --redact / --redact-names "A,B" · states.json "redact": the same fakes capture.mjs --redact wrote are applied to the REAL page before it is compared (pass whatever you captured with, or redacted text shows as missing)
//   --no-text     skip the text/media presence check (pages with random demo data: compare is layout-only then)
//   --viewport WxH · --touch · --dpr N · --scheme light|dark · --storage "k=v;k2=v2" · --motion: same meaning as in capture.mjs (use the flags you captured with;
//   a non-1920x1080 viewport compares the real viewport with the replica's .app-shot wrapper). states.json may carry "init" (login) and per-state "scheme".
//   state "mask": ["#timing", ".clock"]: elements with live values (response time, clock, random numbers): ignored by the pixel diff and the text check
//   state "clip": "#pricing" compares that element only (the real page scrolls it into view, the replica element of the same selector is cut out);
//   a state with its own "root" is compared the same way, by its root. Use it for sections of tall pages and scrolled states.
// The app runs with reduced motion and CSS animations/transitions frozen, so screenshots are stable.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { help, args, load, die, mustExist, known, num } from "./lib/common.mjs";
import { drive, readStates, freezePage, envOptions } from "./lib/drive.mjs";
import { redactConfig, redactPage, newSummary } from "./lib/redact.mjs";
help(import.meta.url);

const a = args(undefined, ["full", "touch", "motion", "no-text", "redact", "help"]);
known(a, ["states", "width", "height", "scale", "full", "max-diff", "max-block", "viewport", "touch", "dpr", "scheme", "storage", "motion", "no-text", "storage-state", "seed", "init-script", "redact", "redact-names"]);
const env = envOptions(a);
const [url, gallery, outDir] = a._;
if (a.states === true) die("--states needs a file");
if (!url || !gallery || !outDir || !a.states) die("usage: node compare.mjs <app-url> <gallery.html> <outDir> --states states.json [--scale 1] [--full]");
mustExist(gallery, "gallery"); mustExist(a.states, "states file");
const states = readStates(a.states);
const REDACT = redactConfig(states.redact, a.redact, a["redact-names"]), redactSum = newSummary();
const W = a.viewport ? env.width : num(a, "width", 1920, { min: 320, max: 7680, int: true }), H = a.viewport ? env.height : num(a, "height", 1080, { min: 240, max: 4320, int: true });
const DPR = env.dpr, maxBlock = num(a, "max-block", 30, { min: 0, max: 100 }), small = W !== 1920 || H !== 1080;
const scale = num(a, "scale", 0.5, { min: 0.1, max: 2 }), max = num(a, "max-diff", 2, { min: 0, max: 100 });
if (small && !a.viewport) console.error(`note: the gallery frames are 1920x1080; a ${W}x${H} app will differ everywhere (capture with --viewport ${W}x${H} and pass the same flag here)`);

// Runs in a blank page: per-pixel diff of two PNGs (a channel differing by more than 24/255 counts) and a diff image.
async function diff(page, real, replica, cell, mask = []) {
  return page.evaluate(async ([A, B, cell, maxBlock, mask]) => {
    const load = (b) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `data:image/png;base64,${b}`; });
    const [ia, ib] = [await load(A), await load(B)], w = ia.width, h = ia.height;
    const px = (img) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = "#f0f"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h); };
    const da = px(ia), db = px(ib), out = new ImageData(w, h);
    let bad = 0;
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell), cnt = new Float32Array(cols * rows);
    for (let i = 0; i < da.data.length; i += 4) {
      const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
      const g = (da.data[i] + da.data[i + 1] + da.data[i + 2]) / 3 * 0.25;
      const px = (i / 4) % w, py = Math.floor(i / 4 / w);
      if (d > 24 && !mask.some(([mx, my, mw, mh]) => px >= mx && px < mx + mw && py >= my && py < my + mh)) { bad++; const q = i / 4; cnt[Math.floor(q / w / cell) * cols + Math.floor((q % w) / cell)]++; out.data[i] = 255; out.data[i + 1] = 40; out.data[i + 2] = 40; } else { out.data[i] = out.data[i + 1] = out.data[i + 2] = g; }
      out.data[i + 3] = 255;
    }
    const c = document.createElement("canvas"); c.width = w; c.height = h; const cx = c.getContext("2d"); cx.putImageData(out, 0, 0);
    let worst = { pct: 0, x: 0, y: 0 };
    cx.strokeStyle = "#ffd400"; cx.lineWidth = Math.max(2, cell / 16);
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const area = Math.min(cell, w - k * cell) * Math.min(cell, h - r * cell), pct = cnt[r * cols + k] / area * 100;
      if (area >= cell * cell / 4 && pct > worst.pct) worst = { pct, x: k * cell, y: r * cell };
      if (area >= cell * cell / 4 && pct > maxBlock) cx.strokeRect(k * cell + 1, r * cell + 1, cell - 2, cell - 2);
    }
    return { pct: bad / (w * h) * 100, block: worst, png: c.toDataURL("image/png").split(",")[1], size: [w, h, ib.width, ib.height] };
  }, [real, replica, cell, maxBlock, mask]);
}

// Runs in a page: the visible text nodes and the count of images/svg/canvas inside `root` that lie in the viewport (w x h, or any height when full),
// relative to `origin` (the replica's .app-shot, or the page itself). Real page and replica are measured with the same function.
function census([sel, originSel, w, h, full, masks = []]) {
  const root = sel ? document.querySelector(sel) : document.body, o = originSel ? document.querySelector(originSel) : null;
  if (!root) return null;
  const org = o ? o.getBoundingClientRect() : { left: 0, top: 0 }, texts = [];
  const visible = (e) => {
    const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return false;
    for (let p = e; p; p = p.parentElement) if (Number(getComputedStyle(p).opacity) < 0.05) return false;
    return true;
  };
  const inView = (r) => r.width > 0 && r.height > 0 && r.right - org.left > 0 && r.left - org.left < w && r.bottom - org.top > 0 && (full || r.top - org.top < h);
  const wk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), rg = document.createRange();
  const byParent = new Map(); // adjacent text nodes (React splits "● Medium" in three) merge when the DOM is re-parsed: compare per parent element
  while (wk.nextNode()) {
    const n = wk.currentNode, e = n.parentElement;
    if (!n.textContent.trim() || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(e?.tagName) || !visible(e)) continue;
    if (masks.some((m) => { try { return e.closest(m); } catch { return false; } })) continue;
    rg.selectNodeContents(n); const rr = rg.getBoundingClientRect(); if (!inView(rr)) continue;
    const cur = byParent.get(e); byParent.set(e, { t: (cur?.t ?? "") + n.textContent, r: cur?.r ?? [rr.left - org.left, rr.top - org.top, rr.width, rr.height] });
  }
  // relative times ("5 min ago", "just now") and timings ("34 ms") change between runs: compared as a placeholder
  const norm = (t) => t.replace(/\s+/g, " ").trim().replace(/\b(\d+|an?)\s*(s|sec\w*|m|min\w*|h|hrs?|hours?|d|days?|w|weeks?|months?|y|years?)\s+ago\b/gi, "~ ago").replace(/\bjust now\b/gi, "~ ago").replace(/\b\d+(\.\d+)?\s?ms\b/g, "~ ms");
  const boxes = [];
  for (const { t, r } of byParent.values()) { const v = norm(t); if (v) { texts.push(v); boxes.push([v, ...r]); } }
  const media = [...root.querySelectorAll("img, svg, canvas")].filter((e) => !e.closest("svg:not(:scope)") && visible(e) && inView(e.getBoundingClientRect())).length;
  return { texts, boxes, media };
}

mkdirSync(outDir, { recursive: true });
const { chromium } = load("playwright");
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const errors = [], rows = [];
try {
  const galCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DPR });
  const gal = await galCtx.newPage();
  gal.on("pageerror", (e) => errors.push(`[gallery] ${e.message}`));
  await gal.goto(pathToFileURL(path.resolve(gallery)).href);
  await gal.addStyleTag({ content: ".frame::before{display:none!important}" }); // the state label would count as a difference
  await gal.evaluate(() => document.fonts.ready);
  await gal.waitForTimeout(300);
  const tool = await browser.newPage({ viewport: { width: 400, height: 300 } });

  await drive(browser, url, states, { width: W, height: H, errors, animate: false, dpr: DPR, dprAll: true, touch: env.touch, motion: env.motion, scheme: env.scheme, storage: env.storage, init: states.init, setup: states.setup, seed: env.seed, initScript: env.initScript, storageState: env.storageState }, async (app, st) => {
    if (st.capture === false) return; // drive-only state, same meaning as in capture.mjs
    const fullPage = !!(st.full ?? a.full);
    const clipSel = st.clip ?? (st.root && !/^(body|html)$/.test(st.root) ? st.root : null); // a section / scrolled state: compare that element, scrolled into view
    // a click may have scrolled the real page (the replica is captured at scroll 0): put window and scroll containers back first (not for a clipped element: it is scrolled to)
    if (!clipSel) await app.evaluate(() => { window.scrollTo(0, 0); for (const e of document.querySelectorAll("*")) if (e.scrollTop || e.scrollLeft) { e.scrollTop = 0; e.scrollLeft = 0; } });
    await app.waitForTimeout(100);
    if (REDACT && st.redact !== false) await redactPage(app, REDACT, redactSum, st.name);
    const pageH = await app.evaluate(() => document.documentElement.scrollHeight);
    if (!fullPage && !(st.clip ?? st.root) && pageH > H + 20) console.error(`note [${st.name}] the page is ${pageH} px tall: only the top ${H} px are compared (add --full, or "full": true on the state, to verify the rest)`);
    const frame = await gal.$(`.frame[data-state="${st.name}"]`);
    if (!frame) { errors.push(`gallery has no .frame[data-state="${st.name}"]`); return; }
    // replica part to compare: the clipped element, or the .app-shot wrapper when the viewport is not 1920x1080, or the whole frame
    let repEl = frame, realBuf;
    if (clipSel) {
      const loc = app.locator(clipSel).first();
      if (!(await loc.count())) { errors.push(`[${st.name}] clip/root "${clipSel}" matches nothing on the real page`); return; }
      repEl = (st.clip ? await frame.$(`.app-shot ${st.clip}`) : null) ?? await frame.$(".app-shot > :first-child") ?? frame;
      realBuf = await loc.screenshot();
    } else {
      if (small) repEl = (await frame.$(".app-shot")) ?? frame;
      realBuf = await app.screenshot({ fullPage });
    }
    const real = realBuf.toString("base64");
    const full = fullPage ? await app.evaluate(() => document.documentElement.scrollHeight) : H;
    if (fullPage && !clipSel) await frame.evaluate((f, h) => { f.style.height = `${h}px`; f.querySelectorAll(".app-shot").forEach((s) => { s.style.height = `${h}px`; }); }, full);
    if (clipSel) await frame.evaluate((f) => { for (const e of [f, ...f.querySelectorAll(".app-shot")]) { e.dataset.svS = e.getAttribute("style") ?? ""; e.style.height = "auto"; e.style.overflow = "visible"; } }); // an element taller than the viewport: do not cut it at the frame
    const replica = (await repEl.screenshot()).toString("base64");
    if (clipSel) await frame.evaluate((f) => { for (const e of [f, ...f.querySelectorAll(".app-shot")]) { e.setAttribute("style", e.dataset.svS); delete e.dataset.svS; } });
    if (fullPage && !clipSel) await frame.evaluate((f) => { f.style.height = ""; f.querySelectorAll(".app-shot").forEach((s) => { s.style.height = ""; }); });
    // canvas pixels (a map, a chart drawn by JS) never match a captured frame: masked out of the diff when the state has canvases of its own
    // "mask": [selector, ...] on a state does the same for live numbers (a response time, a clock, a random value): those elements are ignored by the diff and the text check
    const masks = [].concat(st.mask ?? []);
    const mask = (st.canvas || st.record || masks.length) ? await app.evaluate(([sel, k, masks, canv]) => {
      const o = sel ? document.querySelector(sel).getBoundingClientRect() : { left: 0, top: 0 };
      const els = [...(canv ? document.querySelectorAll("canvas") : []), ...masks.flatMap((m) => [...document.querySelectorAll(m)])];
      return els.map((c) => { const r = c.getBoundingClientRect(); return [(r.left - o.left) * k, (r.top - o.top) * k, r.width * k, r.height * k]; }).filter((r) => r[2] > 0 && r[3] > 0);
    }, [clipSel, DPR, masks, !!(st.canvas || st.record)]) : [];
    if (mask.length) console.error(`note [${st.name}] ${mask.length} region(s) (canvas / "mask") masked out of the pixel diff`);
    const d = await diff(tool, real, replica, Math.round(64 * DPR), mask);
    // presence check: text and media the real page shows but the replica does not (a dropped toast scores 0.5 % in pixels)
    const fs = `.frame[data-state="${st.name}"]`, repRoot = clipSel ? (st.clip ? `${fs} .app-shot ${st.clip}` : `${fs} .app-shot > :first-child`) : fs;
    const noText = a["no-text"] || st.image; // an image state has no text to find
    const rc = noText ? null : await app.evaluate(census, [clipSel, clipSel, W, H, fullPage || !!clipSel, masks]);
    const rp = noText ? null : await gal.evaluate(census, [repRoot, clipSel ? repRoot : `${fs} .app-shot`, W, H, fullPage || !!clipSel, masks.map((m) => `${repRoot === fs ? fs : repRoot} ${m}`)]);
    const miss = [], extra = [];
    if (process.env.DEBUG) console.error(`[${st.name}] census real ${rc?.texts.length} texts, replica ${rp?.texts.length} (root ${repRoot})`);
    if (rc && rp) {
      const bag = (arr) => { const m = new Map(); for (const t of arr) m.set(t, (m.get(t) ?? 0) + 1); return m; }, A = bag(rc.texts), B = bag(rp.texts);
      for (const [t, n] of A) if ((B.get(t) ?? 0) < n) miss.push(t);
      for (const [t, n] of B) if ((A.get(t) ?? 0) < n) extra.push(t);
    }
    const mediaDiff = rc && rp ? rp.media - rc.media : 0;
    // structure: the same text must sit in the same place. Pixel diff stays low on a mostly empty page even when the layout collapsed into one column.
    let moved = 0, matched = 0;
    if (rc && rp) {
      const pool = new Map(); for (const [t, ...r] of rp.boxes) (pool.get(t) ?? pool.set(t, []).get(t)).push(r);
      for (const [t, x, y, w, h] of rc.boxes) {
        const list = pool.get(t); if (!list?.length) continue;
        let bi = 0, bd = Infinity; list.forEach((r, i) => { const dd = Math.hypot(r[0] - x, r[1] - y); if (dd < bd) { bd = dd; bi = i; } });
        const [rx, ry, rw, rh] = list.splice(bi, 1)[0]; matched++;
        if (Math.hypot(rx - x, ry - y) > 40 || Math.abs(rw - w) > Math.max(24, w * 0.3) || Math.abs(rh - h) > Math.max(16, h * 0.5)) moved++;
      }
    }
    const layoutBroken = matched >= 8 && moved / matched > 0.25;
    const allIconsLost = rc && rp && rc.media >= 3 && rp.media === 0; // text intact but every icon / image / chart gone
    const bad = d.pct > max || d.block.pct > maxBlock || miss.length > 0 || allIconsLost || layoutBroken;
    const notes = [`worst 64px cell ${d.block.pct.toFixed(0)} % at (${Math.round(d.block.x / DPR)}, ${Math.round(d.block.y / DPR)})`,
      ...(miss.length ? [`MISSING in replica: ${miss.slice(0, 6).map((t) => JSON.stringify(t.slice(0, 40))).join(" ")}${miss.length > 6 ? ` +${miss.length - 6}` : ""}`] : []),
      ...(extra.length ? [`only in replica: ${extra.slice(0, 4).map((t) => JSON.stringify(t.slice(0, 40))).join(" ")}${extra.length > 4 ? ` +${extra.length - 4}` : ""}`] : []),
      ...(layoutBroken ? [`LAYOUT: ${moved} of ${matched} text boxes sit >40 px (or a different size) from where the real page has them: the replica is structurally different (missing CSS? a collapsed or stacked layout?)`] : []),
      ...(mediaDiff ? [`images/svg/canvas: real ${rc.media}, replica ${rp.media}${allIconsLost ? "  (ALL of them are missing: icons, images or charts were lost in the capture)" : ""}`] : [])];
    writeFileSync(path.join(outDir, `${st.name}-diff.png`), Buffer.from(d.png, "base64"));

    const sheet = await browser.newPage({ viewport: { width: Math.round(W * scale), height: 100 } });
    // a very tall comparison (--full on a long page) is cut to a window around the worst cell instead of an unreadable strip
    const hh = d.size[1] > 2400 * DPR ? 1200 * DPR : 0, y0 = hh ? Math.max(0, Math.min(d.size[1] - hh, d.block.y - hh / 3)) : 0, fk = Math.round(W * scale) / d.size[0];
    const img = (b) => hh ? `<div style="height:${Math.round(hh * fk)}px;overflow:hidden"><img src="data:image/png;base64,${b}" style="display:block;width:100%;margin-top:-${Math.round(y0 * fk)}px"></div>` : `<img src="data:image/png;base64,${b}" style="display:block;width:100%">`;
    const bar = (c, t) => `<div style="padding:6px 10px;background:${c}">${t}</div>`;
    await sheet.setContent(`<body style="margin:0;background:#111;font:600 16px system-ui;color:#fff">
      ${bar("#0a6", `REAL · ${st.name}`)}${img(real)}${bar("#a40", `REPLICA · ${st.name}`)}${img(replica)}${bar(bad ? "#c22" : "#446", `DIFF · ${st.name} · ${d.pct.toFixed(2)} % · ${notes.join(" · ")}${hh ? ` · window from y ${Math.round(y0 / DPR)}` : ""}`)}${img(d.png)}</body>`);
    await sheet.screenshot({ path: path.join(outDir, `${st.name}.png`), fullPage: true });
    await sheet.close();
    rows.push({ name: st.name, pct: +d.pct.toFixed(2), block: +d.block.pct.toFixed(1), missing: miss, onlyInReplica: extra, moved, matched, real: d.size.slice(0, 2), replica: d.size.slice(2) });
    console.log(`${st.name.padEnd(18)} diff ${d.pct.toFixed(2).padStart(6)} %  block ${d.block.pct.toFixed(0).padStart(3)} %${bad ? "  OVER" : ""}${d.size[1] !== d.size[3] ? `  (size ${d.size[0]}x${d.size[1]} vs ${d.size[2]}x${d.size[3]})` : ""}  → ${path.join(outDir, `${st.name}.png`)}`);
    for (const n of notes.slice(1)) console.log(`${" ".repeat(19)}${n}`);
  });
} finally {
  await browser.close();
}
writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(rows, null, 1));
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

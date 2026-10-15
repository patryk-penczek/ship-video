// Screenshots every .frame element (1920×1080) of a static page, e.g. a replica gallery, as out-1.png, out-2.png…
// usage: node snap.mjs <page.html> <out.png>
import path from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "./lib/common.mjs";

const [html, out] = process.argv.slice(2);
if (!html || !out) { console.error("usage: node snap.mjs <page.html> <out.png>"); process.exit(1); }
const { chromium } = load("playwright");
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(pathToFileURL(path.resolve(html)).href);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
const frames = await p.$$(".frame");
for (let i = 0; i < frames.length; i++) await frames[i].screenshot({ path: out.replace(/\.png$/, `-${i + 1}.png`) });
await b.close();
console.log(`${frames.length} frames → ${out.replace(/\.png$/, "-N.png")}`);

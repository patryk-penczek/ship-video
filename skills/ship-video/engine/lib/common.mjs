// Shared bits for the engine scripts: where the deps live, arg parsing, opening a film in render mode.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

export const HOME_DIR = process.env.SHIP_VIDEO_HOME ?? path.join(os.homedir(), ".ship-video");

function load(name) {
  if (!existsSync(path.join(HOME_DIR, "node_modules", name))) {
    console.error(`ship-video: '${name}' is not installed in ${HOME_DIR}. Run engine/setup.sh first.`);
    process.exit(1);
  }
  return createRequire(path.join(HOME_DIR, "package.json"))(name);
}

// node x.mjs a b --fps 60 --label  ->  { _: ["a", "b"], fps: "60", label: true }
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[a.slice(2)] = true;
    else { out[a.slice(2)] = next; i++; }
  }
  return out;
}

// Opens <film>/index.html?render=1 and waits for window.__ready. scale = deviceScaleFactor (2 → 3840×2160).
export async function openFilm(html, { scale = 1 } = {}) {
  const { chromium } = load("playwright");
  const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--disable-lcd-text", "--allow-file-access-from-files"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  page.on("console", (m) => m.type() === "error" && console.error("[page]", m.text()));
  page.on("pageerror", (e) => console.error("[pageerror]", e.message));
  await page.goto(`${pathToFileURL(path.resolve(html)).href}?render=1`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });
  const duration = await page.evaluate(() => window.__duration);
  return { browser, page, duration, seek: (t) => page.evaluate((tt) => window.__seek(tt), t) };
}

export { load };

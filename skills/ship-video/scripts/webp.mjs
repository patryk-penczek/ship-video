// Animated WebP from a rendered MP4: autoplays and loops wherever an image does (README, docs, posts), in full colour,
// at a fraction of a GIF's size. GitHub won't autoplay video, so this is the README hero format.
// usage: node webp.mjs <film.mp4> <out.webp> [--fps 60] [--width 1280] [--quality 70] [--from s] [--to s]
// Uses ffmpeg for frames and Pillow (in the ship-video venv) for the encode; Homebrew's ffmpeg has no WebP encoder.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { HOME_DIR, args, help } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
const [mp4, out] = a._;
if (!mp4 || !out) { console.error("usage: node webp.mjs <film.mp4> <out.webp> [--fps 60] [--width 1280] [--quality 70] [--from s] [--to s]"); process.exit(1); }
const fps = Number(a.fps ?? 60), width = Number(a.width ?? 1280), quality = Number(a.quality ?? 70);
const PY = path.join(HOME_DIR, ".venv/bin/python");
if (!existsSync(PY)) { console.error(`Python venv missing in ${HOME_DIR}. Run scripts/setup.sh first.`); process.exit(1); }

const tmp = mkdtempSync(path.join(os.tmpdir(), "ship-video-webp-"));
try {
  const ff = spawnSync("ffmpeg", ["-loglevel", "error", ...(a.from ? ["-ss", String(a.from)] : []), ...(a.to ? ["-to", String(a.to)] : []), "-i", mp4,
    "-vf", `fps=${fps},scale=${width}:-2:flags=lanczos`, path.join(tmp, "%05d.png")], { stdio: "inherit" });
  if (ff.status !== 0) { console.error("ffmpeg failed to extract frames"); process.exit(1); }
  const py = path.join(tmp, "encode.py");
  writeFileSync(py, `import sys, glob
from PIL import Image
d, out, fps, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
fr = [Image.open(f).convert("RGB") for f in sorted(glob.glob(d + "/*.png"))]
fr[0].save(out, save_all=True, append_images=fr[1:], duration=round(1000 / fps), loop=0, quality=q, method=4)
print(len(fr))
`);
  const enc = spawnSync(PY, ["-I", py, tmp, path.resolve(out), String(fps), String(quality)], { encoding: "utf8" });
  if (enc.status !== 0) { console.error(enc.stderr || "WebP encode failed"); process.exit(1); }
  console.log(`${enc.stdout.trim()} frames → ${out} (${(statSync(out).size / 1e6).toFixed(1)} MB; aim under ~8 MB, lower --fps or --width if bigger)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

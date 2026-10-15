// Animated WebP from a rendered MP4: autoplays and loops wherever an image does (README, docs, posts), in full colour,
// at a fraction of a GIF's size. GitHub won't autoplay video, so this is the README hero format.
// usage: node webp.mjs <film.mp4> <out.webp> [--fps 30] [--width 960] [--quality 70] [--max-mb 8] [--from s] [--to s]
// Defaults (30 fps, 960 px wide, quality 70) land near 6 MB for a 20 s UI film. If the result is over --max-mb it lowers
// the quality (down to 25), then the width (down to 480), until it fits; --max-mb 0 turns that off. Prints the final size.
// Uses ffmpeg for frames and Pillow (in the ship-video venv) for the encode; Homebrew's ffmpeg has no WebP encoder.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { HOME_DIR, args, help, die, num } from "./lib/common.mjs";
help(import.meta.url);

const a = args();
const [mp4, out] = a._;
if (!mp4 || !out) die("usage: node webp.mjs <film.mp4> <out.webp> [--fps 30] [--width 960] [--quality 70] [--max-mb 8] [--from s] [--to s]");
const fps = num(a, "fps", 30, { min: 1, max: 120, int: true });
let width = num(a, "width", 960, { min: 16, max: 4096, int: true });
const quality = num(a, "quality", 70, { min: 0, max: 100, int: true });
const maxMb = num(a, "max-mb", 8, { min: 0 });
const from = num(a, "from", 0, { min: 0 }), to = num(a, "to", Infinity, { min: 0 });
if (to <= from) die("--to must be greater than --from");
if (!existsSync(mp4)) die(`input not found: ${mp4}`);
if (!/\.webp$/i.test(out)) die("output must end in .webp");
const PY = path.join(HOME_DIR, ".venv/bin/python");
if (!existsSync(PY)) die(`Python venv missing in ${HOME_DIR}. Run scripts/setup.sh first.`);
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });

// encodes frames in <dir> at descending quality until the file fits; prints "<quality> <bytes> <frames>"
const ENCODE = `import sys, glob
from PIL import Image
d, out, fps, q, maxb = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
files = sorted(glob.glob(d + "/*.png"))
if not files: sys.exit("no frames in range (is --from beyond the end of the video?)")
fr = [Image.open(f).convert("RGB") for f in files]
import os
while True:
    fr[0].save(out, save_all=True, append_images=fr[1:], duration=round(1000 / fps), loop=0, quality=q, method=4)
    size = os.path.getsize(out)
    if not maxb or size <= maxb or q <= 25: break
    q = max(25, q - 15)
print(q, size, len(fr))
`;

const tmp = mkdtempSync(path.join(os.tmpdir(), "ship-video-webp-"));
try {
  writeFileSync(path.join(tmp, "encode.py"), ENCODE);
  for (let attempt = 0; ; attempt++) {
    const frames = path.join(tmp, "frames");
    rmSync(frames, { recursive: true, force: true });
    mkdirSync(frames);
    const ff = spawnSync("ffmpeg", ["-loglevel", "error", ...(from ? ["-ss", String(from)] : []), ...(Number.isFinite(to) ? ["-to", String(to)] : []), "-i", mp4,
      "-vf", `fps=${fps},scale=${width}:-2:flags=lanczos`, path.join(frames, "%05d.png")], { encoding: "utf8" });
    if (ff.error?.code === "ENOENT") throw new Error("ffmpeg not found in PATH (brew install ffmpeg)");
    if (ff.status !== 0) throw new Error(`ffmpeg could not read ${mp4}: ${(ff.stderr || "").trim().split("\n").pop()}`);
    const enc = spawnSync(PY, ["-I", path.join(tmp, "encode.py"), frames, path.resolve(out), String(fps), String(quality), String(Math.round(maxMb * 1e6))], { encoding: "utf8" });
    if (enc.status !== 0) throw new Error((enc.stderr || "WebP encode failed").trim().split("\n").pop());
    const [q, bytes, n] = enc.stdout.trim().split(" ").map(Number);
    const mb = bytes / 1e6;
    if (maxMb && mb > maxMb && width > 480) { width = Math.max(480, Math.round(width * 0.8 / 2) * 2); console.error(`still ${mb.toFixed(1)} MB at quality ${q}; trying ${width} px wide`); continue; }
    console.log(`${n} frames, ${fps} fps, ${width} px, quality ${q} → ${out} (${mb.toFixed(1)} MB${maxMb && mb > maxMb ? `, over the ${maxMb} MB target: lower --fps or --width` : ""})`);
    break;
  }
} catch (e) {
  rmSync(tmp, { recursive: true, force: true });
  die(e.message);
}
rmSync(tmp, { recursive: true, force: true });

# 60 fps audio envelope for audio-reactive effects: window.ENV = {fps, sub, mid, high, rms}, each normalised 0..1.
# usage: node music.mjs envelope <track> <film/env.js>
import sys, os, json
import numpy as np

if not os.environ.get("DEBUG"):
    sys.excepthook = lambda t, e, tb: (print(f"{os.path.basename(sys.argv[0])[:-3]}: {e}", file=sys.stderr), os._exit(1))
if len(sys.argv) != 3: sys.exit("usage: node music.mjs envelope <track> <film/env.js>")
track, dest = sys.argv[1:]
if not os.path.isfile(track): sys.exit(f"track not found: {track}")
import librosa
try:
    y, sr = librosa.load(track, sr=22050)
except Exception as e:
    sys.exit(f"cannot read audio {track}: not a readable audio file (empty, truncated or another format?)")
if len(y) < 2048: sys.exit(f"{track} is empty or too short")
os.makedirs(os.path.dirname(os.path.abspath(dest)), exist_ok=True)
hop = int(sr / 60)
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
f = librosa.fft_frequencies(sr=sr, n_fft=2048)

def b(lo, hi):
    a = S[(f >= lo) & (f < hi)].mean(0)
    return np.clip(a / max(np.percentile(a, 99.5), 1e-9), 0, 1)

rms = librosa.feature.rms(y=y, hop_length=hop)[0]
rms = np.clip(rms / max(np.percentile(rms, 99.5), 1e-9), 0, 1)
out = {"fps": 60, "sub": b(20, 100), "mid": b(300, 2500), "high": b(3000, 10000), "rms": rms}
out = {k: (v if k == "fps" else [round(float(x), 3) for x in v]) for k, v in out.items()}
open(dest, "w").write("window.ENV=" + json.dumps(out, separators=(",", ":")) + ";")
print(f"{len(out['rms'])} frames → {dest}")

# 60 fps audio envelope for audio-reactive effects: window.ENV = {fps, sub, mid, high, rms}, each normalised 0..1.
# usage: python -I envelope.py track.mp3 film/env.js
import sys, json
import numpy as np
import librosa

y, sr = librosa.load(sys.argv[1], sr=22050)
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
open(sys.argv[2], "w").write("window.ENV=" + json.dumps(out, separators=(",", ":")) + ";")
print(f"{len(out['rms'])} frames → {sys.argv[2]}")

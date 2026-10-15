# Per-stem energy every 0.25 s + strong onsets per stem, from a demucs output folder (optional, needs setup.sh --demucs).
# separate first: node music.mjs separate <track> stems   → stems/htdemucs_6s/<track name>/*.wav
# usage: node music.mjs stems stems/htdemucs_6s/<track name>
import sys, os
import numpy as np

if not os.environ.get("DEBUG"):
    sys.excepthook = lambda t, e, tb: (print(f"{os.path.basename(sys.argv[0])[:-3]}: {e}", file=sys.stderr), os._exit(1))
if len(sys.argv) != 2: sys.exit("usage: node music.mjs stems <demucs_out_dir>")
d = sys.argv[1]
if not os.path.isdir(d): sys.exit(f"folder not found: {d}")
import librosa
names = sorted(n[:-4] for n in os.listdir(d) if n.endswith(".wav"))
if not names: sys.exit(f"no .wav stems in {d} (run: node music.mjs separate <track> <out_dir>, then pass out_dir/htdemucs_6s/<track name>)")
data = {}
for n in names:
    y, sr = librosa.load(os.path.join(d, n + ".wav"), sr=22050, mono=True)
    r = librosa.feature.rms(y=y, hop_length=256)[0]
    data[n] = (r, librosa.times_like(r, sr=sr, hop_length=256))
dur = max(t[-1] for _, t in data.values())
gmax = max(v[0].max() for v in data.values())
print("     t " + "  ".join(f"{n[:6]:>6}" for n in names))
for s in np.arange(0, dur, 0.25):
    row = []
    for n in names:
        r, t = data[n]
        m = (t >= s) & (t < s + 0.25)
        row.append(r[m].mean() / gmax if m.any() else 0)
    print(f"{s:6.2f} " + "  ".join(f"{v:6.2f}" for v in row))
print()
for n in names:
    y, sr = librosa.load(os.path.join(d, n + ".wav"), sr=22050)
    env = librosa.onset.onset_strength(y=y, sr=sr)
    if env.max() <= 0:
        continue
    tt = librosa.times_like(env, sr=sr)
    on = librosa.onset.onset_detect(onset_envelope=env, sr=sr, units="time", delta=0.15)
    strong = [o for o in on if env[np.argmin(abs(tt - o))] > env.max() * 0.3]
    print(f"{n:>7}:", " ".join(f"{o:.2f}" for o in strong))

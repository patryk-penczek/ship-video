# Mel spectrogram of the mix (+ stems if given) with beat lines and bold bar lines. Look at it to find sections.
# usage: node music.mjs plot <track> <out.png> [stems_dir] [--bpm 120]
import sys, os
import numpy as np

if not os.environ.get("DEBUG"):
    sys.excepthook = lambda t, e, tb: (print(f"{os.path.basename(sys.argv[0])[:-3]}: {e}", file=sys.stderr), os._exit(1))
import librosa, librosa.display
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

argv = [a for a in sys.argv[1:]]
bpm = None
if "--bpm" in argv:
    i = argv.index("--bpm")
    try: bpm = float(argv[i + 1])
    except (IndexError, ValueError): sys.exit("--bpm needs a number")
    if not 20 <= bpm <= 400: sys.exit("--bpm must be between 20 and 400")
    del argv[i:i + 2]
if len(argv) < 2: sys.exit("usage: node music.mjs plot <track> <out.png> [stems_dir] [--bpm N]")
mix, out = argv[:2]
stems_dir = argv[2] if len(argv) > 2 else None
if not os.path.isfile(mix): sys.exit(f"track not found: {mix}")
if stems_dir and not os.path.isdir(stems_dir): sys.exit(f"stems dir not found: {stems_dir}")
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)

try:
    y, sr = librosa.load(mix, sr=22050)
except Exception as e:
    sys.exit(f"cannot read audio {mix}: {str(e).strip().splitlines()[-1] if str(e).strip() else type(e).__name__}")
dur = len(y) / sr
if np.abs(y).max() < 1e-4: sys.exit(f"{mix} is silent: nothing to plot")
if bpm is None:
    bpm = float(np.atleast_1d(librosa.beat.beat_track(y=y, sr=sr)[0])[0])
    if bpm <= 0: sys.exit("no steady beat found; pass --bpm N")
names = sorted(n[:-4] for n in os.listdir(stems_dir) if n.endswith(".wav")) if stems_dir else []

fig, ax = plt.subplots(len(names) + 1, 1, figsize=(22, 3 + 2.6 * (len(names) + 1)), sharex=True, squeeze=False)
ax = ax[:, 0]
librosa.display.specshow(librosa.amplitude_to_db(librosa.feature.melspectrogram(y=y, sr=sr), ref=np.max), sr=sr, x_axis="time", y_axis="mel", ax=ax[0])
ax[0].set_title(f"mix · {bpm:.1f} bpm · bar {240 / bpm:.2f}s")
for i, n in enumerate(names):
    yy, _ = librosa.load(os.path.join(stems_dir, n + ".wav"), sr=22050)
    librosa.display.specshow(librosa.amplitude_to_db(librosa.feature.melspectrogram(y=yy, sr=sr, n_mels=64), ref=np.max), sr=sr, x_axis="time", y_axis="mel", ax=ax[i + 1])
    ax[i + 1].set_title(n)
beat = 60 / bpm
for a in ax:
    for k, t in enumerate(np.arange(0, dur, beat)):
        a.axvline(t, color="w", lw=1.2 if k % 4 == 0 else 0.3, alpha=0.6)
ax[-1].set_xticks(np.arange(0, dur, 1))
plt.tight_layout()
plt.savefig(out, dpi=60)
print(f"→ {out}")

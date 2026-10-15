# Music map raw data: tempo, beats, bar starts, strong hits, kicks, quiet gaps, 0.25 s band-energy table.
# usage: python -I analyze.py track.mp3 [--json out.json]
# Read it like a musician: hits = where cuts go, kicks = where small moves go, gaps = breaks/drops, table = sections.
import sys, json
import numpy as np
import librosa

path = sys.argv[1]
out_json = sys.argv[sys.argv.index("--json") + 1] if "--json" in sys.argv else None

y, sr = librosa.load(path, sr=22050, mono=True)
dur = len(y) / sr
hop = 512

tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
tempo = float(np.atleast_1d(tempo)[0])

# onset strength over the full mix and the low end only (kicks, sub hits)
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
env_lo = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, fmax=200, n_mels=32)
et = librosa.times_like(env, sr=sr, hop_length=hop)
onsets = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop, units="time")

def peaks(e, thresh, min_gap=0.2):
    idx = librosa.util.peak_pick(e, pre_max=3, post_max=3, pre_avg=10, post_avg=10, delta=0.05, wait=int(min_gap * sr / hop))
    return [(float(et[i]), float(e[i] / e.max())) for i in idx if e[i] >= thresh * e.max()]

hits = peaks(env, 0.45, 0.3)
kicks = peaks(env_lo, 0.3, 0.12)

# bar starts: the beat phase (0..3) with the most onset energy is taken as the downbeat
beat_strength = np.array([env[np.argmin(abs(et - b))] for b in beats]) if len(beats) else np.array([])
phase = int(np.argmax([beat_strength[p::4].sum() for p in range(4)])) if len(beats) >= 4 else 0
bars = [float(b) for b in beats[phase::4]]

rms = librosa.feature.rms(y=y, hop_length=hop)[0]
rt = librosa.times_like(rms, sr=sr, hop_length=hop)
quiet = rms < 0.2 * np.median(rms)
gaps, start = [], None
for t, q in zip(rt, quiet):
    if q and start is None:
        start = t
    if not q and start is not None:
        if t - start >= 0.2 and start > 0.3:
            gaps.append((float(start), float(t)))
        start = None

S = np.abs(librosa.stft(y, hop_length=hop))
f = librosa.fft_frequencies(sr=sr)
band = lambda lo, hi: S[(f >= lo) & (f < hi)].mean(0)
sub, low, mid, high = band(20, 90), band(90, 300), band(300, 2500), band(2500, 11000)

fmt = lambda xs: " ".join(f"{x:.2f}" for x in xs)
print(f"dur {dur:.2f}s  tempo {tempo:.1f} bpm  beat {60 / tempo:.3f}s  bar {240 / tempo:.3f}s")
print("bars:  ", fmt(bars))
print("beats: ", fmt(beats))
print("hits:  ", " ".join(f"{t:.2f}({s:.1f})" for t, s in hits), "   (strength 0..1)")
print("kicks: ", fmt(t for t, _ in kicks))
print("gaps:  ", " ".join(f"{a:.2f}–{b:.2f}" for a, b in gaps) or "none")
print("onsets:", fmt(onsets))
print("\n    t   rms  sub  low  mid high")
for s in np.arange(0, dur, 0.25):
    m = (rt >= s) & (rt < s + 0.25)
    n = lambda a: a[m].mean() / a.max() if m.any() else 0
    print(f"{s:6.2f} {n(rms):.2f} {n(sub):.2f} {n(low):.2f} {n(mid):.2f} {n(high):.2f} " + "#" * int(n(rms) * 40))

if out_json:
    json.dump({"duration": dur, "tempo": tempo, "bars": bars, "beats": [float(b) for b in beats], "hits": hits,
               "kicks": [t for t, _ in kicks], "gaps": gaps, "onsets": [float(o) for o in onsets]}, open(out_json, "w"), indent=1)
    print(f"\n→ {out_json}")

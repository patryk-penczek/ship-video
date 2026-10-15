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

# Hits are sudden jumps in energy, mostly in the low end (sub booms, impacts). Spectral-flux onsets
# are dominated by hi-hats, so they are listed separately and only used for fine timing.
S = np.abs(librosa.stft(y, hop_length=hop))
f = librosa.fft_frequencies(sr=sr)
et = librosa.times_like(S[0], sr=sr, hop_length=hop)

def flux(e, w=4):
    e = np.log1p(e / (np.median(e) + 1e-9))
    prev = np.convolve(np.r_[np.full(w, e[0]), e], np.ones(w) / w, "valid")[:-1]
    d = np.clip(e - prev, 0, None)
    return d / (d.max() + 1e-9)

lo = flux(S[(f >= 20) & (f < 150)].sum(0))
score = 0.6 * lo + 0.4 * flux((S ** 2).sum(0))

def peaks(e, thresh, min_gap, pre=10):
    idx = librosa.util.peak_pick(e, pre_max=pre, post_max=pre, pre_avg=pre * 2, post_avg=pre // 2, delta=0.08, wait=max(1, int(min_gap * sr / hop)))
    return [(float(et[i]), float(e[i])) for i in idx if e[i] >= thresh]

hits = peaks(score, 0.4, 0.35)
kicks = peaks(lo, 0.25, 0.1, pre=3)
onsets = librosa.onset.onset_detect(y=y, sr=sr, hop_length=hop, units="time")

# bar starts: the beat phase (0..3) that carries the most hit energy is the downbeat
at = lambda t: score[np.argmin(abs(et - t))]
phase = int(np.argmax([sum(at(b) for b in beats[p::4]) for p in range(4)])) if len(beats) >= 4 else 0
bars = [float(b) for b in beats[phase::4]]

rms = librosa.feature.rms(y=y, hop_length=hop)[0]
rt = librosa.times_like(rms, sr=sr, hop_length=hop)
quiet = rms < 0.3 * np.median(rms)
gaps, start = [], None
for t, q in zip(rt, quiet):
    if q and start is None:
        start = t
    if not q and start is not None:
        if t - start >= 0.2 and start > 0.3:
            gaps.append((float(start), float(t)))
        start = None

band = lambda lo, hi: S[(f >= lo) & (f < hi)].mean(0)
sub, low, mid, high = band(20, 90), band(90, 300), band(300, 2500), band(2500, 11000)

fmt = lambda xs: " ".join(f"{x:.2f}" for x in xs)
print(f"dur {dur:.2f}s  tempo {tempo:.1f} bpm  beat {60 / tempo:.3f}s  bar {240 / tempo:.3f}s")
print("bars:  ", fmt(bars))
print("beats: ", fmt(beats))
print("hits:  ", " ".join(f"{t:.2f}{'*' if s >= 0.6 else ''}" for t, s in hits), "   (* = strong: cut here)")
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

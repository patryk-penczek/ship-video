# Music map raw data: tempo, bars/beats to the audible end, hits (* = strong), suggested cuts, section lifts, kicks, gaps, 0.25 s energy table.
# usage: node music.mjs analyze <track> [--json music.json]
# Read it like a musician: cuts = where cuts go, hits = candidates, lifts = section starts, kicks = small moves, table = sections.
# A hit is strong when the low end jumps >= 1.5x over the half second before it, or when it is the last hit before the music decays.
import sys, os, json
import numpy as np

if not os.environ.get("DEBUG"):
    sys.excepthook = lambda t, e, tb: (print(f"analyze: {e}", file=sys.stderr), os._exit(1))
argv = sys.argv[1:]
out_json = None
if "--json" in argv:
    i = argv.index("--json")
    if i + 1 >= len(argv) or argv[i + 1].startswith("--"): sys.exit("usage: node music.mjs analyze <track> [--json music.json]  (--json needs a file)")
    out_json = argv[i + 1]; del argv[i:i + 2]
if len(argv) != 1: sys.exit("usage: node music.mjs analyze <track> [--json music.json]")
path = argv[0]
if not os.path.isfile(path): sys.exit(f"track not found: {path}")
import librosa
try:
    y, sr = librosa.load(path, sr=22050, mono=True)
except Exception as e:
    sys.exit(f"cannot read audio {path}: {str(e).strip().splitlines()[-1] if str(e).strip() else type(e).__name__}")
dur = len(y) / sr
hop = 512
if dur < 1 or np.abs(y).max() < 1e-4: sys.exit(f"{path} is empty or silent ({dur:.1f} s): nothing to analyze. No music? Use: node music.mjs grid --bpm 120 --duration <s>")

S = np.abs(librosa.stft(y, hop_length=hop))
f = librosa.fft_frequencies(sr=sr)
et = librosa.times_like(S[0], sr=sr, hop_length=hop)
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
rt = librosa.times_like(rms, sr=sr, hop_length=hop)
low = S[(f >= 20) & (f < 150)].sum(0)
lown = low / low.max()
rmsn = rms / rms.max()
mean = lambda a, t0, t1: float(a[(et >= t0) & (et < t1)].mean()) if ((et >= t0) & (et < t1)).any() else 0.0

# audible end: last moment above 4 % of the loudest part (tracks often decay to silence well before the file ends)
loud = np.where(rmsn > 0.04)[0]
end = float(rt[loud[-1]]) if len(loud) else dur

# Hits are sudden jumps in energy, mostly in the low end (sub booms, impacts). Spectral-flux onsets
# are dominated by hi-hats, so they are listed separately and only used for fine timing.
def flux(e, w=4):
    e = np.log1p(e / (np.median(e) + 1e-9))
    prev = np.convolve(np.r_[np.full(w, e[0]), e], np.ones(w) / w, "valid")[:-1]
    d = np.clip(e - prev, 0, None)
    return d / (d.max() + 1e-9)

lo = flux(low)
score = 0.6 * lo + 0.4 * flux((S ** 2).sum(0))

def peaks(e, thresh, min_gap, pre=10):
    idx = librosa.util.peak_pick(e, pre_max=pre, post_max=pre, pre_avg=pre * 2, post_avg=pre // 2, delta=0.08, wait=max(1, int(min_gap * sr / hop)))
    return [(float(et[i]), float(e[i])) for i in idx if e[i] >= thresh]

cand = [(t, s) for t, s in peaks(score, 0.4, 0.35) if t <= end + 0.1]
kicks = peaks(lo, 0.25, 0.1, pre=3)
onsets = librosa.onset.onset_detect(y=y, sr=sr, hop_length=hop, units="time")
jump = lambda t: mean(lown, t - 0.02, t + 0.25) / (mean(lown, t - 0.5, t - 0.05) + 0.02)
hits = [(t, s, jump(t)) for t, s in cand]
final = max(range(len(hits)), key=lambda i: hits[i][0]) if hits else None
strong = [i for i, h in enumerate(hits) if h[2] >= 1.5 or i == final]

# tempo grid: bars from the beat tracker, then a straight-line fit so the grid runs on to the audible end
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
tempo = float(np.atleast_1d(tempo)[0])
at = lambda t: score[np.argmin(abs(et - t))]
phase = int(np.argmax([sum(at(b) for b in beats[p::4]) for p in range(4)])) if len(beats) >= 8 else 0
bars = [float(b) for b in beats[phase::4]]
if len(bars) >= 3:
    k = np.round((np.array(bars) - bars[0]) / np.median(np.diff(bars))).astype(int)
    per, t0 = np.polyfit(k, bars, 1)
    lo_k = int(np.ceil((0 - t0) / per))
    bars = [float(t0 + i * per) for i in range(lo_k, int((end + 0.05 - t0) / per) + 1)]
    beats = [float(b0 + j * per / 4) for b0 in bars for j in range(4)]
    beats = [b for b in beats if b <= end + 0.05]
    tempo = 240 / per
else:
    bars, beats = [], [float(b) for b in beats]

# section lifts / dips: level of the next 2 s against the 4 s before, local extremes only
cands = [(t, mean(rmsn, t, t + 2) / (mean(rmsn, max(0, t - 4), t) + 0.03)) for t in np.arange(1.5, end - 1, 0.25)]
def extremes(sign):
    r = [(t, v) for t, v in cands if (v >= 1.12 if sign > 0 else v <= 0.7)]
    r = [(t, v) for t, v in r if all((v >= w if sign > 0 else v <= w) for u, w in cands if abs(u - t) <= 1.5)]
    keep = []
    for t, v in r:
        if not keep or t - keep[-1][0] > 1.5: keep.append((t, v))
    return keep
lifts, dips = extremes(1), extremes(-1)
# the level ramps up a little before the section starts: land on the nearest strong hit (else bar line) within 0.6 s
def snap(t):
    for pool in ([hits[i][0] for i in strong], bars):
        near = [x for x in pool if abs(x - t) <= 0.6]
        if near: return min(near, key=lambda x: abs(x - t))
    return t
lifts = [(snap(t), v) for t, v in lifts]
dips = [(snap(t), v) for t, v in dips]

cuts = []
for t in sorted([hits[i][0] for i in strong] + [t for t, _ in lifts]):
    if not cuts or t - cuts[-1] > 0.6: cuts.append(t)

quiet = rms < 0.3 * np.median(rms)
gaps, start = [], None
for t, q in zip(rt, quiet):
    if q and start is None:
        start = t
    if not q and start is not None:
        if t - start >= 0.2 and start > 0.3 and t < end:
            gaps.append((float(start), float(t)))
        start = None

band = lambda lo, hi: S[(f >= lo) & (f < hi)].mean(0)
sub, lowb, mid, high = band(20, 90), band(90, 300), band(300, 2500), band(2500, 11000)

fmt = lambda xs: " ".join(f"{x:.2f}" for x in xs)
print(f"dur {dur:.2f}s  audible end: {end:.2f} s{'' if end > dur - 0.3 else f'  (silence for the last {dur - end:.1f} s: end the film near {end:.1f})'}")
print(f"tempo {tempo:.1f} bpm  beat {60 / tempo:.3f}s  bar {240 / tempo:.3f}s" if bars else "tempo: no steady beat found (use bars from `grid` if you need a grid)")
print("bars:  ", fmt(bars))
print("beats: ", fmt(beats))
print("cuts:  ", fmt(cuts), "   (strong hits + section lifts: start here)")
print("lifts: ", " ".join(f"{t:.2f}(x{v:.1f})" for t, v in lifts) or "none", "   (section starts where the level steps up)")
print("dips:  ", " ".join(f"{t:.2f}(x{v:.1f})" for t, v in dips) or "none", "   (level steps down: breaks, outros)")
print("hits:  ", " ".join(f"{t:.2f}{'*' if i in strong else ''}" for i, (t, s, j) in enumerate(hits)), "   (* = strong: low end jumps >= 1.5x, or last hit before the decay)")
print("kicks: ", fmt(t for t, _ in kicks))
print("gaps:  ", " ".join(f"{a:.2f}–{b:.2f}" for a, b in gaps) or "none")
print("onsets:", fmt(onsets))
print("\n    t   rms  sub  low  mid high")
for s in np.arange(0, dur, 0.25):
    m = (rt >= s) & (rt < s + 0.25)
    n = lambda a: a[m].mean() / a.max() if m.any() else 0
    print(f"{s:6.2f} {n(rms):.2f} {n(sub):.2f} {n(lowb):.2f} {n(mid):.2f} {n(high):.2f} " + "#" * int(n(rms) * 40))

if out_json:
    json.dump({"duration": dur, "audible_end": end, "tempo": tempo, "bars": bars, "beats": beats, "cuts": cuts,
               "lifts": [t for t, _ in lifts], "dips": [t for t, _ in dips], "hits": [(t, s) for t, s, _ in hits],
               "strong_hits": [hits[i][0] for i in strong], "kicks": [t for t, _ in kicks], "gaps": gaps, "onsets": [float(o) for o in onsets]}, open(out_json, "w"), indent=1)
    print(f"\n→ {out_json}")

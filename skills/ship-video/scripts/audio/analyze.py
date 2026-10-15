# Music map raw data: tempo, bars/beats to the audible end, hits (* = strong), suggested cuts, section lifts, kicks, gaps, 0.25 s energy table.
# usage: node music.mjs analyze <track> [--json music.json] [--plan track.plan.json | --no-plan]
# A track made by `synth` has a sidecar <track>.plan.json: the grid, drop, riser and sections then come from the plan (exact), the audio only adds detail.
# Read it like a musician: cuts = where cuts go, hits = candidates, lifts = section starts, kicks = small moves, table = sections.
# A hit is strong when the low end jumps >= 1.5x over the half second before it, or when it is the last hit before the music decays.
import sys, os, json
import numpy as np

if not os.environ.get("DEBUG"):
    sys.excepthook = lambda t, e, tb: (print(f"analyze: {e}", file=sys.stderr), os._exit(1))
argv = sys.argv[1:]
out_json = None
plan_file, use_plan = None, True
if "--no-plan" in argv: argv.remove("--no-plan"); use_plan = False
if "--plan" in argv:
    i = argv.index("--plan")
    if i + 1 >= len(argv) or argv[i + 1].startswith("--"): sys.exit("--plan needs a file (the track.plan.json written by synth)")
    plan_file = argv[i + 1]; del argv[i:i + 2]
if "--json" in argv:
    i = argv.index("--json")
    if i + 1 >= len(argv) or argv[i + 1].startswith("--"): sys.exit("usage: node music.mjs analyze <track> [--json music.json]  (--json needs a file)")
    out_json = argv[i + 1]; del argv[i:i + 2]
if len(argv) != 1: sys.exit("usage: node music.mjs analyze <track> [--json music.json] [--plan track.plan.json | --no-plan]")
path = argv[0]
if path.startswith("--"): sys.exit(f"unknown option {path}")
if not os.path.isfile(path): sys.exit(f"track not found: {path}")
if out_json:  # fail before the analysis, not after it
    jd = os.path.dirname(os.path.abspath(out_json))
    if os.path.isdir(out_json) or not os.path.isdir(jd): sys.exit(f"--json {out_json}: the folder does not exist or the path is a folder")
import librosa
try:
    y, sr = librosa.load(path, sr=22050, mono=True)
except Exception as e:
    sys.exit(f"cannot read audio {path}: not a readable audio file (empty, truncated or another format?)")
dur = len(y) / sr
hop = 512
plan = None
if use_plan:
    cand_files = [plan_file] if plan_file else [os.environ.get("SHIP_VIDEO_PLAN"), path + ".plan.json"]
    for pf in cand_files:
        if pf and os.path.isfile(pf):
            try: pl = json.load(open(pf))
            except Exception: pl = None
            if isinstance(pl, dict) and pl.get("synth") and abs(float(pl.get("duration", -9)) - dur) < 0.35: plan = pl
            elif plan_file: sys.exit(f"--plan {pf}: not a synth plan for this track (missing or different duration)")
            if plan: break
if dur < 1 or np.abs(y).max() < 1e-4: sys.exit(f"{path} is empty or silent ({dur:.1f} s): nothing to analyze. No music? Use: node music.mjs grid --bpm 120 --duration <s>")

S = np.abs(librosa.stft(y, hop_length=hop))
f = librosa.fft_frequencies(sr=sr)
band = lambda lo, hi: S[(f >= lo) & (f < hi)].mean(0)
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
if plan:   # planned impacts (drops, hits, the end hit) are the strong hits, at their planned times; every other detected hit is plain
    planned = sorted([float(t) for t in plan.get("drops", [])] + [float(h["t"]) for h in plan.get("hits", [])] + ([float(plan["end"]["t"])] if plan.get("end", {}).get("t") is not None else []))
    keep = [h for h in hits if all(abs(h[0] - tp) > 0.08 for tp in planned)]
    hits = sorted(keep + [(tp, 1.0, jump(tp)) for tp in planned if tp <= end + 0.1])
    strong = [i for i, h in enumerate(hits) if any(abs(h[0] - tp) < 1e-9 for tp in planned)]

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

# the tracker lags the real onsets by 2-5 frames: slide the whole grid onto the detected strong hits (median offset of each hit
# to its nearest beat, within 0.12 s), then drop grid lines in the leading silence
anchor = 0.0
if bars and beats:
    anchors = [hits[i][0] for i in strong] if len(strong) >= 3 else [t for t, _ in kicks]
    res = [h - min(beats, key=lambda b: abs(b - h)) for h in anchors]
    res = [r for r in res if abs(r) < 0.12]
    if len(res) >= 3:
        anchor = float(np.median(res))
        if abs(anchor) >= 0.008:
            bars = [b + anchor for b in bars]; beats = [b + anchor for b in beats]
        else: anchor = 0.0
    first = float(rt[loud[0]]) if len(loud) else 0.0
    bars = [b for b in bars if b >= max(0.0, first - 0.05)]; beats = [b for b in beats if b >= max(0.0, first - 0.05)]

if plan:   # the plan's grid is exact: bar 0 starts at 0 s, no tracker, no anchor
    per = float(plan["bar"]); tempo = 240 / per; anchor = 0.0
    bars = [k * per for k in range(int((end + 0.05) / per) + 1)]
    beats = [b0 + j * per / 4 for b0 in bars for j in range(4)]; beats = [b for b in beats if b <= end + 0.05]

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
if plan:   # section starts where the planned energy steps up or down
    lifts, dips = [], []
    ps = plan.get("sections", [])
    for a_, b_ in zip(ps, ps[1:]):
        r_ = (b_["energy"] + 1e-3) / (a_["energy"] + 1e-3)
        if r_ >= 1.12: lifts.append((float(b_["t"]), float(r_)))
        elif r_ <= 0.7: dips.append((float(b_["t"]), float(r_)))
# the level ramps up a little before the section starts: land on the nearest strong hit (else bar line) within 0.6 s
def snap(t):
    for pool in ([hits[i][0] for i in strong], bars):
        near = [x for x in pool if abs(x - t) <= 0.6]
        if near: return min(near, key=lambda x: abs(x - t))
    return t
if not plan:
    lifts = [(snap(t), v) for t, v in lifts]
    dips = [(snap(t), v) for t, v in dips]

cuts = []
for t in sorted([hits[i][0] for i in strong] + [t for t, _ in lifts]):
    if not cuts or t - cuts[-1] > 0.6: cuts.append(t)

# riser + drop: a riser is >= 2 s of steadily rising high band (noise sweep) with a weak low end, ending in a sudden fall of the
# high band at the drop. The loudest hit is often the intro stab, not the drop: the drop is the first full-band hit after the riser.
hb = band(2500, 11000); hbn = hb / (hb.max() + 1e-9)
step = 0.25; grid_t = np.arange(0, end, step)
H = np.array([mean(hbn, t, t + step) for t in grid_t]); L = np.array([mean(lown, t, t + step) for t in grid_t])
Hs = np.convolve(H, np.ones(4) / 4, "same")
riser, drop = None, None
# a riser ends on a strong hit: the stretch before it (back to the previous strong hit, at most 6 s, at least 2 s) has a high band that
# climbs steadily. The best-climbing one wins; its closing hit is the drop.
sh = sorted(hits[i][0] for i in strong)
best = 0.0
cands_r = []
for k, e in enumerate(sh):
    if e < 3.0: continue
    s0 = max(sh[k - 1] + 0.4 if k else 0.0, e - 6.0)
    seg = Hs[(grid_t >= s0) & (grid_t < e - 0.1)]
    if len(seg) < 8: continue                       # < 2 s
    corr = float(np.corrcoef(np.arange(len(seg)), seg)[0, 1]) if seg.std() > 1e-6 else 0.0
    rise = float(seg[-4:].mean() / max(seg[:4].mean(), 1e-3))
    # the real drop is followed by the biggest SUSTAINED energy step (low end + rms over the next 4 s vs the 3 s before); a riser that
    # only leads into a pause or a quiet verse scores low even if its sweep is clean
    after = 0.5 * mean(lown, e + 0.3, e + 4.0) + 0.5 * mean(rmsn, e + 0.3, e + 4.0)
    before = 0.5 * mean(lown, max(0, e - 3.0), e - 0.2) + 0.5 * mean(rmsn, max(0, e - 3.0), e - 0.2)
    step_up = max(after - before, 0.0) + 0.1 * after
    score_r = corr * min(rise, 2.0) * len(seg) * step * (0.3 + e / end) * (0.15 + step_up * 4)
    if os.environ.get("DEBUG"): print(f"riser cand end {e:.2f} start {s0:.2f} corr {corr:.2f} rise {rise:.2f} jump {[h[2] for h in hits if abs(h[0] - e) < 0.01]}", file=sys.stderr)
    if corr >= 0.5 and rise >= 1.2:
        cands_r.append((score_r, float(s0), float(e), float(step_up)))
        if score_r > best: best = score_r; riser = (float(s0), float(e))
if riser:
    drop = riser[1]
elif strong:
    pool = [hits[i] for i in strong if hits[i][0] < end - 2.0]   # the closing hit is an ending, not a drop
    dh = max(pool, key=lambda h: h[1] * h[2])[0] if pool else None  # no riser: the strongest hit by flux x low-end jump
    # ...but only if the level steps up and stays up after it: a fill hit in a flat groove is not a drop
    aft = 0.0 if dh is None else 0.5 * mean(lown, dh + 0.3, dh + 4.0) + 0.5 * mean(rmsn, dh + 0.3, dh + 4.0)
    bef = 0.0 if dh is None else 0.5 * mean(lown, max(0, dh - 3.0), dh - 0.2) + 0.5 * mean(rmsn, max(0, dh - 3.0), dh - 0.2)
    if dh is not None and aft - bef >= 0.05: drop = dh
# stretches without low end (risers, breakdowns): the energy table can look busy while the kick is gone
nolow, st = [], None
first_t = float(rt[loud[0]]) if len(loud) else 0.0
for t, v in zip(grid_t, L):
    if t < first_t + 0.3: continue
    if v < 0.12 and st is None: st = t
    if (v >= 0.12 or t >= grid_t[-1]) and st is not None:
        if t - st >= 1.0: nolow.append((float(st), float(t)))
        st = None
# a drop often follows a BREAK (the kick drops out, then a full-band hit): score each such break end like a riser, by the sustained energy step after it
for a0, b0 in nolow:
    if b0 > end - 2.0 or b0 - a0 < 0.7: continue
    e = min([hits[i][0] for i in strong if b0 - 0.15 <= hits[i][0] <= b0 + 0.6] or [None], key=lambda x: 0 if x is None else abs(x - b0))
    if e is None: continue
    w1 = min(e + 7.0, end)  # a drop holds: the 7 s after it (to the end) stay loud, a break that leads into a quiet verse does not
    after = 0.5 * mean(lown, e + 0.3, w1) + 0.5 * mean(rmsn, e + 0.3, w1)
    before = 0.5 * mean(lown, a0, b0) + 0.5 * mean(rmsn, a0, b0)
    step_up = max(after - before, 0.0) + 0.1 * after
    sc = 8.0 * min(b0 - a0, 1.0) * (0.15 + step_up * 4) * (0.3 + e / end)
    cands_r.append((sc, float(a0), float(e), float(step_up)))
    if sc > best: best = sc; drop = float(e)
_d = []
for c in sorted(cands_r, reverse=True):   # one candidate per 0.1 s: the best-scoring one
    if all(abs(c[2] - k[2]) > 0.1 for k in _d): _d.append(c)
cands_r = _d
if plan:
    pr, pd = plan.get("risers") or [], plan.get("drops") or []
    riser = (float(pr[0][0]), float(pr[0][1])) if pr else None
    drop = float(pd[0]) if pd else None
    cands_r = []
# sections: intro until the first section start, build = riser, drop(s) = levels above 0.7 of the loudest 2 s, break = dips, outro = tail
rms_at = lambda t: mean(rmsn, t, t + 1.0)
dlevel = rms_at(drop + 0.2) if drop else None
pts = [(0.0, "intro")]
if riser: pts.append((riser[0], "build"))
if drop: pts.append((drop, "drop"))
for t, _ in lifts + dips:
    if t < 1.0 or (riser and riser[0] - 1.0 <= t <= riser[1] + 0.3) or (t > 0.8 * end and any(abs(t - d) < 1e-6 for d, _ in dips)) or (drop and abs(t - drop) < 1.0): continue
    isdip = any(abs(t - d) < 1e-6 for d, _ in dips)
    lvl = rms_at(t + 0.2)
    pts.append((t, "break" if isdip else ("drop" if dlevel and lvl >= 0.8 * dlevel and (not drop or t > drop) else "groove")))
tail = [t for t, _ in dips if t > 0.8 * end]
if tail: pts.append((tail[-1], "outro"))
pts.sort()
secs = []
for t, n in pts:
    if secs and (n == secs[-1][1] or t - secs[-1][0] < 1.0) and n not in ("drop", "build"): continue
    secs.append((t, n))

if plan:
    secs = [(float(x["t"]), x["role"]) for k, x in enumerate(plan["sections"]) if k == 0 or x["role"] != plan["sections"][k - 1]["role"]]

quiet = rms < 0.3 * np.median(rms)
gaps, start = [], None
for t, q in zip(rt, quiet):
    if q and start is None:
        start = t
    if not q and start is not None:
        if t - start >= 0.2 and start > 0.3 and t < end:
            gaps.append((float(start), float(t)))
        start = None

sub, lowb, mid, high = band(20, 90), band(90, 300), band(300, 2500), band(2500, 11000)

fmt = lambda xs: " ".join(f"{x:.2f}" for x in xs)
print(f"dur {dur:.2f}s  audible end: {end:.2f} s{'' if end > dur - 0.3 else f'  (silence for the last {dur - end:.1f} s: end the film near {end:.1f})'}")
print(f"tempo {tempo:.1f} bpm  beat {60 / tempo:.3f}s  bar {240 / tempo:.3f}s" if bars else "tempo: no steady beat found (use bars from `grid` if you need a grid)")
print(f"grid, drop, riser, sections and strong hits from the synth plan ({plan['preset']}, {plan['bpm']:g} bpm): exact, audio-checked for the rest" if plan else f"grid anchored on the strong hits ({anchor * 1000:+.0f} ms vs the tracker)" if anchor else "grid: tracker phase kept (no strong hits to anchor on)")
print("bars:  ", fmt(bars))
print("beats: ", fmt(beats))
print("cuts:  ", fmt(cuts), "   (strong hits + section lifts: start here)")
print("lifts: ", " ".join(f"{t:.2f}(x{v:.1f})" for t, v in lifts) or "none", "   (section starts where the level steps up)")
print("dips:  ", " ".join(f"{t:.2f}(x{v:.1f})" for t, v in dips) or "none", "   (level steps down: breaks, outros)")
print("hits:  ", " ".join(f"{t:.2f}{'*' if i in strong else ''}" for i, (t, s, j) in enumerate(hits)), "   (* = strong: low end jumps >= 1.5x, or last hit before the decay)")
short = lambda xs, n=16: (fmt(xs[:n]) + f" … (+{len(xs) - n} more, all in --json)") if len(xs) > n else fmt(xs)
print(f"kicks:  {len(kicks)}  " + short([t for t, _ in kicks]))
print("gaps:  ", " ".join(f"{a:.2f}–{b:.2f}" for a, b in gaps) or "none")
print("no low end:", " ".join(f"{a:.2f}–{b:.2f}" for a, b in nolow) or "none", "   (risers / breakdowns: the kick is gone)")
print(f"onsets: {len(onsets)}  " + short([float(o) for o in onsets], 12))
print("riser: ", f"{riser[0]:.2f}–{riser[1]:.2f}" if riser else "none")
alts = [f"{e:.2f} (riser {s0:.2f}–{e:.2f}, score {sc:.1f}, energy step {su:.2f})" for sc, s0, e, su in sorted(cands_r, reverse=True)[:4] if abs(e - (drop or -9)) > 0.01]
if cands_r: print("drop candidates (score = sweep x sustained energy step after it):", ", ".join(f"{e:.2f} score {sc:.1f}" for sc, s0, e, su in sorted(cands_r, reverse=True)))
print("drop:  ", f"{drop:.2f}   (best candidate: the hit that closes a riser or a break, scored by the sustained energy after it; the loudest hit is not always the drop){'  other candidates: ' + ', '.join(alts) if alts else ''}" if drop else "none found")
print("sections:", "  ".join(f"{t:.2f} {n}" for t, n in secs), "   (guesses from the energy curve: check against the plot)")
print("\n    t   rms  sub  low  mid high")
for s in np.arange(0, dur, 0.25):
    m = (rt >= s) & (rt < s + 0.25)
    n = lambda a: a[m].mean() / a.max() if m.any() else 0
    print(f"{s:6.2f} {n(rms):.2f} {n(sub):.2f} {n(lowb):.2f} {n(mid):.2f} {n(high):.2f} " + "#" * int(n(rms) * 40))

if out_json:
    json.dump({"duration": dur, "audible_end": end, "tempo": tempo, "bars": bars, "beats": beats, "cuts": cuts,
               "lifts": [t for t, _ in lifts], "dips": [t for t, _ in dips], "hits": [(t, s) for t, s, _ in hits],
               "strong_hits": [hits[i][0] for i in strong], "riser": riser, "drop": drop, "sections": [{"t": t, "name": n} for t, n in secs], "from_plan": bool(plan), "no_low_end": nolow, "anchor_offset": anchor, "kicks": [t for t, _ in kicks], "gaps": gaps, "onsets": [float(o) for o in onsets]}, open(out_json, "w"), indent=1)
    print(f"\n→ {out_json}")

# Generated beat: a small, deterministic synthesized score built from a bar plan (no samples, no licenses, owned outright).
# usage: node music.mjs synth --plan <film>/beat.json --out <film>/track.wav [--sr 44100|48000] [--seed N] [--preset NAME] [--lufs -14]
# Out: .wav (16-bit), or .mp3/.m4a/.flac via ffmpeg. Plan schema and presets: references/synth.md.
import json, math, os, re, subprocess, sys, tempfile
import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d

USAGE = "usage: node music.mjs synth --plan <beat.json> --out <track.wav|mp3|m4a|flac> [--sr 44100|48000] [--seed N] [--preset pulse|punchy|calm|cinematic] [--lufs -14]"
ROLES = ("intro", "build", "break", "drop", "groove", "outro")
ROLE_E = {"intro": 0.35, "build": 0.65, "break": 0.25, "drop": 1.0, "groove": 0.75, "outro": 0.35}

# ---------------------------------------------------------------- args and plan
if not os.environ.get("DEBUG"):
    sys.excepthook = lambda t, e, tb: (print(f"synth: {e}", file=sys.stderr), os._exit(1))
OUT_EXT = (".wav", ".mp3", ".m4a", ".flac", ".aac")
def bad(msg): sys.exit(f"bad plan: {msg}")
def warn(msg): print(f"warn: {msg}", file=sys.stderr)
def num(v, name, lo=None, hi=None, whole=False, err=bad):
    if isinstance(v, bool) or v is None: err(f"{name} must be a number, got {json.dumps(v)}")
    try: x = float(v)
    except (TypeError, ValueError): err(f"{name} must be a number, got {json.dumps(v)}")
    if not math.isfinite(x): err(f"{name} must be a finite number")
    if whole and x != int(x): err(f"{name} must be a whole number, got {v}")
    if (lo is not None and x < lo) or (hi is not None and x > hi): err(f"{name} must be {lo}..{hi}, got {v}")
    return x
def cli_err(m): sys.exit(f"{m}\n{USAGE}")
argv = sys.argv[1:]
opts = {}
i = 0
while i < len(argv):
    a = argv[i]
    if a in ("--help", "-h"):
        print(USAGE); sys.exit(0)
    if not a.startswith("--") or a[2:] not in ("plan", "out", "sr", "seed", "preset", "lufs"):
        sys.exit(f"unknown argument {a}\n{USAGE}")
    if i + 1 >= len(argv): sys.exit(f"{a} needs a value\n{USAGE}")
    opts[a[2:]] = argv[i + 1]; i += 2
if "plan" not in opts or "out" not in opts: sys.exit(USAGE)
# the output type is checked before any synthesis
_ext = os.path.splitext(opts["out"])[1].lower()
if _ext not in OUT_EXT: sys.exit(f"unknown output type {_ext or opts['out']!r} (use .wav, .mp3, .m4a, .flac)")
if os.path.isdir(opts["out"]): sys.exit(f"--out {opts['out']} is a folder")
try: plan = json.load(open(opts["plan"]))
except Exception as e: sys.exit(f"cannot read plan {opts['plan']}: {e}")
if not isinstance(plan, dict): bad(f"the plan must be a JSON object ({{...}}), got {type(plan).__name__}")
SR = int(num(opts.get("sr", plan.get("sr", 44100)), "--sr", whole=True, err=cli_err))
if SR not in (44100, 48000): sys.exit("--sr must be 44100 or 48000")
SEED = int(num(opts.get("seed", plan.get("seed", 7)), "--seed", whole=True, err=cli_err))
LUFS = num(opts.get("lufs", plan.get("lufs", -14)), "--lufs", -30, -6, err=cli_err)
rng = np.random.default_rng(SEED % (2 ** 63))   # negative and huge seeds fold into the generator's range

PRESETS = {
    # bright electro pulse: four on the floor, offbeat bass, 16th plucked arp
    "pulse": dict(root="A", mode="minor", prog=[(0, "m"), (8, "M"), (3, "M"), (10, "M")], chord_bars=1,
        kick=dict(f0=48, f1=170, sweep=38, decay=7.5), kick_pat=[0, 4, 8, 12], snare_pat=[4, 12], snare="clap", hat_pat=[2, 6, 10, 14], hat16=True, open_hat=[14],
        bass="pulse", bass_oct=2, pluck_wave="saw", pluck_cut=3800, pluck_decay=7.0, pluck_oct=1, pad_level=0.55, pad_cut=1800, swing=0.0, verb=0.22, impact=0.9, arp=[0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 4, 3, 2, 1, 2]),
    # halftime hip-hop/trap leaning: 808 glide bass, snare on beat 3, rolled hats, bell pluck, swing
    "punchy": dict(root="G", mode="minor", prog=[(0, "m"), (0, "m"), (8, "M"), (10, "M")], chord_bars=1,
        kick=dict(f0=44, f1=130, sweep=45, decay=9.0), kick_pat=[0, 6, 10], snare_pat=[8], snare="snare", hat_pat=[0, 2, 4, 6, 8, 10, 12, 14], hat16=True, open_hat=[11],
        bass="808", bass_oct=1, pluck_wave="synthpl", pluck_cut=5000, pluck_decay=5.5, pluck_oct=1, pad_level=0.5, pad_cut=1600, swing=0.14, verb=0.18, impact=1.0, arp=[0, 2, 1, 2, 3, 2, 1, 0, 2, 1, 3, 4, 3, 2, 1, 0],
        # arrangement: the drop changes chords (Eb F Gm Bb), opens the filter on chord stabs, adds bells, a fuller 808 and a ghost kick
        prog_drop=[(8, "M"), (10, "M"), (0, "m"), (3, "M")], stab=True, pluck_gain=2.4, bass_gain=0.75, sparkle=("drop",), spark_pat=[[0, 10], [6, 14], [0, 8, 12], [4, 10, 14]]),
    # soft lo-fi / warm: Rhodes-ish pluck, brushed hats, pure sub, wide pad, major 7ths
    "calm": dict(root="F", mode="major", prog=[(0, "M7"), (9, "m7"), (5, "M7"), (7, "7")], chord_bars=1,
        kick=dict(f0=52, f1=110, sweep=30, decay=8.0), kick_pat=[0, 10], snare_pat=[8], snare="rim", hat_pat=[0, 2, 4, 6, 8, 10, 12, 14], hat16=False, open_hat=[],
        bass="long", bass_oct=2, pluck_wave="epiano", pluck_cut=7500, bright=1.6, pluck_decay=3.2, pluck_oct=0, pad_level=0.8, pad_cut=2300, swing=0.1, verb=0.38, impact=0.6, arp=[0, 2, 3, 2, 1, 2, 3, 4, 0, 2, 3, 2, 4, 3, 2, 1],
        # a 4-bar phrase (question, answer) over an 8-bar chord cycle, bells in the upper octave, layers that change per section
        arp4=[[0, 2, 3, 2, 1, 2, 3, 4, 0, 2, 3, 2, 4, 3, 2, 1], [4, 3, 2, 3, 5, 3, 2, 3, 4, 3, 2, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 5, 6, 5, 4, 3], [6, 5, 4, 3, 2, 3, 4, 2, 3, 2, 1, 2, 0, 1, 2, 0]],
        prog_b=[(9, "m7"), (2, "m7"), (5, "M7"), (7, "7")], sparkle=("build", "groove", "drop", "intro", "outro"), spark_pat=[[0, 10], [6, 14], [0, 8, 12], [4, 10]]),
    # taiko and strings: low drums, long swelling pad, driving 8th ostinato, huge impacts, sparse bells
    "cinematic": dict(root="D", mode="minor", prog=[(0, "m"), (8, "M"), (3, "M"), (10, "M")], chord_bars=2,
        kick=dict(f0=40, f1=95, sweep=22, decay=4.5), kick_pat=[0, 8], snare_pat=[8], snare="taiko", hat_pat=[], hat16=False, open_hat=[],
        bass="ostinato", bass_oct=1, pluck_wave="bell", pluck_cut=6000, pluck_decay=2.2, pluck_oct=2, pad_level=0.9, pad_cut=2600, swing=0.0, verb=0.5, impact=1.3, arp=[0, 2, 4, 2, 0, 2, 4, 5, 0, 2, 4, 2, 3, 4, 5, 4]),
}
preset = str(opts.get("preset", plan.get("preset", plan.get("style", plan.get("mood", "pulse"))))).lower()
if preset not in PRESETS: bad(f"unknown preset {preset!r}. Presets: {', '.join(PRESETS)}")
P = PRESETS[preset]

bpm = num(plan.get("bpm", 120), "bpm", 40, 220)
beat = 60 / bpm; bar = beat * 4; step = beat / 4
if "duration" in plan: dur = num(plan["duration"], "duration", 4, 180)
elif "bars" in plan: dur = num(plan["bars"], "bars", 1, 400) * bar
else: bad("the plan needs bars or duration")
if not 4 <= dur <= 180: bad(f"duration must be 4..180 s, got {dur:.1f}")
nbars = max(1, math.ceil(dur / bar - 1e-6))
N = int(round(dur * SR))
def tt(x): return int(round(x * SR))

# key: "Am", "A minor", "F#", plus optional root/mode
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def parse_key(s):
    m = re.match(r"^\s*([A-Ga-g])([#b]?)\s*(m|min|minor|M|maj|major)?\s*$", s)
    if not m: bad(f"cannot read key {s!r} (examples: Am, F# minor, C major)")
    pc = (NOTE[m.group(1).upper()] + {"#": 1, "b": -1, "": 0}[m.group(2)]) % 12
    q = m.group(3) or ""
    return pc, ("minor" if q in ("m", "min", "minor") else "major" if q else None)
root_pc, mode = parse_key(P["root"])[0], P["mode"]
if "key" in plan or "root" in plan:
    k = plan.get("key", plan.get("root"))
    root_pc, m2 = parse_key(str(k))
    mode = m2 or plan.get("mode", mode)
if "mode" in plan and plan["mode"] in ("minor", "major"): mode = plan["mode"]
prog = P["prog"]
if mode != P["mode"]:  # switch minor <-> major: reuse the same shape with the other scale's progression
    prog = [(0, "m"), (8, "M"), (3, "M"), (10, "M")] if mode == "minor" else [(0, "M"), (7, "M"), (9, "m"), (5, "M")]
QUAL = {"m": (0, 3, 7), "M": (0, 4, 7), "M7": (0, 4, 7, 11), "m7": (0, 3, 7, 10), "7": (0, 4, 7, 10)}
def chord_at_bar(b):
    pg = prog
    if mode == P["mode"]:
        if P.get("prog_b") and (b // 4) % 2 == 1: pg = P["prog_b"]
        if P.get("prog_drop") and b < len(role_of) and role_of[b] == "drop": pg = P["prog_drop"]
    off, q = pg[(b // P["chord_bars"]) % len(pg)]
    return (root_pc + off) % 12, QUAL[q]
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

# sections: 0-based bars, to_bar exclusive
role_of = [None] * nbars; en_of = [0.0] * nbars
secs = plan.get("sections")
if secs is not None and not isinstance(secs, list): bad('"sections" must be a list of {from_bar, to_bar, role, energy} objects')
if secs:
    for si, s in enumerate(secs):
        if not isinstance(s, dict): bad(f"sections[{si}] must be an object like {{\"from_bar\": 0, \"to_bar\": 2, \"role\": \"intro\"}}, got {json.dumps(s)}")
        if "from_bar" not in s: bad(f"sections[{si}] is missing from_bar")
        role = s.get("role", "groove")
        if role not in ROLES: bad(f"sections[{si}] role {role!r} must be one of {', '.join(ROLES)}")
        a = int(num(s["from_bar"], f"sections[{si}].from_bar", 0, whole=True))
        b = int(num(s["to_bar"], f"sections[{si}].to_bar", 1, whole=True)) if "to_bar" in s else a + 1
        if not 0 <= a < b: bad(f"sections[{si}] bars {a}..{b}: to_bar must be greater than from_bar")
        en = min(1.0, max(0.0, num(s["energy"], f"sections[{si}].energy"))) if "energy" in s else ROLE_E[role]
        if a >= nbars: warn(f"sections[{si}] ({role}) starts at bar {a}, past the end of the film ({nbars} bars): ignored")
        elif b > nbars: warn(f"sections[{si}] ({role}) runs to bar {b}, past the end of the film ({nbars} bars): cut")
        for k in range(a, min(b, nbars)): role_of[k] = role; en_of[k] = en
    last = "groove"
    for k in range(nbars):
        if role_of[k] is None: role_of[k] = last; en_of[k] = ROLE_E[last] * 0.8
        last = role_of[k]
else:  # default arc: intro, groove, build (2 bars), drop, outro
    if nbars < 4: role_of = ["groove"] * nbars
    else:
        d = max(3, round(nbars * 0.62)); bs = max(1, d - 2)
        for k in range(nbars):
            role_of[k] = "intro" if k < max(1, round(nbars * 0.2)) else "build" if bs <= k < d else "drop" if k >= d else "groove"
        role_of[-1] = "outro"
    en_of = [ROLE_E[r] for r in role_of]
sections_out = []
for k in range(nbars):
    if k == 0 or role_of[k] != role_of[k - 1]: sections_out.append([k, role_of[k]])
drops = [k * bar for k in range(nbars) if role_of[k] == "drop" and (k == 0 or role_of[k - 1] != "drop")]
drops_nz = [t for t in drops if t > 0.01]

end_mode = str(plan.get("end", "ring")).lower()
if end_mode not in ("fade", "stinger", "ring"): bad("end must be fade, stinger or ring")
RING_MIN = 1.5   # the last chord needs at least this long to ring out inside the film
final_t = None
if end_mode != "fade" and nbars >= 2:
    final_t = (nbars - 1) * bar
    moved = False
    while dur - final_t < RING_MIN and final_t - bar >= bar - 1e-6: final_t -= bar; moved = True
    if dur - final_t < RING_MIN: final_t = None
    elif moved: warn(f"the end hit moved to bar {int(round(final_t / bar))} ({final_t:.2f} s) so the last chord rings {dur - final_t:.1f} s inside the {dur:g} s film; later sections are cut")
if final_t is None and end_mode != "fade": end_mode = "fade"
gap_len = bar * 0.25 if plan.get("silenceBeforeDrop", True) else 0.0
gap_len = min(gap_len, 0.6)

# hits: number = seconds; "bar:N" or {"bar":N,"beat":B} or {"t":S}; optional strength 0..1
hits = []
hl = plan.get("hits", [])
if hl is None: hl = []
if not isinstance(hl, list): bad('"hits" must be a list: seconds, "bar:N" or {"bar": N, "beat": B, "strength": S}')
for hi_, h in enumerate(hl):
    st = 0.9; nm = f"hits[{hi_}]"
    if isinstance(h, dict):
        if "t" not in h and "bar" not in h: bad(f'{nm} needs "t" (seconds) or "bar" (+ optional "beat"), got {json.dumps(h)}')
        st = min(1.0, max(0.0, num(h["strength"], nm + ".strength"))) if "strength" in h else 0.9
        t = num(h["t"], nm + ".t") if "t" in h else num(h["bar"], nm + ".bar") * bar + num(h.get("beat", 0), nm + ".beat") * beat
    elif isinstance(h, str):
        m = re.match(r"^\s*bar[: ]?\s*(\d+(?:\.\d+)?)\s*$", h)
        if not m: bad(f"cannot read {nm} {h!r} (number of seconds, 'bar:N' or an object)")
        t = float(m.group(1)) * bar
    else: t = num(h, nm)
    if t < 0: bad(f"{nm} is at {t:.2f} s, before the start")
    if t >= dur: warn(f"{nm} at {t:.2f} s is past the end of the film ({dur:.2f} s): ignored"); continue
    hits.append((t, st))
hits.sort()
if final_t is not None:   # the ending is its own gesture: nothing lands in the ring-out or right on top of the final hit
    kept = []
    for t, st in hits:
        if t > final_t - max(0.5, beat) - 1e-6 and t < dur:
            warn(f"hit at {t:.2f} s is too close to the final hit ({final_t:.2f} s) or inside the ring-out: ignored"); continue
        if any(role_of[k] == "outro" and k * bar <= t < (k + 1) * bar for k in range(nbars)) and abs(t / beat - round(t / beat)) * beat > 0.04:
            t2 = round(t / beat) * beat
            warn(f"hit at {t:.2f} s in the outro is off the beat grid: snapped to {t2:.2f} s"); t = t2
        kept.append((t, st))
    hits = kept

# ---------------------------------------------------------------- synth voices
def nz(n): return rng.standard_normal(n)
def ex(n, rate): return np.exp(-rate * np.arange(n) / SR)
def sos(kind, f, x, order=2):
    return signal.sosfilt(signal.butter(order, f, btype=kind, fs=SR, output="sos"), x)
def fade(x, a=0.002, r=0.01):
    x = x.copy(); na, nr = max(1, tt(a)), max(1, tt(r))
    x[:na] *= np.linspace(0, 1, na); x[-nr:] *= np.linspace(1, 0, nr); return x

def v_kick(k, g=1.0, dec=1.0):
    n = tt(0.55); t = np.arange(n) / SR
    f = k["f0"] + (k["f1"] - k["f0"]) * np.exp(-t * k["sweep"])
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * k["decay"] * dec)
    y += 0.25 * sos("high", 1800, nz(n)) * ex(n, 500)
    return fade(y * g, 0.0005, 0.02)
def v_snare(g=1.0):
    n = tt(0.35); t = np.arange(n) / SR
    y = 0.5 * np.sin(2 * np.pi * 185 * t) * ex(n, 28) + 0.9 * sos("band", [1500, 9000], nz(n)) * ex(n, 16)
    return fade(y * g, 0.0005, 0.02)
def v_clap(g=1.0):
    n = tt(0.3); y = np.zeros(n)
    for o in (0, 0.011, 0.022):
        j = tt(o); m = n - j; y[j:] += sos("band", [1000, 3500], nz(m)) * ex(m, 120 if o < 0.022 else 18)
    return fade(y * g * 1.3, 0.0005, 0.02)
def v_rim(g=1.0):
    n = tt(0.1); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 820 * t) * ex(n, 70) * 0.5 + sos("band", [2000, 6000], nz(n)) * ex(n, 90) * 0.5
    return fade(y * g, 0.0005, 0.01)
def v_taiko(g=1.0, pitch=1.0):
    n = tt(0.9); t = np.arange(n) / SR
    f = 62 * pitch + 55 * pitch * np.exp(-t * 30)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * ex(n, 4.2) + 0.5 * sos("low", 400, nz(n)) * ex(n, 40)
    return fade(y * g, 0.0005, 0.05)
def v_hat(g=1.0, op=False):
    n = tt(0.28 if op else 0.07)
    return fade(sos("high", 7500, nz(n)) * ex(n, 14 if op else 70) * g, 0.0003, 0.01)
def v_sub(freq, dur_s, glide=0.0, decay=0.0, g=1.0):
    n = tt(dur_s); t = np.arange(n) / SR
    f = freq * (1 + glide * np.exp(-t * 25))
    y = np.tanh(1.9 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.8
    if decay: y *= np.exp(-t * decay)
    return fade(y * g, 0.004, 0.03)
def saw(f, n, harm, detune=0.0, ph=0.0):
    t = np.arange(n) / SR; y = np.zeros(n)
    for k in range(1, harm + 1):
        if f * k * (1 + detune) > SR * 0.45: break
        y += np.sin(2 * np.pi * f * (1 + detune) * k * t + ph * k) / k
    return y
def v_pluck(m, dur_s, wave, cut, dec, g=1.0):
    f = mtof(m); n = tt(dur_s); t = np.arange(n) / SR
    if wave == "saw": y = saw(f, n, 14) + 0.6 * saw(f, n, 14, 0.006)
    elif wave == "bell":
        y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, dec), (2.76, .4, dec * 1.8), (5.4, .2, dec * 3), (8.9, .1, dec * 4)))
        return fade(y * g * 0.7, 0.001, 0.03)
    elif wave == "synthpl":   # analog pluck: two detuned saws and a sub octave, the filter closes with the note
        y = saw(f, n, 16) + 0.7 * saw(f, n, 16, 0.007) + 0.6 * np.sin(2 * np.pi * f * 0.5 * t)
        lo_, hi_ = sos("low", 900, y), sos("low", min(cut, SR * 0.45), y)
        y = (lo_ + (hi_ - lo_) * np.exp(-t * 14)) * 0.35 * np.exp(-t * dec)
        return fade(y * g, 0.002, 0.04)
    else:  # epiano
        y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6) + 0.12 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 14)
        y += 0.6 * np.sin(2 * np.pi * f * 1.003 * t) * 0.3
        y += 0.5 * np.sin(2 * np.pi * 5 * f * t) * np.exp(-t * 16) + 0.25 * np.sin(2 * np.pi * 7 * f * t) * np.exp(-t * 24)   # tine bark: content above 2 kHz
    y = sos("low", min(cut, SR * 0.45), y) * np.exp(-t * dec)
    return fade(y * g, 0.002, 0.04)
def v_stab(freqs, dur_s, cut, g=1.0):
    n = tt(dur_s); t = np.arange(n) / SR
    y = sum(saw(f, n, 12) + 0.6 * saw(f, n, 12, 0.006) for f in freqs) / len(freqs)
    return fade(sos("low", min(cut, SR * 0.45), y) * np.exp(-t * 9) * g * 0.5, 0.002, 0.03)
def v_pad(freqs, n, cut, pan_set):
    t = np.arange(n) / SR; L = np.zeros(n); R = np.zeros(n)
    for fi, f in enumerate(freqs):
        for vi, dt in enumerate((-0.0075, 0.0, 0.0075)):
            y = saw(f, n, 9, dt, ph=fi + vi) * (1.0 / (1 + 0.15 * fi))
            w = (vi + pan_set) % 3
            L += y * (0.3 + 0.25 * (w == 0) + 0.1 * (w == 1)); R += y * (0.3 + 0.25 * (w == 2) + 0.1 * (w == 1))
    return sos("low", cut, L), sos("low", cut, R)

def riser(n, strong=1.0):
    # noise swept upward through a band (STFT mask) plus a rising tone and tremolo, amplitude ramp
    nf = 2048
    x = nz(n + nf)
    f, tms, Z = signal.stft(x, SR, nperseg=nf, noverlap=nf * 3 // 4)
    prog_t = np.linspace(0, 1, Z.shape[1])
    fc = 400 * (9500 / 400) ** prog_t
    M = np.exp(-((np.log2((f[:, None] + 1) / fc[None, :])) ** 2) / (2 * 0.9 ** 2))
    _, y = signal.istft(Z * M, SR, nperseg=nf, noverlap=nf * 3 // 4)
    y = y[:n] if len(y) >= n else np.pad(y, (0, n - len(y)))
    y = y / (np.abs(y).max() + 1e-9)
    t = np.arange(n) / SR; u = t / (n / SR)
    tone = np.sin(2 * np.pi * np.cumsum(220 * (8 ** u)) / SR) * 0.25
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * np.cumsum(5 + 11 * u) / SR)
    return (y * 0.9 + tone) * trem * (u ** 1.6) * strong
def impact(g=1.0, boom=1.0, tail=1.9):
    n = tt(tail); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(34 + 90 * np.exp(-t * 14)) / SR) * np.exp(-t * 1.9) * boom
    crash = sos("high", 4500, nz(n)) * np.exp(-t * 3.2) * 0.45 + sos("band", [300, 3000], nz(n)) * np.exp(-t * 12) * 0.5
    click = sos("band", [2500, 12000], nz(n)) * np.exp(-t * 220) * 0.9   # crisp attack so the hit time is unambiguous
    return fade((sub * 1.1 + crash + click) * g, 0.0005, 0.1)

# ---------------------------------------------------------------- score
L = {k: np.zeros(N + SR * 3) for k in ("drums", "bass", "pad", "pluck", "fx")}
R = {k: np.zeros(N + SR * 3) for k in L}
def put(bus, t, y, g=1.0, pan=0.0):
    i = tt(t)
    if i < 0 or i >= N: return
    y = y[: len(L[bus]) - i]
    a = (pan + 1) * math.pi / 4
    L[bus][i:i + len(y)] += y * g * math.cos(a) * 1.414; R[bus][i:i + len(y)] += y * g * math.sin(a) * 1.414

duck = np.ones(N + SR * 3)
def duck_at(t, depth=0.65, tau=0.13):
    i = tt(t); n = tt(0.45)
    if i >= N: return
    seg = 1 - depth * np.exp(-np.arange(n) / SR / tau); seg = seg[: len(duck) - i]
    duck[i:i + len(seg)] *= seg

pre_end = final_t if final_t is not None else dur
riser_info = []   # (start, end)
for d in drops_nz:
    rl = min(d - gap_len, max(2.0, bar if bar >= 2 else bar * 2) if bar < 4 else bar)
    if rl >= 1.0: riser_info.append((d - gap_len - rl, d - gap_len))
def in_riser(t):
    return any(a - 1e-6 <= t < b for a, b in riser_info)
def riser_progress(t):
    for a, b in riser_info:
        if a - 1e-6 <= t < b: return (t - a) / (b - a)
    return None

swing = P["swing"]
kick_times = []
for b in range(nbars):
    t0 = b * bar
    if t0 >= pre_end - 1e-6: break
    role, e = role_of[b], max(0.0, min(1.0, en_of[b]))
    full = role in ("drop", "groove")
    gscale = (0.3 + 0.7 * e) * (1.25 if role == "drop" else 0.85 if role == "groove" else 1.0)
    root, tones = chord_at_bar(b)
    # drum pattern selection
    for s in range(16):
        t = t0 + s * step + (swing * step if s % 2 else 0)
        if t >= pre_end - 1e-6: break
        rise = in_riser(t)
        # kick
        kp = P["kick_pat"]
        if role == "intro": kp = [0, 8]   # the intro always pulses (soft), never a pad alone
        elif role == "outro": kp = [0, 8] if e >= 0.45 else []
        elif role == "break": kp = []
        elif role == "build": kp = [0, 4, 8, 12] if P["kick_pat"] != [0, 8] else [0, 8]
        if role == "drop" and P.get("prog_drop") and s == 14 and not rise: kp = kp + [14]   # ghost kick (punchy drop)
        if s in kp and not rise:
            g = (1.0 if full else 0.7) * gscale
            put("drums", t, v_kick(P["kick"], g), 1.0); kick_times.append(t)
            duck_at(t, 0.65 if full else 0.4)
        # snare / clap
        sp = P["snare_pat"] if full else ([P["snare_pat"][-1]] if role == "build" and e > 0.5 and not rise else [])
        if s in sp and not rise:
            g = (0.9 if full else 0.6) * gscale
            kind = P["snare"]
            put("drums", t, {"clap": v_clap, "snare": v_snare, "rim": v_rim}.get(kind, v_snare)(g) if kind != "taiko" else v_taiko(g * 1.0, 0.8), 1.0, 0.0)
            if kind == "snare": put("drums", t, v_clap(g * 0.5), 1.0, 0.1)
        # hats
        if P["hat_pat"] and role not in ("break",) and not (role == "outro" and e < 0.5):
            pat = P["hat_pat"]
            dense = (role == "drop" and P["hat16"]) or (role == "build" and P["hat16"] and (e >= 0.6 or rise))
            if rise and P["hat16"]: dense = True
            if s in pat or (dense and s % 2 == 1):
                acc = 1.0 if s % 4 == 2 else 0.6
                g = (1.2 if full else 0.8) * (0.55 if role == "intro" and e < 0.5 else 1.0) * gscale * acc * (0.8 + 0.4 * rng.random()) * (0.55 if s % 2 == 1 else 1)
                put("drums", t, v_hat(g, op=(s in P["open_hat"] and full and role == "drop")), 1.0, 0.25 if s % 4 else -0.15)
        # snare roll into the drop
        pr = riser_progress(t)
        if pr is not None and s % 2 == 0 and role in ("build", "break", "groove", "intro", "drop"):
            a, bb = [x for x in riser_info if x[0] - 1e-6 <= t < x[1]][0]
            last_bar = t >= bb - bar
            if last_bar and (s % 2 == 0) and P["snare"] != "rim":
                g = (0.25 + 0.75 * pr) * 0.9
                put("drums", t, v_taiko(g, 1.1) if P["snare"] == "taiko" else v_snare(g * 0.8), 1.0)
        # bass
        if full or (role == "build" and e > 0.45):
            kind = P["bass"]
            midi = 12 * (P["bass_oct"] + 1) + root
            if midi < 28: midi += 12
            if kind == "pulse" and s in (2, 6, 10, 14) and not rise:
                put("bass", t, v_sub(mtof(midi), step * 3.2, 0.0, 6.0, 0.85), 1.0)
            elif kind == "808" and (s in (0, 7, 10) or (s == 14 and role == "drop")) and not rise:
                put("bass", t, v_sub(mtof(midi), beat * (1.7 if s == 0 else 1.0), 0.6, 2.2, 0.95), 1.0)
            elif kind == "long" and s == 0 and not rise:
                put("bass", t, v_sub(mtof(midi), bar * 0.96, 0.0, 0.5, 0.8), 1.0)
            elif kind == "ostinato" and s % 2 == 0 and not rise:
                accent = 1.0 if s % 8 == 0 else 0.7
                put("bass", t, v_sub(mtof(midi), step * 1.8, 0.0, 5.0, 0.85 * accent), 1.0)
        # pluck / arp
        dens = 0
        if role in ("drop", "groove"): dens = 16 if (e >= 0.85 or preset in ("pulse", "calm")) else 8
        elif role == "build": dens = 16 if (e > 0.7 or rise) else 8
        elif role == "break": dens = 8
        elif role == "intro": dens = 8 if e >= 0.3 else 4
        elif role == "outro": dens = 4
        if preset == "cinematic": dens = min(dens, 8) if role in ("drop", "groove") else min(dens, 4)
        if preset == "calm": dens = 16 if (role == "drop" and e >= 0.85) else 4 if role == "intro" else min(dens, 8)
        if dens == 16: hitstep = True
        elif dens == 8: hitstep = s % 2 == 0
        elif dens == 4: hitstep = s in (0, 6, 10) if preset != "cinematic" else s in (0, 8)
        else: hitstep = False
        if hitstep and not (role == "outro" and b == nbars - 1):
            ct = [root + iv for iv in tones]
            allt = ct + [x + 12 for x in ct] + [x + 24 for x in ct]
            idx = (P["arp4"][b % 4] if P.get("arp4") else P["arp"])[s % 16]
            m = 12 * (4 + P["pluck_oct"]) + root + (allt[idx % len(allt)] - root) - 12 * (1 if P["pluck_oct"] == 2 else 0)
            while m > 96: m -= 12
            acc = 1.0 if s % 4 == 0 else 0.62
            g = 0.55 * acc * (0.45 + 0.55 * e) * (1.35 if role == "break" else 1.0) * (0.85 + 0.3 * rng.random())
            put("pluck", t, v_pluck(m, beat * 0.9 if dens < 16 else beat * 0.55, P["pluck_wave"], P["pluck_cut"], P["pluck_decay"], g), 0.9, -0.5 + (s % 8) / 8)
        # chord stabs (punchy): the filter opens at the drop
        if P.get("stab") and not rise and role in ("groove", "drop") and s in ((0, 6, 10, 14) if role == "drop" else (6, 10)):
            sg = 0.55 * (0.5 + 0.5 * e) * (1.2 if role == "drop" else 0.8)
            put("pluck", t, v_stab([mtof(60 + root + iv) for iv in tones], beat * 0.6, 6500 if role == "drop" else 2200, sg), 0.9, 0.35)
        # bell layer in the upper octave (calm: all sections, sparse in the intro and outro; punchy: drop only)
        if P.get("sparkle") and not rise and role in P["sparkle"]:
            pat = P["spark_pat"][b % 4]
            if role in ("intro", "outro"): pat = [0] if b % 4 == 0 else []
            elif role == "build": pat = pat[:1]
            if s in pat and not (role == "outro" and b == nbars - 1):
                ci = (pat.index(s) + b) % len(tones)
                bm = 84 + (root + tones[ci]) % 12
                bg = 0.8 * (0.5 + 0.5 * e) * (0.7 if role in ("intro", "outro") else 1.0)
                put("pluck", t, v_pluck(bm, beat * 1.4, "bell", 9000, 2.6, bg), 0.9, 0.4 if s < 8 else -0.4)

# pad: one evolving chord per chord segment (crossfaded), level follows the section energies
PADBASE = {"intro": 0.85, "build": 0.85, "break": 1.0, "drop": 0.6, "groove": 0.65, "outro": 0.95}
cb = P["chord_bars"]
for sgi, b0 in enumerate(range(0, nbars, cb)):
    root, tones = chord_at_bar(b0)
    t0 = b0 * bar
    t1 = min(dur, (b0 + cb) * bar)
    if final_t is not None: t1 = min(t1, final_t)
    if t1 - t0 < 0.1: continue
    n = tt(t1 - t0 + 0.6)
    midis = [48 + root + iv - (12 if root > 6 and iv == 0 else 0) for iv in tones] + [60 + root]
    midis = [m if m < 62 else m for m in midis]
    cut = P["pad_cut"] + 1500 * float(np.mean(en_of[b0:b0 + cb]))
    pl, pr_ = v_pad([mtof(m) for m in midis], n, cut, sgi)
    env = np.ones(n); na = tt(0.45 if cb == 1 else 0.9); nr = tt(0.6)
    env[:na] = np.linspace(0, 1, na) ** 1.5; env[-nr:] *= np.linspace(1, 0, nr)
    if sgi == 0: env[:na] = np.maximum(env[:na], np.linspace(0.3, 1, na))
    pl *= env; pr_ *= env
    i = tt(t0)
    k = min(n, len(L["pad"]) - i)
    L["pad"][i:i + k] += pl[:k] * 0.1; R["pad"][i:i + k] += pr_[:k] * 0.1
lvl = np.zeros(len(duck))
for b in range(nbars):
    lvl[tt(b * bar):tt((b + 1) * bar)] = PADBASE[role_of[b]] * (0.45 + 0.55 * en_of[b]) * P["pad_level"] / 0.55
lvl[tt(nbars * bar):] = lvl[tt(nbars * bar) - 1] if nbars else 0
lvl = uniform_filter1d(lvl, tt(0.3))
for k in ("pad",):
    L[k] *= lvl; R[k] *= lvl

# risers
for a, b in riser_info:
    y = riser(tt(b - a))
    put("fx", a, y, 0.9, 0.0)
    ya = riser(tt(b - a))
    put("fx", a, ya * 0.3, 0.3, 0.7)

# presence on the keys (calm): a high-passed copy of the pluck bus lifts the 2-6 kHz band
if P.get("bright"):
    for bus in (L, R): bus["pluck"] += P["bright"] * sos("high", 2200, bus["pluck"])

# sidechain-style ducking for bass, pad, pluck
for k, dpt in (("bass", 1.0), ("pad", 0.9), ("pluck", 0.45)):
    dk = 1 - (1 - duck) * dpt
    L[k] *= dk; R[k] *= dk

# reverb send for pad, pluck, snare-ish
def reverb(x, wet, seconds):
    n = tt(seconds); ir = np.stack([nz(n) * np.exp(-np.arange(n) / SR * (6.9 / seconds)) for _ in range(2)])
    ir = np.stack([sos("low", 6000, ir[0]), sos("low", 6000, ir[1])]); ir /= np.abs(ir).sum(axis=1, keepdims=True) ** 0.5 * 8
    return [signal.fftconvolve(x[c], ir[c])[: len(x[c])] * wet for c in (0, 1)]
verb_in = [L["pluck"] * 0.8 + L["pad"] * 0.5 + L["drums"] * 0.12, R["pluck"] * 0.8 + R["pad"] * 0.5 + R["drums"] * 0.12]
rv = reverb(np.array(verb_in), P["verb"], 1.8 if preset != "cinematic" else 3.2)

mixL = L["drums"] * 0.95 + L["bass"] * 0.9 * P.get("bass_gain", 1) + L["pad"] * 1.0 + L["pluck"] * 0.55 * P.get("pluck_gain", 1) + L["fx"] + rv[0]
mixR = R["drums"] * 0.95 + R["bass"] * 0.9 * P.get("bass_gain", 1) + R["pad"] * 1.0 + R["pluck"] * 0.55 * P.get("pluck_gain", 1) + R["fx"] + rv[1]

# silence right before each drop: everything off for gap_len (4 ms edges), the drop then lands on a dead floor
mask = np.ones(len(mixL))
for d in drops_nz:
    if gap_len > 0:
        a, b = tt(d - gap_len), tt(d)
        mask[a:b] = 0
        e1 = tt(0.004); mask[a - e1:a] = np.linspace(1, 0, e1)
for t, st in hits + ([(final_t, 1.0)] if final_t is not None else []):   # explicit hits and the end hit: a 90 ms dip just before, so the hit stands out of a busy groove
    a, b = tt(max(0, t - 0.09)), tt(t)
    if b - a > 8:
        dp = 1 - 0.95 * min(1.0, 0.3 + 0.7 * st)
        e1 = tt(0.004); mask[a:b] *= dp; mask[a - e1:a] *= np.linspace(1, dp, e1) if a >= e1 else 1
mixL *= mask; mixR *= mask

# ending: everything stops at final_t, then impact + chord ring (stinger: short chord)
if final_t is not None:
    cut = tt(final_t)
    ramp = tt(0.004)
    for m in (mixL, mixR):
        m[cut - ramp:cut] *= np.linspace(1, 0, ramp); m[cut:] = 0
        # nothing from before bleeds into the ring except the reverb tail (kept below)
    # re-add reverb tail after the cut so it rings naturally
    mixL[cut:] += rv[0][cut:] * 0.8; mixR[cut:] += rv[1][cut:] * 0.8

# hits: impacts at planned seconds (drops get a full one), end hit
imp = []
for d in drops_nz: imp.append((d, 1.0, "drop"))
for t, st in hits: imp.append((t, st, "hit"))
if final_t is not None: imp.append((final_t, 0.9, "end"))
REF = P["impact"] * 0.9   # the drop impact is the loudest one; explicit hits scale with their strength and stay below it
for t, st, kind in imp:
    if kind == "drop": g, boom = REF, 1.0
    elif kind == "end": g, boom = REF * 0.9, 1.0
    else: g, boom = REF * 0.9 * (0.2 + 0.8 * st), 0.5 + 0.5 * st
    y = impact(g, boom, 2.4 if kind == "end" else 1.9)
    i = tt(t)
    k = min(len(y), len(mixL) - i)
    mixL[i:i + k] += y[:k]; mixR[i:i + k] += y[:k]
    # a short low stab so the hit is felt on the beat grid
    st_y = v_kick(P["kick"], 0.8 * (0.2 + 0.8 * st), 0.4)
    k2 = min(len(st_y), len(mixL) - i); mixL[i:i + k2] += st_y[:k2]; mixR[i:i + k2] += st_y[:k2]
if final_t is not None:
    root, tones = root_pc, QUAL[prog[0][1]]   # the ending resolves on the tonic chord
    ring = tt(dur - final_t)
    for iv in [x for x in tones] + [12]:
        for octv in (0, 12):
            f = mtof(60 + root + iv + octv - 12)
            n = ring; t = np.arange(n) / SR
            decay = min(3.2, 1.9 / max(ring / SR, 0.3)) if end_mode == "stinger" else min(1.0, 1.7 / max(ring / SR, 0.3))   # still audible at the file end
            y = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t * 2)) * np.exp(-t * decay) * 0.09
            i = tt(final_t)
            k = min(n, len(mixL) - i); mixL[i:i + k] += y[:k]; mixR[i:i + k] += y[:k]
if end_mode == "fade":
    fl = min(dur * 0.4, max(1.5, bar * 1.2)); a = tt(dur - fl)
    g = np.ones(len(mixL)); g[a:N] = np.cos(np.linspace(0, math.pi / 2, N - a)) ** 2; g[N:] = 0
    mixL *= g; mixR *= g

y = np.stack([mixL[:N], mixR[:N]], axis=1)
y -= y.mean(axis=0)
y = np.stack([sos("low", 15500, y[:, 0], 4), sos("low", 15500, y[:, 1], 4)], axis=1)   # no content near Nyquist: safer for mp3/aac and true peaks
y = np.tanh(y * 0.9) / 0.9 * 0.97   # gentle glue
# short tail fade so the file never ends on a click
y[-tt(0.3):] *= (np.cos(np.linspace(0, math.pi / 2, tt(0.3))) ** 2)[:, None]   # ~0.3 s closing fade: the file never ends mid-sound

# ---------------------------------------------------------------- loudness and limiter
CEIL = 10 ** (-1.5 / 20)
def limit(x, ceil=CEIL):
    up = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max(axis=1)   # true peak: look at the 4x oversampled signal
    pk = np.maximum(up[: len(x) * 4].reshape(-1, 4).max(axis=1), np.abs(x).max(axis=1))
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    w = tt(0.004)
    g = minimum_filter1d(need, size=w * 2 + 1, mode="nearest")
    g = uniform_filter1d(g, size=w * 2 + 1, mode="nearest")
    g = np.minimum(g, need)
    return x * g[:, None]
def measure(x):
    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, "m.wav"); sf.write(p, x, SR, subtype="FLOAT")
        r = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    m = re.search(r"Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS", r.stderr)
    return float(m.group(1)) if m else None
have_ff = subprocess.run(["ffmpeg", "-version"], capture_output=True).returncode == 0
gain = 1.0
x = y
for it in range(6):
    lufs = measure(limit(y * gain)) if have_ff else None
    if lufs is None:
        rms = np.sqrt(np.mean(y ** 2)); gain = 10 ** ((LUFS + 3) / 20) / rms; break
    if abs(lufs - LUFS) < 0.15: break
    gain *= 10 ** ((LUFS - lufs) / 20)
x = limit(y * gain)

# ---------------------------------------------------------------- write
out = opts["out"]; ext = os.path.splitext(out)[1].lower()
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
if ext == ".wav": sf.write(out, x, SR, subtype="PCM_16")
elif ext in (".mp3", ".m4a", ".flac", ".aac"):
    if not have_ff: sys.exit("ffmpeg is needed for " + ext)
    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, "t.wav"); sf.write(p, x, SR, subtype="PCM_16")
        codec = {".mp3": ["-c:a", "libmp3lame", "-b:a", "256k"], ".m4a": ["-c:a", "aac", "-b:a", "256k"], ".aac": ["-c:a", "aac", "-b:a", "256k"], ".flac": ["-c:a", "flac"]}[ext]
        r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", p, *codec, out], capture_output=True, text=True)
        if r.returncode: sys.exit("ffmpeg failed: " + r.stderr.strip().split("\n")[-1])
else: sys.exit(f"unknown output type {ext} (use .wav, .mp3, .m4a, .flac)")

# sidecar <out>.plan.json: what was planned, so analyze reads the grid, drops and sections from the plan instead of guessing from audio
runs = []
for k in range(nbars if final_t is None else int(round(final_t / bar)) + 1):   # bars after a moved end hit are cut
    if k == 0 or role_of[k] != role_of[k - 1] or abs(en_of[k] - en_of[k - 1]) > 1e-9: runs.append([k, k + 1, role_of[k], round(float(en_of[k]), 3)])
    else: runs[-1][1] = k + 1
sidecar = {
    "synth": 1, "bpm": bpm, "beat": beat, "bar": bar, "duration": dur, "bars": nbars, "preset": preset, "seed": SEED, "sr": SR,
    "key": ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][root_pc] + (" minor" if mode == "minor" else " major"),
    "sections": [{"from_bar": a_, "to_bar": b_, "role": r_, "energy": e_, "t": round(a_ * bar, 4), "t_end": round(min(dur, b_ * bar), 4)} for a_, b_, r_, e_ in runs],
    "drops": [round(d, 4) for d in drops_nz], "risers": [[round(a_, 4), round(b_, 4)] for a_, b_ in riser_info],
    "gaps": [[round(d - gap_len, 4), round(d, 4)] for d in drops_nz] if gap_len > 0 else [],
    "hits": [{"t": round(t, 4), "strength": round(st, 3)} for t, st in hits],
    "end": {"mode": end_mode, "t": round(final_t, 4) if final_t is not None else None},
}
json.dump(sidecar, open(out + ".plan.json", "w"), indent=1)

fmt = lambda v: f"{v:.2f}"
print(f"synth {preset}  {bpm:g} bpm  beat {beat:.3f}s  bar {bar:.3f}s  {nbars} bars  {dur:.2f}s  key {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][root_pc]} {mode}  {SR} Hz  seed {SEED}")
print("sections:", "  ".join(f"bar{b} {r} @{fmt(b * bar)}s" for b, r in sections_out if final_t is None or b * bar <= final_t + 1e-6))
print("drops:  ", " ".join(fmt(d) for d in drops_nz) or "none", "  gap before drop:", f"{gap_len:.2f}s" if drops_nz and gap_len else "none")
print("risers: ", " ".join(f"{fmt(a)}-{fmt(b)}" for a, b in riser_info) or "none")
print("hits:   ", " ".join(fmt(t) for t, _ in hits) or "none", "   end:", f"{end_mode}" + (f" at {fmt(final_t)}s" if final_t is not None else ""))
fin = measure(x) if have_ff else None
print(f"loudness: {fin:.1f} LUFS   peak {20 * np.log10(np.abs(x).max()):.1f} dBFS" if fin is not None else f"peak {20 * np.log10(np.abs(x).max()):.1f} dBFS")
print(f"→ {out}")

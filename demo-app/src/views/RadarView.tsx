import { useEffect, useRef, useState } from "react";
import { clock, extras, mins, seedOf, type City } from "../data";
import { REDUCED, rng } from "../lib";
import { Glyph } from "../components/Icon";

type Layer = "rain" | "temp" | "wind";

const MAP_W = 1000;
const MAP_H = 600;
const RANGE = 120;

const LAND = [
  "M-60 110 C 60 50 190 80 250 150 S 380 250 330 330 S 190 410 130 520 L 60 660 L -60 660 Z",
  "M520 -40 C 600 50 690 30 760 100 S 880 190 960 160 L 1080 150 L 1080 -40 Z",
  "M600 430 C 680 360 820 380 900 440 S 1010 560 980 660 L 560 660 C 530 560 560 480 600 430 Z",
  "M430 250 C 460 225 510 235 520 265 S 500 315 465 312 S 410 278 430 250 Z",
  "M700 250 C 720 236 750 242 752 262 S 730 290 712 284 S 688 262 700 250 Z",
];
const PATHS = LAND.map((d) => new Path2D(d));

const INTENSITY = { sun: 0.3, partly: 0.45, cloud: 0.55, rain: 0.8, storm: 1 };
const COUNT = { sun: 4, partly: 7, cloud: 9, rain: 13, storm: 16 };

function rainColor(k: number) {
  if (k < 0.35) return "74 222 128";
  if (k < 0.6) return "250 204 21";
  if (k < 0.8) return "251 146 60";
  return "239 68 68";
}

const hhmm = (m: number) => {
  const v = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

export function RadarView({ city }: { city: City }) {
  const [playing, setPlaying] = useState(!REDUCED);
  const [t, setT] = useState(0);
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ rain: true, temp: false, wind: false });
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ t: 0, playing, layers });
  useEffect(() => {
    live.current.playing = playing;
    live.current.layers = layers;
  }, [playing, layers]);
  const x = extras(city);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const seed = seedOf(city.id);
    const rnd = rng(seed);
    const flip = seed % 2 ? -1 : 1;
    const k0 = INTENSITY[city.condition];
    const ang = ((x.windDir + 180) * Math.PI) / 180;
    const speed = 0.8 + city.wind / 18;
    const vx = Math.sin(ang) * speed;
    const vy = -Math.cos(ang) * speed;

    const cells = Array.from({ length: COUNT[city.condition] }, () => ({
      x: rnd() * MAP_W,
      y: rnd() * MAP_H,
      r: 40 + rnd() * 80 * k0,
      k: (0.3 + rnd() * 0.7) * k0,
      lobes: Array.from({ length: 6 }, () => [(rnd() - 0.5) * 1.3, (rnd() - 0.5) * 1.3, 0.4 + rnd() * 0.55]),
    }));
    if (city.condition === "rain" || city.condition === "storm") Object.assign(cells[0], { x: 500, y: 300, r: 120, k: k0 });
    else if (x.nowcast.some((v) => v > 0)) Object.assign(cells[0], { x: 500 - vx * 25, y: 300 - vy * 25, r: 90, k: 0.55 });

    const temps = Array.from({ length: 7 }, () => ({ x: rnd() * MAP_W, y: rnd() * MAP_H, r: 180 + rnd() * 220, d: (rnd() - 0.5) * 12 }));
    const flow = Array.from({ length: 120 }, () => ({ x: rnd() * MAP_W, y: rnd() * MAP_H, age: rnd() * 80, trail: [] as [number, number][] }));

    let time = 0;
    let last = performance.now();
    let raf = 0;
    let shownT = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += REDUCED ? 0 : dt;
      const s = live.current;
      if (s.playing) {
        s.t += dt * 20;
        if (s.t > RANGE) s.t = -RANGE;
      }
      if (Math.round(s.t) !== shownT) {
        shownT = Math.round(s.t);
        setT(shownT);
      }

      const light = document.documentElement.dataset.theme === "light";
      const scale = Math.max(w / MAP_W, h / MAP_H);
      const ox = (w - MAP_W * scale) / 2;
      const oy = (h - MAP_H * scale) / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = light ? "#d6e4f5" : "#0a1128";
      ctx.fillRect(0, 0, w, h);

      ctx.setTransform(dpr * scale * flip, 0, 0, dpr * scale, dpr * (flip > 0 ? ox : w - ox), dpr * oy);
      ctx.fillStyle = light ? "#f5f8fd" : "#131c3a";
      ctx.strokeStyle = light ? "rgb(15 23 42 / .14)" : "rgb(255 255 255 / .09)";
      ctx.lineWidth = 1.5;
      for (const p of PATHS) {
        ctx.fill(p);
        ctx.stroke(p);
      }
      ctx.strokeStyle = light ? "rgb(15 23 42 / .05)" : "rgb(255 255 255 / .035)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx <= MAP_W; gx += 50) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, MAP_H);
      }
      for (let gy = 0; gy <= MAP_H; gy += 50) {
        ctx.moveTo(0, gy);
        ctx.lineTo(MAP_W, gy);
      }
      ctx.stroke();
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);

      if (s.layers.temp) {
        for (const c of temps) {
          const v = city.temp + c.d;
          const rgb = v < 8 ? "106 209 255" : v < 18 ? "255 200 87" : "255 138 91";
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
          g.addColorStop(0, `rgb(${rgb} / .38)`);
          g.addColorStop(1, `rgb(${rgb} / 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
        }
      }

      if (s.layers.rain) {
        const span = MAP_W + 400;
        for (const c of cells) {
          const cx = ((((c.x + vx * s.t + 200) % span) + span) % span) - 200;
          const cy = ((((c.y + vy * s.t + 200) % (MAP_H + 400)) + MAP_H + 400) % (MAP_H + 400)) - 200;
          for (const [lx, ly, ls] of c.lobes) {
            const px = cx + lx * c.r;
            const py = cy + ly * c.r;
            const rr = c.r * ls;
            const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
            g.addColorStop(0, `rgb(${rainColor(c.k)} / .7)`);
            g.addColorStop(0.4, `rgb(${rainColor(c.k * 0.6)} / .45)`);
            g.addColorStop(0.75, "rgb(74 222 128 / .2)");
            g.addColorStop(1, "rgb(74 222 128 / 0)");
            ctx.fillStyle = g;
            ctx.fillRect(px - rr, py - rr, rr * 2, rr * 2);
          }
        }
      }

      if (s.layers.wind) {
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        for (const p of flow) {
          if (!REDUCED) {
            p.x += vx * dt * 70 * (1 + 0.35 * Math.sin(p.y * 0.012 + time));
            p.y += vy * dt * 70 + Math.cos(p.x * 0.01 + time * 0.6) * dt * 30;
            p.age += dt * 30;
          }
          p.trail.push([p.x, p.y]);
          if (p.trail.length > 14) p.trail.shift();
          if (p.age > 90 || p.x < -20 || p.x > MAP_W + 20 || p.y < -20 || p.y > MAP_H + 20) {
            p.x = rnd() * MAP_W;
            p.y = rnd() * MAP_H;
            p.age = 0;
            p.trail = [];
            continue;
          }
          const fade = Math.min(1, p.age / 10, (90 - p.age) / 10);
          ctx.strokeStyle = light ? `rgb(30 50 110 / ${0.2 * fade})` : `rgb(220 230 255 / ${0.22 * fade})`;
          ctx.beginPath();
          p.trail.forEach(([tx, ty], i) => (i ? ctx.lineTo(tx, ty) : ctx.moveTo(tx, ty)));
          ctx.stroke();
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = light ? "rgb(15 23 42 / .12)" : "rgb(255 255 255 / .1)";
      ctx.setLineDash([3, 6]);
      for (const r of [110, 220]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = light ? "rgb(15 23 42 / .4)" : "rgb(255 255 255 / .35)";
      ctx.font = "500 11px 'JetBrains Mono Variable', monospace";
      ctx.fillText("25 km", cx + 114, cy - 4);
      ctx.fillText("50 km", cx + 224, cy - 4);

      ctx.fillStyle = "#ffc857";
      ctx.shadowColor = "rgb(255 200 87)";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0a1128";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [city.id]);

  function scrub(v: number) {
    live.current.t = v;
    setT(v);
    setPlaying(false);
  }

  const at = hhmm(mins(clock(city)) + t);
  const phase = Math.abs(t) < 3 ? "Now" : t < 0 ? "Past" : "Forecast";

  return (
    <section className="card radar">
      <div className="radar-map">
        <canvas ref={canvas} className="radar-canvas" />
        <div className="radar-hud">
          <div className="radar-title">
            <span className="live-dot" />
            Precipitation radar
          </div>
          <div className="radar-city">{city.name}</div>
          <div className="radar-sub">{x.nowcastText}</div>
        </div>
        <div className="radar-time">
          <span className={`radar-phase ${phase === "Past" ? "" : `phase-${phase.toLowerCase()}`}`}>{phase}</span>
          <b>{at}</b>
        </div>
        <div className="radar-layers">
          {(["rain", "temp", "wind"] as const).map((l) => (
            <button key={l} className={`chip ${layers[l] ? "is-on" : ""}`} onClick={() => setLayers((s) => ({ ...s, [l]: !s[l] }))}>
              <Glyph name={l === "rain" ? "drop" : l === "temp" ? "thermo" : "wind"} size={14} />
              {l === "rain" ? "Rain" : l === "temp" ? "Temperature" : "Wind"}
            </button>
          ))}
        </div>
        <div className="radar-legend">
          <span>Light</span>
          <i />
          <span>Heavy</span>
        </div>
      </div>
      <div className="radar-controls">
        <button className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Play"}>
          <Glyph name={playing ? "pause" : "play"} size={18} />
        </button>
        <div className="timeline">
          <input type="range" min={-RANGE} max={RANGE} value={t} onChange={(e) => scrub(Number(e.target.value))} style={{ "--p": `${((t + RANGE) / (RANGE * 2)) * 100}%` } as React.CSSProperties} aria-label="Radar time" />
          <div className="timeline-ticks">
            <span>−2h</span>
            <span>−1h</span>
            <span className="is-now">Now</span>
            <span>+1h</span>
            <span>+2h</span>
          </div>
        </div>
      </div>
    </section>
  );
}

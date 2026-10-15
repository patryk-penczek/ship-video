import { useState } from "react";
import { isNight, type City } from "../data";
import { smooth, useFormat, useWidth } from "../lib";
import { Glyph, WeatherIcon, type GlyphName } from "../components/Icon";
import { Num, Temp } from "../components/Temp";

type Metric = "temp" | "rain" | "wind";

const CITY_COLORS = ["#ffc857", "#6ad1ff", "#ff8a5b", "#a78bfa", "#4ade80", "#f472b6", "#7b8cff", "#2dd4bf", "#facc15", "#fb7185", "#38bdf8", "#c084fc", "#a3e635", "#fdba74"];

const weekRain = (c: City) => Math.round(c.days.reduce((s, d) => s + d.rain, 0) / c.days.length);
const VALUE: Record<Metric, (c: City) => number> = { temp: (c) => c.temp, rain: weekRain, wind: (c) => c.wind };
const METRICS: { id: Metric; label: string; seg: string; icon: GlyphName }[] = [
  { id: "temp", label: "Warmest", seg: "Temperature", icon: "thermo" },
  { id: "rain", label: "Wettest", seg: "Rain this week", icon: "drop" },
  { id: "wind", label: "Windiest", seg: "Wind", icon: "wind" },
];

const ROW = 56;

export function CompareView({ cities, onOpen }: { cities: City[]; onOpen: (id: string) => void }) {
  const [metric, setMetric] = useState<Metric>("temp");
  const color = (c: City) => CITY_COLORS[cities.indexOf(c) % CITY_COLORS.length];
  const value = VALUE[metric];
  const ranked = [...cities].sort((a, b) => value(b) - value(a));
  const values = cities.map(value);
  const lo = Math.min(0, ...values);
  const hi = Math.max(...values);

  return (
    <div className="compare">
      <div className="highlights">
        {METRICS.map((m) => {
          const top = [...cities].sort((a, b) => VALUE[m.id](b) - VALUE[m.id](a))[0];
          return (
            <button key={m.id} className={`highlight ${metric === m.id ? "is-active" : ""}`} onClick={() => setMetric(m.id)}>
              <span className="hl-icon">
                <Glyph name={m.icon} size={18} />
              </span>
              <span className="hl-label">{m.label}</span>
              <span className="hl-city">{top.name}</span>
              <span className="hl-value">
                {m.id === "temp" ? <Temp c={top.temp} from={0} /> : <Num value={VALUE[m.id](top)} from={0} suffix={m.id === "rain" ? "%" : " km/h"} />}
              </span>
            </button>
          );
        })}
      </div>

      <section className="card race">
        <header className="card-head">
          <h2>Right now</h2>
          <div className="seg">
            {METRICS.map((m) => (
              <button key={m.id} className={metric === m.id ? "is-active" : ""} onClick={() => setMetric(m.id)}>
                {m.seg}
              </button>
            ))}
          </div>
        </header>
        <div className="race-rows" style={{ height: cities.length * ROW }}>
          {cities.map((c) => {
            const rank = ranked.indexOf(c);
            const v = value(c);
            return (
              <button key={c.id} className="race-row" style={{ transform: `translateY(${rank * ROW}px)` }} onClick={() => onOpen(c.id)}>
                <span className="race-rank">{rank + 1}</span>
                <WeatherIcon condition={c.condition} night={isNight(c)} size={26} />
                <span className="race-name">{c.name}</span>
                <span className="race-track">
                  <i style={{ width: `${12 + ((v - lo) / (hi - lo || 1)) * 88}%`, background: `linear-gradient(90deg, ${color(c)}33, ${color(c)})` }} />
                </span>
                <span className="race-value">{metric === "temp" ? <Temp c={v} /> : <Num value={v} suffix={metric === "rain" ? "%" : " km/h"} />}</span>
              </button>
            );
          })}
        </div>
      </section>

      <WeekChart cities={cities} color={color} />
    </div>
  );
}

const H = 240;
const TOP = 20;
const BOTTOM = 34;
const PAD = 36;

function WeekChart({ cities, color }: { cities: City[]; color: (c: City) => string }) {
  const format = useFormat();
  const [hidden, setHidden] = useState<string[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>();
  const shown = cities.filter((c) => !hidden.includes(c.id));
  const days = cities[0].days.map((d) => d.day);
  const highs = shown.flatMap((c) => c.days.map((d) => d.high));
  const min = Math.min(...highs, 0) - 2;
  const max = Math.max(...highs, 10) + 2;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (days.length - 1);
  const y = (t: number) => TOP + (1 - (t - min) / (max - min)) * (H - TOP - BOTTOM);

  function move(e: React.PointerEvent) {
    if (!W) return;
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.min(days.length - 1, Math.max(0, Math.round(((e.clientX - r.left - PAD) / (W - PAD * 2)) * (days.length - 1)))));
  }

  return (
    <section className="card week">
      <header className="card-head">
        <h2>Daily highs this week</h2>
        <span className="card-meta">Tap a place to hide it</span>
      </header>
      <div className="legend">
        {cities.map((c) => (
          <button key={c.id} className={`legend-chip ${hidden.includes(c.id) ? "is-off" : ""}`} onClick={() => setHidden((h) => (h.includes(c.id) ? h.filter((x) => x !== c.id) : [...h, c.id]))}>
            <i style={{ background: color(c) }} />
            {c.name}
          </button>
        ))}
      </div>
      <div ref={ref} className="week-plot" onPointerMove={move} onPointerLeave={() => setHover(null)}>
        {W > 0 && (
          <svg width={W} height={H}>
            {[0, 1, 2, 3].map((k) => {
              const t = Math.round(min + ((max - min) * k) / 3);
              return (
                <g key={k}>
                  <line x1={PAD} x2={W - PAD} y1={y(t)} y2={y(t)} className="gridline" />
                  <text x={PAD - 10} y={y(t) + 4} className="axis axis-y">{format(t)}</text>
                </g>
              );
            })}
            {days.map((d, i) => (
              <text key={d} x={x(i)} y={H - 10} className={`axis ${hover === i ? "is-hover" : ""}`}>{d}</text>
            ))}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={TOP - 6} y2={H - BOTTOM + 6} className="week-cursor" />}
            {shown.map((c) => {
              const pts = c.days.map((d, i) => [x(i), y(d.high)] as [number, number]);
              return (
                <g key={c.id}>
                  <path d={smooth(pts)} pathLength={1} fill="none" stroke={color(c)} strokeWidth="2.5" strokeLinecap="round" className="week-line" />
                  {pts.map(([px, py], i) => (
                    <circle key={i} cx={px} cy={py} r={hover === i ? 5 : 3} fill={hover === i ? color(c) : "var(--bg-2)"} stroke={color(c)} strokeWidth="2" className="week-dot" />
                  ))}
                </g>
              );
            })}
          </svg>
        )}
        {hover !== null && W > 0 && (
          <div className="week-tip" style={{ left: Math.min(W - 110, Math.max(110, x(hover))) }}>
            <b>{days[hover]}</b>
            {[...shown]
              .sort((a, b) => b.days[hover].high - a.days[hover].high)
              .map((c) => (
                <span key={c.id}>
                  <i style={{ background: color(c) }} />
                  {c.name}
                  <em>{format(c.days[hover].high)}</em>
                </span>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}

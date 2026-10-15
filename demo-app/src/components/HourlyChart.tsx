import { isNightAt, type City } from "../data";
import { smooth, useFormat, useWidth } from "../lib";
import { WeatherIcon } from "./Icon";

type Props = { city: City; selected: number; onSelect: (i: number) => void };

const H = 150;
const TOP = 34;
const BOTTOM = 36;
const PAD = 22;

export function HourlyChart({ city, selected, onSelect }: Props) {
  const format = useFormat();
  const hours = city.hours;
  const [ref, W] = useWidth<HTMLDivElement>();
  const temps = hours.map((h) => h.temp);
  const min = Math.min(...temps) - 1;
  const max = Math.max(...temps) + 1;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (hours.length - 1);
  const y = (t: number) => TOP + (1 - (t - min) / (max - min)) * (H - TOP - BOTTOM);
  const line = smooth(hours.map((h, i) => [x(i), y(h.temp)]));
  const sel = hours[selected];

  function scrub(e: React.PointerEvent) {
    if (!W) return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - PAD) / (W - PAD * 2)) * (hours.length - 1));
    const next = Math.min(hours.length - 1, Math.max(0, i));
    if (next !== selected) onSelect(next);
  }

  return (
    <section className="card hourly">
      <header className="card-head">
        <h2>Next 12 hours</h2>
        <span className="card-meta">Hover the chart to scrub</span>
      </header>
      <div ref={ref} className="hourly-plot" onPointerMove={scrub} onPointerDown={scrub}>
        {W > 0 && (
          <>
            <svg width={W} height={H} className="hourly-chart">
              <defs>
                <linearGradient id="hourly-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--sun)" stopOpacity=".38" />
                  <stop offset="1" stopColor="var(--sun)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="hourly-stroke" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="var(--sun)" />
                  <stop offset=".6" stopColor="var(--warm)" />
                  <stop offset="1" stopColor="var(--sky)" />
                </linearGradient>
              </defs>
              {hours.map((h, i) => {
                const bh = (h.rain / 100) * 28;
                return <rect key={`r${h.time}`} className="hourly-rain" x={x(i) - 5} y={H - bh} width={10} height={bh} rx={3} style={{ animationDelay: `${300 + i * 40}ms` }} />;
              })}
              <path d={`${line} L${x(hours.length - 1)} ${H - BOTTOM + 10} L${x(0)} ${H - BOTTOM + 10} Z`} fill="url(#hourly-fill)" className="hourly-area" />
              <line x1={x(selected)} x2={x(selected)} y1={8} y2={H} className="hourly-cursor" />
              <path d={line} pathLength={1} fill="none" stroke="url(#hourly-stroke)" strokeWidth="3" strokeLinecap="round" className="hourly-line" />
              {hours.map((h, i) => (
                <circle key={h.time} className="hourly-dot" cx={x(i)} cy={y(h.temp)} r={3} />
              ))}
              <circle className="hourly-sel" cx={x(selected)} cy={y(sel.temp)} r={6} />
            </svg>
            <div className="hourly-tip" style={{ left: Math.min(W - 70, Math.max(70, x(selected))), top: y(sel.temp) }}>
              <WeatherIcon condition={sel.condition} night={isNightAt(city, sel.time)} size={20} />
              <b>{format(sel.temp)}</b>
              <span>{selected === 0 ? "Now" : sel.time}</span>
              <span className="tip-rain">{sel.rain}%</span>
            </div>
          </>
        )}
      </div>
      <ol className="hours">
        {hours.map((h, i) => (
          <li key={h.time}>
            <button className={`hour ${i === selected ? "is-active" : ""}`} onClick={() => onSelect(i)}>
              <span className="h-time">{i === 0 ? "Now" : h.time}</span>
              <WeatherIcon condition={h.condition} night={isNightAt(city, h.time)} size={22} />
              <span className="h-temp">{format(h.temp)}</span>
              <span className="h-rain">{h.rain}%</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

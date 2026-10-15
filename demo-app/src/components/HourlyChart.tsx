import type { Hour } from "../data";
import { WeatherIcon } from "./Icon";

type Props = { hours: Hour[]; selected: number; onSelect: (i: number) => void; format: (c: number) => string };

const W = 720;
const H = 120;
const PAD = 24;

export function HourlyChart({ hours, selected, onSelect, format }: Props) {
  const temps = hours.map((h) => h.temp);
  const min = Math.min(...temps) - 1;
  const max = Math.max(...temps) + 1;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (hours.length - 1);
  const y = (t: number) => H - PAD - ((t - min) / (max - min)) * (H - PAD * 2);
  const line = hours.map((h, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(h.temp).toFixed(1)}`).join(" ");
  const sel = hours[selected];

  return (
    <section className="card hourly">
      <header className="card-head">
        <h2>Next 12 hours</h2>
        <span className="card-meta">Tap an hour for details</span>
      </header>
      <div className="hourly-plot">
        <svg viewBox={`0 0 ${W} ${H}`} className="hourly-chart" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hourly-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--sun)" stopOpacity=".35" />
              <stop offset="1" stopColor="var(--sun)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${x(hours.length - 1)} ${H} L${x(0)} ${H} Z`} fill="url(#hourly-fill)" />
          <line x1={x(selected)} x2={x(selected)} y1={0} y2={H} className="hourly-cursor" />
          <path d={line} fill="none" stroke="var(--sun)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hourly-line" />
          {hours.map((h, i) => (
            <circle key={h.time} cx={x(i)} cy={y(h.temp)} r={i === selected ? 6 : 3} fill={i === selected ? "var(--sun)" : "var(--bg-2)"} stroke="var(--sun)" strokeWidth="2" />
          ))}
        </svg>
        <div className="hourly-tip" style={{ left: `${Math.min(92, Math.max(8, (x(selected) / W) * 100))}%`, top: `${(y(sel.temp) / H) * 100}%` }}>
          <b>{format(sel.temp)}</b>
          <span>{sel.rain}% rain</span>
        </div>
      </div>
      <ol className="hours">
        {hours.map((h, i) => (
          <li key={h.time}>
            <button className={`hour ${i === selected ? "is-active" : ""}`} onClick={() => onSelect(i)}>
              <span className="h-time">{i === 0 ? "Now" : h.time}</span>
              <WeatherIcon condition={h.condition} size={22} />
              <span className="h-temp">{format(h.temp)}</span>
              <span className="h-rain">{h.rain}%</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

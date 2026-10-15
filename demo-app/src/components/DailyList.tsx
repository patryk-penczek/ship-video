import type { Day } from "../data";
import { Glyph, WeatherIcon } from "./Icon";

type Props = { days: Day[]; open: number | null; onToggle: (i: number) => void; format: (c: number) => string };

const ADVICE: Record<Day["condition"], string> = {
  sun: "Sunglasses weather. UV peaks around 14:00.",
  partly: "Mostly bright with a few clouds by the afternoon.",
  cloud: "Grey but dry. A light jacket will do.",
  rain: "Showers on and off. Take an umbrella.",
  storm: "Stay in if you can. Storms through the afternoon.",
};

export function DailyList({ days, open, onToggle, format }: Props) {
  const lo = Math.min(...days.map((d) => d.low));
  const hi = Math.max(...days.map((d) => d.high));
  const pct = (t: number) => ((t - lo) / (hi - lo)) * 100;

  return (
    <section className="card daily">
      <header className="card-head">
        <h2>7-day forecast</h2>
      </header>
      <ul className="days">
        {days.map((d, i) => (
          <li key={d.day} className={`day-row ${open === i ? "is-open" : ""}`}>
            <button className="day" onClick={() => onToggle(i)} aria-expanded={open === i}>
              <span className="d-name">{d.day}</span>
              <WeatherIcon condition={d.condition} size={24} />
              <span className={`d-rain ${d.rain >= 50 ? "is-wet" : ""}`}>
                {d.rain > 0 && (
                  <>
                    <Glyph name="drop" size={12} />
                    {d.rain}%
                  </>
                )}
              </span>
              <span className="d-low">{format(d.low)}</span>
              <span className="d-bar">
                <i style={{ left: `${pct(d.low)}%`, right: `${100 - pct(d.high)}%` }} />
              </span>
              <span className="d-high">{format(d.high)}</span>
              <Glyph name="chevron" size={14} className="d-chev" />
            </button>
            {open === i && (
              <div className="day-detail">
                <p>{ADVICE[d.condition]}</p>
                <dl>
                  <div><dt>Low</dt><dd>{format(d.low)}</dd></div>
                  <div><dt>High</dt><dd>{format(d.high)}</dd></div>
                  <div><dt>Rain</dt><dd>{d.rain}%</dd></div>
                </dl>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

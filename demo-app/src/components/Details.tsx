import { MOON, clock, extras, isNight, mins, type ActivityId, type City } from "../data";
import { useTween } from "../lib";
import { Glyph, type GlyphName } from "./Icon";
import { Num } from "./Temp";

const R = 54;
const C = 2 * Math.PI * R;
const ARC = C * 0.75;

export function AirQuality({ city }: { city: City }) {
  const x = extras(city);
  const shown = useTween(x.aqi, { from: 0, ms: 1400 });
  const fill = (Math.min(200, shown) / 200) * ARC;

  return (
    <section className="card aqi">
      <header className="card-head">
        <h2>Air quality</h2>
        <span className="card-meta">US AQI</span>
      </header>
      <div className="aqi-body">
        <svg viewBox="0 0 140 140" className="aqi-gauge">
          <defs>
            <linearGradient id="aqi-grad" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0" stopColor="#4ade80" />
              <stop offset=".45" stopColor="#facc15" />
              <stop offset=".75" stopColor="#fb923c" />
              <stop offset="1" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <circle cx="70" cy="70" r={R} className="aqi-track" strokeDasharray={`${ARC} ${C}`} transform="rotate(135 70 70)" />
          <circle cx="70" cy="70" r={R} className="aqi-fill" stroke="url(#aqi-grad)" strokeDasharray={`${fill} ${C}`} transform="rotate(135 70 70)" />
          <text x="70" y="72" className="aqi-value">{Math.round(shown)}</text>
          <text x="70" y="94" className="aqi-label">{x.aqiLabel}</text>
        </svg>
        <ul className="pollutants">
          {x.pollutants.map((p, i) => (
            <li key={p.name}>
              <span className="p-name">{p.name}</span>
              <span className="p-bar">
                <i style={{ width: `${Math.min(100, (p.value / p.max) * 100)}%`, animationDelay: `${200 + i * 90}ms` }} />
              </span>
              <span className="p-value">{p.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const POINTS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];

export function WindCard({ city }: { city: City }) {
  const x = extras(city);
  const dir = useTween(x.windDir, { from: x.windDir - 90, ms: 1200 });
  const from = POINTS[Math.round(x.windDir / 45) % 8];

  return (
    <section className="card wind">
      <header className="card-head">
        <h2>Wind</h2>
        <span className="card-meta">{x.beaufort}</span>
      </header>
      <div className="wind-body">
        <svg viewBox="0 0 150 150" className="compass">
          <circle cx="75" cy="75" r="66" className="compass-ring" />
          {Array.from({ length: 72 }, (_, i) => (
            <line key={i} x1="75" y1="11" x2="75" y2={i % 9 === 0 ? 19 : 15} className={i % 9 === 0 ? "tick-major" : "tick"} transform={`rotate(${i * 5} 75 75)`} />
          ))}
          {["N", "E", "S", "W"].map((l, i) => {
            const a = (i * Math.PI) / 2;
            return (
              <text key={l} x={75 + Math.sin(a) * 46} y={75 - Math.cos(a) * 46 + 4} className={`compass-letter ${l === "N" ? "is-north" : ""}`}>
                {l}
              </text>
            );
          })}
          <g transform={`rotate(${dir + 180} 75 75)`}>
            <g className="compass-sway">
              <path d="M75 14 L83 34 L75 29 L67 34 Z" className="compass-head" />
              <line x1="75" y1="30" x2="75" y2="124" className="compass-shaft" />
              <circle cx="75" cy="128" r="4" className="compass-tail" />
            </g>
          </g>
          <circle cx="75" cy="75" r="24" className="compass-hub" />
          <text x="75" y="79" className="compass-speed">{city.wind}</text>
          <text x="75" y="92" className="compass-unit">km/h</text>
        </svg>
        <dl className="wind-facts">
          <div>
            <dt>From</dt>
            <dd>{from[0].toUpperCase() + from.slice(1)}</dd>
          </div>
          <div>
            <dt>Gusts</dt>
            <dd>
              <Num value={x.gust} from={0} suffix=" km/h" />
            </dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>{x.windDir}°</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

const fmtDuration = (m: number) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, "0")}m`;

export function SunCard({ city }: { city: City }) {
  const now = mins(clock(city));
  const rise = mins(city.sunrise);
  const set = mins(city.sunset);
  const night = isNight(city);
  const progress = night ? (now < rise ? 0 : 1) : (now - rise) / (set - rise);
  const p = useTween(progress, { from: 0, ms: 1800 });
  const pt = (q: number) => [130 - 110 * Math.cos(Math.PI * q), 112 - 92 * Math.sin(Math.PI * q)] as const;
  const [sx, sy] = pt(p);
  const untilRise = now < rise ? rise - now : 24 * 60 - now + rise;

  return (
    <section className="card sun">
      <header className="card-head">
        <h2>Sun & moon</h2>
        <span className="card-meta">{night ? `Sunrise in ${fmtDuration(untilRise)}` : `${fmtDuration(set - now)} of daylight left`}</span>
      </header>
      <svg viewBox="0 0 260 132" className="sun-arc">
        <defs>
          <linearGradient id="sun-grad" x1="0" x2="1">
            <stop offset="0" stopColor="var(--warm)" />
            <stop offset="1" stopColor="var(--sun)" />
          </linearGradient>
          <radialGradient id="sun-glow">
            <stop offset="0" stopColor="var(--sun)" stopOpacity=".7" />
            <stop offset="1" stopColor="var(--sun)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <line x1="6" x2="254" y1="112" y2="112" className="horizon" />
        <path d="M20 112 A110 92 0 0 1 240 112" className="arc-track" />
        {p > 0.002 && <path d={`M20 112 A110 92 0 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)}`} className="arc-done" />}
        {!night && (
          <>
            <circle cx={sx} cy={sy} r="22" fill="url(#sun-glow)" />
            <circle cx={sx} cy={sy} r="8" className="sun-dot" />
          </>
        )}
        <text x="20" y="128" className="arc-label">{city.sunrise}</text>
        <text x="240" y="128" className="arc-label">{city.sunset}</text>
      </svg>
      <div className="moon-row">
        <span className="moon-disc" style={{ "--lit": `${MOON.illumination}%` } as React.CSSProperties} />
        <span>
          <b>{MOON.name}</b>
          <small>{MOON.illumination}% illuminated</small>
        </span>
      </div>
    </section>
  );
}

const ACT_ICON: Record<ActivityId, GlyphName> = { run: "run", cycle: "bike", picnic: "basket", stargaze: "star" };

export function Activities({ city }: { city: City }) {
  const x = extras(city);
  const best = x.activities.reduce((b, a) => (a.score > b.score ? a : b));
  return (
    <section className="card activities">
      <header className="card-head">
        <h2>
          <Glyph name="sparkle" size={16} className="sparkle" /> Best time to…
        </h2>
        <span className="card-meta">Planned from the 7-day forecast</span>
      </header>
      <div className="act-grid">
        {x.activities.map((a) => (
          <div key={a.id} className={`act ${a === best ? "is-best" : ""}`}>
            <span className="act-icon">
              <Glyph name={ACT_ICON[a.id]} size={20} />
            </span>
            <div className="act-name">
              {a.name}
              {a === best && <em>Top pick</em>}
            </div>
            <div className="act-when">
              {a.day} · {a.time}
            </div>
            <div className="act-score">
              <span className="act-bar">
                <i style={{ width: `${a.score}%` }} />
              </span>
              <Num value={a.score} from={0} />
            </div>
            <div className="act-note">{a.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

import type { City } from "../data";
import { Glyph, WeatherIcon } from "./Icon";

type Props = { city: City; format: (c: number) => string };

export function CurrentCard({ city, format }: Props) {
  return (
    <section className="current">
      <div className="current-top">
        <div>
          <div className="current-place">
            <Glyph name="pin" size={16} />
            {city.name}, {city.country}
          </div>
          <div className="current-temp">{format(city.temp)}</div>
          <div className="current-summary">{city.summary}</div>
          <div className="current-range">
            H {format(city.high)} · L {format(city.low)} · Feels like {format(city.feelsLike)}
          </div>
        </div>
        <WeatherIcon condition={city.condition} size={168} className="current-icon" />
      </div>

      <div className="stats">
        <Stat icon="wind" label="Wind" value={`${city.wind} km/h`} />
        <Stat icon="drop" label="Humidity" value={`${city.humidity}%`} />
        <Stat icon="uv" label="UV index" value={String(city.uv)} />
        <Stat icon="sunrise" label="Sunrise" value={city.sunrise} sub={`Sunset ${city.sunset}`} />
      </div>
    </section>
  );
}

function Stat({ icon, label, value, sub }: { icon: "wind" | "drop" | "uv" | "sunrise"; label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">
        <Glyph name={icon} size={16} />
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

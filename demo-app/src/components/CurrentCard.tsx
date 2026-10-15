import { extras, isNight, type City } from "../data";
import { useFormat } from "../lib";
import { Glyph, WeatherIcon, type GlyphName } from "./Icon";
import { Num, Temp } from "./Temp";

const UV_LABEL = ["Low", "Low", "Low", "Moderate", "Moderate", "Moderate", "High", "High", "Very high", "Very high", "Very high", "Extreme"];

export function CurrentCard({ city }: { city: City }) {
  const format = useFormat();
  const x = extras(city);
  const night = isNight(city);

  return (
    <section className="current">
      <div className="current-top">
        <div className="current-info">
          <div className="current-place">
            <Glyph name="pin" size={16} />
            {city.name}, {city.country}
            <span className="current-clock">{city.localTime}</span>
          </div>
          <Temp c={city.temp} from={0} className="current-temp" />
          <div className="current-summary">{city.summary}</div>
          <div className="current-range">
            H {format(city.high)} · L {format(city.low)} · Feels like {format(city.feelsLike)}
          </div>
        </div>
        <div className="current-art">
          <WeatherIcon condition={city.condition} night={night} size={188} className="current-icon" />
        </div>
      </div>

      <div className="stats">
        <Stat icon="drop" label="Humidity" sub={`Dew point ${format(x.dewPoint)}`} meter={city.humidity / 100}>
          <Num value={city.humidity} from={0} suffix="%" />
        </Stat>
        <Stat icon="uv" label="UV index" sub={UV_LABEL[Math.min(11, city.uv)]} meter={city.uv / 11} dot>
          <Num value={city.uv} from={0} />
        </Stat>
        <Stat icon="gauge" label="Pressure" sub={x.pressure < 1008 ? "Falling" : "Steady"} meter={(x.pressure - 980) / 60} dot>
          <Num value={x.pressure} from={980} suffix=" hPa" />
        </Stat>
        <Stat icon="eye" label="Visibility" sub={x.visibility > 15 ? "Crystal clear" : x.visibility > 8 ? "Good" : "Hazy"} meter={x.visibility / 30}>
          <Num value={x.visibility} from={0} suffix=" km" />
        </Stat>
      </div>
    </section>
  );
}

function Stat({ icon, label, sub, meter, dot, children }: { icon: GlyphName; label: string; sub: string; meter: number; dot?: boolean; children: React.ReactNode }) {
  const pct = `${Math.round(Math.min(1, Math.max(0, meter)) * 100)}%`;
  return (
    <div className="stat">
      <div className="stat-label">
        <Glyph name={icon} size={16} />
        {label}
      </div>
      <div className="stat-value">{children}</div>
      <div className={`meter ${dot ? "meter-dot" : ""}`}>{dot ? <i style={{ left: pct }} /> : <i style={{ width: pct }} />}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

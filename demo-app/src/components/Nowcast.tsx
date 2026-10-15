import { extras, type City } from "../data";
import { useWidth } from "../lib";
import { Glyph } from "./Icon";

const H = 64;

export function Nowcast({ city }: { city: City }) {
  const x = extras(city);
  const [ref, w] = useWidth<HTMLDivElement>();
  const bw = w / x.nowcast.length;
  const wet = x.nowcast.some((v) => v > 0);

  return (
    <section className={`card nowcast ${wet ? "is-wet" : ""}`}>
      <header className="card-head">
        <h2 className="nowcast-title">
          <span className="nowcast-icon">
            <Glyph name="drop" size={16} />
          </span>
          {x.nowcastText}
        </h2>
        <span className="card-meta">Next 60 minutes</span>
      </header>
      <div ref={ref} className="nowcast-plot">
        {w > 0 && (
          <svg width={w} height={H}>
            <defs>
              <linearGradient id="nc-fill" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={H} y2="0">
                <stop offset="0" stopColor="var(--sky)" />
                <stop offset=".55" stopColor="var(--rain)" />
                <stop offset="1" stopColor="#b57bff" />
              </linearGradient>
            </defs>
            {x.nowcast.map((v, i) => {
              const bh = Math.max(3, v * H);
              return (
                <rect
                  key={i}
                  className="nc-bar"
                  x={i * bw + 1}
                  y={H - bh}
                  width={Math.max(1, bw - 2.5)}
                  height={bh}
                  rx={Math.min(2.5, (bw - 2.5) / 2)}
                  fill={v ? "url(#nc-fill)" : "var(--border-strong)"}
                  style={{ animationDelay: `${i * 6}ms` }}
                />
              );
            })}
          </svg>
        )}
      </div>
      <div className="nowcast-ticks">
        <span>Now</span>
        <span>15 min</span>
        <span>30 min</span>
        <span>45 min</span>
        <span>60 min</span>
      </div>
    </section>
  );
}

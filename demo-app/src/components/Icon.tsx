import type { Condition } from "../data";

type Props = { size?: number; className?: string };

const s = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const cloudPath = "M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.2 4.4 4.4 0 0 0 7 18Z";

export function WeatherIcon({ condition, size = 24, className }: Props & { condition: Condition }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`wx wx-${condition} ${className ?? ""}`} aria-hidden>
      {condition === "sun" && (
        <g stroke="var(--sun)" {...s}>
          <circle cx="12" cy="12" r="4.2" style={{ fill: "var(--sun)" }} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M12 2.8v2.2" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
      )}
      {condition === "partly" && (
        <>
          <g stroke="var(--sun)" {...s}>
            <circle cx="9" cy="8.5" r="3.4" style={{ fill: "var(--sun)" }} />
            {[0, 60, 120, 300].map((a) => (
              <path key={a} d="M9 2.2v1.6" transform={`rotate(${a} 9 8.5)`} />
            ))}
          </g>
          <path d={cloudPath} transform="translate(1.5 1.5) scale(.92)" {...s} fill="#c9d3f0" stroke="#c9d3f0" />
        </>
      )}
      {condition === "cloud" && <path d={cloudPath} {...s} fill="#aab6da" stroke="#aab6da" />}
      {(condition === "rain" || condition === "storm") && (
        <>
          <path d={cloudPath} transform="translate(0 -3)" {...s} fill="#8f9bc7" stroke="#8f9bc7" />
          {condition === "rain" ? (
            <g stroke="var(--rain)" {...s} strokeWidth={2}>
              <path d="M8 18.5l-1 2.5" />
              <path d="M12 18.5l-1 2.5" />
              <path d="M16 18.5l-1 2.5" />
            </g>
          ) : (
            <path d="M12.5 15.5l-2.5 4h3l-2 4" stroke="var(--sun)" {...s} strokeWidth={2} />
          )}
        </>
      )}
    </svg>
  );
}

const glyphs = {
  wind: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7" />,
  drop: <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" />,
  uv: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  sunrise: <path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 4v5M9 7l3-3 3 3" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  warning: <path d="M12 4 2.8 19.5h18.4L12 4ZM12 10v4.5M12 17.2v.1" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
} as const;

export function Glyph({ name, size = 18, className }: Props & { name: keyof typeof glyphs }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} stroke="currentColor" {...s} aria-hidden>
      {glyphs[name]}
    </svg>
  );
}

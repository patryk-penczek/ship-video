import type { Condition } from "../data";

type Props = { size?: number; className?: string };

const s = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const cloudPath = "M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.2 4.4 4.4 0 0 0 7 18Z";
const moonPath = "M18.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 9 10Z";

export function WeatherIcon({ condition, night = false, size = 24, className }: Props & { condition: Condition; night?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`wx ${className ?? ""}`} aria-hidden>
      {condition === "sun" && !night && (
        <g stroke="var(--sun)" {...s}>
          <circle cx="12" cy="12" r="4.2" style={{ fill: "var(--sun)" }} />
          <g>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <path key={a} d="M12 2.8v2.2" transform={`rotate(${a} 12 12)`} />
            ))}
          </g>
        </g>
      )}
      {condition === "sun" && night && (
        <>
          <path d={moonPath} {...s} fill="var(--moon)" stroke="var(--moon)" />
          <circle cx="19" cy="4.5" r=".9" fill="var(--moon)" />
          <circle cx="21.2" cy="9.4" r=".6" fill="var(--moon)" />
        </>
      )}
      {condition === "partly" && (
        <>
          {night ? (
            <path d={moonPath} transform="translate(2 1) scale(.55)" {...s} fill="var(--moon)" stroke="var(--moon)" />
          ) : (
            <g stroke="var(--sun)" {...s}>
              <circle cx="9" cy="8.5" r="3.4" style={{ fill: "var(--sun)" }} />
              <g>
                {[0, 60, 120, 300].map((a) => (
                  <path key={a} d="M9 2.2v1.6" transform={`rotate(${a} 9 8.5)`} />
                ))}
              </g>
            </g>
          )}
          <path d={cloudPath} transform="translate(1.5 1.5) scale(.92)" {...s} fill="var(--cloud-1)" stroke="var(--cloud-1)" />
        </>
      )}
      {condition === "cloud" && (
        <>
          <path d={cloudPath} transform="translate(-3 -3.5) scale(.7)" {...s} fill="var(--cloud-3)" stroke="var(--cloud-3)" />
          <path d={cloudPath} {...s} fill="var(--cloud-2)" stroke="var(--cloud-2)" />
        </>
      )}
      {(condition === "rain" || condition === "storm") && (
        <>
          <path d={cloudPath} transform="translate(0 -3)" {...s} fill="var(--cloud-3)" stroke="var(--cloud-3)" />
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
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  radar: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12l6-6" />
    </>
  ),
  chart: <path d="M4 19h16M6 15l4-5 3 3 5-7" />,
  play: <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" />,
  pause: <path d="M8.5 5v14M15.5 5v14" strokeWidth={3} />,
  undo: <path d="M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  gauge: <path d="M4 17a8 8 0 1 1 16 0M12 17l4-5" />,
  thermo: <path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z" />,
  sparkle: <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7ZM19 15.5c.3 1.8 1 2.5 2.5 2.8-1.5.3-2.2 1-2.5 2.7-.3-1.7-1-2.4-2.5-2.7 1.5-.3 2.2-1 2.5-2.8Z" />,
  run: (
    <>
      <circle cx="14.5" cy="4.5" r="1.8" />
      <path d="M7 21l3.2-5.5 3 2.5v4M5.5 11.5 9 8.5l4.5 1 2 3H19M10.2 15.5l2.6-6" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16l3.5-7h6L18 16M9.5 9l3.5 7H6M14 6h2.5" />
    </>
  ),
  basket: <path d="M4 10h16l-1.6 9H5.6L4 10ZM8 10l3-5M16 10l-3-5M9 13v3M12 13v3M15 13v3" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
} as const;

export type GlyphName = keyof typeof glyphs;

export function Glyph({ name, size = 18, className }: Props & { name: GlyphName }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} stroke="currentColor" {...s} aria-hidden>
      {glyphs[name]}
    </svg>
  );
}

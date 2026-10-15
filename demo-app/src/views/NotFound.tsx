import { useEffect, useRef, useState } from "react";
import type { Condition } from "../data";
import { Glyph, WeatherIcon } from "../components/Icon";

type Props = { path: string; onHome: () => void };

export function NotFound({ path, onHome }: Props) {
  return (
    <>
      <section className="current nf-hero">
        <div className="nf-code" aria-label="404">
          <span>4</span>
          <WeatherIcon condition="partly" size={128} className="nf-icon" />
          <span>4</span>
        </div>
        <h1>This page blew away</h1>
        <p>
          Forecast for <code>{path}</code>: 100% chance of nothing.
        </p>
        <button className="nf-home" onClick={onHome}>
          <Glyph name="arrow" size={16} />
          Back to the forecast
        </button>
      </section>

      <WeatherPairs />
    </>
  );
}

type Face = { id: string; label: string; condition: Condition; night?: boolean };
type Card = { key: number; face: Face };

const FACES: Face[] = [
  { id: "sun", label: "Sunny", condition: "sun" },
  { id: "partly", label: "Partly cloudy", condition: "partly" },
  { id: "cloud", label: "Overcast", condition: "cloud" },
  { id: "rain", label: "Rain", condition: "rain" },
  { id: "storm", label: "Storm", condition: "storm" },
  { id: "night", label: "Clear night", condition: "sun", night: true },
];

const deal = (): Card[] =>
  [...FACES, ...FACES]
    .map((face) => ({ face, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(({ face }, key) => ({ key, face }));

function readBest() {
  try {
    return Number(localStorage.getItem("breeze-404-best")) || null;
  } catch {
    return null;
  }
}

function saveBest(n: number) {
  try {
    localStorage.setItem("breeze-404-best", String(n));
  } catch {}
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function WeatherPairs() {
  const [cards, setCards] = useState(deal);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [best, setBest] = useState(readBest);
  const flipBack = useRef(0);
  const won = matched.length === FACES.length;

  useEffect(() => () => clearTimeout(flipBack.current), []);

  useEffect(() => {
    if (!started || won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, won]);

  useEffect(() => {
    if (!won) return;
    if (best === null || moves < best) {
      setBest(moves);
      saveBest(moves);
    }
  }, [won]);

  function flip(i: number) {
    if (open.length === 2 || open.includes(i) || matched.includes(cards[i].face.id)) return;
    setStarted(true);
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next.map((k) => cards[k].face.id);
    if (a === b) {
      setMatched((m) => [...m, a]);
      setOpen([]);
    } else {
      flipBack.current = window.setTimeout(() => setOpen([]), 800);
    }
  }

  function restart() {
    clearTimeout(flipBack.current);
    setCards(deal());
    setOpen([]);
    setMatched([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
  }

  return (
    <section className="card nf-game">
      <header className="card-head">
        <h2>Match the weather while you're here</h2>
        <div className="nf-score">
          <span>
            Moves <b>{moves}</b>
          </span>
          <span>
            Time <b>{fmtTime(seconds)}</b>
          </span>
          <span>
            Best <b>{best ?? "–"}</b>
          </span>
          <button className="nf-restart" onClick={restart} aria-label="New game">
            <Glyph name="refresh" size={14} />
          </button>
        </div>
      </header>
      <div className="pairs">
        {cards.map((c, i) => {
          const done = matched.includes(c.face.id);
          const up = done || open.includes(i);
          return (
            <button key={c.key} className={`pair ${up ? "is-up" : ""} ${done ? "is-done" : ""}`} onClick={() => flip(i)} aria-label={up ? c.face.label : "Hidden card"}>
              <span className="pair-inner">
                <span className="pair-back">
                  <span className="brand-mark" />
                </span>
                <span className="pair-front">
                  <WeatherIcon condition={c.face.condition} night={c.face.night} size={52} />
                  <small>{c.face.label}</small>
                </span>
              </span>
            </button>
          );
        })}
        {won && (
          <div className="nf-overlay">
            <strong>Clear skies!</strong>
            <span>
              {moves} moves · {fmtTime(seconds)}
            </span>
            <button className="nf-play" onClick={restart}>
              <Glyph name="refresh" size={14} />
              Play again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

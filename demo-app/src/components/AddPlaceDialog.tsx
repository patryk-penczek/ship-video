import { useEffect, useRef, useState } from "react";
import type { City } from "../data";
import { Glyph, WeatherIcon } from "./Icon";

type Props = {
  places: City[];
  format: (c: number) => string;
  onAdd: (city: City) => void;
  onClose: () => void;
};

export function AddPlaceDialog({ places, format, onAdd, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const results = places.filter((c) => !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q));

  useEffect(() => input.current?.focus(), []);
  useEffect(() => setActive(0), [query]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) onAdd(results[active]);
  }

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-label="Add a place" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <label className="dialog-search">
          <Glyph name="search" />
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for a city" />
          <kbd>esc</kbd>
        </label>
        <ul className="results">
          {results.map((c, i) => (
            <li key={c.id}>
              <button className={`result ${i === active ? "is-active" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => onAdd(c)}>
                <WeatherIcon condition={c.condition} size={28} />
                <span className="result-main">
                  <span className="result-name">{c.name}</span>
                  <span className="result-meta">{c.country} · {c.summary}</span>
                </span>
                <span className="result-temp">{format(c.temp)}</span>
                <span className="result-add"><Glyph name="plus" size={14} />Add</span>
              </button>
            </li>
          ))}
          {!results.length && <li className="empty">{places.length ? `No cities match “${query}”` : "You've added every city"}</li>}
        </ul>
        <footer className="dialog-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
          <span><kbd>↵</kbd> to add</span>
        </footer>
      </div>
    </div>
  );
}

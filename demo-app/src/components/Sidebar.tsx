import { useState } from "react";
import { isNight, type City } from "../data";
import { Glyph, WeatherIcon } from "./Icon";
import { Temp } from "./Temp";

type Props = {
  cities: City[];
  selected: string;
  onSelect: (id: string) => void;
  onOpenPalette: () => void;
  onRemove: (id: string) => void;
  onHome: () => void;
};

export function Sidebar({ cities, selected, onSelect, onOpenPalette, onRemove, onHome }: Props) {
  const [query, setQuery] = useState("");
  const [leaving, setLeaving] = useState<string[]>([]);
  const shown = cities.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  function remove(id: string) {
    setLeaving((l) => [...l, id]);
    setTimeout(() => {
      setLeaving((l) => l.filter((x) => x !== id));
      onRemove(id);
    }, 280);
  }

  return (
    <aside className="sidebar">
      <button className="brand" onClick={onHome}>
        <span className="brand-mark" />
        Breeze
      </button>

      <label className="search">
        <Glyph name="search" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter saved places" />
        {query && (
          <button className="search-clear" onClick={() => setQuery("")} aria-label="Clear filter">
            <Glyph name="close" size={14} />
          </button>
        )}
      </label>

      <div className="section-label">
        Saved places <span className="count">{cities.length}</span>
      </div>
      <ul className="city-list">
        {shown.map((c) => (
          <li key={c.id} className={`city-row ${leaving.includes(c.id) ? "is-leaving" : ""}`}>
            <button className={`city ${c.id === selected ? "is-active" : ""}`} onClick={() => onSelect(c.id)}>
              <span className="city-main">
                <span className="city-name">
                  {c.name}
                  {c.alert && <i className="alert-dot" title={c.alert.title} />}
                </span>
                <span className="city-meta">
                  {c.localTime} · {c.summary}
                </span>
              </span>
              <WeatherIcon condition={c.condition} night={isNight(c)} size={28} />
              <Temp c={c.temp} className="city-temp" />
            </button>
            {cities.length > 1 && (
              <button className="city-remove" onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`}>
                <Glyph name="close" size={12} />
              </button>
            )}
          </li>
        ))}
        {!shown.length && <li className="empty">No saved places match “{query}”</li>}
      </ul>

      <button className="add-city" onClick={onOpenPalette}>
        <Glyph name="plus" size={16} />
        Add a place
        <kbd>⌘K</kbd>
      </button>
    </aside>
  );
}

import { useState } from "react";
import type { City } from "../data";
import { Glyph, WeatherIcon } from "./Icon";

type Props = {
  cities: City[];
  selected: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  format: (c: number) => string;
};

export function Sidebar({ cities, selected, onSelect, onAdd, onRemove, format }: Props) {
  const [query, setQuery] = useState("");
  const shown = cities.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" />
        Breeze
      </div>

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
          <li key={c.id} className="city-row">
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
              <WeatherIcon condition={c.condition} size={26} />
              <span className="city-temp">{format(c.temp)}</span>
            </button>
            {cities.length > 1 && (
              <button className="city-remove" onClick={() => onRemove(c.id)} aria-label={`Remove ${c.name}`}>
                <Glyph name="close" size={12} />
              </button>
            )}
          </li>
        ))}
        {!shown.length && <li className="empty">No saved places match “{query}”</li>}
      </ul>

      <button className="add-city" onClick={onAdd}>
        <Glyph name="plus" size={16} />
        Add a place
        <kbd>⌘K</kbd>
      </button>
    </aside>
  );
}

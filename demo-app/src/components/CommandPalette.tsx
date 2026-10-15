import { useEffect, useRef, useState } from "react";
import { isNight, type City } from "../data";
import { useFormat } from "../lib";
import { Glyph, WeatherIcon, type GlyphName } from "./Icon";

export type Command = { id: string; label: string; icon: GlyphName; hint?: string; run: () => void };

type Props = {
  addable: City[];
  saved: City[];
  commands: Command[];
  onAdd: (city: City) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
};

type Item =
  | { kind: "add"; key: string; city: City }
  | { kind: "open"; key: string; city: City }
  | { kind: "command"; key: string; command: Command };

const GROUPS = { add: "Add a place", open: "Saved places", command: "Actions" } as const;

export function CommandPalette({ addable, saved, commands, onAdd, onOpen, onClose }: Props) {
  const format = useFormat();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const q = query.trim().toLowerCase();
  const hit = (...s: string[]) => !q || s.some((x) => x.toLowerCase().includes(q));

  const items: Item[] = [
    ...addable.filter((c) => hit(c.name, c.country)).map((city) => ({ kind: "add" as const, key: `add-${city.id}`, city })),
    ...(q ? saved.filter((c) => hit(c.name, c.country)).map((city) => ({ kind: "open" as const, key: `open-${city.id}`, city })) : []),
    ...commands.filter((c) => hit(c.label)).map((command) => ({ kind: "command" as const, key: command.id, command })),
  ];

  useEffect(() => input.current?.focus(), []);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function run(item: Item | undefined) {
    if (!item) return;
    if (item.kind === "add") onAdd(item.city);
    if (item.kind === "open") onOpen(item.city.id);
    if (item.kind === "command") {
      item.command.run();
      onClose();
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      run(items[active]);
    }
  }

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <label className="dialog-search">
          <Glyph name="search" />
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cities or type a command" />
          <kbd>esc</kbd>
        </label>
        <ul className="results" ref={list}>
          {items.map((item, i) => (
            <li key={item.key}>
              {(i === 0 || items[i - 1].kind !== item.kind) && <div className="group-label">{GROUPS[item.kind]}</div>}
              <button className={`result ${i === active ? "is-active" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => run(item)}>
                {item.kind === "command" ? (
                  <>
                    <span className="result-glyph">
                      <Glyph name={item.command.icon} size={16} />
                    </span>
                    <span className="result-main">
                      <span className="result-name">{item.command.label}</span>
                    </span>
                    {item.command.hint && <kbd>{item.command.hint}</kbd>}
                  </>
                ) : (
                  <>
                    <WeatherIcon condition={item.city.condition} night={isNight(item.city)} size={28} />
                    <span className="result-main">
                      <span className="result-name">{item.city.name}</span>
                      <span className="result-meta">
                        {item.city.country} · {item.city.summary}
                      </span>
                    </span>
                    <span className="result-temp">{format(item.city.temp)}</span>
                    <span className="result-add">
                      <Glyph name={item.kind === "add" ? "plus" : "arrow"} size={14} />
                      {item.kind === "add" ? "Add" : "Open"}
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
          {!items.length && <li className="empty">Nothing matches “{query}”</li>}
        </ul>
        <footer className="dialog-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
          <span><kbd>↵</kbd> to run</span>
        </footer>
      </div>
    </div>
  );
}

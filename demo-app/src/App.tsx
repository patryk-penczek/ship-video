import { useEffect, useState } from "react";
import { CITIES, MORE_CITIES, toF, type City } from "./data";
import { Sidebar } from "./components/Sidebar";
import { CurrentCard } from "./components/CurrentCard";
import { HourlyChart } from "./components/HourlyChart";
import { DailyList } from "./components/DailyList";
import { AddPlaceDialog } from "./components/AddPlaceDialog";
import { AlertBanner } from "./components/AlertBanner";
import { Glyph } from "./components/Icon";

type Unit = "c" | "f";
type Theme = "dark" | "light";

export function App() {
  const [saved, setSaved] = useState<City[]>(CITIES);
  const [cityId, setCityId] = useState(CITIES[0].id);
  const [unit, setUnit] = useState<Unit>("c");
  const [theme, setTheme] = useState<Theme>("dark");
  const [adding, setAdding] = useState(false);
  const [hour, setHour] = useState(0);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [updated, setUpdated] = useState("2 min ago");

  const city = saved.find((c) => c.id === cityId) ?? saved[0];
  const format = (c: number) => `${unit === "c" ? c : toF(c)}°`;
  const addable = MORE_CITIES.filter((c) => !saved.some((s) => s.id === c.id));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // ⌘K / Ctrl+K opens "Add a place"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAdding(true);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  function select(id: string) {
    setCityId(id);
    setHour(0);
    setOpenDay(null);
  }

  function add(c: City) {
    setSaved((s) => [...s, c]);
    select(c.id);
    setAdding(false);
  }

  function remove(id: string) {
    const next = saved.filter((c) => c.id !== id);
    if (!next.length) return;
    setSaved(next);
    if (id === city.id) select(next[0].id);
  }

  return (
    <div className="app">
      <Sidebar cities={saved} selected={city.id} onSelect={select} onAdd={() => setAdding(true)} onRemove={remove} format={format} />
      <main className="main">
        <div className="toolbar">
          <button className="updated" onClick={() => setUpdated("just now")}>
            <Glyph name="refresh" size={14} />
            Updated {updated}
          </button>
          <div className="toolbar-right">
            <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              <Glyph name={theme === "dark" ? "moon" : "sun"} size={18} />
            </button>
            <div className="units" role="group" aria-label="Units">
              {(["c", "f"] as const).map((u) => (
                <button key={u} className={`unit ${unit === u ? "is-active" : ""}`} onClick={() => setUnit(u)}>
                  °{u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        {city.alert && !dismissed.includes(city.id) && (
          <AlertBanner {...city.alert} onDismiss={() => setDismissed((d) => [...d, city.id])} />
        )}
        <CurrentCard city={city} format={format} />
        <div className="grid">
          <HourlyChart hours={city.hours} selected={hour} onSelect={setHour} format={format} />
          <DailyList days={city.days} open={openDay} onToggle={(i) => setOpenDay(openDay === i ? null : i)} format={format} />
        </div>
      </main>
      {adding && <AddPlaceDialog places={addable} format={format} onAdd={add} onClose={() => setAdding(false)} />}
    </div>
  );
}

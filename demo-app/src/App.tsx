import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CITIES, MORE_CITIES, isNight, type City } from "./data";
import { UnitContext, type Unit } from "./lib";
import { Sky } from "./components/Sky";
import { Sidebar } from "./components/Sidebar";
import { CurrentCard } from "./components/CurrentCard";
import { Nowcast } from "./components/Nowcast";
import { HourlyChart } from "./components/HourlyChart";
import { DailyList } from "./components/DailyList";
import { Activities, AirQuality, SunCard, WindCard } from "./components/Details";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { AlertBanner } from "./components/AlertBanner";
import { Toasts, type Toast } from "./components/Toasts";
import { ThemeToggle, switchTheme, type Theme } from "./components/ThemeToggle";
import { Glyph, type GlyphName } from "./components/Icon";
import { RadarView } from "./views/RadarView";
import { CompareView } from "./views/CompareView";
import { NotFound } from "./views/NotFound";

type View = "overview" | "radar" | "compare";
const VIEWS: { id: View; label: string; icon: GlyphName }[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "radar", label: "Radar", icon: "radar" },
  { id: "compare", label: "Compare", icon: "chart" },
];
const PATHS: Record<View, string> = { overview: "/", radar: "/radar", compare: "/compare" };
const viewOf = (path: string) => VIEWS.find((v) => PATHS[v.id] === (path.replace(/\/+$/, "") || "/"))?.id ?? null;

export function App() {
  const [saved, setSaved] = useState<City[]>(CITIES);
  const [cityId, setCityId] = useState(CITIES[0].id);
  const [unit, setUnit] = useState<Unit>("c");
  const [theme, setTheme] = useState<Theme>("dark");
  const [path, setPath] = useState(location.pathname);
  const view = viewOf(path);
  const [palette, setPalette] = useState(false);
  const [hour, setHour] = useState(0);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [updated, setUpdated] = useState("2 min ago");
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const city = saved.find((c) => c.id === cityId) ?? saved[0];
  const addable = MORE_CITIES.filter((c) => !saved.some((s) => s.id === c.id));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  function setView(v: View) {
    if (viewOf(location.pathname) !== v) history.pushState(null, "", PATHS[v]);
    setPath(PATHS[v]);
  }

  const closeToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (text: string, action?: Toast["action"]) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, text, action }]);
      setTimeout(() => closeToast(id), 4200);
    },
    [closeToast],
  );

  function select(id: string) {
    setCityId(id);
    setHour(0);
    setOpenDay(null);
    if (!viewOf(location.pathname)) setView("overview");
  }

  function open(id: string) {
    select(id);
    setView("overview");
    setPalette(false);
  }

  function add(c: City) {
    if (saved.some((s) => s.id === c.id)) return open(c.id);
    setSaved((s) => [...s, c]);
    open(c.id);
    toast(`Added ${c.name} to your places`);
  }

  function remove(id: string) {
    const i = saved.findIndex((c) => c.id === id);
    const gone = saved[i];
    const fallback = saved.find((c) => c.id !== id);
    if (!gone || !fallback) return;
    const before = saved[i - 1]?.id;
    const after = saved[i + 1]?.id;
    setSaved((s) => (s.length > 1 ? s.filter((c) => c.id !== id) : s));
    if (id === cityId) select(fallback.id);
    toast(`Removed ${gone.name}`, {
      label: "Undo",
      run: () =>
        setSaved((s) => {
          if (s.some((c) => c.id === id)) return s;
          const prev = s.findIndex((c) => c.id === before);
          const next = s.findIndex((c) => c.id === after);
          const at = prev >= 0 ? prev + 1 : next >= 0 ? next : Math.min(i, s.length);
          return [...s.slice(0, at), gone, ...s.slice(at)];
        }),
    });
  }

  function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setUpdated("just now");
      toast("Forecast updated");
    }, 1100);
  }

  const toggleTheme = () => switchTheme(theme === "dark" ? "light" : "dark", setTheme);
  const toggleUnit = () => setUnit(unit === "c" ? "f" : "c");

  const commands: Command[] = [
    { id: "overview", label: "Show overview", icon: "grid", hint: "1", run: () => setView("overview") },
    { id: "radar", label: "Open rain radar", icon: "radar", hint: "2", run: () => setView("radar") },
    { id: "compare", label: "Compare places", icon: "chart", hint: "3", run: () => setView("compare") },
    { id: "theme", label: `Switch to ${theme === "dark" ? "light" : "dark"} theme`, icon: theme === "dark" ? "sun" : "moon", hint: "T", run: toggleTheme },
    { id: "unit", label: `Show temperatures in °${unit === "c" ? "F" : "C"}`, icon: "thermo", hint: "U", run: toggleUnit },
    { id: "refresh", label: "Refresh forecast", icon: "refresh", hint: "R", run: refresh },
  ];

  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    onKey.current = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (palette || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      const k = e.key.toLowerCase();
      if (k === "1" || k === "2" || k === "3") setView(VIEWS[Number(k) - 1].id);
      if (k === "t") toggleTheme();
      if (k === "u") toggleUnit();
      if (k === "r") refresh();
      if (k === "j" || k === "k") {
        const i = saved.indexOf(city) + (k === "j" ? 1 : -1);
        select(saved[(i + saved.length) % saved.length].id);
      }
    };
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey.current(e);
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, []);

  const viewIndex = VIEWS.findIndex((v) => v.id === view);

  return (
    <UnitContext.Provider value={unit}>
      <div className="app">
        <Sky condition={city.condition} night={isNight(city)} />
        <Sidebar cities={saved} selected={city.id} onSelect={select} onOpenPalette={() => setPalette(true)} onRemove={remove} onHome={() => setView("overview")} />
        <main className="main">
          <div className="toolbar">
            <nav className={`tabs ${view ? "" : "is-none"}`} style={{ "--i": Math.max(0, viewIndex) } as React.CSSProperties}>
              <i className="tabs-thumb" />
              {VIEWS.map((v) => (
                <button key={v.id} className={`tab ${view === v.id ? "is-active" : ""}`} onClick={() => setView(v.id)}>
                  <Glyph name={v.icon} size={15} />
                  {v.label}
                </button>
              ))}
            </nav>
            <div className="toolbar-right">
              <button className={`updated ${refreshing ? "is-spinning" : ""}`} onClick={refresh}>
                <Glyph name="refresh" size={14} />
                <span className="updated-text">{refreshing ? "Updating…" : `Updated ${updated}`}</span>
              </button>
              <ThemeToggle theme={theme} onChange={setTheme} />
              <div className={`units is-${unit}`} role="group" aria-label="Units">
                <i className="units-thumb" />
                {(["c", "f"] as const).map((u) => (
                  <button key={u} className={`unit ${unit === u ? "is-active" : ""}`} onClick={() => setUnit(u)}>
                    °{u.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {view === "overview" && (
            <div className="view" key={`overview-${city.id}`}>
              {city.alert && !dismissed.includes(city.id) && <AlertBanner {...city.alert} onDismiss={() => setDismissed((d) => [...d, city.id])} />}
              <CurrentCard city={city} />
              <Nowcast city={city} />
              <div className="grid">
                <HourlyChart city={city} selected={hour} onSelect={setHour} />
                <DailyList city={city} open={openDay} onToggle={(i) => setOpenDay(openDay === i ? null : i)} />
              </div>
              <div className="details">
                <AirQuality city={city} />
                <WindCard city={city} />
                <SunCard city={city} />
              </div>
              <Activities city={city} />
            </div>
          )}
          {view === "radar" && (
            <div className="view" key={`radar-${city.id}`}>
              <RadarView city={city} />
            </div>
          )}
          {!view && (
            <div className="view" key="not-found">
              <NotFound path={path} onHome={() => setView("overview")} />
            </div>
          )}
          {view === "compare" && (
            <div className="view" key="compare">
              <CompareView cities={saved} onOpen={open} />
            </div>
          )}
        </main>
        {palette && <CommandPalette addable={addable} saved={saved} commands={commands} onAdd={add} onOpen={open} onClose={() => setPalette(false)} />}
        <Toasts toasts={toasts} onClose={closeToast} />
      </div>
    </UnitContext.Provider>
  );
}

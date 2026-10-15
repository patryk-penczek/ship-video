import { useRef } from "react";
import { flushSync } from "react-dom";
import { REDUCED } from "../lib";
import { Glyph } from "./Icon";

export type Theme = "dark" | "light";

export function switchTheme(next: Theme, apply: (t: Theme) => void, origin?: { x: number; y: number }) {
  const commit = () => {
    flushSync(() => apply(next));
  };
  if (!document.startViewTransition || REDUCED) return commit();

  const { x, y } = origin ?? { x: innerWidth - 120, y: 48 };
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(commit);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 750, easing: "cubic-bezier(.65,0,.25,1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const ref = useRef<HTMLButtonElement>(null);

  function toggle() {
    const r = ref.current!.getBoundingClientRect();
    switchTheme(theme === "dark" ? "light" : "dark", onChange, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }

  return (
    <button ref={ref} className={`icon-btn theme-toggle is-${theme}`} onClick={toggle} aria-label="Toggle theme">
      <Glyph name="moon" size={18} className="tt-moon" />
      <Glyph name="sun" size={18} className="tt-sun" />
    </button>
  );
}

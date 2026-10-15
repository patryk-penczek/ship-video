import { useContext } from "react";
import { UnitContext, toUnit, useTween } from "../lib";

export function Temp({ c, from, className }: { c: number; from?: number; className?: string }) {
  const unit = useContext(UnitContext);
  const value = useTween(toUnit(c, unit), { from: from === undefined ? undefined : toUnit(from, unit) });
  return <span className={`num ${className ?? ""}`}>{Math.round(value)}°</span>;
}

export function Num({ value, from, suffix = "" }: { value: number; from?: number; suffix?: string }) {
  const shown = useTween(value, { from });
  return (
    <span className="num">
      {Math.round(shown)}
      {suffix}
    </span>
  );
}

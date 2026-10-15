import type { Condition } from "../data";

const SCENES = ["sun", "partly", "cloud", "rain", "storm", "night"] as const;

export function Sky({ condition, night }: { condition: Condition; night: boolean }) {
  const scene = night ? "night" : condition;
  return (
    <div className="sky" aria-hidden>
      {SCENES.map((s) => (
        <div key={s} className={`sky-tint sky-${s} ${s === scene ? "is-on" : ""}`} />
      ))}
    </div>
  );
}

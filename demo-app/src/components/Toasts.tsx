import { Glyph } from "./Icon";

export type Toast = { id: number; text: string; action?: { label: string; run: () => void } };

export function Toasts({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <Glyph name="sparkle" size={15} className="toast-icon" />
          <span>{t.text}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action!.run();
                onClose(t.id);
              }}
            >
              <Glyph name="undo" size={14} />
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

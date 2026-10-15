import { Glyph } from "./Icon";

type Props = { title: string; body: string; onDismiss: () => void };

export function AlertBanner({ title, body, onDismiss }: Props) {
  return (
    <div className="alert" role="alert">
      <span className="alert-icon">
        <Glyph name="warning" size={20} />
      </span>
      <div className="alert-text">
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
      <button className="alert-close" onClick={onDismiss} aria-label="Dismiss alert">
        <Glyph name="close" size={14} />
      </button>
    </div>
  );
}

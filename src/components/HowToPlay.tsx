import { COPY } from '../app/copy.ts';

/** Three-row instruction card: what a click, a move and idling do. */
export function HowToPlay() {
  return (
    <div className="glass-panel howto">
      <div className="panel-title">
        <span>✦ {COPY.howto.title}</span>
        <span>{COPY.howto.badge}</span>
      </div>
      <ol className="howto-list">
        {COPY.howto.steps.map((step) => (
          <li key={step.title} className="howto-row">
            <span className="howto-icon" aria-hidden="true">
              {step.icon}
            </span>
            <span className="howto-text">
              <strong>{step.title}</strong>
              <small>{step.body}</small>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

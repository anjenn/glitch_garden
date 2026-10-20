import { COPY } from '../app/copy.ts';

export interface WorldControlsProps {
  helper: string;
  pending: boolean;
  paletteName: string;
  canReset: boolean;
  onMutate(): void;
  onPalette(): void;
  onReset(): void;
  onHelp(): void;
}

export function WorldControls(props: WorldControlsProps) {
  const { helper, pending, paletteName, canReset, onMutate, onPalette, onReset, onHelp } = props;
  return (
    <section className="bottom-actions" aria-label="World controls">
      <button type="button" className="primary" id="mutate" onClick={onMutate} disabled={pending}>
        <i aria-hidden="true">♧</i> {COPY.controls.mutate} <span aria-hidden="true">→</span>
      </button>
      <div className="action-note" id="helper" aria-live="polite">
        {helper}
      </div>
      <div className="mini-actions">
        <button
          type="button"
          className="tool-btn"
          id="palette"
          onClick={onPalette}
          disabled={pending}
          aria-label={`Change palette, currently ${paletteName}`}
        >
          {COPY.controls.palette} · {paletteName}
        </button>
        {canReset && (
          <button type="button" className="tool-btn" id="newWorld" onClick={onReset}>
            {COPY.controls.newWorld}
          </button>
        )}
        <button type="button" className="tool-btn" id="helpBottom" onClick={onHelp}>
          {COPY.controls.help}
        </button>
      </div>
    </section>
  );
}

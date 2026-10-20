import { useEffect, useRef } from 'react';
import { COPY } from '../app/copy.ts';
import type { RuntimeMode } from '../game/types.ts';

export function HelpPopover({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: RuntimeMode;
  onClose(): void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <div
      className={open ? 'about-popover open' : 'about-popover'}
      id="about"
      role="dialog"
      aria-label="How it works"
      aria-modal="false"
      hidden={!open}
    >
      <button
        ref={closeRef}
        id="closeAbout"
        aria-label={COPY.help.close}
        type="button"
        onClick={onClose}
      >
        ×
      </button>
      <strong>{COPY.help.title}</strong>
      <p>
        {COPY.help.steps.map((step) => (
          <span key={step}>
            {step}
            <br />
          </span>
        ))}
        {mode === 'local' ? COPY.help.localNote : COPY.help.sharedNote}
      </p>
    </div>
  );
}

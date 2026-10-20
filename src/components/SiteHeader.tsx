import { COPY } from '../app/copy.ts';
import { PALETTES } from '../game/palettes.ts';

export interface SiteHeaderProps {
  modeLabel: string;
  seedTag: string;
  helpOpen: boolean;
  canCopy: boolean;
  paletteName: string | null;
  pending: boolean;
  onWorld(): void;
  onDna(): void;
  onHelp(): void;
  onCopySeed(): void;
  onPalette(): void;
}

export function SiteHeader(props: SiteHeaderProps) {
  const {
    modeLabel,
    seedTag,
    helpOpen,
    canCopy,
    paletteName,
    pending,
    onWorld,
    onDna,
    onHelp,
    onCopySeed,
    onPalette,
  } = props;
  const palette = PALETTES.find((p) => p.name === paletteName) ?? null;
  return (
    <header className="header">
      <div className="brand">
        <span className="logo" aria-hidden="true">
          ♧
        </span>
        <span className="brand-text">
          <span>
            GLITCH<span className="brand-dot">.</span>GARDEN
          </span>
          <span className="brand-tagline" aria-hidden="true">
            {COPY.tagline}
          </span>
        </span>
        <span className="mode-chip" data-testid="mode-chip">
          {modeLabel}
        </span>
      </div>
      <nav className="mainnav" aria-label="Sections">
        <button
          className={helpOpen ? undefined : 'active'}
          type="button"
          id="navWorld"
          aria-current={helpOpen ? undefined : 'page'}
          onClick={onWorld}
        >
          {COPY.nav.world}
        </button>
        <button type="button" id="navDNA" onClick={onDna}>
          {COPY.nav.dna}
        </button>
        <button
          className={helpOpen ? 'active' : undefined}
          type="button"
          id="navHelp"
          aria-expanded={helpOpen}
          aria-controls="about"
          onClick={onHelp}
        >
          {COPY.nav.help}
        </button>
      </nav>
      <div className="header-tools">
        <button
          className="tool-btn palette-btn"
          id="paletteTop"
          type="button"
          onClick={onPalette}
          disabled={pending || !palette}
          aria-label={palette ? `Change palette, currently ${palette.name}` : 'Change palette'}
        >
          <span className="tool-icon" aria-hidden="true">
            ✿
          </span>
          {COPY.paletteShort}
          {palette && (
            <>
              <span className="tool-value">{palette.name}</span>
              <span className="swatches" aria-hidden="true">
                <i style={{ background: palette.characters.flower[0] }} />
                <i style={{ background: palette.characters.tree[0] }} />
                <i style={{ background: palette.characters.crystal[0] }} />
                <i style={{ background: palette.characters.portal[0] }} />
              </span>
            </>
          )}
        </button>
        <button
          className="tool-btn seed-btn"
          id="copySeed"
          type="button"
          onClick={onCopySeed}
          disabled={!canCopy}
        >
          <span className="tool-icon" aria-hidden="true">
            ♧
          </span>
          {COPY.copySeed} <span id="seedTiny">{seedTag}</span>
        </button>
      </div>
    </header>
  );
}

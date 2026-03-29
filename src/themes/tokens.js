/** CSS custom property names (no -- prefix) required on html for every palette × mode. */
export const THEME_TOKEN_KEYS = [
  'bg-deep',
  'bg-panel',
  'bg-surface',
  'bg-hover',
  'border',
  'border-active',
  'text-primary',
  'text-secondary',
  'text-dim',
  'accent-blue',
  'accent-cyan',
  'accent-green',
  'accent-orange',
  'accent-red',
  'accent-purple',
  'grid-minor',
  'grid-major',
  'axis-color',
  'axis-tick',
  'axis-title',
  'point-default',
  'point-selected',
  'point-selected-dim',
  'accent-cyan-subtle',
  'selection-bg',
  'callout-bg',
  'callout-border',
  'callout-text',
  'ref-hline',
  'ref-vline',
  'intersect-default',
  'shadow-lg',
  'shadow-md',
  'on-accent',
  'danger-hover-bg',
  'path-1',
  'path-2',
  'path-3',
  'path-4',
  'path-5',
  'path-6',
  'path-7',
  'path-8',
];

export const PALETTE_IDS = [
  'forge',
  'oxide',
  'blueprint',
  'dro',
  'telemetry',
  'monolith',
  'theme-axiom',
  'theme-strata',
  'theme-flux',
  'theme-catalyst',
  'theme-zenith',
];

export const PALETTES = [
  {
    id: 'forge',
    label: 'Forge',
    description: 'Cockpit HUD—gunmetal, caution amber, and signal green for live-state emphasis.',
  },
  {
    id: 'oxide',
    label: 'Oxide',
    description: 'Workshop steel and rust tones—warm industrial metal and oxidized accents.',
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    description: 'Technical drawing ink on deep Prussian canvas; light mode reads like bluelines on paper.',
  },
  {
    id: 'dro',
    label: 'DRO',
    description: 'CNC readout phosphor on near-black; light mode is soft drafting green on gray.',
  },
  {
    id: 'telemetry',
    label: 'Telemetry',
    description: 'Original slate UI with cyan highlights—general machine-design workspace.',
  },
  {
    id: 'monolith',
    label: 'Monolith',
    description: 'Minimal zinc and concrete neutrals with a cold safety accent—plant-floor CAD station.',
  },
  {
    id: 'theme-axiom',
    label: 'Axiom',
    description: 'Precise, mathematical, and stark. Built on deep naval tones and sharp gold/teal intersections.',
  },
  {
    id: 'theme-strata',
    label: 'Strata',
    description: 'Industrial and grounded. Layers of graphite, warm concrete, and rusted amber.',
  },
  {
    id: 'theme-flux',
    label: 'Flux',
    description: 'Fluid and energetic. A deep void background pierced by high-frequency fuchsia and cyan.',
  },
  {
    id: 'theme-catalyst',
    label: 'Catalyst',
    description: 'High-contrast and immediate. Pure OLED blacks driven by terminal green and electric purples.',
  },
  {
    id: 'theme-zenith',
    label: 'Zenith',
    description: 'Airy and balanced. Soft slate backgrounds with luminous, low-fatigue pastel data paths.',
  },
];

export const STORAGE_PALETTE = 'camforge-palette';
export const STORAGE_THEME = 'camforge-theme';

export const DEFAULT_PALETTE = 'forge';
export const DEFAULT_THEME = 'dark';

export function isValidPalette(id) {
  return PALETTE_IDS.includes(id);
}

export function isValidTheme(mode) {
  return mode === 'dark' || mode === 'light';
}

import { app } from '../state.js';
import {
  DEFAULT_PALETTE,
  DEFAULT_THEME,
  isValidPalette,
  isValidTheme,
  STORAGE_PALETTE,
  STORAGE_THEME,
} from './tokens.js';

export function readStoredPalette() {
  try {
    const v = localStorage.getItem(STORAGE_PALETTE);
    return isValidPalette(v) ? v : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

export function readStoredThemeMode() {
  try {
    const v = localStorage.getItem(STORAGE_THEME);
    return isValidTheme(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * @param {string} [paletteId]
 * @param {'dark'|'light'} [mode]
 * @param {{ draw?: () => void, skipStorage?: boolean }} [opts]
 */
export function applyTheme(paletteId, mode, opts = {}) {
  const root = document.documentElement;
  const palette = isValidPalette(paletteId) ? paletteId : DEFAULT_PALETTE;
  const theme = isValidTheme(mode) ? mode : DEFAULT_THEME;

  root.setAttribute('data-palette', palette);
  root.setAttribute('data-theme', theme);
  app.isDark = theme === 'dark';

  if (!opts.skipStorage) {
    try {
      localStorage.setItem(STORAGE_PALETTE, palette);
      localStorage.setItem(STORAGE_THEME, theme);
    } catch {
      /* ignore */
    }
  }

  const sel = document.getElementById('paletteSelect');
  if (sel && sel.value !== palette) sel.value = palette;

  const btn = document.getElementById('btnTheme');
  if (btn) {
    btn.textContent = app.isDark ? '\u2600 Light' : '\u263E Dark';
    btn.title = app.isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  if (typeof opts.draw === 'function') opts.draw();
}

export function toggleColorMode(draw) {
  const pal =
    document.documentElement.getAttribute('data-palette') || DEFAULT_PALETTE;
  const next = app.isDark ? 'light' : 'dark';
  applyTheme(pal, next, { draw });
}

export function setPalette(paletteId, draw) {
  applyTheme(paletteId, readStoredThemeMode(), { draw });
}

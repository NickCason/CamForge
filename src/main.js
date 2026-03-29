import './style.css';
import { app } from './state.js';
import { cssVar } from './coords.js';
import { resize } from './render.js';
import { refreshAll } from './ui/panels.js';
import { initEvents } from './ui/events.js';
import { applyTheme, readStoredPalette, readStoredThemeMode } from './themes/applyTheme.js';
import { PALETTES } from './themes/tokens.js';
import { start as startTutorial, tryAutoLaunch } from './tutorial/engine.js';

const paletteSelect = document.getElementById('paletteSelect');
for (const p of PALETTES) {
  const o = document.createElement('option');
  o.value = p.id;
  o.textContent = p.label;
  paletteSelect.appendChild(o);
}
applyTheme(readStoredPalette(), readStoredThemeMode(), { skipStorage: true });

app.canvas = document.getElementById('mainCanvas');
app.ctx = app.canvas.getContext('2d');
app.container = document.getElementById('canvasContainer');

app.paths[0].color = cssVar('--accent-blue');

initEvents();
resize();
refreshAll();

document.getElementById('btnTutorial').addEventListener('click', startTutorial);
tryAutoLaunch();

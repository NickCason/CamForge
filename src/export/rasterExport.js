import { app } from '../state.js';
import { cssVar } from '../coords.js';
import { exportGraphToCanvas } from '../render.js';
import { buildStatsText } from './sceneData.js';

export function exportPng({ transparent = false, includeStats = false, scale = 2 } = {}) {
  const logicalW = app.W / app.dpr;
  const logicalH = app.H / app.dpr;

  let statsLines = [];
  if (includeStats) statsLines = buildStatsText();
  const statsLineH = 16;
  const statsPadding = 20;
  const statsBlockH = statsLines.length > 0 ? statsLines.length * statsLineH + statsPadding * 2 : 0;

  const graphCanvas = document.createElement('canvas');
  exportGraphToCanvas(graphCanvas, { transparent, scale });

  const finalW = logicalW * scale;
  const finalH = logicalH * scale + statsBlockH * scale;

  const out = document.createElement('canvas');
  out.width = finalW;
  out.height = finalH;
  const ctx = out.getContext('2d');

  if (!transparent && statsBlockH > 0) {
    ctx.fillStyle = cssVar('--bg-deep');
    ctx.fillRect(0, 0, finalW, finalH);
  }

  ctx.drawImage(graphCanvas, 0, 0);

  if (statsLines.length > 0) {
    const statsY = logicalH * scale;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const baseY = logicalH + statsPadding;
    ctx.font = '11px "JetBrains Mono", monospace';
    statsLines.forEach((line, i) => {
      const isHeader = line.startsWith('\u2500');
      ctx.fillStyle = isHeader ? cssVar('--text-secondary') : cssVar('--text-dim');
      ctx.fillText(line, 12, baseY + i * statsLineH + 12);
    });
    ctx.restore();
  }

  out.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cam-profile.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

import { app } from '../state.js';
import { cssVar } from '../coords.js';
import { exportGraphToCanvas } from '../render.js';
import { buildStatsExportModel } from './sceneData.js';
import { getStatsReportHeight, buildStatsReportSvg } from './statsReportSvg.js';

function rasterizeStatsSvg(model, width, height, scale) {
  const svgBody = buildStatsReportSvg(model, { x: 0, y: 0, width });
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">${svgBody}</svg>`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Stats SVG rasterization failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  });
}

export async function exportPng({ transparent = false, includeStats = false, scale = 2 } = {}) {
  const logicalW = app.W / app.dpr;
  const logicalH = app.H / app.dpr;

  let statsH = 0;
  let statsModel = null;
  if (includeStats) {
    statsModel = buildStatsExportModel();
    statsH = getStatsReportHeight(statsModel);
  }

  const graphCanvas = document.createElement('canvas');
  exportGraphToCanvas(graphCanvas, { transparent, scale });

  const finalW = logicalW * scale;
  const finalH = (logicalH + statsH) * scale;

  const out = document.createElement('canvas');
  out.width = finalW;
  out.height = finalH;
  const ctx = out.getContext('2d');

  if (!transparent) {
    ctx.fillStyle = cssVar('--bg-deep');
    ctx.fillRect(0, 0, finalW, finalH);
  }

  ctx.drawImage(graphCanvas, 0, 0);

  if (statsModel && statsH > 0) {
    const statsImg = await rasterizeStatsSvg(statsModel, logicalW, statsH, scale);
    ctx.drawImage(statsImg, 0, logicalH * scale);
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

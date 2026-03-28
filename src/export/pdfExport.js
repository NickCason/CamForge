import { app } from '../state.js';
import { cssVar } from '../coords.js';
import { exportGraphToCanvas } from '../render.js';
import { buildStatsText } from './sceneData.js';
import { buildSvgString } from '../ui/exportSvg.js';

async function vectorPdf({ includeStats = false, scale = 2 } = {}) {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
  ]);

  const svgString = buildSvgString({ transparent: false, includeStats: false, scale: 1 });

  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = svgDoc.documentElement;

  const svgW = parseFloat(svgEl.getAttribute('width'));
  const svgH = parseFloat(svgEl.getAttribute('height'));

  let statsLines = [];
  if (includeStats) statsLines = buildStatsText();
  const statsLineH = 12;
  const statsPad = 14;
  const statsBlockPt = statsLines.length > 0 ? statsLines.length * statsLineH + statsPad * 2 : 0;

  const ptPerPx = 72 / 96;
  const pdfW = svgW * ptPerPx * scale;
  const pdfH = svgH * ptPerPx * scale;
  const totalH = pdfH + statsBlockPt;

  const orientation = pdfW > totalH ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'pt', format: [pdfW, totalH] });

  try {
    await svg2pdf(svgEl, doc, { x: 0, y: 0, width: pdfW, height: pdfH });
  } catch {
    return rasterPdf({ includeStats, scale });
  }

  if (statsLines.length > 0) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    const baseY = pdfH + statsPad;
    statsLines.forEach((line, i) => {
      const isHeader = line.startsWith('\u2500');
      doc.setTextColor(isHeader ? 120 : 90);
      doc.text(line, 8, baseY + i * statsLineH + 8);
    });
  }

  doc.save('cam-profile.pdf');
}

async function rasterPdf({ includeStats = false, scale = 2 } = {}) {
  const { jsPDF } = await import('jspdf');

  const logicalW = app.W / app.dpr;
  const logicalH = app.H / app.dpr;

  let statsLines = [];
  if (includeStats) statsLines = buildStatsText();

  const graphCanvas = document.createElement('canvas');
  exportGraphToCanvas(graphCanvas, { transparent: false, scale });

  const imgData = graphCanvas.toDataURL('image/png');
  const pxW = graphCanvas.width;
  const pxH = graphCanvas.height;

  const ptPerPx = 72 / (96 * scale);
  const pdfW = pxW * ptPerPx;
  const pdfH = pxH * ptPerPx;

  const statsLineH = 12;
  const statsPad = 14;
  const statsBlockPt = statsLines.length > 0 ? statsLines.length * statsLineH + statsPad * 2 : 0;
  const totalH = pdfH + statsBlockPt;

  const orientation = pdfW > totalH ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'pt', format: [pdfW, totalH] });

  doc.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

  if (statsLines.length > 0) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    const baseY = pdfH + statsPad;
    statsLines.forEach((line, i) => {
      const isHeader = line.startsWith('\u2500');
      doc.setTextColor(isHeader ? 120 : 90);
      doc.text(line, 8, baseY + i * statsLineH + 8);
    });
  }

  doc.save('cam-profile.pdf');
}

export async function exportPdf({ includeStats = false, scale = 2, vector = true } = {}) {
  if (vector) {
    return vectorPdf({ includeStats, scale });
  }
  return rasterPdf({ includeStats, scale });
}

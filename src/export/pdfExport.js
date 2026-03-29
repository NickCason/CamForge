import { buildSvgString } from '../ui/exportSvg.js';

export async function exportPdf({ includeStats = false, scale = 2 } = {}) {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
  ]);

  const svgString = buildSvgString({ transparent: false, includeStats, scale: 1 });

  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = svgDoc.documentElement;

  const svgW = parseFloat(svgEl.getAttribute('width'));
  const svgH = parseFloat(svgEl.getAttribute('height'));

  const ptPerPx = 72 / 96;
  const pdfW = svgW * ptPerPx * scale;
  const pdfH = svgH * ptPerPx * scale;

  const orientation = pdfW > pdfH ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'pt', format: [pdfW, pdfH] });

  try {
    await svg2pdf(svgEl, doc, { x: 0, y: 0, width: pdfW, height: pdfH });
  } catch (err) {
    alert('PDF export failed: ' + (err.message || err));
    return;
  }

  doc.save('cam-profile.pdf');
}

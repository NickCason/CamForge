import { app } from '../state.js';
import { MARGIN } from '../constants.js';
import { g2c, cssVar } from '../coords.js';
import { sorted, sampleSpline } from '../spline.js';

export function exportSvg() {
  const { W, H, dpr, graphRange, gridStep, axisLabels, points, objects, splineColor, splineWidth, startSlope, endSlope, showIntersects, intersectColor } = app;
  const sw = W / dpr, sh = H / dpr; const bgExport = cssVar('--bg-deep');
  const pL = MARGIN.left, pR = sw - MARGIN.right, pT = MARGIN.top, pB = sh - MARGIN.bottom, pw = pR - pL, ph = pB - pT;
  const xR = graphRange.xMax - graphRange.xMin, yR = graphRange.yMax - graphRange.yMin;
  const gridCol = cssVar('--border'), axisCol = cssVar('--axis-color'), ptCol = cssVar('--point-default');
  const tickCol = cssVar('--axis-tick'), titleCol = cssVar('--axis-title');

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}">`;
  svg += `<defs><style>text{font-family:'JetBrains Mono',monospace}</style></defs>`;
  svg += `<rect width="100%" height="100%" fill="${bgExport}"/>`;

  for (let v = Math.ceil(graphRange.xMin / gridStep.x) * gridStep.x; v <= graphRange.xMax; v += gridStep.x) { const x = pL + ((v - graphRange.xMin) / xR) * pw; svg += `<line x1="${x}" y1="${pT}" x2="${x}" y2="${pB}" stroke="${gridCol}" stroke-width="0.5"/>`; }
  for (let v = Math.ceil(graphRange.yMin / gridStep.y) * gridStep.y; v <= graphRange.yMax; v += gridStep.y) { const y = pB - ((v - graphRange.yMin) / yR) * ph; svg += `<line x1="${pL}" y1="${y}" x2="${pR}" y2="${y}" stroke="${gridCol}" stroke-width="0.5"/>`; }

  svg += `<line x1="${pL}" y1="${pT}" x2="${pL}" y2="${pB}" stroke="${axisCol}" stroke-width="1.5"/>`;
  svg += `<line x1="${pL}" y1="${pB}" x2="${pR}" y2="${pB}" stroke="${axisCol}" stroke-width="1.5"/>`;

  for (let v = Math.ceil(graphRange.xMin / gridStep.x) * gridStep.x; v <= graphRange.xMax; v += gridStep.x) {
    const x = pL + ((v - graphRange.xMin) / xR) * pw;
    svg += `<text x="${x}" y="${pB + 18}" text-anchor="middle" fill="${tickCol}" font-size="12">${v}</text>`;
  }
  for (let v = Math.ceil(graphRange.yMin / gridStep.y) * gridStep.y; v <= graphRange.yMax; v += gridStep.y) {
    const y = pB - ((v - graphRange.yMin) / yR) * ph;
    svg += `<text x="${pL - 8}" y="${y + 4}" text-anchor="end" fill="${tickCol}" font-size="12">${v}</text>`;
  }

  svg += `<text x="${pL + pw / 2}" y="${pB + 36}" text-anchor="middle" fill="${titleCol}" font-size="13" font-family="'IBM Plex Sans',sans-serif">${axisLabels.x}</text>`;
  svg += `<text x="14" y="${pT + ph / 2}" text-anchor="middle" fill="${titleCol}" font-size="13" font-family="'IBM Plex Sans',sans-serif" transform="rotate(-90,14,${pT + ph / 2})">${axisLabels.y}</text>`;

  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'hline') {
      const p = g2c(0, o.value); const col = o.color || cssVar('--ref-hline');
      svg += `<line x1="${pL}" y1="${p.y}" x2="${pR}" y2="${p.y}" stroke="${col}" stroke-width="1" stroke-dasharray="6,4"/>`;
      const pos = o.labelPos !== undefined ? o.labelPos : 1.0, side = o.labelSide || 'above';
      const lx = pL + pos * (pR - pL), lbl = (o.label ? o.label + ' ' : '') + o.value.toFixed(1);
      const anchor = pos > 0.5 ? 'end' : 'start', yOff = side === 'above' ? -5 : 15;
      svg += `<text x="${pos > 0.5 ? lx - 4 : lx + 4}" y="${p.y + yOff}" text-anchor="${anchor}" fill="${col}" font-size="12">${lbl}</text>`;
    }
    if (o.type === 'vline') {
      const p = g2c(o.value, 0); const col = o.color || cssVar('--ref-vline');
      svg += `<line x1="${p.x}" y1="${pT}" x2="${p.x}" y2="${pB}" stroke="${col}" stroke-width="1" stroke-dasharray="6,4"/>`;
      const pos = o.labelPos !== undefined ? o.labelPos : 0.0, side = o.labelSide || 'right';
      const ly = pT + pos * (pB - pT), lbl = (o.label ? o.label + ' ' : '') + o.value.toFixed(1);
      const anchor = side === 'right' ? 'start' : 'end', xOff = side === 'right' ? 4 : -4;
      svg += `<text x="${p.x + xOff}" y="${ly + 14}" text-anchor="${anchor}" fill="${col}" font-size="12">${lbl}</text>`;
    }
  });

  if (points.length >= 2) {
    const samples = sampleSpline(60); let d = '';
    samples.forEach((s, i) => { const p = g2c(s.x, s.y); d += (i === 0 ? 'M' : 'L') + `${p.x.toFixed(2)},${p.y.toFixed(2)} `; });
    svg += `<path d="${d}" fill="none" stroke="${splineColor}" stroke-width="${splineWidth}"/>`;
  }

  if (points.length >= 2) {
    const pts = sorted(); const aLen = 25;
    const scaleRatio = (ph / yR) / (pw / xR);
    [[pts[0], startSlope], [pts[pts.length - 1], endSlope]].forEach(([pt, slope]) => {
      const p = g2c(pt.x, pt.y);
      const dxC = aLen, dyC = -slope * scaleRatio * aLen;
      svg += `<line x1="${p.x - dxC}" y1="${p.y - dyC}" x2="${p.x + dxC}" y2="${p.y + dyC}" stroke="rgba(245,158,11,0.5)" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    });
  }

  if (showIntersects && points.length >= 2) {
    const samples = sampleSpline(80);
    const yBase = (graphRange.yMin <= 0 && graphRange.yMax >= 0) ? 0 : graphRange.yMin;
    const ints = [];
    for (let i = 0; i < samples.length - 1; i++) {
      if ((samples[i].y - yBase) * (samples[i + 1].y - yBase) < 0) {
        const t = (yBase - samples[i].y) / (samples[i + 1].y - samples[i].y);
        ints.push({ x: samples[i].x + t * (samples[i + 1].x - samples[i].x), y: yBase });
      }
    }
    objects.forEach(o => {
      if (o.hidden) return;
      if (o.type === 'hline') for (let i = 0; i < samples.length - 1; i++) { if ((samples[i].y - o.value) * (samples[i + 1].y - o.value) <= 0) { const dy = samples[i + 1].y - samples[i].y; if (Math.abs(dy) < 1e-10) continue; const t = (o.value - samples[i].y) / dy; ints.push({ x: samples[i].x + t * (samples[i + 1].x - samples[i].x), y: o.value }); } }
      if (o.type === 'vline') for (let i = 0; i < samples.length - 1; i++) { if ((samples[i].x - o.value) * (samples[i + 1].x - o.value) <= 0) { const dx = samples[i + 1].x - samples[i].x; if (Math.abs(dx) < 1e-10) continue; const t = (o.value - samples[i].x) / dx; ints.push({ x: o.value, y: samples[i].y + t * (samples[i + 1].y - samples[i].y) }); } }
    });
    ints.forEach(pt => {
      const p = g2c(pt.x, pt.y);
      const iCol = intersectColor || cssVar('--intersect-default');
      svg += `<line x1="${p.x - 5}" y1="${p.y - 5}" x2="${p.x + 5}" y2="${p.y + 5}" stroke="${iCol}" stroke-width="2"/>`;
      svg += `<line x1="${p.x + 5}" y1="${p.y - 5}" x2="${p.x - 5}" y2="${p.y + 5}" stroke="${iCol}" stroke-width="2"/>`;
    });
  }

  points.forEach(pt => { const p = g2c(pt.x, pt.y); svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${ptCol}" stroke="${bgExport}" stroke-width="2"/>`; });

  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'line') {
      const p1 = g2c(o.x1, o.y1), p2 = g2c(o.x2, o.y2); const col = o.color || cssVar('--accent-red');
      svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${col}" stroke-width="1.5"${o.dashed ? ' stroke-dasharray="5,4"' : ''}/>`;
      svg += `<circle cx="${p1.x}" cy="${p1.y}" r="4" fill="${col}" stroke="${bgExport}" stroke-width="1"/>`;
      svg += `<circle cx="${p2.x}" cy="${p2.y}" r="4" fill="${col}" stroke="${bgExport}" stroke-width="1"/>`;
    }
    if (o.type === 'dimension') {
      const p1 = g2c(o.x1, o.y1), p2 = g2c(o.x2, o.y2); const col = o.color || cssVar('--accent-orange');
      svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${col}" stroke-width="1"/>`;
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x), perp = ang + Math.PI / 2;
      [p1, p2].forEach(p => {
        svg += `<line x1="${p.x + Math.cos(perp) * 8}" y1="${p.y + Math.sin(perp) * 8}" x2="${p.x - Math.cos(perp) * 8}" y2="${p.y - Math.sin(perp) * 8}" stroke="${col}" stroke-width="1"/>`;
      });
      svg += `<circle cx="${p1.x}" cy="${p1.y}" r="4" fill="${col}" stroke="${bgExport}" stroke-width="1"/>`;
      svg += `<circle cx="${p2.x}" cy="${p2.y}" r="4" fill="${col}" stroke="${bgExport}" stroke-width="1"/>`;
      const dx = o.x2 - o.x1, dy = o.y2 - o.y1, dist = Math.sqrt(dx * dx + dy * dy);
      const midGx = (o.x1 + o.x2) / 2, midGy = (o.y1 + o.y2) / 2;
      const lblGx = o.labelX !== undefined ? o.labelX : midGx;
      const lblGy = o.labelY !== undefined ? o.labelY : midGy + 5;
      const lblP = g2c(lblGx, lblGy), midP = g2c(midGx, midGy);
      if (o.labelX !== undefined) {
        svg += `<line x1="${midP.x}" y1="${midP.y}" x2="${lblP.x}" y2="${lblP.y + 6}" stroke="${col}" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.5"/>`;
      }
      svg += `<text x="${lblP.x}" y="${lblP.y - 4}" text-anchor="middle" fill="${col}" font-size="12">\u0394=${dist.toFixed(2)} (\u0394x=${Math.abs(dx).toFixed(1)}, \u0394y=${Math.abs(dy).toFixed(1)})</text>`;
    }
    if (o.type === 'callout') {
      const p = g2c(o.x, o.y); const fontSize = o.fontSize || 13;
      const bgCol = o.bgColor || cssVar('--callout-bg');
      const borderCol = o.borderColor || cssVar('--callout-border');
      const txtCol = o.textColor || cssVar('--callout-text');
      const estW = o.text.length * fontSize * 0.6 + 14, h = fontSize + 10;
      if (o.anchorX !== undefined) {
        const a = g2c(o.anchorX, o.anchorY);
        svg += `<line x1="${a.x}" y1="${a.y}" x2="${p.x}" y2="${p.y + h / 2}" stroke="${borderCol}" stroke-width="1"/>`;
        svg += `<circle cx="${a.x}" cy="${a.y}" r="4" fill="${borderCol}" stroke="${bgExport}" stroke-width="1"/>`;
      }
      svg += `<rect x="${p.x - estW / 2}" y="${p.y - h / 2}" width="${estW}" height="${h}" rx="3" fill="${bgCol}" stroke="${borderCol}" stroke-width="1"/>`;
      svg += `<text x="${p.x}" y="${p.y + fontSize * 0.35}" text-anchor="middle" fill="${txtCol}" font-size="${fontSize}" font-family="'IBM Plex Sans',sans-serif">${o.text}</text>`;
    }
  });

  svg += '</svg>';
  const blob = new Blob([svg], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'cam-profile.svg'; a.click(); URL.revokeObjectURL(url);
}

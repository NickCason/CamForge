import { app } from '../state.js';
import { MARGIN } from '../constants.js';
import { g2c, cssVar } from '../coords.js';
import { sortedPoints, sampleSpline } from '../spline.js';
import {
  computeIntersections,
  intersectHitColor,
  findIntersectLabelPlacement,
  closestPointOnRect,
  intersectionLabelKey,
  makeIntersectTextBox,
  intersectionCalloutLabel,
  effectiveCalloutMode
} from '../intersectLabels.js';
import { intersectMarkerSvg } from '../intersectMarkers.js';

export function exportSvg() {
  const { W, H, dpr, graphRange, gridStep, axisLabels, paths, objects, showIntersects, intersectionLabelPositions, intersectionCalloutModes, intersectionMarkerShapes } = app;
  const intLabelPos = intersectionLabelPositions || {};
  const intCalloutModes = intersectionCalloutModes || {};
  const intMarkerShapes = intersectionMarkerShapes || {};
  const sw = W / dpr, sh = H / dpr; const bgExport = cssVar('--bg-deep');
  const pL = MARGIN.left, pR = sw - MARGIN.right, pT = MARGIN.top, pB = sh - MARGIN.bottom, pw = pR - pL, ph = pB - pT;
  const xR = graphRange.xMax - graphRange.xMin, yR = graphRange.yMax - graphRange.yMin;
  const gridCol = cssVar('--border'), axisCol = cssVar('--axis-color');
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

  const plotBounds = { left: pL, right: pR, top: pT, bottom: pB };
  const intersectStrokes = paths
    .filter(path => path.points.length >= 2)
    .map(path => {
      const samples = sampleSpline(path, 80);
      return {
        points: samples.map(s => g2c(s.x, s.y)),
        halfWidth: Math.max(1, (path.width || 2) / 2)
      };
    });
  let intersectPlacedBoxes = [];

  // Splines, slope ticks, intersections, and points — per path
  paths.forEach(path => {
    if (path.points.length < 2) return;
    const samples = sampleSpline(path, 60); let d = '';
    samples.forEach((s, i) => { const p = g2c(s.x, s.y); d += (i === 0 ? 'M' : 'L') + `${p.x.toFixed(2)},${p.y.toFixed(2)} `; });
    svg += `<path d="${d}" fill="none" stroke="${path.color}" stroke-width="${path.width}"/>`;

    const pts = sortedPoints(path.points);
    const aLen = 25, scaleRatio = (ph / yR) / (pw / xR);
    [[pts[0], path.startSlope], [pts[pts.length - 1], path.endSlope]].forEach(([pt, slope]) => {
      const p = g2c(pt.x, pt.y);
      const dxC = aLen, dyC = -slope * scaleRatio * aLen;
      svg += `<line x1="${p.x - dxC}" y1="${p.y - dyC}" x2="${p.x + dxC}" y2="${p.y + dyC}" stroke="${cssVar('--accent-orange')}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.5"/>`;
    });

    if (showIntersects) {
      const intSamples = sampleSpline(path, 80);
      const ints = computeIntersections(intSamples, graphRange, objects, path.id);
      ints.forEach(pt => {
        const p = g2c(pt.x, pt.y);
        const key = intersectionLabelKey(path.id, pt);
        const shape = intMarkerShapes[key] || 'brackets';
        const hitC = intersectHitColor(pt, objects, cssVar);
        svg += intersectMarkerSvg(shape, p.x, p.y, hitC, 2);
        const eff = effectiveCalloutMode(pt, intCalloutModes[key]);
        const lbl = intersectionCalloutLabel(pt, eff);
        if (lbl !== null) {
          const col = intersectHitColor(pt, objects, cssVar);
          const tw = Math.max(24, lbl.length * 7.4);
          const th = 14;
          const ovr = intLabelPos[key];
          let place;
          if (ovr) {
            const lc = g2c(ovr.gx, ovr.gy);
            place = makeIntersectTextBox(lc.x, lc.y, tw, th);
          } else {
            place = findIntersectLabelPlacement(p.x, p.y, tw, th, plotBounds, intersectStrokes, intersectPlacedBoxes, pt.axis);
          }
          const tail = closestPointOnRect(p.x, p.y, place);
          svg += `<line x1="${p.x.toFixed(2)}" y1="${p.y.toFixed(2)}" x2="${tail.x.toFixed(2)}" y2="${tail.y.toFixed(2)}" stroke="${col}" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.55"/>`;
          svg += `<text x="${place.cx.toFixed(2)}" y="${place.cy.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" fill="${col}" font-size="12">${lbl}</text>`;
          intersectPlacedBoxes.push(place);
        }
      });
    }

    path.points.forEach(pt => { const p = g2c(pt.x, pt.y); svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${path.color}" stroke="${bgExport}" stroke-width="2"/>`; });
  });

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

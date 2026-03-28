import { app } from '../state.js';
import { MARGIN } from '../constants.js';
import { g2c, cssVar, visibleGraphRange } from '../coords.js';
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
import { repeatOffsets, buildStatsText } from '../export/sceneData.js';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildSvgString({ transparent = false, includeStats = false, scale = 1 } = {}) {
  const { W, H, dpr, graphRange, gridStep, axisLabels, paths, objects, showIntersects,
          intersectionLabelPositions, intersectionCalloutModes, intersectionMarkerShapes,
          zoom, panX, panY, infiniteGrid, masterAxisRollover, slaveAxisRollover } = app;
  const intLabelPos = intersectionLabelPositions || {};
  const intCalloutModes = intersectionCalloutModes || {};
  const intMarkerShapes = intersectionMarkerShapes || {};
  const sw = W / dpr, sh = H / dpr;
  const bgExport = cssVar('--bg-deep');
  const pL = MARGIN.left, pR = sw - MARGIN.right, pT = MARGIN.top, pB = sh - MARGIN.bottom;
  const pw = pR - pL, ph = pB - pT;
  const xR = graphRange.xMax - graphRange.xMin, yR = graphRange.yMax - graphRange.yMin;
  const gridCol = cssVar('--border'), axisCol = cssVar('--axis-color');
  const tickCol = cssVar('--axis-tick'), titleCol = cssVar('--axis-title');
  const minor = cssVar('--grid-minor'), major = cssVar('--grid-major');
  const cycleX = xR, cycleY = yR;

  let statsHeight = 0;
  let statsLines = [];
  if (includeStats) {
    statsLines = buildStatsText();
    statsHeight = statsLines.length * 16 + 24;
  }

  const totalH = sh + statsHeight;

  const tx = panX * zoom - panX + sw * (1 - zoom) / 2;
  const ty = panY * zoom - panY + sh * (1 - zoom) / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sw * scale}" height="${totalH * scale}" viewBox="0 0 ${sw} ${totalH}">`;
  svg += `<defs><style>text{font-family:'JetBrains Mono',monospace}</style></defs>`;

  if (!transparent) {
    svg += `<rect width="100%" height="100%" fill="${bgExport}"/>`;
  }

  svg += `<g transform="translate(${tx.toFixed(3)},${ty.toFixed(3)}) scale(${zoom})">`;

  // --- Grid ---
  let xLo = graphRange.xMin, xHi = graphRange.xMax;
  let yLo = graphRange.yMin, yHi = graphRange.yMax;
  let drawTop = pT, drawBot = pB, drawLeft = pL, drawRight = pR;

  if (infiniteGrid) {
    const vis = visibleGraphRange();
    xLo = vis.xMin; xHi = vis.xMax;
    yLo = vis.yMin; yHi = vis.yMax;
    drawTop = -1e4; drawBot = 1e4; drawLeft = -1e4; drawRight = 1e4;
  }

  for (let v = Math.ceil(xLo / gridStep.x) * gridStep.x; v <= xHi; v += gridStep.x) {
    const x = pL + ((v - graphRange.xMin) / xR) * pw;
    const maj = v % (gridStep.x * 4) === 0 || v === 0;
    svg += `<line x1="${x.toFixed(2)}" y1="${drawTop}" x2="${x.toFixed(2)}" y2="${drawBot}" stroke="${maj ? major : minor}" stroke-width="${maj ? 0.8 : 0.5}"/>`;
  }
  for (let v = Math.ceil(yLo / gridStep.y) * gridStep.y; v <= yHi; v += gridStep.y) {
    const y = pB - ((v - graphRange.yMin) / yR) * ph;
    const maj = v % (gridStep.y * 4) === 0 || v === 0;
    svg += `<line x1="${drawLeft}" y1="${y.toFixed(2)}" x2="${drawRight}" y2="${y.toFixed(2)}" stroke="${maj ? major : minor}" stroke-width="${maj ? 0.8 : 0.5}"/>`;
  }

  if (infiniteGrid) {
    const rangeCol = cssVar('--axis-color');
    svg += `<rect x="${pL}" y="${pT}" width="${pw}" height="${ph}" fill="none" stroke="${rangeCol}" stroke-width="1" stroke-dasharray="6,4" opacity="0.5"/>`;
  }

  // --- Axes ---
  svg += `<line x1="${pL}" y1="${pT}" x2="${pL}" y2="${pB}" stroke="${axisCol}" stroke-width="1.5"/>`;
  svg += `<line x1="${pL}" y1="${pB}" x2="${pR}" y2="${pB}" stroke="${axisCol}" stroke-width="1.5"/>`;

  for (let v = Math.ceil(xLo / gridStep.x) * gridStep.x; v <= xHi; v += gridStep.x) {
    const x = pL + ((v - graphRange.xMin) / xR) * pw;
    let lbl = v;
    if (masterAxisRollover && cycleX > 0) {
      lbl = ((v - graphRange.xMin) % cycleX + cycleX) % cycleX + graphRange.xMin;
      lbl = +lbl.toFixed(6);
    }
    svg += `<text x="${x.toFixed(2)}" y="${pB + 18}" text-anchor="middle" fill="${tickCol}" font-size="12">${lbl}</text>`;
    svg += `<line x1="${x.toFixed(2)}" y1="${pB}" x2="${x.toFixed(2)}" y2="${pB + 4}" stroke="${axisCol}" stroke-width="1"/>`;
  }
  for (let v = Math.ceil(yLo / gridStep.y) * gridStep.y; v <= yHi; v += gridStep.y) {
    const y = pB - ((v - graphRange.yMin) / yR) * ph;
    let lbl = v;
    if (slaveAxisRollover && cycleY > 0) {
      lbl = ((v - graphRange.yMin) % cycleY + cycleY) % cycleY + graphRange.yMin;
      lbl = +lbl.toFixed(6);
    }
    svg += `<text x="${pL - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end" fill="${tickCol}" font-size="12">${lbl}</text>`;
    svg += `<line x1="${pL - 4}" y1="${y.toFixed(2)}" x2="${pL}" y2="${y.toFixed(2)}" stroke="${axisCol}" stroke-width="1"/>`;
  }

  svg += `<text x="${pL + pw / 2}" y="${pB + 36}" text-anchor="middle" fill="${titleCol}" font-size="13" font-family="'IBM Plex Sans',sans-serif">${esc(axisLabels.x)}</text>`;
  svg += `<text x="14" y="${pT + ph / 2}" text-anchor="middle" fill="${titleCol}" font-size="13" font-family="'IBM Plex Sans',sans-serif" transform="rotate(-90,14,${pT + ph / 2})">${esc(axisLabels.y)}</text>`;

  // --- Ref Lines (hline/vline with repeat offsets) ---
  const vOffsets = repeatOffsets();
  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'hline') {
      const p = g2c(0, o.value);
      const col = o.color || cssVar('--ref-hline');
      svg += `<line x1="${drawLeft}" y1="${p.y.toFixed(2)}" x2="${drawRight}" y2="${p.y.toFixed(2)}" stroke="${col}" stroke-width="1" stroke-dasharray="6,4"/>`;
      const pos = o.labelPos !== undefined ? o.labelPos : 1.0;
      const side = o.labelSide || 'above';
      const lx = pL + pos * (pR - pL);
      const lbl = (o.label ? o.label + ' ' : '') + o.value.toFixed(1);
      const anchor = pos > 0.5 ? 'end' : 'start';
      const yOff = side === 'above' ? -5 : 15;
      svg += `<text x="${(pos > 0.5 ? lx - 4 : lx + 4).toFixed(2)}" y="${(p.y + yOff).toFixed(2)}" text-anchor="${anchor}" fill="${col}" font-size="12">${esc(lbl)}</text>`;
    }
    if (o.type === 'vline') {
      vOffsets.forEach(off => {
        const isPrimary = off === 0;
        const p = g2c(o.value + off, 0);
        const col = o.color || cssVar('--ref-vline');
        svg += `<line x1="${p.x.toFixed(2)}" y1="${drawTop}" x2="${p.x.toFixed(2)}" y2="${drawBot}" stroke="${col}" stroke-width="1" stroke-dasharray="6,4"${isPrimary ? '' : ' opacity="0.35"'}/>`;
        if (isPrimary) {
          const pos = o.labelPos !== undefined ? o.labelPos : 0.0;
          const side = o.labelSide || 'right';
          const ly = pT + pos * (pB - pT);
          const lbl = (o.label ? o.label + ' ' : '') + o.value.toFixed(1);
          const anchor = side === 'right' ? 'start' : 'end';
          const xOff = side === 'right' ? 4 : -4;
          svg += `<text x="${(p.x + xOff).toFixed(2)}" y="${(ly + 14).toFixed(2)}" text-anchor="${anchor}" fill="${col}" font-size="12">${esc(lbl)}</text>`;
        }
      });
    }
  });

  // --- Splines with repeat offsets ---
  const offsets = repeatOffsets();
  const plotBounds = { left: pL, right: pR, top: pT, bottom: pB };
  const intersectStrokes = paths
    .filter(path => path.points.length >= 2)
    .map(path => {
      const samples = sampleSpline(path, 80);
      return { points: samples.map(s => g2c(s.x, s.y)), halfWidth: Math.max(1, (path.width || 2) / 2) };
    });
  let intersectPlacedBoxes = [];

  paths.forEach(path => {
    if (path.points.length < 2) return;
    const samples = sampleSpline(path, 60);

    offsets.forEach(off => {
      const isPrimary = off === 0;
      let d = '';
      samples.forEach((s, i) => { const p = g2c(s.x + off, s.y); d += (i === 0 ? 'M' : 'L') + `${p.x.toFixed(2)},${p.y.toFixed(2)} `; });
      svg += `<path d="${d}" fill="none" stroke="${path.color}" stroke-width="${path.width}"${isPrimary ? '' : ' opacity="0.35"'}/>`;
    });

    const pts = sortedPoints(path.points);
    const aLen = 25, scaleRatio = (ph / yR) / (pw / xR);
    [[pts[0], path.startSlope], [pts[pts.length - 1], path.endSlope]].forEach(([pt, slope]) => {
      const p = g2c(pt.x, pt.y);
      const dxC = aLen, dyC = -slope * scaleRatio * aLen;
      svg += `<line x1="${(p.x - dxC).toFixed(2)}" y1="${(p.y - dyC).toFixed(2)}" x2="${(p.x + dxC).toFixed(2)}" y2="${(p.y + dyC).toFixed(2)}" stroke="${cssVar('--accent-orange')}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.5"/>`;
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
          svg += `<text x="${place.cx.toFixed(2)}" y="${place.cy.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" fill="${col}" font-size="12">${esc(lbl)}</text>`;
          intersectPlacedBoxes.push(place);
        }
      });
    }

    // Points with repeat offsets
    offsets.forEach(off => {
      const isPrimary = off === 0;
      path.points.forEach(pt => {
        const p = g2c(pt.x + off, pt.y);
        svg += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5" fill="${path.color}" stroke="${transparent ? path.color : bgExport}" stroke-width="2"${isPrimary ? '' : ' opacity="0.35"'}/>`;
      });
    });
  });

  // --- Objects (line, dimension, callout) ---
  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'line') {
      const p1 = g2c(o.x1, o.y1), p2 = g2c(o.x2, o.y2);
      const col = o.color || cssVar('--accent-red');
      const ptStroke = transparent ? col : bgExport;
      svg += `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="${col}" stroke-width="1.5"${o.dashed ? ' stroke-dasharray="5,4"' : ''}/>`;
      svg += `<circle cx="${p1.x.toFixed(2)}" cy="${p1.y.toFixed(2)}" r="4" fill="${col}" stroke="${ptStroke}" stroke-width="1"/>`;
      svg += `<circle cx="${p2.x.toFixed(2)}" cy="${p2.y.toFixed(2)}" r="4" fill="${col}" stroke="${ptStroke}" stroke-width="1"/>`;
    }
    if (o.type === 'dimension') {
      const p1 = g2c(o.x1, o.y1), p2 = g2c(o.x2, o.y2);
      const col = o.color || cssVar('--accent-orange');
      svg += `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="${col}" stroke-width="1"/>`;
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x), perp = ang + Math.PI / 2;
      [p1, p2].forEach(p => {
        svg += `<line x1="${(p.x + Math.cos(perp) * 8).toFixed(2)}" y1="${(p.y + Math.sin(perp) * 8).toFixed(2)}" x2="${(p.x - Math.cos(perp) * 8).toFixed(2)}" y2="${(p.y - Math.sin(perp) * 8).toFixed(2)}" stroke="${col}" stroke-width="1"/>`;
      });
      const dimPtStroke = transparent ? col : bgExport;
      svg += `<circle cx="${p1.x.toFixed(2)}" cy="${p1.y.toFixed(2)}" r="4" fill="${col}" stroke="${dimPtStroke}" stroke-width="1"/>`;
      svg += `<circle cx="${p2.x.toFixed(2)}" cy="${p2.y.toFixed(2)}" r="4" fill="${col}" stroke="${dimPtStroke}" stroke-width="1"/>`;
      const dx = o.x2 - o.x1, dy = o.y2 - o.y1, dist = Math.sqrt(dx * dx + dy * dy);
      const midGx = (o.x1 + o.x2) / 2, midGy = (o.y1 + o.y2) / 2;
      const lblGx = o.labelX !== undefined ? o.labelX : midGx;
      const lblGy = o.labelY !== undefined ? o.labelY : midGy + 5;
      const lblP = g2c(lblGx, lblGy), midP = g2c(midGx, midGy);
      if (o.labelX !== undefined) {
        svg += `<line x1="${midP.x.toFixed(2)}" y1="${midP.y.toFixed(2)}" x2="${lblP.x.toFixed(2)}" y2="${(lblP.y + 6).toFixed(2)}" stroke="${col}" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.5"/>`;
      }
      svg += `<text x="${lblP.x.toFixed(2)}" y="${(lblP.y - 4).toFixed(2)}" text-anchor="middle" fill="${col}" font-size="12">\u0394=${dist.toFixed(2)} (\u0394x=${Math.abs(dx).toFixed(1)}, \u0394y=${Math.abs(dy).toFixed(1)})</text>`;
    }
    if (o.type === 'callout') {
      const p = g2c(o.x, o.y);
      const fontSize = o.fontSize || 13;
      const bgCol = o.bgColor || cssVar('--callout-bg');
      const borderCol = o.borderColor || cssVar('--callout-border');
      const txtCol = o.textColor || cssVar('--callout-text');
      const estW = o.text.length * fontSize * 0.6 + 14, h = fontSize + 10;
      if (o.anchorX !== undefined) {
        const a = g2c(o.anchorX, o.anchorY);
        svg += `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${p.x.toFixed(2)}" y2="${(p.y + h / 2).toFixed(2)}" stroke="${borderCol}" stroke-width="1"/>`;
        svg += `<circle cx="${a.x.toFixed(2)}" cy="${a.y.toFixed(2)}" r="4" fill="${borderCol}" stroke="${transparent ? borderCol : bgExport}" stroke-width="1"/>`;
      }
      svg += `<rect x="${(p.x - estW / 2).toFixed(2)}" y="${(p.y - h / 2).toFixed(2)}" width="${estW.toFixed(2)}" height="${h}" rx="3" fill="${bgCol}" stroke="${borderCol}" stroke-width="1"/>`;
      svg += `<text x="${p.x.toFixed(2)}" y="${(p.y + fontSize * 0.35).toFixed(2)}" text-anchor="middle" fill="${txtCol}" font-size="${fontSize}" font-family="'IBM Plex Sans',sans-serif">${esc(o.text)}</text>`;
    }
  });

  svg += `</g>`;

  // --- Stats block (below the graph) ---
  if (includeStats && statsLines.length > 0) {
    const statsY = sh + 10;
    const statsFill = cssVar('--text-dim');
    statsLines.forEach((line, i) => {
      const isHeader = line.startsWith('\u2500');
      const fill = isHeader ? cssVar('--text-secondary') : statsFill;
      svg += `<text x="12" y="${(statsY + i * 16 + 14).toFixed(1)}" fill="${fill}" font-size="11">${esc(line)}</text>`;
    });
  }

  svg += '</svg>';
  return svg;
}

export function exportSvg(opts = {}) {
  const svg = buildSvgString(opts);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'cam-profile.svg'; a.click();
  URL.revokeObjectURL(url);
}

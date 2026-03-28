import { app } from './state.js';
import { MARGIN } from './constants.js';
import { g2c, c2g, maySnap, cssVar, c2gFromLogical, canvasLogicalToScreen } from './coords.js';
import { sortedPoints, sampleSpline } from './spline.js';
import {
  computeIntersections,
  intersectHitColor,
  findIntersectLabelPlacement,
  closestPointOnRect,
  intersectionLabelKey,
  makeIntersectTextBox,
  intersectionCalloutLabel,
  effectiveCalloutMode
} from './intersectLabels.js';
import { drawIntersectionMarker } from './intersectMarkers.js';

export function resize() {
  const r = app.container.getBoundingClientRect();
  app.W = r.width * app.dpr;
  app.H = r.height * app.dpr;
  app.canvas.width = app.W;
  app.canvas.height = app.H;
  app.canvas.style.width = r.width + 'px';
  app.canvas.style.height = r.height + 'px';
  draw();
}

export function draw() {
  const { ctx, W, H, dpr, zoom, panX, panY } = app;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = cssVar('--bg-deep');
  ctx.fillRect(0, 0, W / dpr, H / dpr);
  ctx.save();
  ctx.translate(panX * zoom - panX + (W / dpr) * (1 - zoom) / 2, panY * zoom - panY + (H / dpr) * (1 - zoom) / 2);
  ctx.scale(zoom, zoom);
  drawGrid(); drawAxes(); drawRefLines(); drawSplines(); drawIntersects(); drawPoints(); drawObjects(); drawPreview();
  ctx.restore();
}

function drawPreview() {
  if (!app.lineStart) return;
  if (app.activeTool !== 'line' && app.activeTool !== 'dimension') return;
  const ctx = app.ctx;
  const gp = c2g(app.mouseCanvasX, app.mouseCanvasY);
  const s = maySnap(gp.x, gp.y, false);
  const p1 = g2c(app.lineStart.x, app.lineStart.y);
  const p2 = g2c(s.x, s.y);
  const col = app.activeTool === 'line' ? cssVar('--accent-red') : cssVar('--accent-orange');
  ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
  ctx.beginPath(); ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1.0;
  if (app.activeTool === 'dimension') {
    const dx = s.x - app.lineStart.x, dy = s.y - app.lineStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    ctx.fillStyle = col; ctx.font = '12px "JetBrains Mono",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(`\u0394=${dist.toFixed(1)}`, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 8);
  }
}

function drawGrid() {
  const { ctx, W, H, dpr } = app;
  const { graphRange, gridStep } = app;
  const pL = MARGIN.left, pR = W / dpr - MARGIN.right, pT = MARGIN.top, pB = H / dpr - MARGIN.bottom;
  const pw = pR - pL, ph = pB - pT, xR = graphRange.xMax - graphRange.xMin, yR = graphRange.yMax - graphRange.yMin;
  const minor = cssVar('--grid-minor'), major = cssVar('--grid-major');
  for (let v = Math.ceil(graphRange.xMin / gridStep.x) * gridStep.x; v <= graphRange.xMax; v += gridStep.x) {
    const x = pL + ((v - graphRange.xMin) / xR) * pw, maj = v % (gridStep.x * 4) === 0 || v === 0;
    ctx.strokeStyle = maj ? major : minor; ctx.lineWidth = maj ? 0.8 : 0.5;
    ctx.beginPath(); ctx.moveTo(x, pT); ctx.lineTo(x, pB); ctx.stroke();
  }
  for (let v = Math.ceil(graphRange.yMin / gridStep.y) * gridStep.y; v <= graphRange.yMax; v += gridStep.y) {
    const y = pB - ((v - graphRange.yMin) / yR) * ph, maj = v % (gridStep.y * 4) === 0 || v === 0;
    ctx.strokeStyle = maj ? major : minor; ctx.lineWidth = maj ? 0.8 : 0.5;
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pR, y); ctx.stroke();
  }
}

function drawAxes() {
  const { ctx, W, H, dpr } = app;
  const { graphRange, gridStep, axisLabels } = app;
  const pL = MARGIN.left, pR = W / dpr - MARGIN.right, pT = MARGIN.top, pB = H / dpr - MARGIN.bottom;
  const pw = pR - pL, ph = pB - pT, xR = graphRange.xMax - graphRange.xMin, yR = graphRange.yMax - graphRange.yMin;
  const axCol = cssVar('--axis-color'), tickCol = cssVar('--axis-tick'), titleCol = cssVar('--axis-title');
  ctx.strokeStyle = axCol; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pL, pT); ctx.lineTo(pL, pB); ctx.lineTo(pR, pB); ctx.stroke();
  ctx.fillStyle = tickCol; ctx.font = '12px "JetBrains Mono",monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let v = Math.ceil(graphRange.xMin / gridStep.x) * gridStep.x; v <= graphRange.xMax; v += gridStep.x) {
    const x = pL + ((v - graphRange.xMin) / xR) * pw;
    ctx.fillText(v + '', x, pB + 6);
    ctx.beginPath(); ctx.moveTo(x, pB); ctx.lineTo(x, pB + 4); ctx.strokeStyle = axCol; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = Math.ceil(graphRange.yMin / gridStep.y) * gridStep.y; v <= graphRange.yMax; v += gridStep.y) {
    const y = pB - ((v - graphRange.yMin) / yR) * ph;
    ctx.fillText(v + '', pL - 8, y);
    ctx.beginPath(); ctx.moveTo(pL - 4, y); ctx.lineTo(pL, y); ctx.strokeStyle = axCol; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.fillStyle = titleCol; ctx.font = '13px "IBM Plex Sans",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(axisLabels.x, pL + pw / 2, pB + 30);
  ctx.save(); ctx.translate(14, pT + ph / 2); ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle'; ctx.fillText(axisLabels.y, 0, 0); ctx.restore();
}

function drawRefLines() {
  const { ctx, W, H, dpr, objects } = app;
  const pL = MARGIN.left, pR = W / dpr - MARGIN.right, pT = MARGIN.top, pB = H / dpr - MARGIN.bottom;
  const defH = cssVar('--ref-hline'), defV = cssVar('--ref-vline');
  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'hline') {
      const p = g2c(0, o.value); const col = o.color || defH;
      ctx.setLineDash([6, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pL, p.y); ctx.lineTo(pR, p.y); ctx.stroke(); ctx.setLineDash([]);
      const pos = o.labelPos !== undefined ? o.labelPos : 1.0;
      const side = o.labelSide || 'above';
      const lx = pL + pos * (pR - pL);
      ctx.fillStyle = col; ctx.font = '12px "JetBrains Mono",monospace';
      ctx.textAlign = pos > 0.5 ? 'right' : 'left';
      ctx.textBaseline = side === 'above' ? 'bottom' : 'top';
      const lbl = (o.label ? o.label + ' ' : '') + o.value.toFixed(1);
      const yOff = side === 'above' ? -3 : 3;
      ctx.fillText(lbl, pos > 0.5 ? lx - 4 : lx + 4, p.y + yOff);
    }
    if (o.type === 'vline') {
      const p = g2c(o.value, 0); const col = o.color || defV;
      ctx.setLineDash([6, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x, pT); ctx.lineTo(p.x, pB); ctx.stroke(); ctx.setLineDash([]);
      const pos = o.labelPos !== undefined ? o.labelPos : 0.0;
      const side = o.labelSide || 'right';
      const ly = pT + pos * (pB - pT);
      ctx.fillStyle = col; ctx.font = '12px "JetBrains Mono",monospace';
      ctx.textAlign = side === 'right' ? 'left' : 'right';
      ctx.textBaseline = pos < 0.5 ? 'top' : 'bottom';
      const lbl = (o.label ? o.label + ' ' : '') + o.value.toFixed(1);
      const xOff = side === 'right' ? 4 : -4;
      ctx.fillText(lbl, p.x + xOff, ly + 4);
    }
  });
}

function drawSplines() {
  const { ctx, W, H, dpr, graphRange } = app;
  app.paths.forEach(path => {
    if (path.points.length < 2) return;
    const samples = sampleSpline(path, 50);
    if (samples.length < 2) return;
    ctx.strokeStyle = path.color; ctx.lineWidth = path.width;
    ctx.beginPath();
    const s0 = g2c(samples[0].x, samples[0].y); ctx.moveTo(s0.x, s0.y);
    for (let i = 1; i < samples.length; i++) { const s = g2c(samples[i].x, samples[i].y); ctx.lineTo(s.x, s.y); }
    ctx.stroke();

    const pts = sortedPoints(path.points);
    if (pts.length >= 2) {
      const aLen = 25;
      const pw = W / dpr - MARGIN.left - MARGIN.right, ph = H / dpr - MARGIN.top - MARGIN.bottom;
      const xR = graphRange.xMax - graphRange.xMin, yR = graphRange.yMax - graphRange.yMin;
      const scaleRatio = (ph / yR) / (pw / xR);
      [[pts[0], path.startSlope], [pts[pts.length - 1], path.endSlope]].forEach(([pt, slope]) => {
        const p = g2c(pt.x, pt.y);
        const dxC = aLen, dyC = -slope * scaleRatio * aLen;
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = cssVar('--accent-orange'); ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(p.x - dxC, p.y - dyC); ctx.lineTo(p.x + dxC, p.y + dyC); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });
    }
  });
}

function drawPoints() {
  const { ctx, H, dpr, selectedPoint } = app;
  const selCol = cssVar('--point-selected'), bgCol = cssVar('--bg-deep');
  app.paths.forEach(path => {
    path.points.forEach((pt, i) => {
      const p = g2c(pt.x, pt.y);
      const sel = selectedPoint && selectedPoint.pathId === path.id && selectedPoint.pointIndex === i;
      const r = sel ? 7 : 5;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = sel ? selCol : path.color; ctx.fill();
      ctx.strokeStyle = bgCol; ctx.lineWidth = 2; ctx.stroke();
      if (sel) {
        ctx.setLineDash([3, 3]); ctx.strokeStyle = cssVar('--point-selected-dim'); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, H / dpr - MARGIN.bottom);
        ctx.moveTo(p.x, p.y); ctx.lineTo(MARGIN.left, p.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = selCol; ctx.font = '12px "JetBrains Mono",monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(`(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`, p.x + 10, p.y - 6);
      }
    });
  });
}

function drawIntersects() {
  const { ctx, showIntersects, graphRange, objects, W, H, dpr } = app;
  if (!showIntersects) {
    app._intersectLabelHits = [];
    app._intersectMarkerHits = [];
    return;
  }

  const allInts = [];
  const pathSamples = new Map();
  const pL = MARGIN.left, pR = W / dpr - MARGIN.right, pT = MARGIN.top, pB = H / dpr - MARGIN.bottom;
  const plot = { left: pL, right: pR, top: pT, bottom: pB };

  const strokes = [];
  app.paths.forEach(path => {
    if (path.points.length < 2) return;
    const samples = sampleSpline(path, 80);
    strokes.push({
      points: samples.map(s => g2c(s.x, s.y)),
      halfWidth: Math.max(1, (path.width || 2) / 2)
    });
  });

  app.paths.forEach(path => {
    if (path.points.length < 2) return;
    const samples = sampleSpline(path, 80);
    pathSamples.set(path.id, samples);
    const ints = computeIntersections(samples, graphRange, objects, path.id);
    ints.forEach(int => allInts.push({ ...int, pathId: path.id, pathColor: path.color }));
  });

  const defIc = cssVar('--intersect-default');
  const selCyan = cssVar('--accent-cyan');
  const markerShapes = app.intersectionMarkerShapes;
  app._intersectMarkerHits = [];
  allInts.forEach(pt => {
    const p = g2c(pt.x, pt.y);
    const key = intersectionLabelKey(pt.pathId, pt);
    const scr = canvasLogicalToScreen(p.x, p.y);
    app._intersectMarkerHits.push({ key, sx: scr.x, sy: scr.y });
    const { x: px, y: py } = p;
    const sel = app.selectedIntersectionKey === key;
    const shape = markerShapes[key] || 'brackets';
    const hitCol = intersectHitColor(pt, objects, cssVar);
    const strokeCol = sel ? selCyan : hitCol || defIc;
    const lw = sel ? 2.5 : 2;
    drawIntersectionMarker(ctx, shape, px, py, strokeCol, lw);
  });

  ctx.font = '12px "JetBrains Mono",monospace';
  const placedBoxes = [];
  const positions = app.intersectionLabelPositions;
  const calloutModes = app.intersectionCalloutModes;
  app._intersectLabelHits = [];
  const hitPad = 4;
  allInts.forEach(pt => {
    const p = g2c(pt.x, pt.y);
    const key = intersectionLabelKey(pt.pathId, pt);
    const eff = effectiveCalloutMode(pt, calloutModes[key]);
    const lbl = intersectionCalloutLabel(pt, eff);
    if (lbl === null) return;

    const col = intersectHitColor(pt, objects, cssVar);
    const tw = ctx.measureText(lbl).width;
    const th = 14;
    const ovr = positions[key];
    let place;
    if (ovr) {
      const lc = g2c(ovr.gx, ovr.gy);
      place = makeIntersectTextBox(lc.x, lc.y, tw, th);
    } else {
      place = findIntersectLabelPlacement(p.x, p.y, tw, th, plot, strokes, placedBoxes, pt.axis);
    }
    const tail = closestPointOnRect(p.x, p.y, place);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(tail.x, tail.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lbl, place.cx, place.cy);
    placedBoxes.push(place);
    const tl = canvasLogicalToScreen(place.left - hitPad, place.top - hitPad);
    const br = canvasLogicalToScreen(place.right + hitPad, place.bottom + hitPad);
    const labelG = ovr ? { gx: ovr.gx, gy: ovr.gy } : c2gFromLogical(place.cx, place.cy);
    app._intersectLabelHits.push({
      key,
      left: Math.min(tl.x, br.x),
      right: Math.max(tl.x, br.x),
      top: Math.min(tl.y, br.y),
      bottom: Math.max(tl.y, br.y),
      labelGx: labelG.x,
      labelGy: labelG.y
    });
  });

  const el = document.getElementById('intersectList');
  if (allInts.length) {
    el.innerHTML = allInts.map((p, idx) => {
      const slopeStr = Math.abs(p.slope) > 1e6 ? '\u221E' : p.slope.toFixed(3);
      const pathIdx = app.paths.findIndex(pa => pa.id === p.pathId) + 1;
      return `<div class="intersect-item"><span style="color:${p.pathColor}">P${pathIdx} ${p.axis}</span> X=${p.x.toFixed(2)} Y=${p.y.toFixed(2)} m=${slopeStr}</div>`;
    }).join('');
  } else {
    el.innerHTML = '<div style="font-size:10px;color:var(--text-dim)">No intersections</div>';
  }

  const pmSection = document.getElementById('pathMeasureSection');
  const pmList = document.getElementById('pathMeasureList');
  const byPath = {};
  allInts.forEach(int => {
    if (!byPath[int.pathId]) byPath[int.pathId] = { ints: [], color: int.pathColor };
    byPath[int.pathId].ints.push(int);
  });

  let pmHtml = '';
  let anyMeasures = false;
  for (const [pathId, data] of Object.entries(byPath)) {
    if (data.ints.length < 2) continue;
    anyMeasures = true;
    const samples = pathSamples.get(parseInt(pathId));
    const sortedInts = [...data.ints].sort((a, b) => a.x - b.x);
    const pathIdx = app.paths.findIndex(p => p.id === parseInt(pathId)) + 1;
    pmHtml += `<div style="font-size:10px;color:${data.color};font-family:'JetBrains Mono',monospace;margin-top:4px;">Path ${pathIdx}</div>`;
    for (let k = 0; k < sortedInts.length - 1; k++) {
      const ia = sortedInts[k], ib = sortedInts[k + 1];
      let arcLen = 0;
      for (let j = 0; j < samples.length - 1; j++) {
        const sx = samples[j].x, snx = samples[j + 1].x;
        if (sx >= ia.x && snx <= ib.x) {
          const ddx = samples[j + 1].x - samples[j].x;
          const ddy = samples[j + 1].y - samples[j].y;
          arcLen += Math.sqrt(ddx * ddx + ddy * ddy);
        }
      }
      const dxS = ib.x - ia.x, dyS = ib.y - ia.y;
      const straight = Math.sqrt(dxS * dxS + dyS * dyS);
      pmHtml += `<div class="intersect-item"><span style="color:${data.color}">${k + 1}\u2192${k + 2}</span> path=${arcLen.toFixed(2)} straight=${straight.toFixed(2)}</div>`;
    }
  }

  if (anyMeasures) {
    pmList.innerHTML = pmHtml;
    pmSection.style.display = 'block';
  } else {
    pmSection.style.display = allInts.length ? 'block' : 'none';
    pmList.innerHTML = '<div style="font-size:10px;color:var(--text-dim)">Need 2+ intersects</div>';
  }
}

function drawObjects() {
  const { ctx, objects, selectedObjectId } = app;
  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'callout') {
      const p = g2c(o.x, o.y), sel = selectedObjectId === o.id;
      const fontSize = o.fontSize || 13;
      ctx.font = fontSize + 'px "IBM Plex Sans",sans-serif';
      const w = ctx.measureText(o.text).width + 14, h = fontSize + 10;
      if (o.anchorX !== undefined) {
        const a = g2c(o.anchorX, o.anchorY);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y + h / 2);
        ctx.strokeStyle = sel ? cssVar('--accent-cyan') : (o.borderColor || cssVar('--callout-border')); ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(a.x, a.y, sel ? 5 : 4, 0, Math.PI * 2); ctx.fillStyle = sel ? cssVar('--accent-cyan') : (o.borderColor || cssVar('--callout-border')); ctx.fill();
        ctx.strokeStyle = cssVar('--bg-deep'); ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.fillStyle = sel ? cssVar('--accent-cyan-subtle') : (o.bgColor || cssVar('--callout-bg'));
      ctx.strokeStyle = sel ? cssVar('--accent-cyan') : (o.borderColor || cssVar('--callout-border')); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(p.x - w / 2, p.y - h / 2, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sel ? cssVar('--accent-cyan') : (o.textColor || cssVar('--callout-text')); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.text, p.x, p.y);
    }
    if (o.type === 'line') {
      const p1 = g2c(o.x1, o.y1), p2 = g2c(o.x2, o.y2), sel = selectedObjectId === o.id;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = sel ? cssVar('--accent-cyan') : (o.color || cssVar('--accent-red')); ctx.lineWidth = sel ? 2 : 1.5;
      ctx.setLineDash(o.dashed ? [5, 4] : []); ctx.stroke(); ctx.setLineDash([]);
      [p1, p2].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, sel ? 5 : 4, 0, Math.PI * 2); ctx.fillStyle = sel ? cssVar('--accent-cyan') : (o.color || cssVar('--accent-red')); ctx.fill(); ctx.strokeStyle = cssVar('--bg-deep'); ctx.lineWidth = 1; ctx.stroke(); });
    }
    if (o.type === 'dimension') {
      const p1 = g2c(o.x1, o.y1), p2 = g2c(o.x2, o.y2), sel = selectedObjectId === o.id;
      const col = sel ? cssVar('--accent-cyan') : (o.color || cssVar('--accent-orange'));
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x), perp = ang + Math.PI / 2;
      [p1, p2].forEach(p => { ctx.beginPath(); ctx.moveTo(p.x + Math.cos(perp) * 8, p.y + Math.sin(perp) * 8); ctx.lineTo(p.x - Math.cos(perp) * 8, p.y - Math.sin(perp) * 8); ctx.stroke(); });
      [p1, p2].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, sel ? 5 : 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = cssVar('--bg-deep'); ctx.lineWidth = 1; ctx.stroke(); });
      const dx = o.x2 - o.x1, dy = o.y2 - o.y1, dist = Math.sqrt(dx * dx + dy * dy);
      const dimText = `\u0394=${dist.toFixed(2)} (\u0394x=${Math.abs(dx).toFixed(1)}, \u0394y=${Math.abs(dy).toFixed(1)})`;
      const midGx = (o.x1 + o.x2) / 2, midGy = (o.y1 + o.y2) / 2;
      const lblGx = o.labelX !== undefined ? o.labelX : midGx;
      const lblGy = o.labelY !== undefined ? o.labelY : midGy + 5;
      const lblP = g2c(lblGx, lblGy);
      const midP = g2c(midGx, midGy);
      if (o.labelX !== undefined) {
        ctx.setLineDash([3, 3]); ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(midP.x, midP.y); ctx.lineTo(lblP.x, lblP.y + 6); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = col; ctx.font = '12px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(dimText, lblP.x, lblP.y);
    }
  });
}

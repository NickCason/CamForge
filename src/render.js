import { app } from './state.js';
import { MARGIN } from './constants.js';
import { g2c, c2g, cssVar, c2gFromLogical, canvasLogicalToScreen, visibleGraphRange } from './coords.js';
import { resolveSnap } from './snapEngine.js';
import { sortedPoints, sampleSpline } from './spline.js';
import {
  intersectHitColor,
  findIntersectLabelPlacement,
  closestPointOnRect,
  intersectionLabelKey,
  makeIntersectTextBox,
  intersectionCalloutLabel,
  effectiveCalloutMode
} from './intersectLabels.js';
import { drawIntersectionMarker } from './intersectMarkers.js';
import { repeatOffsets, collectIntersectionData } from './export/sceneData.js';

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
  paintScene(ctx, { exportMode: false });
  drawPreview(ctx);
  drawSnapReticle(ctx);
  ctx.restore();
}

export function paintScene(ctx, opts = {}) {
  const { exportMode = false, transparent = false } = opts;
  drawGrid(ctx);
  drawAxes(ctx);
  drawRefLines(ctx);
  drawSplines(ctx);
  if (app.showIntersects) {
    const intData = collectIntersectionData();
    paintIntersections(ctx, intData);
    if (!exportMode) syncIntersectionPanels(intData);
  } else if (!exportMode) {
    app._intersectLabelHits = [];
    app._intersectMarkerHits = [];
    const el = document.getElementById('intersectList');
    if (el) el.innerHTML = '<div style="font-size:10px;color:var(--text-dim)">No intersections</div>';
    const pmSection = document.getElementById('pathMeasureSection');
    if (pmSection) pmSection.style.display = 'none';
  }
  drawPoints(ctx, exportMode, transparent);
  drawObjects(ctx, exportMode, transparent);
}

export function exportGraphToCanvas(targetCanvas, { transparent = false, scale = 1 } = {}) {
  const origCtx = app.ctx;
  const origW = app.W;
  const origH = app.H;
  const origDpr = app.dpr;
  const logicalW = origW / origDpr;
  const logicalH = origH / origDpr;
  targetCanvas.width = logicalW * scale;
  targetCanvas.height = logicalH * scale;
  const tctx = targetCanvas.getContext('2d');
  app.ctx = tctx;
  app.W = logicalW * scale;
  app.H = logicalH * scale;
  app.dpr = scale;
  tctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (!transparent) {
    tctx.fillStyle = cssVar('--bg-deep');
    tctx.fillRect(0, 0, logicalW, logicalH);
  }
  tctx.save();
  const { zoom, panX, panY } = app;
  tctx.translate(panX * zoom - panX + logicalW * (1 - zoom) / 2,
                 panY * zoom - panY + logicalH * (1 - zoom) / 2);
  tctx.scale(zoom, zoom);
  paintScene(tctx, { exportMode: true, transparent });
  tctx.restore();
  app.ctx = origCtx;
  app.W = origW;
  app.H = origH;
  app.dpr = origDpr;
}

function drawPreview(ctx) {
  if (!app.lineStart) return;
  if (app.activeTool !== 'line' && app.activeTool !== 'dimension') return;
  const gp = c2g(app.mouseCanvasX, app.mouseCanvasY);
  const s = resolveSnap(gp.x, gp.y, { shiftKey: app.shiftDown });
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

function drawSnapReticle(ctx) {
  if (app.lastSnapKind === 'none' || app.lastSnapKind === 'grid') return;
  const p = g2c(app.lastSnapX, app.lastSnapY);
  const r = 8;
  const col = app.lastSnapKind === 'node' ? cssVar('--accent-cyan') : cssVar('--accent-green');
  ctx.save();
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x + r, p.y);
  ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x, p.y + r);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x, p.y, r + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGrid(ctx) {
  const { W, H, dpr } = app;
  const { graphRange, gridStep } = app;
  const pL = MARGIN.left, pR = W / dpr - MARGIN.right, pT = MARGIN.top, pB = H / dpr - MARGIN.bottom;
  const pw = pR - pL, ph = pB - pT, xR = graphRange.xMax - graphRange.xMin, yR = graphRange.yMax - graphRange.yMin;
  const minor = cssVar('--grid-minor'), major = cssVar('--grid-major');

  let xLo = graphRange.xMin, xHi = graphRange.xMax;
  let yLo = graphRange.yMin, yHi = graphRange.yMax;
  let drawTop = pT, drawBot = pB, drawLeft = pL, drawRight = pR;

  if (app.infiniteGrid) {
    const vis = visibleGraphRange();
    xLo = vis.xMin; xHi = vis.xMax;
    yLo = vis.yMin; yHi = vis.yMax;
    drawTop = -1e4; drawBot = 1e4; drawLeft = -1e4; drawRight = 1e4;
  }

  for (let v = Math.ceil(xLo / gridStep.x) * gridStep.x; v <= xHi; v += gridStep.x) {
    const x = pL + ((v - graphRange.xMin) / xR) * pw;
    const maj = v % (gridStep.x * 4) === 0 || v === 0;
    ctx.strokeStyle = maj ? major : minor; ctx.lineWidth = maj ? 0.8 : 0.5;
    ctx.beginPath(); ctx.moveTo(x, drawTop); ctx.lineTo(x, drawBot); ctx.stroke();
  }
  for (let v = Math.ceil(yLo / gridStep.y) * gridStep.y; v <= yHi; v += gridStep.y) {
    const y = pB - ((v - graphRange.yMin) / yR) * ph;
    const maj = v % (gridStep.y * 4) === 0 || v === 0;
    ctx.strokeStyle = maj ? major : minor; ctx.lineWidth = maj ? 0.8 : 0.5;
    ctx.beginPath(); ctx.moveTo(drawLeft, y); ctx.lineTo(drawRight, y); ctx.stroke();
  }

  if (app.infiniteGrid) {
    const rangeCol = cssVar('--axis-color');
    ctx.save();
    ctx.strokeStyle = rangeCol; ctx.lineWidth = 1; ctx.setLineDash([6, 4]); ctx.globalAlpha = 0.5;
    ctx.strokeRect(pL, pT, pw, ph);
    ctx.restore();
  }
}

function drawAxes(ctx) {
  const { W, H, dpr } = app;
  const { graphRange, gridStep, axisLabels } = app;
  const pL = MARGIN.left, pR = W / dpr - MARGIN.right, pT = MARGIN.top, pB = H / dpr - MARGIN.bottom;
  const pw = pR - pL, ph = pB - pT, xR = graphRange.xMax - graphRange.xMin, yR = graphRange.yMax - graphRange.yMin;
  const axCol = cssVar('--axis-color'), tickCol = cssVar('--axis-tick'), titleCol = cssVar('--axis-title');
  const cycleX = xR, cycleY = yR;

  ctx.strokeStyle = axCol; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pL, pT); ctx.lineTo(pL, pB); ctx.lineTo(pR, pB); ctx.stroke();

  let xLo = graphRange.xMin, xHi = graphRange.xMax;
  let yLo = graphRange.yMin, yHi = graphRange.yMax;
  if (app.infiniteGrid) {
    const vis = visibleGraphRange();
    xLo = vis.xMin; xHi = vis.xMax;
    yLo = vis.yMin; yHi = vis.yMax;
  }

  ctx.fillStyle = tickCol; ctx.font = '12px "JetBrains Mono",monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let v = Math.ceil(xLo / gridStep.x) * gridStep.x; v <= xHi; v += gridStep.x) {
    const x = pL + ((v - graphRange.xMin) / xR) * pw;
    let lbl = v;
    if (app.masterAxisRollover && cycleX > 0) {
      lbl = ((v - graphRange.xMin) % cycleX + cycleX) % cycleX + graphRange.xMin;
      lbl = +lbl.toFixed(6);
    }
    ctx.fillStyle = tickCol;
    ctx.fillText(lbl + '', x, pB + 6);
    ctx.beginPath(); ctx.moveTo(x, pB); ctx.lineTo(x, pB + 4); ctx.strokeStyle = axCol; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = Math.ceil(yLo / gridStep.y) * gridStep.y; v <= yHi; v += gridStep.y) {
    const y = pB - ((v - graphRange.yMin) / yR) * ph;
    let lbl = v;
    if (app.slaveAxisRollover && cycleY > 0) {
      lbl = ((v - graphRange.yMin) % cycleY + cycleY) % cycleY + graphRange.yMin;
      lbl = +lbl.toFixed(6);
    }
    ctx.fillStyle = tickCol;
    ctx.fillText(lbl + '', pL - 8, y);
    ctx.beginPath(); ctx.moveTo(pL - 4, y); ctx.lineTo(pL, y); ctx.strokeStyle = axCol; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.fillStyle = titleCol; ctx.font = '13px "IBM Plex Sans",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(axisLabels.x, pL + pw / 2, pB + 30);
  ctx.save(); ctx.translate(14, pT + ph / 2); ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle'; ctx.fillText(axisLabels.y, 0, 0); ctx.restore();
}

function drawRefLines(ctx) {
  const { W, H, dpr, objects } = app;
  const pL = MARGIN.left, pR = W / dpr - MARGIN.right, pT = MARGIN.top, pB = H / dpr - MARGIN.bottom;
  const defH = cssVar('--ref-hline'), defV = cssVar('--ref-vline');
  const drawLeft = app.infiniteGrid ? -1e4 : pL;
  const drawRight = app.infiniteGrid ? 1e4 : pR;
  const drawTop = app.infiniteGrid ? -1e4 : pT;
  const drawBot = app.infiniteGrid ? 1e4 : pB;
  const vOffsets = repeatOffsets();
  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'hline') {
      const p = g2c(0, o.value); const col = o.color || defH;
      ctx.setLineDash([6, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(drawLeft, p.y); ctx.lineTo(drawRight, p.y); ctx.stroke(); ctx.setLineDash([]);
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
      vOffsets.forEach(off => {
        const isPrimary = off === 0;
        const p = g2c(o.value + off, 0); const col = o.color || defV;
        ctx.save();
        if (!isPrimary) ctx.globalAlpha = 0.35;
        ctx.setLineDash([6, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, drawTop); ctx.lineTo(p.x, drawBot); ctx.stroke(); ctx.setLineDash([]);
        if (isPrimary) {
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
        ctx.restore();
      });
    }
  });
}


function drawSplines(ctx) {
  const { W, H, dpr, graphRange } = app;
  const offsets = repeatOffsets();
  app.paths.forEach(path => {
    if (path.points.length < 2) return;
    const samples = sampleSpline(path, 50);
    if (samples.length < 2) return;

    offsets.forEach(off => {
      const isPrimary = off === 0;
      ctx.save();
      if (!isPrimary) ctx.globalAlpha = 0.35;
      ctx.strokeStyle = path.color; ctx.lineWidth = path.width;
      ctx.beginPath();
      const s0 = g2c(samples[0].x + off, samples[0].y); ctx.moveTo(s0.x, s0.y);
      for (let i = 1; i < samples.length; i++) { const s = g2c(samples[i].x + off, samples[i].y); ctx.lineTo(s.x, s.y); }
      ctx.stroke();
      ctx.restore();
    });

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

function drawPoints(ctx, exportMode, transparent) {
  const { H, dpr, selectedPoint } = app;
  const selCol = cssVar('--point-selected'), bgCol = cssVar('--bg-deep');
  const offsets = repeatOffsets();
  app.paths.forEach(path => {
    path.points.forEach((pt, i) => {
      offsets.forEach(off => {
        const isPrimary = off === 0;
        const p = g2c(pt.x + off, pt.y);
        const sel = isPrimary && selectedPoint && selectedPoint.pathId === path.id && selectedPoint.pointIndex === i;
        const r = sel ? 7 : 5;
        const fillCol = sel ? selCol : path.color;
        ctx.save();
        if (!isPrimary) ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = fillCol; ctx.fill();
        ctx.strokeStyle = transparent ? fillCol : bgCol; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
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
  });
}

function paintIntersections(ctx, intData) {
  const { allInts, strokes, plot } = intData;
  const { W, H, dpr } = app;
  const pL = MARGIN.left, pR = W / dpr - MARGIN.right;
  const pT = MARGIN.top, pB = H / dpr - MARGIN.bottom;
  const usePlot = plot || { left: pL, right: pR, top: pT, bottom: pB };

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
    const hitCol = intersectHitColor(pt, app.objects, cssVar);
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

    const col = intersectHitColor(pt, app.objects, cssVar);
    const tw = ctx.measureText(lbl).width;
    const th = 14;
    const ovr = positions[key];
    let place;
    if (ovr) {
      const lc = g2c(ovr.gx, ovr.gy);
      place = makeIntersectTextBox(lc.x, lc.y, tw, th);
    } else {
      place = findIntersectLabelPlacement(p.x, p.y, tw, th, usePlot, strokes, placedBoxes, pt.axis);
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
}

function syncIntersectionPanels(intData) {
  const { allInts, pathSamples } = intData;

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

function drawObjects(ctx, exportMode, transparent) {
  const { objects, selectedObjectId } = app;
  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'callout') {
      const p = g2c(o.x, o.y), sel = selectedObjectId === o.id;
      const fontSize = o.fontSize || 13;
      ctx.font = fontSize + 'px "IBM Plex Sans",sans-serif';
      const w = ctx.measureText(o.text).width + 14, h = fontSize + 10;
      if (o.anchorX !== undefined) {
        const a = g2c(o.anchorX, o.anchorY);
        const anchorCol = sel ? cssVar('--accent-cyan') : (o.borderColor || cssVar('--callout-border'));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y + h / 2);
        ctx.strokeStyle = anchorCol; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(a.x, a.y, sel ? 5 : 4, 0, Math.PI * 2); ctx.fillStyle = anchorCol; ctx.fill();
        ctx.strokeStyle = transparent ? anchorCol : cssVar('--bg-deep'); ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.fillStyle = sel ? cssVar('--accent-cyan-subtle') : (o.bgColor || cssVar('--callout-bg'));
      ctx.strokeStyle = sel ? cssVar('--accent-cyan') : (o.borderColor || cssVar('--callout-border')); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(p.x - w / 2, p.y - h / 2, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sel ? cssVar('--accent-cyan') : (o.textColor || cssVar('--callout-text')); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.text, p.x, p.y);
    }
    if (o.type === 'line') {
      const p1 = g2c(o.x1, o.y1), p2 = g2c(o.x2, o.y2), sel = selectedObjectId === o.id;
      const lineCol = sel ? cssVar('--accent-cyan') : (o.color || cssVar('--accent-red'));
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = lineCol; ctx.lineWidth = sel ? 2 : 1.5;
      ctx.setLineDash(o.dashed ? [5, 4] : []); ctx.stroke(); ctx.setLineDash([]);
      [p1, p2].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, sel ? 5 : 4, 0, Math.PI * 2); ctx.fillStyle = lineCol; ctx.fill(); ctx.strokeStyle = transparent ? lineCol : cssVar('--bg-deep'); ctx.lineWidth = 1; ctx.stroke(); });
    }
    if (o.type === 'dimension') {
      const p1 = g2c(o.x1, o.y1), p2 = g2c(o.x2, o.y2), sel = selectedObjectId === o.id;
      const col = sel ? cssVar('--accent-cyan') : (o.color || cssVar('--accent-orange'));
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x), perp = ang + Math.PI / 2;
      [p1, p2].forEach(p => { ctx.beginPath(); ctx.moveTo(p.x + Math.cos(perp) * 8, p.y + Math.sin(perp) * 8); ctx.lineTo(p.x - Math.cos(perp) * 8, p.y - Math.sin(perp) * 8); ctx.stroke(); });
      [p1, p2].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, sel ? 5 : 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = transparent ? col : cssVar('--bg-deep'); ctx.lineWidth = 1; ctx.stroke(); });
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

import { app } from './state.js';
import { MARGIN } from './constants.js';
import { g2c, c2g, maySnap, cssVar } from './coords.js';
import { sorted, sampleSpline } from './spline.js';

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
  drawGrid(); drawAxes(); drawRefLines(); drawSpline(); drawIntersects(); drawPoints(); drawObjects(); drawPreview();
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

function drawSpline() {
  const { ctx, W, H, dpr, points, splineColor, splineWidth, startSlope, endSlope, graphRange } = app;
  if (points.length < 2) return;
  const samples = sampleSpline(50);
  if (samples.length < 2) return;
  ctx.strokeStyle = splineColor; ctx.lineWidth = splineWidth;
  ctx.beginPath();
  const s0 = g2c(samples[0].x, samples[0].y); ctx.moveTo(s0.x, s0.y);
  for (let i = 1; i < samples.length; i++) { const s = g2c(samples[i].x, samples[i].y); ctx.lineTo(s.x, s.y); }
  ctx.stroke();

  if (sorted().length >= 2) {
    const pts = sorted();
    const aLen = 25;
    const pw = W / dpr - MARGIN.left - MARGIN.right, ph = H / dpr - MARGIN.top - MARGIN.bottom;
    const xR = graphRange.xMax - graphRange.xMin, yR = graphRange.yMax - graphRange.yMin;
    const scaleRatio = (ph / yR) / (pw / xR);
    [[pts[0], startSlope], [pts[pts.length - 1], endSlope]].forEach(([pt, slope]) => {
      const p = g2c(pt.x, pt.y);
      const dxC = aLen, dyC = -slope * scaleRatio * aLen;
      ctx.strokeStyle = 'rgba(245,158,11,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(p.x - dxC, p.y - dyC); ctx.lineTo(p.x + dxC, p.y + dyC); ctx.stroke();
      ctx.setLineDash([]);
    });
  }
}

function drawPoints() {
  const { ctx, H, dpr, points, selectedPointIdx } = app;
  const ptCol = cssVar('--point-default'), selCol = cssVar('--point-selected'), bgCol = cssVar('--bg-deep');
  points.forEach((pt, i) => {
    const p = g2c(pt.x, pt.y), sel = i === selectedPointIdx, r = sel ? 7 : 5;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = sel ? selCol : ptCol; ctx.fill();
    ctx.strokeStyle = bgCol; ctx.lineWidth = 2; ctx.stroke();
    if (sel) {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = selCol + '66'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, H / dpr - MARGIN.bottom);
      ctx.moveTo(p.x, p.y); ctx.lineTo(MARGIN.left, p.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = selCol; ctx.font = '12px "JetBrains Mono",monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(`(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`, p.x + 10, p.y - 6);
    }
  });
}

function drawIntersects() {
  const { ctx, showIntersects, points, graphRange, objects, intersectColor } = app;
  if (!showIntersects || points.length < 2) return;
  const samples = sampleSpline(80);
  const yBase = (graphRange.yMin <= 0 && graphRange.yMax >= 0) ? 0 : graphRange.yMin;
  const ints = [];

  function slopeAt(i) {
    const dx = samples[Math.min(i + 1, samples.length - 1)].x - samples[Math.max(i - 1, 0)].x;
    const dy = samples[Math.min(i + 1, samples.length - 1)].y - samples[Math.max(i - 1, 0)].y;
    return dx === 0 ? Infinity : dy / dx;
  }

  for (let i = 0; i < samples.length - 1; i++) {
    if ((samples[i].y - yBase) * (samples[i + 1].y - yBase) < 0) {
      const t = (yBase - samples[i].y) / (samples[i + 1].y - samples[i].y);
      const ix = samples[i].x + t * (samples[i + 1].x - samples[i].x);
      const sl = slopeAt(i);
      ints.push({ x: ix, y: yBase, axis: 'X', slope: sl });
    }
  }
  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'hline') for (let i = 0; i < samples.length - 1; i++) {
      if ((samples[i].y - o.value) * (samples[i + 1].y - o.value) <= 0) {
        const dy = samples[i + 1].y - samples[i].y; if (Math.abs(dy) < 1e-10) continue;
        const t = (o.value - samples[i].y) / dy;
        const sl = slopeAt(i);
        ints.push({ x: samples[i].x + t * (samples[i + 1].x - samples[i].x), y: o.value, axis: 'H-Ref', slope: sl });
      }
    }
    if (o.type === 'vline') for (let i = 0; i < samples.length - 1; i++) {
      if ((samples[i].x - o.value) * (samples[i + 1].x - o.value) <= 0) {
        const dx = samples[i + 1].x - samples[i].x; if (Math.abs(dx) < 1e-10) continue;
        const t = (o.value - samples[i].x) / dx;
        const sl = slopeAt(i);
        ints.push({ x: o.value, y: samples[i].y + t * (samples[i + 1].y - samples[i].y), axis: 'V-Ref', slope: sl });
      }
    }
  });
  ints.forEach(pt => {
    const p = g2c(pt.x, pt.y);
    ctx.beginPath(); ctx.moveTo(p.x - 5, p.y - 5); ctx.lineTo(p.x + 5, p.y + 5);
    ctx.moveTo(p.x + 5, p.y - 5); ctx.lineTo(p.x - 5, p.y + 5);
    ctx.strokeStyle = intersectColor || cssVar('--intersect-default'); ctx.lineWidth = 2; ctx.stroke();
  });
  const el = document.getElementById('intersectList');
  el.innerHTML = ints.length ? ints.map((p, idx) => {
    const slopeStr = Math.abs(p.slope) > 1e6 ? '\u221E' : p.slope.toFixed(3);
    return `<div class="intersect-item"><span>${idx + 1} ${p.axis}</span> X=${p.x.toFixed(2)} Y=${p.y.toFixed(2)} m=${slopeStr}</div>`;
  }).join('') : '<div style="font-size:10px;color:var(--text-dim)">No intersections</div>';

  const pmSection = document.getElementById('pathMeasureSection');
  const pmList = document.getElementById('pathMeasureList');
  if (ints.length >= 2) {
    const sortedInts = [...ints].sort((a, b) => a.x - b.x);
    let pmHtml = '';
    for (let k = 0; k < sortedInts.length - 1; k++) {
      const ia = sortedInts[k], ib = sortedInts[k + 1];
      let arcLen = 0;
      for (let j = 0; j < samples.length - 1; j++) {
        const sx = samples[j].x, snx = samples[j + 1].x;
        if (sx >= ia.x && snx <= ib.x) {
          const dx = samples[j + 1].x - samples[j].x;
          const dy = samples[j + 1].y - samples[j].y;
          arcLen += Math.sqrt(dx * dx + dy * dy);
        }
      }
      const dxStraight = ib.x - ia.x;
      const dyStraight = ib.y - ia.y;
      const straight = Math.sqrt(dxStraight * dxStraight + dyStraight * dyStraight);
      pmHtml += `<div class="intersect-item"><span>${k + 1}\u2192${k + 2}</span> path=${arcLen.toFixed(2)} straight=${straight.toFixed(2)}</div>`;
    }
    pmList.innerHTML = pmHtml;
    pmSection.style.display = 'block';
  } else {
    pmSection.style.display = ints.length ? 'block' : 'none';
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
      ctx.fillStyle = sel ? cssVar('--accent-cyan') + '1e' : (o.bgColor || cssVar('--callout-bg'));
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

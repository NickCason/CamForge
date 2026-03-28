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

export function repeatOffsets() {
  if (!app.repeatProfile || !app.infiniteGrid) return [0];
  const cycle = app.graphRange.xMax - app.graphRange.xMin;
  if (cycle <= 0) return [0];
  const vis = visibleGraphRange();
  const offsets = [];
  let lo = Math.floor((vis.xMin - app.graphRange.xMax) / cycle);
  const hi = Math.ceil((vis.xMax - app.graphRange.xMin) / cycle);
  if (!app.repeatProfileUpstream) lo = Math.max(0, lo);
  for (let n = lo; n <= hi; n++) offsets.push(n * cycle);
  return offsets;
}

export function collectIntersectionData() {
  const { showIntersects, graphRange, objects, W, H, dpr } = app;
  if (!showIntersects) return { allInts: [], pathSamples: new Map(), strokes: [], plot: null };

  const allInts = [];
  const pathSamples = new Map();
  const pL = MARGIN.left, pR = W / dpr - MARGIN.right;
  const pT = MARGIN.top, pB = H / dpr - MARGIN.bottom;
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

  return { allInts, pathSamples, strokes, plot };
}

export function computePathAnalytics(path) {
  if (!path || path.points.length < 2) return null;
  const s = sortedPoints(path.points);
  const xR = s[s.length - 1].x - s[0].x;
  const ys = s.map(p => p.y);
  const yMn = Math.min(...ys), yMx = Math.max(...ys), yR = yMx - yMn;
  const samples = sampleSpline(path, 60);
  let maxV = 0, maxA = 0;
  const vels = [];
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    if (dx === 0) continue;
    const v = (samples[i].y - samples[i - 1].y) / dx;
    vels.push(v);
    maxV = Math.max(maxV, Math.abs(v));
  }
  for (let i = 1; i < vels.length; i++) maxA = Math.max(maxA, Math.abs(vels[i] - vels[i - 1]));
  return {
    xMin: s[0].x, xMax: s[s.length - 1].x, xRange: xR,
    yMin: yMn, yMax: yMx, yRange: yR,
    stroke: yR,
    maxVelocity: maxV, maxAcceleration: maxA,
    pointCount: path.points.length
  };
}

function buildIntersectionReport(intData) {
  const { allInts, pathSamples } = intData;
  const lines = [];

  if (allInts.length === 0) return { intersections: lines, measures: [], hasData: false };

  allInts.forEach(p => {
    const slopeStr = Math.abs(p.slope) > 1e6 ? '\u221E' : p.slope.toFixed(3);
    const pathIdx = app.paths.findIndex(pa => pa.id === p.pathId) + 1;
    lines.push(`P${pathIdx} ${p.axis}  X=${p.x.toFixed(2)}  Y=${p.y.toFixed(2)}  m=${slopeStr}`);
  });

  const measures = [];
  const byPath = {};
  allInts.forEach(int => {
    if (!byPath[int.pathId]) byPath[int.pathId] = { ints: [], color: int.pathColor };
    byPath[int.pathId].ints.push(int);
  });

  for (const [pathId, data] of Object.entries(byPath)) {
    if (data.ints.length < 2) continue;
    const samples = pathSamples.get(parseInt(pathId));
    const sortedInts = [...data.ints].sort((a, b) => a.x - b.x);
    const pathIdx = app.paths.findIndex(p => p.id === parseInt(pathId)) + 1;
    measures.push(`Path ${pathIdx}:`);
    for (let k = 0; k < sortedInts.length - 1; k++) {
      const ia = sortedInts[k], ib = sortedInts[k + 1];
      let arcLen = 0;
      if (samples) {
        for (let j = 0; j < samples.length - 1; j++) {
          const sx = samples[j].x, snx = samples[j + 1].x;
          if (sx >= ia.x && snx <= ib.x) {
            const ddx = samples[j + 1].x - samples[j].x;
            const ddy = samples[j + 1].y - samples[j].y;
            arcLen += Math.sqrt(ddx * ddx + ddy * ddy);
          }
        }
      }
      const dxS = ib.x - ia.x, dyS = ib.y - ia.y;
      const straight = Math.sqrt(dxS * dxS + dyS * dyS);
      measures.push(`  ${k + 1}\u2192${k + 2}  path=${arcLen.toFixed(2)}  straight=${straight.toFixed(2)}`);
    }
  }

  return { intersections: lines, measures, hasData: true };
}

export function buildStatsText() {
  const lines = [];

  app.paths.forEach((path, idx) => {
    const analytics = computePathAnalytics(path);
    if (!analytics) return;
    lines.push(`\u2500\u2500\u2500 Path ${idx + 1} (${analytics.pointCount} pts) \u2500\u2500\u2500`);
    lines.push(`  X: ${analytics.xMin.toFixed(1)} \u2192 ${analytics.xMax.toFixed(1)} (\u0394${analytics.xRange.toFixed(1)})`);
    lines.push(`  Y: ${analytics.yMin.toFixed(1)} \u2192 ${analytics.yMax.toFixed(1)} (\u0394${analytics.yRange.toFixed(1)})`);
    lines.push(`  Stroke: ${analytics.stroke.toFixed(2)}`);
    lines.push(`  Max |vel|: ${analytics.maxVelocity.toFixed(4)}`);
    lines.push(`  Max |acc|: ${analytics.maxAcceleration.toFixed(4)}`);
    lines.push('');
  });

  if (app.showIntersects) {
    const intData = collectIntersectionData();
    const report = buildIntersectionReport(intData);
    if (report.hasData) {
      lines.push('\u2500\u2500\u2500 Intersections \u2500\u2500\u2500');
      report.intersections.forEach(l => lines.push('  ' + l));
      lines.push('');
      if (report.measures.length > 0) {
        lines.push('\u2500\u2500\u2500 Path Lengths \u2500\u2500\u2500');
        report.measures.forEach(l => lines.push('  ' + l));
      }
    }
  }

  return lines;
}

import { app } from './state.js';
import { g2c } from './coords.js';
import { sortedPoints } from './spline.js';
import { repeatOffsets } from './export/sceneData.js';

const SNAP_THRESHOLD_PX = 12;
/** Coarse t samples for closest-point on cubic; refined by ternary search. */
const HERMITE_T_SAMPLES = 40;
const HERMITE_REFINE_ITERS = 22;

/**
 * Hermite segment graph position; matches `sampleSpline` cubic branch.
 * @param {number} xOff  added to x (repeat profile)
 */
function hermiteGraphXY(p1, p2, entrySlope, exitSlope, t, xOff) {
  const dx = p2.x - p1.x;
  const m1x = dx, m1y = entrySlope * dx;
  const m2x = dx, m2y = exitSlope * dx;
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  return {
    x: h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x + xOff,
    y: h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y
  };
}

function segmentSlopes(path, pts, i) {
  const n = pts.length;
  function getLinearSlope(j) {
    const ddx = pts[j + 1].x - pts[j].x;
    return ddx === 0 ? 0 : (pts[j + 1].y - pts[j].y) / ddx;
  }
  function naturalSlope(j) {
    if (j <= 0) return path.startSlope;
    if (j >= n - 1) return path.endSlope;
    const prev = pts[j - 1], next = pts[j + 1];
    if (prev.x === next.x) return 0;
    return (next.y - prev.y) / (next.x - prev.x);
  }
  const p2 = pts[i + 1];
  let entrySlope;
  if (i === 0) entrySlope = path.startSlope;
  else {
    const prevType = pts[i - 1].segType || 'cubic';
    entrySlope = (prevType === 'linear') ? getLinearSlope(i - 1) : naturalSlope(i);
  }
  let exitSlope;
  if (i === n - 2) exitSlope = path.endSlope;
  else {
    const nextType = p2.segType || 'cubic';
    exitSlope = (nextType === 'linear') ? getLinearSlope(i + 1) : naturalSlope(i + 1);
  }
  return { entrySlope, exitSlope };
}

/** Closest point on true cubic Hermite segment, distance in screen px (pan cancels). */
function nearestOnCubicHermiteScreen(gpx, gpy, p1, p2, entrySlope, exitSlope, xOff) {
  const p = toScreen(gpx, gpy);
  function distSq(t) {
    const g = hermiteGraphXY(p1, p2, entrySlope, exitSlope, t, xOff);
    const s = toScreen(g.x, g.y);
    const ddx = s.x - p.x, ddy = s.y - p.y;
    return ddx * ddx + ddy * ddy;
  }
  let bestT = 0, bestD = distSq(0);
  for (let k = 1; k <= HERMITE_T_SAMPLES; k++) {
    const t = k / HERMITE_T_SAMPLES;
    const d = distSq(t);
    if (d < bestD) { bestD = d; bestT = t; }
  }
  let lo = Math.max(0, bestT - 1 / HERMITE_T_SAMPLES);
  let hi = Math.min(1, bestT + 1 / HERMITE_T_SAMPLES);
  for (let it = 0; it < HERMITE_REFINE_ITERS; it++) {
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    if (distSq(m1) < distSq(m2)) hi = m2; else lo = m1;
  }
  bestT = (lo + hi) / 2;
  bestD = distSq(bestT);
  const g = hermiteGraphXY(p1, p2, entrySlope, exitSlope, bestT, xOff);
  return { gx: g.x, gy: g.y, dist: Math.sqrt(bestD) };
}

function toScreen(gx, gy) {
  const c = g2c(gx, gy);
  const { zoom } = app;
  return { x: c.x * zoom, y: c.y * zoom };
}

function screenDist(gx1, gy1, gx2, gy2) {
  const a = toScreen(gx1, gy1), b = toScreen(gx2, gy2);
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function nearestOnSegmentScreen(gpx, gpy, gx1, gy1, gx2, gy2) {
  const p = toScreen(gpx, gpy);
  const s1 = toScreen(gx1, gy1), s2 = toScreen(gx2, gy2);
  const dx = s2.x - s1.x, dy = s2.y - s1.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { gx: gx1, gy: gy1, dist: Math.sqrt((p.x - s1.x) ** 2 + (p.y - s1.y) ** 2) };
  const t = Math.max(0, Math.min(1, ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / len2));
  const nx = s1.x + t * dx, ny = s1.y + t * dy;
  const dist = Math.sqrt((p.x - nx) ** 2 + (p.y - ny) ** 2);
  return { gx: gx1 + t * (gx2 - gx1), gy: gy1 + t * (gy2 - gy1), dist };
}

function gridCandidate(gx, gy) {
  return {
    x: Math.round(gx / app.gridStep.x) * app.gridStep.x,
    y: Math.round(gy / app.gridStep.y) * app.gridStep.y,
  };
}

/**
 * @param {number} gx
 * @param {number} gy
 * @param {{ shiftKey?: boolean, excludePathId?: number, excludePointIndex?: number, gridOnly?: boolean }} opts
 * @returns {{ x: number, y: number, kind: 'none'|'grid'|'node'|'curve' }}
 */
export function resolveSnap(gx, gy, opts = {}) {
  const noSnap = { x: gx, y: gy, kind: 'none' };
  if (opts.shiftKey) return noSnap;

  const { snapToGrid, snapToPathNodes, snapToPathCurve, snapActivePathOnly } = app;
  const gridOnly = !!opts.gridOnly;
  const usePathNodes = snapToPathNodes && !gridOnly;
  const usePathCurve = snapToPathCurve && !gridOnly;
  if (gridOnly) {
    if (!snapToGrid) return noSnap;
  } else if (!snapToGrid && !snapToPathNodes && !snapToPathCurve) {
    return noSnap;
  }

  let best = null;
  let bestDist = SNAP_THRESHOLD_PX;

  const candidatePaths = (usePathNodes || usePathCurve)
    ? (snapActivePathOnly ? app.paths.filter(p => p.id === app.activePathId) : app.paths)
    : [];

  const xOffsets = (usePathNodes || usePathCurve) ? repeatOffsets() : [0];

  if (snapToGrid) {
    const gc = gridCandidate(gx, gy);
    const d = screenDist(gx, gy, gc.x, gc.y);
    if (d < bestDist) { best = { x: gc.x, y: gc.y, kind: 'grid' }; bestDist = d; }
  }

  if (usePathNodes) {
    for (const path of candidatePaths) {
      for (let i = 0; i < path.points.length; i++) {
        if (opts.excludePathId === path.id && opts.excludePointIndex === i) continue;
        const pt = path.points[i];
        for (const off of xOffsets) {
          const px = pt.x + off;
          const d = screenDist(gx, gy, px, pt.y);
          if (d < bestDist) { best = { x: px, y: pt.y, kind: 'node' }; bestDist = d; }
        }
      }
    }
  }

  if (usePathCurve) {
    for (const path of candidatePaths) {
      if (path.points.length < 2) continue;
      const pts = sortedPoints(path.points);
      for (let si = 0; si < pts.length - 1; si++) {
        const p1 = pts[si], p2 = pts[si + 1];
        const segType = p1.segType || 'cubic';
        for (const off of xOffsets) {
          let hit;
          if (segType === 'linear') {
            hit = nearestOnSegmentScreen(gx, gy, p1.x + off, p1.y, p2.x + off, p2.y);
          } else {
            const { entrySlope, exitSlope } = segmentSlopes(path, pts, si);
            hit = nearestOnCubicHermiteScreen(gx, gy, p1, p2, entrySlope, exitSlope, off);
          }
          if (hit.dist < bestDist) { best = { x: hit.gx, y: hit.gy, kind: 'curve' }; bestDist = hit.dist; }
        }
      }
    }
  }

  return best || noSnap;
}

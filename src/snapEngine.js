import { app } from './state.js';
import { g2c } from './coords.js';
import { sampleSpline } from './spline.js';

const SNAP_THRESHOLD_PX = 12;
const SNAP_SAMPLES_PER_SEG = 60;

const _cache = new Map();

function cacheKey(path) {
  return path.id + ':' + path.points.length + ':' +
    path.points.map(p => p.x + ',' + p.y + ',' + (p.segType || 'cubic')).join(';') +
    ':' + path.startSlope + ':' + path.endSlope;
}

function getCachedSamples(path) {
  const key = cacheKey(path);
  let entry = _cache.get(path.id);
  if (entry && entry.key === key) return entry.samples;
  const samples = sampleSpline(path, SNAP_SAMPLES_PER_SEG);
  _cache.set(path.id, { key, samples });
  return samples;
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
 * @param {{ shiftKey?: boolean, excludePathId?: number, excludePointIndex?: number }} opts
 * @returns {{ x: number, y: number, kind: 'none'|'grid'|'node'|'curve' }}
 */
export function resolveSnap(gx, gy, opts = {}) {
  const noSnap = { x: gx, y: gy, kind: 'none' };
  if (opts.shiftKey) return noSnap;

  const { snapToGrid, snapToPathNodes, snapToPathCurve, snapActivePathOnly } = app;
  if (!snapToGrid && !snapToPathNodes && !snapToPathCurve) return noSnap;

  let best = null;
  let bestDist = SNAP_THRESHOLD_PX;

  const candidatePaths = snapActivePathOnly
    ? app.paths.filter(p => p.id === app.activePathId)
    : app.paths;

  if (snapToGrid) {
    const gc = gridCandidate(gx, gy);
    const d = screenDist(gx, gy, gc.x, gc.y);
    if (d < bestDist) { best = { x: gc.x, y: gc.y, kind: 'grid' }; bestDist = d; }
  }

  if (snapToPathNodes) {
    for (const path of candidatePaths) {
      for (let i = 0; i < path.points.length; i++) {
        if (opts.excludePathId === path.id && opts.excludePointIndex === i) continue;
        const pt = path.points[i];
        const d = screenDist(gx, gy, pt.x, pt.y);
        if (d < bestDist) { best = { x: pt.x, y: pt.y, kind: 'node' }; bestDist = d; }
      }
    }
  }

  if (snapToPathCurve) {
    for (const path of candidatePaths) {
      if (path.points.length < 2) continue;
      const samples = getCachedSamples(path);
      for (let i = 0; i < samples.length - 1; i++) {
        const hit = nearestOnSegmentScreen(gx, gy, samples[i].x, samples[i].y, samples[i + 1].x, samples[i + 1].y);
        if (hit.dist < bestDist) { best = { x: hit.gx, y: hit.gy, kind: 'curve' }; bestDist = hit.dist; }
      }
    }
  }

  return best || noSnap;
}

export function invalidateSnapCache(pathId) {
  if (pathId !== undefined) _cache.delete(pathId);
  else _cache.clear();
}

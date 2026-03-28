/** Intersection detection, callout placement, ref-like colors. */

import { sampleSpline } from './spline.js';

function ccw(ax, ay, bx, by, cx, cy) {
  return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  return ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
    ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy);
}

function distPointToSegSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) {
    const ex = px - x1;
    const ey = py - y1;
    return ex * ex + ey * ey;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  const ex = px - qx;
  const ey = py - qy;
  return ex * ex + ey * ey;
}

function segmentIntersectsRect(x1, y1, x2, y2, L, T, R, B) {
  const ins = (x, y) => x >= L && x <= R && y >= T && y <= B;
  if (ins(x1, y1) || ins(x2, y2)) return true;
  const edges = [
    [L, T, R, T],
    [R, T, R, B],
    [R, B, L, B],
    [L, B, L, T]
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segmentsIntersect(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
  }
  return false;
}

function rectOverlap(a, b, gap) {
  return !(a.right + gap < b.left || a.left - gap > b.right || a.bottom + gap < b.top || a.top - gap > b.bottom);
}

/**
 * @param {object} pt - intersection with axis: 'X' | 'H-Ref' | 'V-Ref'
 * @param {object[]} objects
 * @param {(name: string) => string} cssVar
 */
export function intersectLabelColor(pt, objects, cssVar) {
  const defH = cssVar('--ref-hline');
  const defV = cssVar('--ref-vline');
  if (pt.axis === 'H-Ref') {
    const o = objects.find(
      x => !x.hidden && x.type === 'hline' && Math.abs(x.value - pt.y) < 1e-5
    );
    return o ? o.color || defH : defH;
  }
  if (pt.axis === 'V-Ref') {
    const o = objects.find(
      x => !x.hidden && x.type === 'vline' && Math.abs(x.value - pt.x) < 1e-5
    );
    return o ? o.color || defV : defV;
  }
  return cssVar('--axis-tick');
}

/** Callout / leader color: optional per-ref `intersectColor` overrides ref line color. */
export function intersectHitColor(pt, objects, cssVar) {
  if (pt.axis === 'H-Ref') {
    const o = objects.find(
      x => !x.hidden && x.type === 'hline' && Math.abs(x.value - pt.y) < 1e-5
    );
    if (o && o.intersectColor) return o.intersectColor;
  }
  if (pt.axis === 'V-Ref') {
    const o = objects.find(
      x => !x.hidden && x.type === 'vline' && Math.abs(x.value - pt.x) < 1e-5
    );
    if (o && o.intersectColor) return o.intersectColor;
  }
  return intersectLabelColor(pt, objects, cssVar);
}

/** Single-value label text: H-Ref shows X (href already shows Y); V-Ref shows Y; X-axis crossing shows X. */
export function intersectLabelText(pt) {
  if (pt.axis === 'H-Ref') return pt.x.toFixed(1);
  if (pt.axis === 'V-Ref') return pt.y.toFixed(1);
  if (pt.axis === 'X') return pt.x.toFixed(1);
  return `${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}`;
}

export function intersectionLabelKey(pathId, pt) {
  const q = v => Math.round(v * 10000) / 10000;
  return `${pathId}:${pt.axis}:${q(pt.x)}:${q(pt.y)}`;
}

export function defaultCalloutMode(pt) {
  if (pt.axis === 'V-Ref') return 'y';
  return 'x';
}

/** @param {string|undefined} stored */
export function effectiveCalloutMode(pt, stored) {
  if (stored === 'x' || stored === 'y' || stored === 'both' || stored === 'off') return stored;
  if (stored === 'auto') return defaultCalloutMode(pt);
  return defaultCalloutMode(pt);
}

/** @param {'x'|'y'|'both'|'off'} mode */
export function intersectionCalloutLabel(pt, mode) {
  if (mode === 'off') return null;
  if (mode === 'both') return `${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}`;
  if (mode === 'x') return pt.x.toFixed(1);
  if (mode === 'y') return pt.y.toFixed(1);
  return intersectLabelText(pt);
}

export function makeIntersectTextBox(cx, cy, tw, th, pad = 4) {
  const halfW = tw / 2 + pad;
  const halfH = th / 2 + pad;
  return {
    cx,
    cy,
    left: cx - halfW,
    right: cx + halfW,
    top: cy - halfH,
    bottom: cy + halfH
  };
}

/**
 * @param {number} ax - anchor x (canvas)
 * @param {number} ay
 * @param {number} tw - text width
 * @param {number} th - text height (approx cap height box)
 * @param {{ left: number, top: number, right: number, bottom: number }} plot
 * @param {{ points: {x:number,y:number}[], halfWidth: number }[]} strokes
 * @param {{ left: number, top: number, right: number, bottom: number }[]} placed
 * @param {'X' | 'H-Ref' | 'V-Ref' | null} axisType - biases search away from ref / axis clutter
 * @returns {{ cx: number, cy: number, box: object } | null}
 */
export function findIntersectLabelPlacement(ax, ay, tw, th, plot, strokes, placed, axisType = null) {
  const pad = 4;
  const halfW = tw / 2 + pad;
  const halfH = th / 2 + pad;
  const maxStroke = strokes.length ? Math.max(2, ...strokes.map(s => s.halfWidth * 2)) : 2;
  const inflate = maxStroke / 2 + 8;

  const pcx = (plot.left + plot.right) / 2;
  const pcy = (plot.top + plot.bottom) / 2;
  const vx = ax - pcx;
  const vy = ay - pcy;
  const vlen = Math.hypot(vx, vy) || 1;
  const ux = vx / vlen;
  const uy = vy / vlen;

  const dirs = [];
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    dirs.push([Math.cos(ang), Math.sin(ang)]);
  }
  dirs.sort((a, b) => {
    let pa = 0;
    let pb = 0;
    if (axisType === 'V-Ref') {
      pa = Math.abs(a[0]);
      pb = Math.abs(b[0]);
    } else if (axisType === 'H-Ref' || axisType === 'X') {
      pa = Math.abs(a[1]);
      pb = Math.abs(b[1]);
    }
    if (Math.abs(pb - pa) > 1e-6) return pb - pa;
    return b[0] * ux + b[1] * uy - (a[0] * ux + a[1] * uy);
  });

  const gapLabel = 8;

  for (let dist = 18; dist <= 340; dist += 8) {
    for (const [dx, dy] of dirs) {
      const cx = ax + dx * dist;
      const cy = ay + dy * dist;
      const box = {
        left: cx - halfW,
        right: cx + halfW,
        top: cy - halfH,
        bottom: cy + halfH
      };
      if (box.left < plot.left + 4 || box.right > plot.right - 4 || box.top < plot.top + 4 || box.bottom > plot.bottom - 4) {
        continue;
      }
      let bad = false;
      for (const pl of placed) {
        if (rectOverlap(box, pl, gapLabel)) {
          bad = true;
          break;
        }
      }
      if (bad) continue;

      const testL = box.left - inflate;
      const testT = box.top - inflate;
      const testR = box.right + inflate;
      const testB = box.bottom + inflate;

      const skipNearSq = 32 * 32;
      for (const s of strokes) {
        const pts = s.points;
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          if (distPointToSegSq(ax, ay, p0.x, p0.y, p1.x, p1.y) < skipNearSq) continue;
          if (segmentIntersectsRect(p0.x, p0.y, p1.x, p1.y, testL, testT, testR, testB)) {
            bad = true;
            break;
          }
        }
        if (bad) break;
      }
      if (!bad) {
        return {
          cx,
          cy,
          left: cx - halfW,
          right: cx + halfW,
          top: cy - halfH,
          bottom: cy + halfH
        };
      }
    }
  }

  const dx = dirs[0][0];
  const dy = dirs[0][1];
  const dist = 52;
  const cx = ax + dx * dist;
  const cy = ay + dy * dist;
  return {
    cx,
    cy,
    left: cx - halfW,
    right: cx + halfW,
    top: cy - halfH,
    bottom: cy + halfH
  };
}

/** Closest point on axis-aligned rect to external point p (for connector end). */
export function closestPointOnRect(px, py, box) {
  const x = Math.max(box.left, Math.min(px, box.right));
  const y = Math.max(box.top, Math.min(py, box.bottom));
  return { x, y };
}

export function computeIntersections(samples, graphRange, objects, pathId) {
  const yBase = graphRange.yMin <= 0 && graphRange.yMax >= 0 ? 0 : graphRange.yMin;
  const ints = [];

  function slopeAt(i) {
    const dx = samples[Math.min(i + 1, samples.length - 1)].x - samples[Math.max(i - 1, 0)].x;
    const dy = samples[Math.min(i + 1, samples.length - 1)].y - samples[Math.max(i - 1, 0)].y;
    return dx === 0 ? Infinity : dy / dx;
  }

  function refAppliesToPath(o) {
    if (o.intersectPathId == null || o.intersectPathId === '') return true;
    const id = Number(o.intersectPathId);
    if (Number.isNaN(id)) return true;
    return id === pathId;
  }

  for (let i = 0; i < samples.length - 1; i++) {
    if ((samples[i].y - yBase) * (samples[i + 1].y - yBase) < 0) {
      const t = (yBase - samples[i].y) / (samples[i + 1].y - samples[i].y);
      const ix = samples[i].x + t * (samples[i + 1].x - samples[i].x);
      ints.push({ x: ix, y: yBase, axis: 'X', slope: slopeAt(i) });
    }
  }
  objects.forEach(o => {
    if (o.hidden) return;
    if (o.type === 'hline') {
      if (!refAppliesToPath(o)) return;
      for (let i = 0; i < samples.length - 1; i++) {
        if ((samples[i].y - o.value) * (samples[i + 1].y - o.value) <= 0) {
          const dy = samples[i + 1].y - samples[i].y;
          if (Math.abs(dy) < 1e-10) continue;
          const t = (o.value - samples[i].y) / dy;
          ints.push({
            x: samples[i].x + t * (samples[i + 1].x - samples[i].x),
            y: o.value,
            axis: 'H-Ref',
            slope: slopeAt(i)
          });
        }
      }
    }
    if (o.type === 'vline') {
      if (!refAppliesToPath(o)) return;
      for (let i = 0; i < samples.length - 1; i++) {
        if ((samples[i].x - o.value) * (samples[i + 1].x - o.value) <= 0) {
          const dx = samples[i + 1].x - samples[i].x;
          if (Math.abs(dx) < 1e-10) continue;
          const t = (o.value - samples[i].x) / dx;
          ints.push({
            x: o.value,
            y: samples[i].y + t * (samples[i + 1].y - samples[i].y),
            axis: 'V-Ref',
            slope: slopeAt(i)
          });
        }
      }
    }
  });
  return ints;
}

export function enumerateAllIntersections(paths, graphRange, objects) {
  const allInts = [];
  paths.forEach(path => {
    if (path.points.length < 2) return;
    const samples = sampleSpline(path, 80);
    computeIntersections(samples, graphRange, objects, path.id).forEach(int => {
      allInts.push({ ...int, pathId: path.id, pathColor: path.color });
    });
  });
  return allInts;
}

export function findIntersectionByKey(paths, graphRange, objects, key) {
  for (const pt of enumerateAllIntersections(paths, graphRange, objects)) {
    if (intersectionLabelKey(pt.pathId, pt) === key) return pt;
  }
  return null;
}

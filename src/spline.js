import { app } from './state.js';

export function sorted() {
  return [...app.points].sort((a, b) => a.x - b.x);
}

export function sampleSpline(nPerSeg) {
  const pts = sorted();
  if (pts.length < 2) return [];
  const result = [], n = pts.length;
  nPerSeg = nPerSeg || 50;

  function getLinearSlope(i) {
    const dx = pts[i + 1].x - pts[i].x;
    return dx === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx;
  }

  function naturalSlope(i) {
    if (i <= 0) return app.startSlope;
    if (i >= n - 1) return app.endSlope;
    const prev = pts[i - 1], next = pts[i + 1];
    if (prev.x === next.x) return 0;
    return (next.y - prev.y) / (next.x - prev.x);
  }

  for (let i = 0; i < n - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1];
    const segType = p1.segType || 'cubic';

    if (segType === 'linear') {
      for (let s = 0; s < nPerSeg; s++) {
        const t = s / nPerSeg;
        result.push({ x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) });
      }
    } else {
      const dx = p2.x - p1.x;
      let entrySlope;
      if (i === 0) {
        entrySlope = app.startSlope;
      } else {
        const prevType = pts[i - 1].segType || 'cubic';
        entrySlope = (prevType === 'linear') ? getLinearSlope(i - 1) : naturalSlope(i);
      }
      let exitSlope;
      if (i === n - 2) {
        exitSlope = app.endSlope;
      } else {
        const nextType = p2.segType || 'cubic';
        exitSlope = (nextType === 'linear') ? getLinearSlope(i + 1) : naturalSlope(i + 1);
      }
      const m1x = dx, m1y = entrySlope * dx;
      const m2x = dx, m2y = exitSlope * dx;
      for (let s = 0; s < nPerSeg; s++) {
        const t = s / nPerSeg;
        const t2 = t * t, t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
        result.push({
          x: h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x,
          y: h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y
        });
      }
    }
  }
  result.push(pts[n - 1]);
  return result;
}

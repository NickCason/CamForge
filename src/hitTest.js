import { app } from './state.js';
import { g2c } from './coords.js';

export function hitPt(cx, cy, th) {
  th = th || 10;
  const { points, zoom, panX, panY, W, H, dpr } = app;
  for (let i = points.length - 1; i >= 0; i--) {
    const p = g2c(points[i].x, points[i].y);
    const px = p.x * zoom + (panX * zoom - panX + (W / dpr) * (1 - zoom) / 2);
    const py = p.y * zoom + (panY * zoom - panY + (H / dpr) * (1 - zoom) / 2);
    if (Math.sqrt((cx - px) ** 2 + (cy - py) ** 2) < th) return i;
  }
  return -1;
}

export function hitObj(cx, cy, th) {
  th = th || 12;
  const { objects, zoom, panX, panY, W, H, dpr } = app;
  const az = p => ({
    x: p.x * zoom + (panX * zoom - panX + (W / dpr) * (1 - zoom) / 2),
    y: p.y * zoom + (panY * zoom - panY + (H / dpr) * (1 - zoom) / 2)
  });
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o.hidden) continue;
    if (o.type === 'callout') {
      if (o.anchorX !== undefined) {
        const za = az(g2c(o.anchorX, o.anchorY));
        if (Math.sqrt((cx - za.x) ** 2 + (cy - za.y) ** 2) < th) return { obj: o, part: 'anchor' };
      }
      const zp = az(g2c(o.x, o.y));
      if (Math.abs(cx - zp.x) < 50 && Math.abs(cy - zp.y) < 15) return { obj: o, part: 'tag' };
    }
    if (o.type === 'line' || o.type === 'dimension') {
      const z1 = az(g2c(o.x1, o.y1)), z2 = az(g2c(o.x2, o.y2));
      if (Math.sqrt((cx - z1.x) ** 2 + (cy - z1.y) ** 2) < th) return { obj: o, part: 'p1' };
      if (Math.sqrt((cx - z2.x) ** 2 + (cy - z2.y) ** 2) < th) return { obj: o, part: 'p2' };
      if (o.type === 'dimension') {
        const midGx = (o.x1 + o.x2) / 2, midGy = (o.y1 + o.y2) / 2;
        const lblGx = o.labelX !== undefined ? o.labelX : midGx;
        const lblGy = o.labelY !== undefined ? o.labelY : midGy + 5;
        const zl = az(g2c(lblGx, lblGy));
        if (Math.abs(cx - zl.x) < 60 && Math.abs(cy - zl.y) < 12) return { obj: o, part: 'label' };
      }
      if (dts(cx, cy, z1.x, z1.y, z2.x, z2.y) < th) return { obj: o, part: 'body' };
    }
    if (o.type === 'hline') {
      if (Math.abs(cy - az(g2c(0, o.value)).y) < th) return { obj: o, part: 'body' };
    }
    if (o.type === 'vline') {
      if (Math.abs(cx - az(g2c(o.value, 0)).x) < th) return { obj: o, part: 'body' };
    }
  }
  return null;
}

function dts(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  if (l === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l));
  return Math.sqrt((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2);
}

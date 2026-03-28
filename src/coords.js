import { app } from './state.js';
import { MARGIN } from './constants.js';

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function g2c(gx, gy) {
  const pw = app.W / app.dpr - MARGIN.left - MARGIN.right;
  const ph = app.H / app.dpr - MARGIN.top - MARGIN.bottom;
  const rx = (gx - app.graphRange.xMin) / (app.graphRange.xMax - app.graphRange.xMin);
  const ry = (gy - app.graphRange.yMin) / (app.graphRange.yMax - app.graphRange.yMin);
  return { x: MARGIN.left + rx * pw, y: MARGIN.top + (1 - ry) * ph };
}

export function c2g(cx, cy) {
  const pw = app.W / app.dpr - MARGIN.left - MARGIN.right;
  const ph = app.H / app.dpr - MARGIN.top - MARGIN.bottom;
  const offX = app.panX * app.zoom - app.panX + (app.W / app.dpr) * (1 - app.zoom) / 2;
  const offY = app.panY * app.zoom - app.panY + (app.H / app.dpr) * (1 - app.zoom) / 2;
  const x = (cx - offX) / app.zoom;
  const y = (cy - offY) / app.zoom;
  return {
    x: app.graphRange.xMin + ((x - MARGIN.left) / pw) * (app.graphRange.xMax - app.graphRange.xMin),
    y: app.graphRange.yMin + (1 - (y - MARGIN.top) / ph) * (app.graphRange.yMax - app.graphRange.yMin)
  };
}

export function snap(gx, gy) {
  return {
    x: Math.round(gx / app.gridStep.x) * app.gridStep.x,
    y: Math.round(gy / app.gridStep.y) * app.gridStep.y
  };
}

export function maySnap(gx, gy, forceOff) {
  return (app.snapEnabled && !forceOff) ? snap(gx, gy) : { x: gx, y: gy };
}

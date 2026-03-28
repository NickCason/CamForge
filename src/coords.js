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

/** Graph coords for a point drawn at canvas logical (g2c) coordinates under current pan/zoom. */
export function c2gFromLogical(lx, ly) {
  const offX = app.panX * app.zoom - app.panX + (app.W / app.dpr) * (1 - app.zoom) / 2;
  const offY = app.panY * app.zoom - app.panY + (app.H / app.dpr) * (1 - app.zoom) / 2;
  return c2g(lx * app.zoom + offX, ly * app.zoom + offY);
}

export function canvasLogicalToScreen(lx, ly) {
  const offX = app.panX * app.zoom - app.panX + (app.W / app.dpr) * (1 - app.zoom) / 2;
  const offY = app.panY * app.zoom - app.panY + (app.H / app.dpr) * (1 - app.zoom) / 2;
  return { x: lx * app.zoom + offX, y: ly * app.zoom + offY };
}

export function visibleGraphRange() {
  const tl = c2g(0, 0);
  const br = c2g(app.W / app.dpr, app.H / app.dpr);
  return {
    xMin: Math.min(tl.x, br.x),
    xMax: Math.max(tl.x, br.x),
    yMin: Math.min(tl.y, br.y),
    yMax: Math.max(tl.y, br.y)
  };
}


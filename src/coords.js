import { app } from './state.js';
import { MARGIN } from './constants.js';

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** `<input type="color">` only accepts #rrggbb; cssVar() often returns rgb()/rgba(). */
export function colorForTypeColorInput(cssColor) {
  if (!cssColor || typeof cssColor !== 'string') return '#808080';
  const v = cssColor.trim();
  if (!v) return '#808080';
  if (v.startsWith('#')) {
    if (v.length === 4) {
      return (
        '#' +
        v[1] +
        v[1] +
        v[2] +
        v[2] +
        v[3] +
        v[3]
      ).toLowerCase();
    }
    if (v.length >= 7) return v.slice(0, 7).toLowerCase();
    return '#808080';
  }
  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const hex = (n) => Math.min(255, Math.max(0, parseInt(n, 10))).toString(16).padStart(2, '0');
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
  }
  return '#808080';
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


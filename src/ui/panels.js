import { app, saveState, getPath, activePath } from '../state.js';
import { cssVar } from '../coords.js';
import { sortedPoints, sampleSpline } from '../spline.js';
import { draw } from '../render.js';
import { findIntersectionByKey, defaultCalloutMode, effectiveCalloutMode } from '../intersectLabels.js';

const PATH_COLORS = ['#4a90d9', '#f59e0b', '#34d399', '#ef4444', '#a78bfa', '#22d3ee', '#ec4899', '#84cc16'];

function nextPathColor() {
  const used = new Set(app.paths.map(p => p.color));
  for (const c of PATH_COLORS) if (!used.has(c)) return c;
  return PATH_COLORS[app.paths.length % PATH_COLORS.length];
}

export function addNewPath() {
  saveState();
  app.paths.push({
    id: app.nextPathId++,
    points: [],
    startSlope: 0,
    endSlope: 0,
    color: nextPathColor(),
    width: 2,
  });
  app.activePathId = app.paths[app.paths.length - 1].id;
  refreshPathPanels(); draw();
}

export function refreshPathPanels() {
  const root = document.getElementById('pathPanelsRoot');
  let html = '';

  app.paths.forEach((path, pathIdx) => {
    const isActive = path.id === app.activePathId;
    const s = sortedPoints(path.points);
    const oMap = s.map(sp => path.points.indexOf(sp));

    html += `<div class="path-panel ${isActive ? 'active' : ''}" data-path-id="${path.id}">`;
    html += `<div class="path-panel-header">`;
    html += `<input type="color" class="path-color-swatch" value="${path.color}" data-path-id="${path.id}" title="Path color">`;
    html += `<span class="path-name">Path ${pathIdx + 1}</span>`;
    html += `<span class="path-point-count">${path.points.length} pts</span>`;
    html += `<input type="number" class="path-width-input" value="${path.width}" min="1" max="8" step="0.5" data-path-id="${path.id}" title="Stroke width (px)">`;
    html += `<button class="path-btn" data-action="duplicate" data-path-id="${path.id}" title="Duplicate path">\u29C9</button>`;
    if (app.paths.length > 1) {
      html += `<button class="path-btn path-del" data-action="delete" data-path-id="${path.id}" title="Delete path">\u00D7</button>`;
    }
    html += `</div>`;

    html += `<div class="path-panel-body">`;
    html += `<div class="slope-row"><span class="slope-label">Start dy/dx</span><input type="number" class="path-start-slope" value="${path.startSlope}" step="0.1" data-path-id="${path.id}"><span class="slope-hint">entry slope</span></div>`;
    html += `<div class="point-table-header"><span>#</span><span>X</span><span>Y</span><span>Segment</span><span></span></div>`;

    html += `<div class="point-list">`;
    s.forEach((pt, si) => {
      const oi = oMap[si], isLast = si === s.length - 1;
      const sel = app.selectedPoint && app.selectedPoint.pathId === path.id && app.selectedPoint.pointIndex === oi;
      html += `<div class="point-card ${sel ? 'selected' : ''}" data-path-id="${path.id}" data-oi="${oi}">`;
      html += `<div class="point-card-main">`;
      html += `<span class="idx">${si + 1}</span>`;
      html += `<input type="text" value="${pt.x.toFixed(2)}" data-field="x" data-path-id="${path.id}" data-oi="${oi}">`;
      html += `<input type="text" value="${pt.y.toFixed(2)}" data-field="y" data-path-id="${path.id}" data-oi="${oi}">`;
      html += `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-dim);text-align:center">${isLast ? 'end' : (pt.segType || 'cubic').substr(0, 3)}</span>`;
      html += `<button class="del-btn" data-path-id="${path.id}" data-oi="${oi}">\u00D7</button>`;
      html += `</div>`;
      if (!isLast) {
        const st = pt.segType || 'cubic';
        html += `<div class="seg-ctrl"><span class="seg-label">\u2192</span>`;
        html += `<div class="seg-type-btns"><button data-path-id="${path.id}" data-oi="${oi}" data-st="cubic" class="${st === 'cubic' ? 'active' : ''}">Cubic</button><button data-path-id="${path.id}" data-oi="${oi}" data-st="linear" class="${st === 'linear' ? 'active' : ''}">Linear</button></div>`;
        html += `</div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;

    html += `<div class="slope-row" style="margin-top:6px;"><span class="slope-label">End dy/dx</span><input type="number" class="path-end-slope" value="${path.endSlope}" step="0.1" data-path-id="${path.id}"><span class="slope-hint">exit slope</span></div>`;
    html += `<div class="add-point-row"><input type="text" class="path-add-x" data-path-id="${path.id}" placeholder="X"><input type="text" class="path-add-y" data-path-id="${path.id}" placeholder="Y"><button class="path-add-btn" data-path-id="${path.id}">+</button></div>`;
    html += `</div></div>`;
  });

  root.innerHTML = html;
  wirePathPanelEvents(root);
  const totalPoints = app.paths.reduce((sum, p) => sum + p.points.length, 0);
  document.getElementById('statusPoints').textContent = `Points: ${totalPoints}`;
}

function wirePathPanelEvents(root) {
  root.querySelectorAll('.path-panel-header').forEach(hdr => {
    hdr.addEventListener('click', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      const pathId = parseInt(hdr.closest('.path-panel').dataset.pathId);
      if (app.activePathId !== pathId) {
        app.activePathId = pathId;
        updateAnalytics();
        refreshPathPanels();
      }
    });
  });

  root.querySelectorAll('.path-color-swatch').forEach(inp => {
    inp.addEventListener('input', e => {
      e.stopPropagation();
      const path = getPath(parseInt(inp.dataset.pathId));
      if (path) { path.color = inp.value; draw(); }
    });
  });

  root.querySelectorAll('.path-width-input').forEach(inp => {
    inp.addEventListener('change', e => {
      e.stopPropagation();
      const path = getPath(parseInt(inp.dataset.pathId));
      if (path) { path.width = parseFloat(inp.value); draw(); }
    });
    inp.addEventListener('click', e => e.stopPropagation());
  });

  root.querySelectorAll('.path-btn[data-action="duplicate"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      duplicatePath(parseInt(btn.dataset.pathId));
    });
  });

  root.querySelectorAll('.path-btn[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deletePath(parseInt(btn.dataset.pathId));
    });
  });

  root.querySelectorAll('.path-start-slope').forEach(inp => {
    inp.addEventListener('change', () => {
      saveState();
      const path = getPath(parseInt(inp.dataset.pathId));
      if (path) { path.startSlope = parseFloat(inp.value) || 0; draw(); }
    });
    inp.addEventListener('click', e => e.stopPropagation());
  });

  root.querySelectorAll('.path-end-slope').forEach(inp => {
    inp.addEventListener('change', () => {
      saveState();
      const path = getPath(parseInt(inp.dataset.pathId));
      if (path) { path.endSlope = parseFloat(inp.value) || 0; draw(); }
    });
    inp.addEventListener('click', e => e.stopPropagation());
  });

  root.querySelectorAll('.point-card').forEach(c => {
    c.addEventListener('click', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      const pathId = parseInt(c.dataset.pathId);
      app.selectedPoint = { pathId, pointIndex: parseInt(c.dataset.oi) };
      app.selectedObjectId = null;
      app.selectedIntersectionKey = null;
      app.activePathId = pathId;
      refreshPathPanels(); draw();
    });
  });

  root.querySelectorAll('.point-card-main input').forEach(inp => {
    inp.addEventListener('change', () => {
      const pathId = parseInt(inp.dataset.pathId);
      const oi = parseInt(inp.dataset.oi), val = parseFloat(inp.value);
      if (isNaN(val)) return;
      saveState();
      const path = getPath(pathId);
      if (path) { path.points[oi][inp.dataset.field] = val; updateAnalytics(); draw(); }
    });
    inp.addEventListener('focus', e => e.target.select());
    inp.addEventListener('click', e => e.stopPropagation());
  });

  root.querySelectorAll('.del-btn').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      saveState();
      const path = getPath(parseInt(b.dataset.pathId));
      if (path) {
        path.points.splice(parseInt(b.dataset.oi), 1);
        app.selectedPoint = null;
        refreshPathPanels(); updateAnalytics(); draw();
      }
    });
  });

  root.querySelectorAll('.seg-type-btns button').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      saveState();
      const path = getPath(parseInt(b.dataset.pathId));
      if (path) {
        path.points[parseInt(b.dataset.oi)].segType = b.dataset.st;
        refreshPathPanels(); draw();
      }
    });
  });

  root.querySelectorAll('.path-add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const panel = btn.closest('.path-panel');
      const xInp = panel.querySelector('.path-add-x');
      const yInp = panel.querySelector('.path-add-y');
      const x = parseFloat(xInp.value), y = parseFloat(yInp.value);
      if (isNaN(x) || isNaN(y)) return;
      saveState();
      const path = getPath(parseInt(btn.dataset.pathId));
      if (path) {
        path.points.push({ x, y, id: app.nextId++, segType: 'cubic', segTension: 0.5 });
        path.points.sort((a, b) => a.x - b.x);
        xInp.value = ''; yInp.value = '';
        refreshPathPanels(); updateAnalytics(); draw();
      }
    });
  });

  root.querySelectorAll('.path-add-x').forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.closest('.path-panel').querySelector('.path-add-y').focus(); });
    inp.addEventListener('click', e => e.stopPropagation());
  });
  root.querySelectorAll('.path-add-y').forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.closest('.path-panel').querySelector('.path-add-btn').click(); });
    inp.addEventListener('click', e => e.stopPropagation());
  });
}

function duplicatePath(pathId) {
  saveState();
  const src = getPath(pathId);
  if (!src) return;
  const newPath = {
    id: app.nextPathId++,
    points: src.points.map(p => ({ ...p, id: app.nextId++ })),
    startSlope: src.startSlope,
    endSlope: src.endSlope,
    color: nextPathColor(),
    width: src.width,
  };
  app.paths.push(newPath);
  app.activePathId = newPath.id;
  refreshPathPanels(); updateAnalytics(); draw();
}

function deletePath(pathId) {
  if (app.paths.length <= 1) return;
  saveState();
  const idx = app.paths.findIndex(p => p.id === pathId);
  app.paths.splice(idx, 1);
  if (app.selectedPoint && app.selectedPoint.pathId === pathId) app.selectedPoint = null;
  if (app.activePathId === pathId) app.activePathId = app.paths[0].id;
  refreshPathPanels(); updateAnalytics(); draw();
}

export function refreshObjectList() {
  const list = document.getElementById('objectList');
  list.innerHTML = app.objects.map(o => {
    const icon = { callout: 'Tx', line: '\u2571', dimension: '\u2194', hline: '\u2500', vline: '\u2502' }[o.type] || '?';
    const name = o.type === 'callout' ? o.text : o.type === 'hline' ? `H-Ref @ ${o.value.toFixed(1)}` : o.type === 'vline' ? `V-Ref @ ${o.value.toFixed(1)}` : o.type + ` #${o.id}`;
    return `<div class="object-item ${app.selectedObjectId === o.id ? 'selected' : ''}" data-id="${o.id}"><span class="obj-icon">${icon}</span><span class="obj-name">${name}</span><button class="vis-toggle ${o.hidden ? 'hidden' : ''}" data-id="${o.id}">${o.hidden ? '\u25CB' : '\u25CF'}</button></div>`;
  }).join('');
  list.querySelectorAll('.object-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.classList.contains('vis-toggle')) return;
      app.selectedObjectId = parseInt(el.dataset.id);
      app.selectedPoint = null;
      app.selectedIntersectionKey = null;
      const o = app.objects.find(x => x.id === app.selectedObjectId);
      if (o) showSelProps(o);
      refreshObjectList(); refreshPathPanels(); draw();
    });
  });
  list.querySelectorAll('.vis-toggle').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const o = app.objects.find(x => x.id === parseInt(b.dataset.id));
      if (o) o.hidden = !o.hidden;
      refreshObjectList(); draw();
    });
  });
  document.getElementById('objCount').textContent = app.objects.length;
  document.getElementById('statusObjects').textContent = `Objects: ${app.objects.length}`;
}

export function showIntersectionProps(key) {
  const pt = findIntersectionByKey(app.paths, app.graphRange, app.objects, key);
  const p = document.getElementById('selectionProps');
  const c = document.getElementById('selPropsContent');
  if (!pt) {
    app.selectedIntersectionKey = null;
    p.style.display = 'none';
    return;
  }
  app.selectedIntersectionKey = key;
  p.style.display = 'block';
  const pathIdx = app.paths.findIndex(pa => pa.id === pt.pathId) + 1;
  const effCall = effectiveCalloutMode(pt, app.intersectionCalloutModes[key]);
  const shapeCur = app.intersectionMarkerShapes[key] || 'brackets';
  let h = `<div class="prop-row"><span class="prop-label">Intersection</span><span style="font-size:11px;color:var(--text-dim);font-family:'JetBrains Mono',monospace">Path ${pathIdx} \u00B7 ${pt.axis}</span></div>`;
  h += `<div class="prop-row"><span class="prop-label">Position</span><span style="font-size:11px;font-family:'JetBrains Mono',monospace">X=${pt.x.toFixed(2)} Y=${pt.y.toFixed(2)}</span></div>`;
  h += `<div class="prop-row"><span class="prop-label">Callout</span><select data-intersect-callout style="flex:1;min-width:0">`;
  h += `<option value="x" ${effCall === 'x' ? 'selected' : ''}>X</option>`;
  h += `<option value="y" ${effCall === 'y' ? 'selected' : ''}>Y</option>`;
  h += `<option value="both" ${effCall === 'both' ? 'selected' : ''}>Both</option>`;
  h += `<option value="off" ${effCall === 'off' ? 'selected' : ''}>Off</option>`;
  h += `</select></div>`;
  h += `<div class="prop-row"><span class="prop-label">Marker</span><select data-intersect-marker style="flex:1;min-width:0">`;
  const shapeOpts = [
    ['brackets', 'Brackets'],
    ['circle', 'Circle'],
    ['square', 'Square'],
    ['diamond', 'Diamond'],
    ['plus', 'Plus'],
    ['both', 'Both']
  ];
  shapeOpts.forEach(([val, lab]) => {
    h += `<option value="${val}" ${shapeCur === val ? 'selected' : ''}>${lab}</option>`;
  });
  h += `</select></div>`;
  c.innerHTML = h;
  const selCo = c.querySelector('[data-intersect-callout]');
  if (selCo) {
    selCo.addEventListener('change', () => {
      saveState();
      const v = selCo.value;
      const defM = defaultCalloutMode(pt);
      if (v === 'off') app.intersectionCalloutModes[key] = 'off';
      else if (v === 'both') app.intersectionCalloutModes[key] = 'both';
      else if (v === defM) delete app.intersectionCalloutModes[key];
      else app.intersectionCalloutModes[key] = v;
      draw();
    });
  }
  const selMk = c.querySelector('[data-intersect-marker]');
  if (selMk) {
    selMk.addEventListener('change', () => {
      saveState();
      const v = selMk.value;
      if (v === 'brackets') delete app.intersectionMarkerShapes[key];
      else app.intersectionMarkerShapes[key] = v;
      draw();
    });
  }
}

export function showSelProps(o) {
  app.selectedIntersectionKey = null;
  const p = document.getElementById('selectionProps'), c = document.getElementById('selPropsContent');
  p.style.display = 'block';
  let h = '';
  if (o.type === 'callout') {
    h = `<div class="prop-row"><span class="prop-label">Text</span><input type="text" value="${o.text}" data-prop="text"></div>`;
    h += `<div class="prop-row"><span class="prop-label">X</span><input type="number" value="${o.x.toFixed(2)}" data-prop="x" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Y</span><input type="number" value="${o.y.toFixed(2)}" data-prop="y" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Size</span><input type="number" value="${o.fontSize || 13}" data-prop="fontSize" min="8" max="36" step="1" style="width:55px"><span style="font-size:10px;color:var(--text-dim)">px</span></div>`;
    h += `<div class="prop-row"><span class="prop-label">Text</span><input type="color" class="color-swatch" value="${o.textColor || cssVar('--callout-text')}" data-prop="textColor"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Bg</span><input type="color" class="color-swatch" value="${o.bgColor || cssVar('--bg-surface')}" data-prop="bgColor"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Border</span><input type="color" class="color-swatch" value="${o.borderColor || cssVar('--callout-border')}" data-prop="borderColor"></div>`;
  } else if (o.type === 'hline') {
    h = `<div class="prop-row"><span class="prop-label">Value</span><input type="number" value="${o.value.toFixed(2)}" data-prop="value" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Name</span><input type="text" value="${o.label || ''}" data-prop="label" placeholder="e.g. Dwell"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Label X</span><input type="range" min="0" max="1" step="any" value="${o.labelPos !== undefined ? o.labelPos : 1.0}" data-prop="labelPos" style="flex:1;accent-color:${o.color || 'var(--accent-orange)'}"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Side</span><select data-prop="labelSide"><option value="above" ${(o.labelSide || 'above') === 'above' ? 'selected' : ''}>Above</option><option value="below" ${o.labelSide === 'below' ? 'selected' : ''}>Below</option></select></div>`;
    h += `<div class="prop-row"><span class="prop-label">Color</span><input type="color" class="color-swatch" value="${o.color || cssVar('--ref-hline')}" data-prop="color"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Intersect</span><select data-prop="intersectPathId" style="flex:1;min-width:0"><option value="" ${o.intersectPathId == null ? 'selected' : ''}>All paths</option>`;
    app.paths.forEach((path, i) => {
      h += `<option value="${path.id}" ${o.intersectPathId === path.id ? 'selected' : ''}>Path ${i + 1}</option>`;
    });
    h += `</select></div>`;
    h += `<div class="prop-row"><span class="prop-label">Hit color</span><input type="color" class="color-swatch" data-prop="intersectColor" value="${o.intersectColor || cssVar('--intersect-default')}"><button type="button" class="prop-reset-hit" style="font-size:10px;margin-left:6px">Default</button></div>`;
  } else if (o.type === 'vline') {
    h = `<div class="prop-row"><span class="prop-label">Value</span><input type="number" value="${o.value.toFixed(2)}" data-prop="value" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Name</span><input type="text" value="${o.label || ''}" data-prop="label" placeholder="e.g. Start"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Label Y</span><input type="range" min="0" max="1" step="any" value="${o.labelPos !== undefined ? o.labelPos : 0.0}" data-prop="labelPos" style="flex:1;accent-color:${o.color || 'var(--accent-purple)'}"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Side</span><select data-prop="labelSide"><option value="right" ${(o.labelSide || 'right') === 'right' ? 'selected' : ''}>Right</option><option value="left" ${o.labelSide === 'left' ? 'selected' : ''}>Left</option></select></div>`;
    h += `<div class="prop-row"><span class="prop-label">Color</span><input type="color" class="color-swatch" value="${o.color || cssVar('--ref-vline')}" data-prop="color"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Intersect</span><select data-prop="intersectPathId" style="flex:1;min-width:0"><option value="" ${o.intersectPathId == null ? 'selected' : ''}>All paths</option>`;
    app.paths.forEach((path, i) => {
      h += `<option value="${path.id}" ${o.intersectPathId === path.id ? 'selected' : ''}>Path ${i + 1}</option>`;
    });
    h += `</select></div>`;
    h += `<div class="prop-row"><span class="prop-label">Hit color</span><input type="color" class="color-swatch" data-prop="intersectColor" value="${o.intersectColor || cssVar('--intersect-default')}"><button type="button" class="prop-reset-hit" style="font-size:10px;margin-left:6px">Default</button></div>`;
  } else if (o.type === 'line' || o.type === 'dimension') {
    h = `<div class="prop-row"><span class="prop-label">X1</span><input type="number" value="${o.x1.toFixed(2)}" data-prop="x1" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Y1</span><input type="number" value="${o.y1.toFixed(2)}" data-prop="y1" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">X2</span><input type="number" value="${o.x2.toFixed(2)}" data-prop="x2" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Y2</span><input type="number" value="${o.y2.toFixed(2)}" data-prop="y2" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Color</span><input type="color" class="color-swatch" value="${o.color || cssVar('--accent-red')}" data-prop="color"></div>`;
  }
  c.innerHTML = h;
  c.querySelectorAll('input,select').forEach(inp => {
    const handler = () => {
      saveState();
      const prop = inp.dataset.prop;
      if (prop === 'intersectPathId') {
        o.intersectPathId = inp.value === '' ? null : parseInt(inp.value, 10);
        refreshObjectList(); draw();
        return;
      }
      let val;
      if (inp.type === 'number' || inp.type === 'range') val = parseFloat(inp.value);
      else val = inp.value;
      o[prop] = val;
      refreshObjectList(); draw();
    };
    inp.addEventListener('change', handler);
    if (inp.type === 'range') inp.addEventListener('input', handler);
  });
  c.querySelectorAll('.prop-reset-hit').forEach(btn => {
    btn.addEventListener('click', () => {
      saveState();
      delete o.intersectColor;
      showSelProps(o);
      draw();
    });
  });
}

export function updateAnalytics() {
  const el = document.getElementById('analyticsContent');
  const path = activePath();
  if (!path || path.points.length < 2) { el.innerHTML = 'Add points to see analytics'; return; }
  const s = sortedPoints(path.points), xR = s[s.length - 1].x - s[0].x, ys = s.map(p => p.y);
  const yMn = Math.min(...ys), yMx = Math.max(...ys), yR = yMx - yMn;
  const samples = sampleSpline(path, 60); let maxV = 0, maxA = 0; const vels = [];
  for (let i = 1; i < samples.length; i++) { const dx = samples[i].x - samples[i - 1].x; if (dx === 0) continue; const v = (samples[i].y - samples[i - 1].y) / dx; vels.push(v); maxV = Math.max(maxV, Math.abs(v)); }
  for (let i = 1; i < vels.length; i++) maxA = Math.max(maxA, Math.abs(vels[i] - vels[i - 1]));
  const pathIdx = app.paths.indexOf(path) + 1;
  el.innerHTML = `<span style="color:${path.color}">Path ${pathIdx}</span> (${path.points.length} pts)<br>X: ${s[0].x.toFixed(1)} \u2192 ${s[s.length - 1].x.toFixed(1)} (\u0394${xR.toFixed(1)})<br>Y: ${yMn.toFixed(1)} \u2192 ${yMx.toFixed(1)} (\u0394${yR.toFixed(1)})<br>Max |vel|: ${maxV.toFixed(4)}<br>Max |acc|: ${maxA.toFixed(4)}<br>Stroke: ${yR.toFixed(2)}`;
}

export function refreshAll() {
  refreshPathPanels(); refreshObjectList(); updateAnalytics();
  if (app.selectedIntersectionKey) showIntersectionProps(app.selectedIntersectionKey);
  draw();
}

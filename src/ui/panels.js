import { app, saveState } from '../state.js';
import { cssVar } from '../coords.js';
import { sorted, sampleSpline } from '../spline.js';
import { draw } from '../render.js';

export function refreshPointList() {
  const list = document.getElementById('pointList');
  const s = sorted(), oMap = s.map(sp => app.points.indexOf(sp));
  let html = '';
  s.forEach((pt, si) => {
    const oi = oMap[si], isLast = si === s.length - 1, sel = app.selectedPointIdx === oi;
    html += `<div class="point-card ${sel ? 'selected' : ''}" data-oi="${oi}">`;
    html += `<div class="point-card-main">`;
    html += `<span class="idx">${si + 1}</span>`;
    html += `<input type="text" value="${pt.x.toFixed(2)}" data-field="x" data-oi="${oi}">`;
    html += `<input type="text" value="${pt.y.toFixed(2)}" data-field="y" data-oi="${oi}">`;
    html += `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-dim);text-align:center">${isLast ? 'end' : (pt.segType || 'cubic').substr(0, 3)}</span>`;
    html += `<button class="del-btn" data-oi="${oi}">\u00D7</button>`;
    html += `</div>`;
    if (!isLast) {
      const st = pt.segType || 'cubic';
      html += `<div class="seg-ctrl"><span class="seg-label">\u2192</span>`;
      html += `<div class="seg-type-btns"><button data-oi="${oi}" data-st="cubic" class="${st === 'cubic' ? 'active' : ''}">Cubic</button><button data-oi="${oi}" data-st="linear" class="${st === 'linear' ? 'active' : ''}">Linear</button></div>`;
      html += `</div>`;
    }
    html += `</div>`;
  });
  list.innerHTML = html;

  list.querySelectorAll('.point-card').forEach(c => {
    c.addEventListener('click', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      app.selectedPointIdx = parseInt(c.dataset.oi);
      app.selectedObjectId = null;
      refreshPointList(); draw();
    });
  });
  list.querySelectorAll('.point-card-main input').forEach(inp => {
    inp.addEventListener('change', () => {
      const oi = parseInt(inp.dataset.oi), val = parseFloat(inp.value);
      if (isNaN(val)) return;
      saveState(); app.points[oi][inp.dataset.field] = val; updateAnalytics(); draw();
    });
    inp.addEventListener('focus', e => e.target.select());
  });
  list.querySelectorAll('.del-btn').forEach(b => {
    b.addEventListener('click', () => {
      saveState(); app.points.splice(parseInt(b.dataset.oi), 1);
      app.selectedPointIdx = -1; refreshPointList(); updateAnalytics(); draw();
    });
  });
  list.querySelectorAll('.seg-type-btns button').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation(); saveState();
      app.points[parseInt(b.dataset.oi)].segType = b.dataset.st;
      refreshPointList(); draw();
    });
  });

  document.getElementById('pointCount').textContent = `${app.points.length} pts`;
  document.getElementById('statusPoints').textContent = `Points: ${app.points.length}`;
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
      app.selectedPointIdx = -1;
      const o = app.objects.find(x => x.id === app.selectedObjectId);
      if (o) showSelProps(o);
      refreshObjectList(); refreshPointList(); draw();
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

export function showSelProps(o) {
  const p = document.getElementById('selectionProps'), c = document.getElementById('selPropsContent');
  p.style.display = 'block';
  let h = '';
  if (o.type === 'callout') {
    h = `<div class="prop-row"><span class="prop-label">Text</span><input type="text" value="${o.text}" data-prop="text"></div>`;
    h += `<div class="prop-row"><span class="prop-label">X</span><input type="number" value="${o.x.toFixed(2)}" data-prop="x" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Y</span><input type="number" value="${o.y.toFixed(2)}" data-prop="y" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Size</span><input type="number" value="${o.fontSize || 13}" data-prop="fontSize" min="8" max="36" step="1" style="width:55px"><span style="font-size:10px;color:var(--text-dim)">px</span></div>`;
    h += `<div class="prop-row"><span class="prop-label">Text</span><input type="color" class="color-swatch" value="${o.textColor || '#e0e4f0'}" data-prop="textColor"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Bg</span><input type="color" class="color-swatch" value="${o.bgColor || '#1a1e28'}" data-prop="bgColor"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Border</span><input type="color" class="color-swatch" value="${o.borderColor || '#4a5580'}" data-prop="borderColor"></div>`;
  } else if (o.type === 'hline') {
    h = `<div class="prop-row"><span class="prop-label">Value</span><input type="number" value="${o.value.toFixed(2)}" data-prop="value" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Name</span><input type="text" value="${o.label || ''}" data-prop="label" placeholder="e.g. Dwell"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Label X</span><input type="range" min="0" max="1" step="any" value="${o.labelPos !== undefined ? o.labelPos : 1.0}" data-prop="labelPos" style="flex:1;accent-color:${o.color || 'var(--accent-orange)'}"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Side</span><select data-prop="labelSide"><option value="above" ${(o.labelSide || 'above') === 'above' ? 'selected' : ''}>Above</option><option value="below" ${o.labelSide === 'below' ? 'selected' : ''}>Below</option></select></div>`;
    h += `<div class="prop-row"><span class="prop-label">Color</span><input type="color" class="color-swatch" value="${o.color || cssVar('--ref-hline')}" data-prop="color"></div>`;
  } else if (o.type === 'vline') {
    h = `<div class="prop-row"><span class="prop-label">Value</span><input type="number" value="${o.value.toFixed(2)}" data-prop="value" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Name</span><input type="text" value="${o.label || ''}" data-prop="label" placeholder="e.g. Start"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Label Y</span><input type="range" min="0" max="1" step="any" value="${o.labelPos !== undefined ? o.labelPos : 0.0}" data-prop="labelPos" style="flex:1;accent-color:${o.color || 'var(--accent-purple)'}"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Side</span><select data-prop="labelSide"><option value="right" ${(o.labelSide || 'right') === 'right' ? 'selected' : ''}>Right</option><option value="left" ${o.labelSide === 'left' ? 'selected' : ''}>Left</option></select></div>`;
    h += `<div class="prop-row"><span class="prop-label">Color</span><input type="color" class="color-swatch" value="${o.color || cssVar('--ref-vline')}" data-prop="color"></div>`;
  } else if (o.type === 'line' || o.type === 'dimension') {
    h = `<div class="prop-row"><span class="prop-label">X1</span><input type="number" value="${o.x1.toFixed(2)}" data-prop="x1" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Y1</span><input type="number" value="${o.y1.toFixed(2)}" data-prop="y1" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">X2</span><input type="number" value="${o.x2.toFixed(2)}" data-prop="x2" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Y2</span><input type="number" value="${o.y2.toFixed(2)}" data-prop="y2" step="1"></div>`;
    h += `<div class="prop-row"><span class="prop-label">Color</span><input type="color" class="color-swatch" value="${o.color || '#ef4444'}" data-prop="color"></div>`;
  }
  c.innerHTML = h;
  c.querySelectorAll('input,select').forEach(inp => {
    const handler = () => {
      saveState();
      const prop = inp.dataset.prop;
      let val;
      if (inp.type === 'number' || inp.type === 'range') val = parseFloat(inp.value);
      else val = inp.value;
      o[prop] = val;
      refreshObjectList(); draw();
    };
    inp.addEventListener('change', handler);
    if (inp.type === 'range') inp.addEventListener('input', handler);
  });
}

export function updateAnalytics() {
  const el = document.getElementById('analyticsContent');
  if (app.points.length < 2) { el.innerHTML = 'Add points to see analytics'; return; }
  const s = sorted(), xR = s[s.length - 1].x - s[0].x, ys = s.map(p => p.y);
  const yMn = Math.min(...ys), yMx = Math.max(...ys), yR = yMx - yMn;
  const samples = sampleSpline(60); let maxV = 0, maxA = 0; const vels = [];
  for (let i = 1; i < samples.length; i++) { const dx = samples[i].x - samples[i - 1].x; if (dx === 0) continue; const v = (samples[i].y - samples[i - 1].y) / dx; vels.push(v); maxV = Math.max(maxV, Math.abs(v)); }
  for (let i = 1; i < vels.length; i++) maxA = Math.max(maxA, Math.abs(vels[i] - vels[i - 1]));
  el.innerHTML = `Points: ${app.points.length}<br>X: ${s[0].x.toFixed(1)} \u2192 ${s[s.length - 1].x.toFixed(1)} (\u0394${xR.toFixed(1)})<br>Y: ${yMn.toFixed(1)} \u2192 ${yMx.toFixed(1)} (\u0394${yR.toFixed(1)})<br>Max |vel|: ${maxV.toFixed(4)}<br>Max |acc|: ${maxA.toFixed(4)}<br>Stroke: ${yR.toFixed(2)}`;
}

export function refreshAll() {
  refreshPointList(); refreshObjectList(); updateAnalytics(); draw();
}

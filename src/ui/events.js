import { app, saveState, getPath, activePath } from '../state.js';
import { c2g, cssVar } from '../coords.js';
import { draw, resize } from '../render.js';
import { setPalette, toggleColorMode } from '../themes/applyTheme.js';
import { hitPt, hitObj, hitIntersectLabel, hitIntersectMarker } from '../hitTest.js';
import { undo, redo } from '../history.js';
import { refreshPathPanels, refreshObjectList, showSelProps, showIntersectionProps, updateAnalytics, refreshAll, addNewPath } from './panels.js';
import { exportSvg } from './exportSvg.js';
import { exportPng } from '../export/rasterExport.js';
import { exportPdf } from '../export/pdfExport.js';
import { resolveSnap } from '../snapEngine.js';

function setPanelState(side, open) {
  const layout = document.querySelector('.app-layout');
  const panel = document.querySelector(side === 'left' ? '.left-panel' : '.right-panel');
  if (side === 'left') {
    app.leftPanelOpen = open;
    layout.classList.toggle('left-collapsed', !open);
    panel.classList.toggle('collapsed', !open);
  } else {
    app.rightPanelOpen = open;
    layout.classList.toggle('right-collapsed', !open);
    panel.classList.toggle('collapsed', !open);
  }
  setTimeout(resize, 260);
}

function toggleLeftPanel() {
  setPanelState('left', !app.leftPanelOpen);
}

function toggleRightPanel() {
  setPanelState('right', !app.rightPanelOpen);
}

function setTool(t) {
  app.activeTool = t;
  app.lineStart = null;
  document.querySelectorAll('#mainToolbar button').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('tool-' + t);
  if (btn) btn.classList.add('active');
  app.canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
  document.getElementById('statusTool').textContent = 'Tool: ' + (btn?.textContent.trim() || t);
}

function toggleIntersects() {
  app.showIntersects = !app.showIntersects;
  document.getElementById('tool-intersect').classList.toggle('active', app.showIntersects);
  draw();
}

function snapSummary() {
  const parts = [];
  if (app.snapToGrid) parts.push('Grid');
  if (app.snapToPathNodes) parts.push('Nodes');
  if (app.snapToPathCurve) parts.push('Curve');
  return parts.length ? 'Snap: ' + parts.join('+') : 'Snap: Off';
}

function syncSnapUI() {
  const el = document.getElementById('statusSnap');
  document.getElementById('snapLabel').textContent = snapSummary();
  const anyOn = app.snapToGrid || app.snapToPathNodes || app.snapToPathCurve;
  el.style.color = anyOn ? '' : 'var(--accent-orange)';
  document.getElementById('snapGrid').checked = app.snapToGrid;
  document.getElementById('snapNodes').checked = app.snapToPathNodes;
  document.getElementById('snapCurve').checked = app.snapToPathCurve;
  document.getElementById('snapActiveOnly').checked = app.snapActivePathOnly;
}

let _snapSaved = null;

function toggleSnapMaster() {
  const anyOn = app.snapToGrid || app.snapToPathNodes || app.snapToPathCurve;
  if (anyOn) {
    _snapSaved = { g: app.snapToGrid, n: app.snapToPathNodes, c: app.snapToPathCurve };
    app.snapToGrid = false; app.snapToPathNodes = false; app.snapToPathCurve = false;
  } else {
    const s = _snapSaved || { g: true, n: true, c: true };
    app.snapToGrid = s.g; app.snapToPathNodes = s.n; app.snapToPathCurve = s.c;
    _snapSaved = null;
  }
  syncSnapUI();
}

function pointerSnap(gx, gy, shiftKey, excludePathId, excludePointIndex, snapOpts) {
  return resolveSnap(gx, gy, { shiftKey, excludePathId, excludePointIndex, ...(snapOpts || {}) });
}

function toggleTheme() {
  toggleColorMode(draw);
}

function confirmCallout() {
  const t = document.getElementById('calloutText').value.trim();
  if (app.editingCallout) {
    if (t) { saveState(); app.editingCallout.text = t; refreshObjectList(); showSelProps(app.editingCallout); draw(); }
    app.editingCallout = null;
  } else if (t && app.calloutPos) {
    saveState();
    app.objects.push({
      type: 'callout',
      id: app.nextId++,
      x: app.calloutPos.x,
      y: app.calloutPos.y + 15,
      text: t,
      anchorX: app.calloutPos.x,
      anchorY: app.calloutPos.y,
    });
    refreshObjectList(); draw();
  }
  document.getElementById('calloutOverlay').classList.remove('show');
  document.getElementById('calloutOverlay').querySelector('h4').textContent = 'Add Callout';
  app.calloutPos = null;
}

function cancelCallout() {
  document.getElementById('calloutOverlay').classList.remove('show');
  app.calloutPos = null;
  app.editingCallout = null;
  document.getElementById('calloutOverlay').querySelector('h4').textContent = 'Add Callout';
}

function ctxAction(a) {
  document.getElementById('contextMenu').classList.remove('show');
  if (a === 'delete') {
    saveState();
    if (app.selectedPoint) {
      const path = getPath(app.selectedPoint.pathId);
      if (path) path.points.splice(app.selectedPoint.pointIndex, 1);
      app.selectedPoint = null;
      refreshPathPanels();
    } else if (app.selectedObjectId !== null) {
      app.objects = app.objects.filter(o => o.id !== app.selectedObjectId);
      app.selectedObjectId = null;
      refreshObjectList();
    }
    draw();
  }
  if (a === 'duplicate') {
    saveState();
    if (app.selectedPoint) {
      const path = getPath(app.selectedPoint.pathId);
      if (path) {
        const srcPt = path.points[app.selectedPoint.pointIndex];
        const pt = { ...srcPt, x: srcPt.x + app.gridStep.x, id: app.nextId++ };
        path.points.push(pt);
        path.points.sort((a, b) => a.x - b.x);
        refreshPathPanels();
      }
    } else if (app.selectedObjectId !== null) {
      const o = app.objects.find(x => x.id === app.selectedObjectId);
      if (o) {
        const d = { ...o, id: app.nextId++ };
        if (d.x !== undefined) d.x += 10;
        if (d.x1 !== undefined) { d.x1 += 10; d.x2 += 10; }
        if (d.value !== undefined) d.value += app.gridStep.x;
        app.objects.push(d); refreshObjectList();
      }
    }
    draw();
  }
  if (a === 'toFront' && app.selectedObjectId) { const i = app.objects.findIndex(o => o.id === app.selectedObjectId); if (i >= 0) app.objects.push(app.objects.splice(i, 1)[0]); draw(); }
  if (a === 'toBack' && app.selectedObjectId) { const i = app.objects.findIndex(o => o.id === app.selectedObjectId); if (i >= 0) app.objects.unshift(app.objects.splice(i, 1)[0]); draw(); }
}

export function initEvents() {
  const canvas = app.canvas;

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect(); app.mouseCanvasX = e.clientX - r.left; app.mouseCanvasY = e.clientY - r.top;
    const gp = c2g(app.mouseCanvasX, app.mouseCanvasY);
    document.getElementById('cursorReadout').innerHTML = `X: <span>${gp.x.toFixed(3)}</span> &nbsp; Y: <span>${gp.y.toFixed(3)}</span>`;
    if (app.isPanning) {
      const dx = e.clientX - app.panStart.x, dy = e.clientY - app.panStart.y;
      app.panX -= dx / app.zoom;
      app.panY -= dy / app.zoom;
      app.panStart = { x: e.clientX, y: e.clientY };
      draw();
      return;
    }
    if (app.draggingIntersectLabel) {
      const g = c2g(app.mouseCanvasX, app.mouseCanvasY);
      const d = app.draggingIntersectLabel;
      app.intersectionLabelPositions[d.key] = { gx: g.x + d.offGx, gy: g.y + d.offGy };
      draw();
      return;
    }
    if (app.draggingPointInfo) {
      const path = getPath(app.draggingPointInfo.pathId);
      if (path) {
        const g = c2g(app.mouseCanvasX, app.mouseCanvasY);
        const s = pointerSnap(g.x, g.y, e.shiftKey, undefined, undefined, { gridOnly: true });
        path.points[app.draggingPointInfo.pointIndex].x = s.x;
        path.points[app.draggingPointInfo.pointIndex].y = s.y;
        app.lastSnapKind = s.kind; app.lastSnapX = s.x; app.lastSnapY = s.y;
        refreshPathPanels(); updateAnalytics(); draw();
      }
      return;
    }
    if (app.draggingObject) {
      const g = c2g(app.mouseCanvasX, app.mouseCanvasY);
      if (app.draggingObject.type === 'callout') {
        const s = pointerSnap(g.x + app.dragOffset.x, g.y + app.dragOffset.y, e.shiftKey);
        if (app.draggingCalloutPart === 'anchor') { app.draggingObject.anchorX = s.x; app.draggingObject.anchorY = s.y; }
        else { app.draggingObject.x = s.x; app.draggingObject.y = s.y; }
      } else if (app.draggingObject.type === 'hline') { app.draggingObject.value = pointerSnap(0, g.y, e.shiftKey).y; }
      else if (app.draggingObject.type === 'vline') { app.draggingObject.value = pointerSnap(g.x, 0, e.shiftKey).x; }
      else if (app.draggingObject.type === 'line' || app.draggingObject.type === 'dimension') {
        const s = pointerSnap(g.x, g.y, e.shiftKey);
        if (app.draggingCalloutPart === 'p1') { app.draggingObject.x1 = s.x; app.draggingObject.y1 = s.y; }
        else if (app.draggingCalloutPart === 'p2') { app.draggingObject.x2 = s.x; app.draggingObject.y2 = s.y; }
        else if (app.draggingCalloutPart === 'label') { app.draggingObject.labelX = g.x + app.dragOffset.x; app.draggingObject.labelY = g.y + app.dragOffset.y; }
        else {
          const dx = g.x - app.dragOffset.x; const dy = g.y - app.dragOffset.y;
          app.draggingObject.x1 += dx; app.draggingObject.y1 += dy; app.draggingObject.x2 += dx; app.draggingObject.y2 += dy;
          if (app.draggingObject.labelX !== undefined) { app.draggingObject.labelX += dx; app.draggingObject.labelY += dy; }
          app.dragOffset.x = g.x; app.dragOffset.y = g.y;
        }
      }
      app.lastSnapKind = 'none';
      refreshObjectList(); showSelProps(app.draggingObject); draw(); return;
    }
    {
      const hp = hitPt(app.mouseCanvasX, app.mouseCanvasY) !== null;
      const hi = app.showIntersects && hitIntersectLabel(app.mouseCanvasX, app.mouseCanvasY) !== null;
      const hm = app.showIntersects && hitIntersectMarker(app.mouseCanvasX, app.mouseCanvasY) !== null;
      const ho = hitObj(app.mouseCanvasX, app.mouseCanvasY) !== null;
      const panHover = e.altKey && !hp && !hi && !hm && !ho;
      if (app.activeTool === 'select') {
        canvas.style.cursor = hp || hi || hm || ho || panHover ? 'grab' : 'default';
      } else if (panHover) {
        canvas.style.cursor = 'grab';
      }
    }
    if (app.lineStart && (app.activeTool === 'line' || app.activeTool === 'dimension')) {
      const ps = pointerSnap(gp.x, gp.y, e.shiftKey);
      app.lastSnapKind = ps.kind; app.lastSnapX = ps.x; app.lastSnapY = ps.y;
      draw();
    } else if (!app.draggingPointInfo && !app.draggingObject) {
      app.lastSnapKind = 'none';
    }
  });

  canvas.addEventListener('mousedown', e => {
    if (e.button === 1) {
      app.isPanning = true;
      app.panStart = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }
    if (e.button === 0 && app.spaceDown) {
      app.isPanning = true;
      app.panStart = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }
    if (e.button === 0 && e.altKey) {
      const pi = hitPt(app.mouseCanvasX, app.mouseCanvasY);
      const il = app.showIntersects ? hitIntersectLabel(app.mouseCanvasX, app.mouseCanvasY) : null;
      const im = app.showIntersects ? hitIntersectMarker(app.mouseCanvasX, app.mouseCanvasY) : null;
      const oi = hitObj(app.mouseCanvasX, app.mouseCanvasY);
      if (!pi && !il && !im && !oi) {
        app.isPanning = true;
        app.panStart = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
        return;
      }
    }
    if (e.button === 2) return;
    const gp = c2g(app.mouseCanvasX, app.mouseCanvasY);
    if (app.activeTool === 'select') {
      const pi = hitPt(app.mouseCanvasX, app.mouseCanvasY);
      if (pi) {
        saveState();
        app.selectedPoint = pi;
        app.activePathId = pi.pathId;
        app.selectedObjectId = null;
        app.selectedIntersectionKey = null;
        app.draggingPointInfo = pi;
        canvas.style.cursor = 'grabbing';
        refreshPathPanels(); draw();
        return;
      }
      const il = app.showIntersects ? hitIntersectLabel(app.mouseCanvasX, app.mouseCanvasY) : null;
      if (il) {
        saveState();
        app.selectedPoint = null;
        app.selectedObjectId = null;
        app.selectedIntersectionKey = il.key;
        showIntersectionProps(il.key);
        const gp = c2g(app.mouseCanvasX, app.mouseCanvasY);
        const cur = app.intersectionLabelPositions[il.key] || { gx: il.labelGx, gy: il.labelGy };
        app.draggingIntersectLabel = { key: il.key, offGx: cur.gx - gp.x, offGy: cur.gy - gp.y };
        canvas.style.cursor = 'grabbing';
        refreshPathPanels();
        refreshObjectList();
        draw();
        return;
      }
      const im = app.showIntersects ? hitIntersectMarker(app.mouseCanvasX, app.mouseCanvasY) : null;
      if (im) {
        app.selectedPoint = null;
        app.selectedObjectId = null;
        showIntersectionProps(im.key);
        refreshPathPanels();
        refreshObjectList();
        draw();
        return;
      }
      const oi = hitObj(app.mouseCanvasX, app.mouseCanvasY);
      if (oi) {
        saveState(); app.selectedObjectId = oi.obj.id; app.selectedPoint = null; app.selectedIntersectionKey = null; app.draggingObject = oi.obj; app.draggingCalloutPart = oi.part;
        if (oi.obj.type === 'callout') {
          if (oi.part === 'anchor') { app.dragOffset = { x: oi.obj.anchorX - gp.x, y: oi.obj.anchorY - gp.y }; }
          else { app.dragOffset = { x: oi.obj.x - gp.x, y: oi.obj.y - gp.y }; }
        }
        if (oi.obj.type === 'line' || oi.obj.type === 'dimension') {
          if (oi.part === 'label') { const midGx = (oi.obj.x1 + oi.obj.x2) / 2, midGy = (oi.obj.y1 + oi.obj.y2) / 2; const lx = oi.obj.labelX !== undefined ? oi.obj.labelX : midGx; const ly = oi.obj.labelY !== undefined ? oi.obj.labelY : midGy + 5; app.dragOffset = { x: lx - gp.x, y: ly - gp.y }; }
          else { app.dragOffset = { x: gp.x, y: gp.y }; }
        }
        canvas.style.cursor = 'grabbing'; refreshObjectList(); showSelProps(oi.obj); draw(); return;
      }
      app.selectedPoint = null; app.selectedObjectId = null; app.selectedIntersectionKey = null; document.getElementById('selectionProps').style.display = 'none';
      refreshPathPanels(); refreshObjectList(); draw();
    }
    if (app.activeTool === 'point') {
      saveState();
      const s = pointerSnap(gp.x, gp.y, e.shiftKey);
      const path = activePath();
      if (path) {
        path.points.push({ x: s.x, y: s.y, id: app.nextId++, segType: 'cubic', segTension: 0.5 });
        path.points.sort((a, b) => a.x - b.x);
        app.selectedPoint = { pathId: path.id, pointIndex: path.points.findIndex(p => p.id === app.nextId - 1) };
        refreshPathPanels(); updateAnalytics(); draw();
      }
    }
    if (app.activeTool === 'line' || app.activeTool === 'dimension') { const s = pointerSnap(gp.x, gp.y, e.shiftKey); if (!app.lineStart) { app.lineStart = s; } else { saveState(); app.objects.push({ type: app.activeTool === 'line' ? 'line' : 'dimension', id: app.nextId++, x1: app.lineStart.x, y1: app.lineStart.y, x2: s.x, y2: s.y, color: app.activeTool === 'line' ? cssVar('--accent-red') : cssVar('--accent-orange'), dashed: false, label: '' }); app.lineStart = null; refreshObjectList(); draw(); } }
    if (app.activeTool === 'hline') { saveState(); const s = pointerSnap(gp.x, gp.y, e.shiftKey); app.objects.push({ type: 'hline', id: app.nextId++, value: s.y, color: '', label: '' }); refreshObjectList(); draw(); }
    if (app.activeTool === 'vline') { saveState(); const s = pointerSnap(gp.x, gp.y, e.shiftKey); app.objects.push({ type: 'vline', id: app.nextId++, value: s.x, color: '', label: '' }); refreshObjectList(); draw(); }
    if (app.activeTool === 'callout') { const s = pointerSnap(gp.x, gp.y, e.shiftKey); app.calloutPos = s; document.getElementById('calloutOverlay').classList.add('show'); document.getElementById('calloutText').value = ''; document.getElementById('calloutText').focus(); }
  });

  canvas.addEventListener('mouseup', () => {
    if (app.isPanning) { app.isPanning = false; canvas.style.cursor = app.activeTool === 'select' ? 'default' : 'crosshair'; return; }
    if (app.draggingPointInfo) { app.draggingPointInfo = null; app.lastSnapKind = 'none'; canvas.style.cursor = 'grab'; }
    if (app.draggingIntersectLabel) { app.draggingIntersectLabel = null; canvas.style.cursor = 'grab'; }
    if (app.draggingObject) { app.draggingObject = null; app.draggingCalloutPart = null; canvas.style.cursor = 'grab'; }
  });

  canvas.addEventListener('dblclick', () => {
    const oi = hitObj(app.mouseCanvasX, app.mouseCanvasY);
    if (oi && oi.obj.type === 'callout' && oi.part === 'tag') {
      const obj = oi.obj;
      app.selectedObjectId = obj.id;
      app.selectedIntersectionKey = null;
      const overlay = document.getElementById('calloutOverlay');
      overlay.querySelector('h4').textContent = 'Edit Callout';
      const inp = document.getElementById('calloutText');
      inp.value = obj.text;
      app.calloutPos = null;
      overlay.classList.add('show');
      inp.focus(); inp.select();
      app.editingCallout = obj;
    }
  });

  canvas.addEventListener('wheel', e => { e.preventDefault(); app.zoom = Math.max(0.2, Math.min(5, app.zoom * (e.deltaY > 0 ? 0.9 : 1.1))); document.getElementById('zoomLabel').textContent = Math.round(app.zoom * 100) + '%'; draw(); }, { passive: false });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const pi = hitPt(app.mouseCanvasX, app.mouseCanvasY), oi = hitObj(app.mouseCanvasX, app.mouseCanvasY);
    if (pi) { app.selectedPoint = pi; app.activePathId = pi.pathId; app.selectedObjectId = null; app.selectedIntersectionKey = null; }
    else if (oi) { app.selectedObjectId = oi.obj.id; app.selectedPoint = null; app.selectedIntersectionKey = null; }
    else return;
    const m = document.getElementById('contextMenu');
    m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px'; m.classList.add('show');
    draw();
  });

  document.addEventListener('click', e => { if (!document.getElementById('contextMenu').contains(e.target)) document.getElementById('contextMenu').classList.remove('show'); });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { app.spaceDown = true; canvas.style.cursor = 'grab'; e.preventDefault(); }
    if (e.key === 'v' || e.key === 'V') setTool('select');
    if (e.key === 'p' || e.key === 'P') setTool('point');
    if (e.key === 'l' || e.key === 'L') setTool('line');
    if (e.key === 'h' || e.key === 'H') setTool('hline');
    if (e.key === 'g' || e.key === 'G') setTool('vline');
    if (e.key === 't' || e.key === 'T') setTool('callout');
    if (e.key === 'd' || e.key === 'D') setTool('dimension');
    if (e.key === 's' || e.key === 'S') toggleSnapMaster();
    if (e.key === 'Shift') app.shiftDown = true;
    if (e.key === 'i' || e.key === 'I') toggleIntersects();
    if (e.key === '[') toggleLeftPanel();
    if (e.key === ']') toggleRightPanel();
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (app.selectedPoint) {
        saveState();
        const path = getPath(app.selectedPoint.pathId);
        if (path) path.points.splice(app.selectedPoint.pointIndex, 1);
        app.selectedPoint = null;
        refreshPathPanels(); updateAnalytics(); draw();
      } else if (app.selectedObjectId !== null) {
        saveState(); app.objects = app.objects.filter(o => o.id !== app.selectedObjectId); app.selectedObjectId = null; refreshObjectList(); draw();
      }
    }
    if (e.ctrlKey && e.key === 'z') { undo(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 'y') { redo(); e.preventDefault(); }
    if (e.key === 'Escape') { app.lineStart = null; cancelCallout(); }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space') { app.spaceDown = false; canvas.style.cursor = app.activeTool === 'select' ? 'default' : 'crosshair'; }
    if (e.key === 'Shift') app.shiftDown = false;
  });

  document.querySelectorAll('#mainToolbar button').forEach(btn => {
    btn.addEventListener('click', () => { const t = btn.id.replace('tool-', ''); if (t === 'intersect') { toggleIntersects(); return; } setTool(t); });
  });

  document.getElementById('btnConfirmCallout').addEventListener('click', confirmCallout);
  document.getElementById('btnCancelCallout').addEventListener('click', cancelCallout);
  document.getElementById('calloutText').addEventListener('keydown', e => { if (e.key === 'Enter') confirmCallout(); if (e.key === 'Escape') cancelCallout(); });

  document.querySelectorAll('#contextMenu button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => ctxAction(btn.dataset.action));
  });

  const snapEl = document.getElementById('statusSnap');
  const snapPop = document.getElementById('snapPopover');
  snapEl.addEventListener('click', e => {
    if (snapPop.contains(e.target)) return;
    snapPop.classList.toggle('show');
  });
  document.addEventListener('click', e => {
    if (!snapEl.contains(e.target)) snapPop.classList.remove('show');
  });
  document.getElementById('snapGrid').addEventListener('change', e => { app.snapToGrid = e.target.checked; syncSnapUI(); });
  document.getElementById('snapNodes').addEventListener('change', e => { app.snapToPathNodes = e.target.checked; syncSnapUI(); });
  document.getElementById('snapCurve').addEventListener('change', e => { app.snapToPathCurve = e.target.checked; syncSnapUI(); });
  document.getElementById('snapActiveOnly').addEventListener('change', e => { app.snapActivePathOnly = e.target.checked; });
  syncSnapUI();

  ['xMin', 'xMax', 'yMin', 'yMax'].forEach(id => { document.getElementById(id).addEventListener('change', e => { app.graphRange[id] = parseFloat(e.target.value); draw(); }); });
  ['xGrid', 'yGrid'].forEach(id => { document.getElementById(id).addEventListener('change', e => { app.gridStep[id === 'xGrid' ? 'x' : 'y'] = parseFloat(e.target.value); draw(); }); });
  document.getElementById('xLabel').addEventListener('change', e => { app.axisLabels.x = e.target.value; draw(); });
  document.getElementById('yLabel').addEventListener('change', e => { app.axisLabels.y = e.target.value; draw(); });

  document.getElementById('zoomIn').addEventListener('click', () => { app.zoom = Math.min(5, app.zoom * 1.2); document.getElementById('zoomLabel').textContent = Math.round(app.zoom * 100) + '%'; draw(); });
  document.getElementById('zoomOut').addEventListener('click', () => { app.zoom = Math.max(0.2, app.zoom / 1.2); document.getElementById('zoomLabel').textContent = Math.round(app.zoom * 100) + '%'; draw(); });
  document.getElementById('zoomFit').addEventListener('click', () => { app.zoom = 1; app.panX = 0; app.panY = 0; document.getElementById('zoomLabel').textContent = '100%'; draw(); });

  document.getElementById('btnTheme').addEventListener('click', toggleTheme);
  document.getElementById('paletteSelect').addEventListener('change', e => {
    setPalette(e.target.value, draw);
  });
  document.getElementById('btnUndo').addEventListener('click', undo);
  document.getElementById('btnRedo').addEventListener('click', redo);
  document.getElementById('btnClear').addEventListener('click', () => {
    saveState();
    app.paths = [{
      id: app.nextPathId++,
      points: [],
      startSlope: 0,
      endSlope: 0,
      color: cssVar('--accent-blue'),
      width: 2,
    }];
    app.activePathId = app.paths[0].id;
    app.objects = [];
    app.intersectionLabelPositions = {};
    app.intersectionCalloutModes = {};
    app.intersectionMarkerShapes = {};
    app.selectedIntersectionKey = null;
    app.selectedPoint = null;
    app.selectedObjectId = null;
    document.getElementById('selectionProps').style.display = 'none';
    refreshAll();
  });
  document.getElementById('btnExport').addEventListener('click', () => {
    document.getElementById('exportOverlay').classList.add('show');
  });
  document.getElementById('btnCancelExport').addEventListener('click', () => {
    document.getElementById('exportOverlay').classList.remove('show');
  });
  document.getElementById('exportFormat').addEventListener('change', e => {
    const isPdf = e.target.value === 'pdf';
    document.getElementById('exportTransparentRow').style.display = isPdf ? 'none' : '';
  });
  document.getElementById('btnConfirmExport').addEventListener('click', () => {
    const fmt = document.getElementById('exportFormat').value;
    const includeStats = document.getElementById('exportStats').checked;
    const transparent = document.getElementById('exportTransparent').checked;
    const scale = parseInt(document.getElementById('exportScale').value, 10);
    document.getElementById('exportOverlay').classList.remove('show');
    if (fmt === 'svg') {
      exportSvg({ transparent, includeStats, scale });
    } else if (fmt === 'png') {
      exportPng({ transparent, includeStats, scale });
    } else if (fmt === 'pdf') {
      exportPdf({ includeStats, scale });
    }
  });
  document.getElementById('btnAddPath').addEventListener('click', addNewPath);

  document.getElementById('btnToggleLeft').addEventListener('click', toggleLeftPanel);
  document.getElementById('btnToggleRight').addEventListener('click', toggleRightPanel);

  function syncRepeatProfileControls() {
    const inf = document.getElementById('gridMode').value === 'infinite';
    const rep = document.getElementById('repeatProfile').checked;
    const upInp = document.getElementById('repeatProfileUpstream');
    upInp.disabled = !inf || !rep;
    if (upInp.disabled) {
      upInp.checked = false;
      app.repeatProfileUpstream = false;
    }
  }

  document.getElementById('gridMode').addEventListener('change', e => {
    app.infiniteGrid = e.target.value === 'infinite';
    syncRepeatProfileControls();
    draw();
  });
  document.getElementById('repeatProfile').addEventListener('change', e => {
    app.repeatProfile = e.target.checked;
    syncRepeatProfileControls();
    draw();
  });
  document.getElementById('repeatProfileUpstream').addEventListener('change', e => { app.repeatProfileUpstream = e.target.checked; draw(); });
  document.getElementById('masterRollover').addEventListener('change', e => { app.masterAxisRollover = e.target.checked; draw(); });
  document.getElementById('slaveRollover').addEventListener('change', e => { app.slaveAxisRollover = e.target.checked; draw(); });

  syncRepeatProfileControls();

  window.addEventListener('resize', resize);
}

import { app } from './state.js';
import { refreshAll } from './ui/panels.js';

export function undo() {
  if (!app.undoStack.length) return;
  app.redoStack.push(JSON.stringify({
    points: app.points, objects: app.objects,
    startSlope: app.startSlope, endSlope: app.endSlope,
  }));
  const s = JSON.parse(app.undoStack.pop());
  app.points = s.points;
  app.objects = s.objects;
  app.startSlope = s.startSlope;
  app.endSlope = s.endSlope;
  document.getElementById('startSlope').value = app.startSlope;
  document.getElementById('endSlope').value = app.endSlope;
  refreshAll();
}

export function redo() {
  if (!app.redoStack.length) return;
  app.undoStack.push(JSON.stringify({
    points: app.points, objects: app.objects,
    startSlope: app.startSlope, endSlope: app.endSlope,
  }));
  const s = JSON.parse(app.redoStack.pop());
  app.points = s.points;
  app.objects = s.objects;
  app.startSlope = s.startSlope;
  app.endSlope = s.endSlope;
  document.getElementById('startSlope').value = app.startSlope;
  document.getElementById('endSlope').value = app.endSlope;
  refreshAll();
}

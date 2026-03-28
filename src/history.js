import { app } from './state.js';
import { refreshAll } from './ui/panels.js';

export function undo() {
  if (!app.undoStack.length) return;
  app.redoStack.push(JSON.stringify({
    paths: app.paths, activePathId: app.activePathId,
    nextPathId: app.nextPathId, objects: app.objects,
    intersectionLabelPositions: app.intersectionLabelPositions,
    intersectionCalloutModes: app.intersectionCalloutModes,
    intersectionMarkerShapes: app.intersectionMarkerShapes,
  }));
  const s = JSON.parse(app.undoStack.pop());
  app.paths = s.paths;
  app.activePathId = s.activePathId;
  app.nextPathId = s.nextPathId;
  app.objects = s.objects;
  app.intersectionLabelPositions = s.intersectionLabelPositions || {};
  app.intersectionCalloutModes = s.intersectionCalloutModes || {};
  app.intersectionMarkerShapes = s.intersectionMarkerShapes || {};
  refreshAll();
}

export function redo() {
  if (!app.redoStack.length) return;
  app.undoStack.push(JSON.stringify({
    paths: app.paths, activePathId: app.activePathId,
    nextPathId: app.nextPathId, objects: app.objects,
    intersectionLabelPositions: app.intersectionLabelPositions,
    intersectionCalloutModes: app.intersectionCalloutModes,
    intersectionMarkerShapes: app.intersectionMarkerShapes,
  }));
  const s = JSON.parse(app.redoStack.pop());
  app.paths = s.paths;
  app.activePathId = s.activePathId;
  app.nextPathId = s.nextPathId;
  app.objects = s.objects;
  app.intersectionLabelPositions = s.intersectionLabelPositions || {};
  app.intersectionCalloutModes = s.intersectionCalloutModes || {};
  app.intersectionMarkerShapes = s.intersectionMarkerShapes || {};
  refreshAll();
}

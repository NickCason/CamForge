export const app = {
  canvas: null,
  ctx: null,
  container: null,

  W: 0,
  H: 0,
  dpr: window.devicePixelRatio || 1,

  graphRange: { xMin: 0, xMax: 360, yMin: 0, yMax: 100 },
  gridStep: { x: 20, y: 5 },
  axisLabels: { x: 'Degrees (\u00B0)', y: 'Displacement (mm)' },

  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStart: { x: 0, y: 0 },
  spaceDown: false,

  activeTool: 'select',

  paths: [
    {
      id: 1,
      points: [
        { x: 0, y: 0, id: 1, segType: 'cubic', segTension: 0.5 },
        { x: 360, y: 100, id: 2, segType: 'cubic', segTension: 0.5 }
      ],
      startSlope: 0,
      endSlope: 0,
      color: '#4a90d9',
      width: 2,
    }
  ],
  activePathId: 1,
  nextPathId: 2,

  objects: [],

  selectedPoint: null,
  selectedObjectId: null,

  draggingPointInfo: null,
  draggingObject: null,
  draggingCalloutPart: null,
  dragOffset: { x: 0, y: 0 },

  showIntersects: true,
  /** @type {Record<string, { gx: number, gy: number }>} graph-space center for intersection callout labels */
  intersectionLabelPositions: {},
  /** @type {Record<string, 'x'|'y'|'both'|'off'>} callout; missing = axis default (X or Y) */
  intersectionCalloutModes: {},
  /** @type {Record<string, 'brackets'|'circle'|'square'|'diamond'|'plus'|'both'>} */
  intersectionMarkerShapes: {},
  selectedIntersectionKey: null,
  draggingIntersectLabel: null,

  lineStart: null,
  nextId: 3,
  calloutPos: null,
  undoStack: [],
  redoStack: [],
  mouseCanvasX: 0,
  mouseCanvasY: 0,
  snapToGrid: true,
  snapToPathNodes: true,
  snapToPathCurve: true,
  snapActivePathOnly: false,
  shiftDown: false,
  lastSnapKind: 'none',
  lastSnapX: 0,
  lastSnapY: 0,
  isDark: true,
  editingCallout: null,

  leftPanelOpen: true,
  rightPanelOpen: true,

  infiniteGrid: false,
  repeatProfile: false,
  /** When repeat profile is on, also tile copies for negative X (left of base range). */
  repeatProfileUpstream: false,
  masterAxisRollover: false,
  slaveAxisRollover: false,
};

export function getPath(pathId) {
  return app.paths.find(p => p.id === pathId);
}

export function activePath() {
  return app.paths.find(p => p.id === app.activePathId);
}

export function saveState() {
  app.undoStack.push(JSON.stringify({
    paths: app.paths,
    activePathId: app.activePathId,
    nextPathId: app.nextPathId,
    objects: app.objects,
    intersectionLabelPositions: app.intersectionLabelPositions,
    intersectionCalloutModes: app.intersectionCalloutModes,
    intersectionMarkerShapes: app.intersectionMarkerShapes,
  }));
  if (app.undoStack.length > 50) app.undoStack.shift();
  app.redoStack = [];
}

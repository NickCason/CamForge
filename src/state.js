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

  splineColor: '#4a90d9',
  splineWidth: 2,
  startSlope: 0,
  endSlope: 0,

  points: [
    { x: 0, y: 0, id: 1, segType: 'cubic', segTension: 0.5 },
    { x: 360, y: 100, id: 2, segType: 'cubic', segTension: 0.5 }
  ],
  objects: [],

  selectedPointIdx: -1,
  selectedObjectId: null,

  draggingPoint: -1,
  draggingObject: null,
  draggingCalloutPart: null,
  dragOffset: { x: 0, y: 0 },

  showIntersects: true,
  intersectColor: '',

  lineStart: null,
  nextId: 3,
  calloutPos: null,
  undoStack: [],
  redoStack: [],
  mouseCanvasX: 0,
  mouseCanvasY: 0,
  snapEnabled: true,
  isDark: true,
  editingCallout: null,
};

export function saveState() {
  app.undoStack.push(JSON.stringify({
    points: app.points,
    objects: app.objects,
    startSlope: app.startSlope,
    endSlope: app.endSlope,
  }));
  if (app.undoStack.length > 50) app.undoStack.shift();
  app.redoStack = [];
}

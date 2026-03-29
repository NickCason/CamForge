# Snapping system (CamForge)

Short reference for anyone changing pointer / graph snapping.

## Core API

| Piece | Location | Role |
|--------|----------|------|
| `resolveSnap(gx, gy, opts)` | `src/snapEngine.js` | Single source of truth: graph coords in, snapped `{ x, y, kind }` out. |
| `pointerSnap(...)` | `src/ui/events.js` | Thin wrapper: passes `shiftKey`, optional `excludePathId` / `excludePointIndex`, optional `snapOpts` into `resolveSnap`. |
| Snap toggles | `src/state.js` | `snapToGrid`, `snapToPathNodes`, `snapToPathCurve`, `snapActivePathOnly`. |
| Reticle + preview | `src/render.js` | `drawSnapReticle` uses `app.lastSnapKind` / `lastSnapX` / `lastSnapY`. Line/dimension preview calls `resolveSnap` with `shiftKey: app.shiftDown`. |

## Snap kinds

- **`none`** — No target within threshold; coordinates pass through (or shift held).
- **`grid`** — Nearest intersection of `app.gridStep` (in graph units).
- **`node`** — Another path control point (all paths, or active path only if `snapActivePathOnly`).
- **`curve`** — Closest point on a path segment (see below).

Winner is whichever candidate has smallest **screen-space** distance to the pointer, below **`SNAP_THRESHOLD_PX`** (12 px in `snapEngine.js`). Distances use `g2c` × `zoom`; pan offset cancels for point-to-point comparisons.

## `resolveSnap` options

| Option | Effect |
|--------|--------|
| `shiftKey: true` | Disable all snapping; return raw `gx, gy`, `kind: 'none'`. |
| `gridOnly: true` | **Grid only** — ignores path nodes and path curve. Used while **dragging an existing path node** so handles do not stick to the spline or other points. |
| `excludePathId` / `excludePointIndex` | Skip that control point as a node target (unused when `gridOnly` is on for node drag). |

## Repeat profile (infinite grid)

When **Repeat profile** + **Infinite grid** are on, the renderer draws path copies shifted in **X** by `repeatOffsets()` (`src/export/sceneData.js`). Snapping applies the **same offsets** for path **nodes** and **curve** tests so targets match what is drawn. With repeat off, offsets are `[0]`.

## Curve snapping (math)

- Segments use the same **Hermite** formulation as `sampleSpline` (`src/spline.js`): `p1.segType === 'linear'` → line segment; otherwise cubic with entry/exit slopes (including `startSlope` / `endSlope` and neighbor handling).
- **Cubic**: closest point is found by scanning **t** on `[0,1]` (coarse steps + ternary refinement) minimizing distance in **screen space** to the true curve — not a polyline chord — to avoid “phantom” straight snap rails.
- **Linear**: closest point on the segment in screen space (`nearestOnSegmentScreen`).

## UI / input

- Status bar **Snap** label and popover checkboxes sync toggles (`syncSnapUI` in `events.js`).
- **`S`** — Toggle all snap types off / restore previous.
- **`Shift`** (during drag) — Same as `opts.shiftKey`: suspend snap (`keydown`/`keyup` set `app.shiftDown`; mouse handlers use `e.shiftKey`).

## Special cases

- **Dragging path nodes**: `pointerSnap(..., { gridOnly: true })` — grid only.
- **Placing new points** (point tool), lines, dimensions, callouts: full snap per toggles.
- **Dragging objects** (callouts, h/v lines, line ends): full snap; `app.lastSnapKind` is forced to `'none'` after object drag so the reticle does not show for those moves.
- **Line/dimension preview** (`drawPreview`): uses `app.shiftDown` for `shiftKey`; mousemove for the second point uses `e.shiftKey`. They are usually aligned; if preview ever disagrees with the click, check both.

## Files to touch for behavior changes

1. `src/snapEngine.js` — thresholds, candidate logic, Hermite tuning, repeat behavior.
2. `src/ui/events.js` — where `pointerSnap` / `resolveSnap` are invoked; pass `gridOnly` or exclusions.
3. `src/state.js` — default toggles.
4. `index.html` — snap popover markup if adding a new mode.

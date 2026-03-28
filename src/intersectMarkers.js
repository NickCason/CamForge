const CORNER = 8;
const ARM = 5;
const R = 7;
const SQ = 6;

function strokeBracketsPath(ctx, px, py) {
  ctx.moveTo(px - CORNER, py - CORNER); ctx.lineTo(px - CORNER + ARM, py - CORNER);
  ctx.moveTo(px - CORNER, py - CORNER); ctx.lineTo(px - CORNER, py - CORNER + ARM);
  ctx.moveTo(px + CORNER, py - CORNER); ctx.lineTo(px + CORNER - ARM, py - CORNER);
  ctx.moveTo(px + CORNER, py - CORNER); ctx.lineTo(px + CORNER, py - CORNER + ARM);
  ctx.moveTo(px - CORNER, py + CORNER); ctx.lineTo(px - CORNER + ARM, py + CORNER);
  ctx.moveTo(px - CORNER, py + CORNER); ctx.lineTo(px - CORNER, py + CORNER - ARM);
  ctx.moveTo(px + CORNER, py + CORNER); ctx.lineTo(px + CORNER - ARM, py + CORNER);
  ctx.moveTo(px + CORNER, py + CORNER); ctx.lineTo(px + CORNER, py + CORNER - ARM);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {'brackets'|'circle'|'square'|'diamond'|'plus'|'both'} shape
 */
export function drawIntersectionMarker(ctx, shape, px, py, strokeStyle, lineWidth) {
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.fillStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(px, py, R, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'square':
      ctx.rect(px - SQ, py - SQ, 2 * SQ, 2 * SQ);
      ctx.stroke();
      break;
    case 'diamond':
      ctx.moveTo(px, py - R);
      ctx.lineTo(px + R, py);
      ctx.lineTo(px, py + R);
      ctx.lineTo(px - R, py);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'plus':
      ctx.moveTo(px - R, py); ctx.lineTo(px + R, py);
      ctx.moveTo(px, py - R); ctx.lineTo(px, py + R);
      ctx.stroke();
      break;
    case 'both':
      strokeBracketsPath(ctx, px, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'brackets':
    default:
      strokeBracketsPath(ctx, px, py);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

/** @param {'brackets'|'circle'|'square'|'diamond'|'plus'|'both'} shape */
export function intersectMarkerSvg(shape, px, py, stroke, strokeW) {
  const x = v => v.toFixed(2);
  const segs = [];
  const line = (x1, y1, x2, y2) =>
    `<line x1="${x(x1)}" y1="${x(y1)}" x2="${x(x2)}" y2="${x(y2)}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  switch (shape) {
    case 'circle':
      return `<circle cx="${x(px)}" cy="${x(py)}" r="${R}" fill="none" stroke="${stroke}" stroke-width="${strokeW}"/>`;
    case 'square':
      return `<rect x="${x(px - SQ)}" y="${x(py - SQ)}" width="${2 * SQ}" height="${2 * SQ}" fill="none" stroke="${stroke}" stroke-width="${strokeW}"/>`;
    case 'diamond':
      return `<polygon points="${x(px)},${x(py - R)} ${x(px + R)},${x(py)} ${x(px)},${x(py + R)} ${x(px - R)},${x(py)}" fill="none" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"/>`;
    case 'plus':
      return line(px - R, py, px + R, py) + line(px, py - R, px, py + R);
    case 'both': {
      const b = [
        [px - CORNER, py - CORNER, px - CORNER + ARM, py - CORNER],
        [px - CORNER, py - CORNER, px - CORNER, py - CORNER + ARM],
        [px + CORNER, py - CORNER, px + CORNER - ARM, py - CORNER],
        [px + CORNER, py - CORNER, px + CORNER, py - CORNER + ARM],
        [px - CORNER, py + CORNER, px - CORNER + ARM, py + CORNER],
        [px - CORNER, py + CORNER, px - CORNER, py + CORNER - ARM],
        [px + CORNER, py + CORNER, px + CORNER - ARM, py + CORNER],
        [px + CORNER, py + CORNER, px + CORNER, py + CORNER - ARM]
      ];
      let s = b.map(([x1, y1, x2, y2]) => line(x1, y1, x2, y2)).join('');
      s += `<circle cx="${x(px)}" cy="${x(py)}" r="2.5" fill="${stroke}"/>`;
      return s;
    }
    case 'brackets':
    default: {
      const b = [
        [px - CORNER, py - CORNER, px - CORNER + ARM, py - CORNER],
        [px - CORNER, py - CORNER, px - CORNER, py - CORNER + ARM],
        [px + CORNER, py - CORNER, px + CORNER - ARM, py - CORNER],
        [px + CORNER, py - CORNER, px + CORNER, py - CORNER + ARM],
        [px - CORNER, py + CORNER, px - CORNER + ARM, py + CORNER],
        [px - CORNER, py + CORNER, px - CORNER, py + CORNER - ARM],
        [px + CORNER, py + CORNER, px + CORNER - ARM, py + CORNER],
        [px + CORNER, py + CORNER, px + CORNER, py + CORNER - ARM]
      ];
      return b.map(([x1, y1, x2, y2]) => line(x1, y1, x2, y2)).join('');
    }
  }
}

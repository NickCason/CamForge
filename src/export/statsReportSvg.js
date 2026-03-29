import { cssVar } from '../coords.js';

const CARD_MARGIN = 10;
const CARD_PAD_X = 18;
const CARD_PAD_Y = 14;
const CARD_RADIUS = 6;

const TITLE_H = 22;
const RULE_GAP = 10;
const PATH_HEADER_H = 20;
const METRIC_ROW_H = 16;
const PATH_GAP = 16;
const SUBCARD_PAD_X = 10;
const SUBCARD_PAD_Y = 6;
const ACCENT_W = 3;
const SECTION_GAP = 16;
const SECTION_HEADER_H = 18;
const SECTION_RULE_GAP = 8;
const DATA_ROW_H = 16;
const SWATCH_SIZE = 10;
const DOT_R = 3.5;
const LABEL_COL_W = 72;

const SANS = "'IBM Plex Sans',sans-serif";
const MONO = "'JetBrains Mono',monospace";

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtSlope(v) {
  return !isFinite(v) ? '\u221E' : v.toFixed(3);
}

export function getStatsReportHeight(model) {
  if (model.paths.length === 0 && model.intersections.length === 0) return 0;

  let h = CARD_PAD_Y + TITLE_H + RULE_GAP;

  model.paths.forEach((_, i) => {
    if (i > 0) h += PATH_GAP;
    h += PATH_HEADER_H + 5 * METRIC_ROW_H;
  });

  if (model.intersections.length > 0) {
    h += SECTION_GAP + SECTION_HEADER_H + SECTION_RULE_GAP;
    h += model.intersections.length * DATA_ROW_H;
  }

  if (model.segments.length > 0) {
    h += SECTION_GAP + SECTION_HEADER_H + SECTION_RULE_GAP;
    h += model.segments.length * DATA_ROW_H;
  }

  h += CARD_PAD_Y;
  return h + CARD_MARGIN * 2;
}

export function buildStatsReportSvg(model, { x, y, width }) {
  if (model.paths.length === 0 && model.intersections.length === 0) return '';

  const cardX = x + CARD_MARGIN;
  const cardY = y + CARD_MARGIN;
  const cardW = width - CARD_MARGIN * 2;
  const innerLeft = cardX + CARD_PAD_X;
  const innerRight = cardX + cardW - CARD_PAD_X;
  const innerW = innerRight - innerLeft;

  const bgPanel = cssVar('--bg-panel');
  const bgDeep = cssVar('--bg-deep');
  const border = cssVar('--border');
  const textPri = cssVar('--text-primary');
  const textSec = cssVar('--text-secondary');
  const textDim = cssVar('--text-dim');

  let svg = '';
  let cy = cardY + CARD_PAD_Y;

  const cardH = getStatsReportHeight(model) - CARD_MARGIN * 2;
  svg += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${CARD_RADIUS}" fill="${bgPanel}" stroke="${border}" stroke-width="1"/>`;

  svg += `<text x="${innerLeft}" y="${(cy + 15).toFixed(1)}" fill="${textPri}" font-size="13" font-weight="600" letter-spacing="1.5" style="font-family:${SANS}">STATISTICS</text>`;
  cy += TITLE_H;

  svg += `<line x1="${innerLeft}" y1="${cy.toFixed(1)}" x2="${innerRight}" y2="${cy.toFixed(1)}" stroke="${border}" stroke-width="0.5"/>`;
  cy += RULE_GAP;

  const contentStart = innerLeft + ACCENT_W + SUBCARD_PAD_X;
  const metricValueX = contentStart + LABEL_COL_W;

  model.paths.forEach((p, i) => {
    if (i > 0) cy += PATH_GAP;

    const blockH = PATH_HEADER_H + 5 * METRIC_ROW_H;
    const scTop = cy - SUBCARD_PAD_Y;
    const scH = blockH + SUBCARD_PAD_Y * 2;

    svg += `<rect x="${innerLeft.toFixed(1)}" y="${scTop.toFixed(1)}" width="${innerW.toFixed(1)}" height="${scH.toFixed(1)}" rx="4" fill="${bgDeep}"/>`;
    svg += `<rect x="${innerLeft.toFixed(1)}" y="${(scTop + 4).toFixed(1)}" width="${ACCENT_W}" height="${(scH - 8).toFixed(1)}" rx="1" fill="${p.color}"/>`;

    const swY = cy + (PATH_HEADER_H - SWATCH_SIZE) / 2;
    svg += `<rect x="${contentStart.toFixed(1)}" y="${swY.toFixed(1)}" width="${SWATCH_SIZE}" height="${SWATCH_SIZE}" rx="2" fill="${p.color}"/>`;

    const nameX = contentStart + SWATCH_SIZE + 8;
    svg += `<text x="${nameX.toFixed(1)}" y="${(cy + 14).toFixed(1)}" fill="${textSec}" font-size="11" font-weight="600" style="font-family:${SANS}">Path ${p.index}</text>`;

    const ptsSep = nameX + ('Path ' + p.index).length * 6.6 + 6;
    svg += `<text x="${ptsSep.toFixed(1)}" y="${(cy + 14).toFixed(1)}" fill="${textDim}" font-size="10" style="font-family:${SANS}">\u00B7  ${p.pointCount} points</text>`;

    cy += PATH_HEADER_H;

    const metrics = [
      ['X Range', `${p.xMin.toFixed(1)} \u2192 ${p.xMax.toFixed(1)}  (\u0394 ${p.xRange.toFixed(1)})`],
      ['Y Range', `${p.yMin.toFixed(1)} \u2192 ${p.yMax.toFixed(1)}  (\u0394 ${p.yRange.toFixed(1)})`],
      ['Stroke', p.stroke.toFixed(2)],
      ['Max |vel|', p.maxVelocity.toFixed(4)],
      ['Max |acc|', p.maxAcceleration.toFixed(4)]
    ];

    metrics.forEach(([label, value]) => {
      svg += `<text x="${contentStart.toFixed(1)}" y="${(cy + 12).toFixed(1)}" fill="${textDim}" font-size="10" style="font-family:${SANS}">${esc(label)}</text>`;
      svg += `<text x="${metricValueX.toFixed(1)}" y="${(cy + 12).toFixed(1)}" fill="${textSec}" font-size="11" style="font-family:${MONO}">${esc(value)}</text>`;
      cy += METRIC_ROW_H;
    });
  });

  if (model.intersections.length > 0) {
    cy += SECTION_GAP;
    svg += `<text x="${innerLeft}" y="${(cy + 13).toFixed(1)}" fill="${textPri}" font-size="10" font-weight="600" letter-spacing="1.2" style="font-family:${SANS}">INTERSECTIONS</text>`;
    cy += SECTION_HEADER_H;
    svg += `<line x1="${innerLeft}" y1="${cy.toFixed(1)}" x2="${innerRight}" y2="${cy.toFixed(1)}" stroke="${border}" stroke-width="0.5"/>`;
    cy += SECTION_RULE_GAP;

    model.intersections.forEach(int => {
      const dotCx = innerLeft + DOT_R + 2;
      const dotCy = cy + DATA_ROW_H / 2;
      svg += `<circle cx="${dotCx.toFixed(1)}" cy="${dotCy.toFixed(1)}" r="${DOT_R}" fill="${int.pathColor}"/>`;

      const rowX = innerLeft + DOT_R * 2 + 10;
      const slopeStr = fmtSlope(int.slope);
      const text = `P${int.pathIndex}  ${int.axis}   X=${int.x.toFixed(2)}   Y=${int.y.toFixed(2)}   m=${slopeStr}`;
      svg += `<text x="${rowX.toFixed(1)}" y="${(cy + 12).toFixed(1)}" fill="${textSec}" font-size="10" style="font-family:${MONO}">${esc(text)}</text>`;
      cy += DATA_ROW_H;
    });
  }

  if (model.segments.length > 0) {
    cy += SECTION_GAP;
    svg += `<text x="${innerLeft}" y="${(cy + 13).toFixed(1)}" fill="${textPri}" font-size="10" font-weight="600" letter-spacing="1.2" style="font-family:${SANS}">SEGMENT LENGTHS</text>`;
    cy += SECTION_HEADER_H;
    svg += `<line x1="${innerLeft}" y1="${cy.toFixed(1)}" x2="${innerRight}" y2="${cy.toFixed(1)}" stroke="${border}" stroke-width="0.5"/>`;
    cy += SECTION_RULE_GAP;

    let lastPathIdx = -1;
    model.segments.forEach(seg => {
      const dotCx = innerLeft + DOT_R + 2;
      const dotCy = cy + DATA_ROW_H / 2;
      svg += `<circle cx="${dotCx.toFixed(1)}" cy="${dotCy.toFixed(1)}" r="${DOT_R}" fill="${seg.pathColor}"/>`;

      const rowX = innerLeft + DOT_R * 2 + 10;
      let prefix = seg.pathIndex !== lastPathIdx ? `P${seg.pathIndex}  ` : '    ';
      lastPathIdx = seg.pathIndex;
      const text = `${prefix}${seg.from}\u2192${seg.to}   Arc ${seg.arcLength.toFixed(2)}   Straight ${seg.straightLength.toFixed(2)}`;
      svg += `<text x="${rowX.toFixed(1)}" y="${(cy + 12).toFixed(1)}" fill="${textSec}" font-size="10" style="font-family:${MONO}">${esc(text)}</text>`;
      cy += DATA_ROW_H;
    });
  }

  return svg;
}

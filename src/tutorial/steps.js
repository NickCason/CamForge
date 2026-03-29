/**
 * Each step: { target, title, desc, svg, prefer }
 *  - target:  CSS selector for the element to spotlight (null = centered card)
 *  - title:   heading text
 *  - desc:    HTML description (can include <strong>, <kbd>, etc.)
 *  - svg:     inline SVG string for the diagram panel
 *  - prefer:  preferred card placement relative to target ('bottom'|'top'|'left'|'right')
 *  - panel:   if the target lives inside a collapsible panel, 'left' or 'right'
 */
export const STEPS = [
  /* 1 ── Welcome ── */
  {
    target: null,
    title: 'Welcome to CamForge',
    desc: 'CamForge is a precision cam-profile designer. Plot displacement curves, add reference lines, dimension annotations, and export publication-ready graphics &mdash; all in the browser.',
    svg: `<svg viewBox="0 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="260" height="80" rx="6" stroke="var(--border-active)" stroke-width="1" fill="var(--bg-surface)"/>
      <line x1="40" y1="80" x2="250" y2="80" stroke="var(--axis-color)" stroke-width="1.5"/>
      <line x1="40" y1="20" x2="40" y2="80" stroke="var(--axis-color)" stroke-width="1.5"/>
      <path d="M40 75 Q100 72 140 50 T210 25 L250 22" stroke="var(--accent-cyan)" stroke-width="2" fill="none"/>
      <circle cx="40" cy="75" r="3" fill="var(--accent-blue)"/>
      <circle cx="140" cy="50" r="3" fill="var(--accent-blue)"/>
      <circle cx="210" cy="25" r="3" fill="var(--accent-blue)"/>
      <circle cx="250" cy="22" r="3" fill="var(--accent-blue)"/>
      <text x="145" y="96" font-size="9" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">CAM PROFILE</text>
    </svg>`,
    prefer: 'bottom',
  },

  /* 2 ── Select Tool ── */
  {
    target: '#tool-select',
    title: 'Select & Move',
    desc: 'Click any control point or object to select it, then drag to reposition. Hold <kbd>Alt</kbd> and drag empty space to pan the viewport. Shortcut: <kbd>V</kbd>.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 16 L60 56 L72 46 L84 66 L92 62 L80 42 L96 40 Z" fill="var(--accent-cyan)" opacity="0.25" stroke="var(--accent-cyan)" stroke-width="1.5"/>
      <circle cx="160" cy="40" r="6" fill="var(--accent-blue)" stroke="var(--bg-deep)" stroke-width="2"/>
      <circle cx="200" cy="28" r="6" fill="var(--accent-blue)" stroke="var(--bg-deep)" stroke-width="2"/>
      <path d="M200 28 L225 28" stroke="var(--accent-orange)" stroke-width="1.2" stroke-dasharray="3 3"/>
      <circle cx="225" cy="28" r="5" fill="none" stroke="var(--accent-orange)" stroke-width="1.2" stroke-dasharray="2 2"/>
      <text x="225" y="48" font-size="9" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">DRAG</text>
    </svg>`,
    prefer: 'bottom',
  },

  /* 3 ── Point Tool ── */
  {
    target: '#tool-point',
    title: 'Add Points',
    desc: 'Click anywhere on the graph to place a new control point on the active path. Points auto-sort by X and the spline redraws instantly. Shortcut: <kbd>P</kbd>.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="30" y1="65" x2="250" y2="65" stroke="var(--axis-color)" stroke-width="1"/>
      <line x1="30" y1="15" x2="30" y2="65" stroke="var(--axis-color)" stroke-width="1"/>
      <path d="M30 60 Q80 58 120 40 T200 20 L250 18" stroke="var(--accent-blue)" stroke-width="1.5" fill="none"/>
      <circle cx="30" cy="60" r="3.5" fill="var(--accent-blue)"/>
      <circle cx="120" cy="40" r="3.5" fill="var(--accent-blue)"/>
      <circle cx="200" cy="20" r="3.5" fill="var(--accent-blue)"/>
      <circle cx="155" cy="32" r="5" fill="none" stroke="var(--accent-green)" stroke-width="1.5"/>
      <line x1="155" y1="27" x2="155" y2="37" stroke="var(--accent-green)" stroke-width="1.5"/>
      <line x1="150" y1="32" x2="160" y2="32" stroke="var(--accent-green)" stroke-width="1.5"/>
      <text x="170" y="30" font-size="9" fill="var(--accent-green)" font-family="JetBrains Mono, monospace">NEW</text>
    </svg>`,
    prefer: 'bottom',
  },

  /* 4 ── Line Tool ── */
  {
    target: '#tool-line',
    title: 'Indicator Lines',
    desc: 'Draw free-angle lines across the graph for reference or measurement. Click once for the start point, click again for the end. Shortcut: <kbd>L</kbd>.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="10" width="240" height="60" rx="4" stroke="var(--border)" stroke-width="0.7" fill="none"/>
      <line x1="50" y1="60" x2="230" y2="20" stroke="var(--accent-red)" stroke-width="2"/>
      <circle cx="50" cy="60" r="3.5" fill="var(--accent-red)"/>
      <circle cx="230" cy="20" r="3.5" fill="var(--accent-red)"/>
    </svg>`,
    prefer: 'bottom',
  },

  /* 5 ── H-Ref ── */
  {
    target: '#tool-hline',
    title: 'Horizontal Reference',
    desc: 'Place a horizontal reference line at any Y-value. Useful for marking lift heights or datum planes. Drag to reposition after placing. Shortcut: <kbd>H</kbd>.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="10" width="240" height="60" rx="4" stroke="var(--border)" stroke-width="0.7" fill="none"/>
      <line x1="20" y1="38" x2="260" y2="38" stroke="var(--accent-orange)" stroke-width="1.8" stroke-dasharray="6 3"/>
      <text x="245" y="33" font-size="9" fill="var(--accent-orange)" text-anchor="end" font-family="JetBrains Mono, monospace">Y=50</text>
    </svg>`,
    prefer: 'bottom',
  },

  /* 6 ── V-Ref ── */
  {
    target: '#tool-vline',
    title: 'Vertical Reference',
    desc: 'Place a vertical reference line at any X-value. Great for marking angular positions or timing events on the cam. Shortcut: <kbd>G</kbd>.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="10" width="240" height="60" rx="4" stroke="var(--border)" stroke-width="0.7" fill="none"/>
      <line x1="150" y1="10" x2="150" y2="70" stroke="var(--accent-purple)" stroke-width="1.8" stroke-dasharray="6 3"/>
      <text x="158" y="20" font-size="9" fill="var(--accent-purple)" font-family="JetBrains Mono, monospace">X=180</text>
    </svg>`,
    prefer: 'bottom',
  },

  /* 7 ── Callout ── */
  {
    target: '#tool-callout',
    title: 'Text Callouts',
    desc: 'Annotate your graph with text labels. Click to place, then type your label. The callout has an anchor line you can drag independently. Shortcut: <kbd>T</kbd>.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="140" y1="58" x2="165" y2="30" stroke="var(--callout-border)" stroke-width="1"/>
      <circle cx="140" cy="58" r="2.5" fill="var(--callout-border)"/>
      <rect x="130" y="15" width="80" height="20" rx="4" fill="var(--callout-bg)" stroke="var(--callout-border)" stroke-width="1"/>
      <text x="170" y="29" font-size="10" fill="var(--callout-text)" text-anchor="middle" font-family="JetBrains Mono, monospace">Max Lift</text>
    </svg>`,
    prefer: 'bottom',
  },

  /* 8 ── Dimension ── */
  {
    target: '#tool-dimension',
    title: 'Dimensions',
    desc: 'Measure distances between two points with a dimension annotation. Click start, click end &mdash; the measurement appears automatically. Shortcut: <kbd>D</kbd>.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="60" y1="55" x2="220" y2="55" stroke="var(--accent-orange)" stroke-width="1.5"/>
      <line x1="60" y1="45" x2="60" y2="65" stroke="var(--accent-orange)" stroke-width="1.5"/>
      <line x1="220" y1="45" x2="220" y2="65" stroke="var(--accent-orange)" stroke-width="1.5"/>
      <polygon points="65,53 65,57 75,55" fill="var(--accent-orange)"/>
      <polygon points="215,53 215,57 205,55" fill="var(--accent-orange)"/>
      <rect x="110" y="42" width="60" height="16" rx="3" fill="var(--bg-panel)"/>
      <text x="140" y="54" font-size="10" fill="var(--accent-orange)" text-anchor="middle" font-family="JetBrains Mono, monospace">160.0</text>
    </svg>`,
    prefer: 'bottom',
  },

  /* 9 ── Intersections ── */
  {
    target: '#tool-intersect',
    title: 'Intersections',
    desc: 'Toggle intersection detection on or off. When enabled, CamForge finds where your spline crosses the X and Y axes and marks them with interactive labels. Shortcut: <kbd>I</kbd>.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="30" y1="50" x2="260" y2="50" stroke="var(--axis-color)" stroke-width="1"/>
      <path d="M30 65 Q90 60 130 50 T200 30 L260 22" stroke="var(--accent-blue)" stroke-width="1.5" fill="none"/>
      <circle cx="130" cy="50" r="5" fill="none" stroke="var(--accent-green)" stroke-width="2"/>
      <circle cx="130" cy="50" r="2" fill="var(--accent-green)"/>
      <text x="130" y="43" font-size="8" fill="var(--accent-green)" text-anchor="middle" font-family="JetBrains Mono, monospace">X=130</text>
    </svg>`,
    prefer: 'bottom',
  },

  /* 10 ── Paths Panel ── */
  {
    target: '#btnAddPath',
    title: 'Paths Panel',
    desc: 'Manage multiple spline paths. Each path has its own color, line width, and set of control points. Click <strong>+ Add Path</strong> to create a new one. Only the active path receives new points.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 60 Q100 55 140 40 T250 20" stroke="var(--accent-blue)" stroke-width="2" fill="none"/>
      <path d="M30 65 Q120 60 160 50 T250 35" stroke="var(--accent-orange)" stroke-width="2" fill="none"/>
      <path d="M30 70 Q80 68 130 55 T250 45" stroke="var(--accent-green)" stroke-width="2" fill="none"/>
      <circle cx="8" cy="20" r="5" fill="var(--accent-blue)"/>
      <text x="18" y="23" font-size="9" fill="var(--text-secondary)" font-family="JetBrains Mono, monospace">Path 1</text>
      <circle cx="8" cy="35" r="5" fill="var(--accent-orange)"/>
      <text x="18" y="38" font-size="9" fill="var(--text-secondary)" font-family="JetBrains Mono, monospace">Path 2</text>
      <circle cx="8" cy="50" r="5" fill="var(--accent-green)"/>
      <text x="18" y="53" font-size="9" fill="var(--text-secondary)" font-family="JetBrains Mono, monospace">Path 3</text>
    </svg>`,
    prefer: 'right',
    panel: 'left',
  },

  /* 11 ── Objects Panel ── */
  {
    target: '#objectList',
    title: 'Objects Panel',
    desc: 'All placed objects &mdash; lines, reference lines, callouts, and dimensions &mdash; appear here. Click to select, use the eye icon to toggle visibility, and right-click for more actions.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="8" width="240" height="20" rx="3" fill="var(--bg-surface)" stroke="var(--border)" stroke-width="0.7"/>
      <text x="30" y="22" font-size="9" fill="var(--accent-red)" font-family="JetBrains Mono, monospace">LINE</text>
      <text x="65" y="22" font-size="9" fill="var(--text-secondary)" font-family="JetBrains Mono, monospace">Indicator Line</text>
      <rect x="20" y="32" width="240" height="20" rx="3" fill="var(--bg-surface)" stroke="var(--accent-cyan)" stroke-width="1"/>
      <text x="30" y="46" font-size="9" fill="var(--accent-orange)" font-family="JetBrains Mono, monospace">HREF</text>
      <text x="65" y="46" font-size="9" fill="var(--text-secondary)" font-family="JetBrains Mono, monospace">Y = 50.0</text>
      <rect x="20" y="56" width="240" height="20" rx="3" fill="var(--bg-surface)" stroke="var(--border)" stroke-width="0.7"/>
      <text x="30" y="70" font-size="9" fill="var(--accent-purple)" font-family="JetBrains Mono, monospace">VREF</text>
      <text x="65" y="70" font-size="9" fill="var(--text-secondary)" font-family="JetBrains Mono, monospace">X = 180.0</text>
    </svg>`,
    prefer: 'right',
    panel: 'left',
  },

  /* 12 ── Shortcuts ── */
  {
    target: '.shortcuts-grid',
    title: 'Keyboard Shortcuts',
    desc: 'Quickly switch tools and toggle features from the keyboard. All shortcuts are single-key &mdash; no modifier needed. This reference grid is always visible at the bottom of the left panel.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="15" width="28" height="22" rx="4" fill="var(--bg-surface)" stroke="var(--border-active)" stroke-width="1"/>
      <text x="44" y="30" font-size="11" fill="var(--text-primary)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600">V</text>
      <rect x="65" y="15" width="28" height="22" rx="4" fill="var(--bg-surface)" stroke="var(--border-active)" stroke-width="1"/>
      <text x="79" y="30" font-size="11" fill="var(--text-primary)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600">P</text>
      <rect x="100" y="15" width="28" height="22" rx="4" fill="var(--bg-surface)" stroke="var(--border-active)" stroke-width="1"/>
      <text x="114" y="30" font-size="11" fill="var(--text-primary)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600">L</text>
      <rect x="135" y="15" width="28" height="22" rx="4" fill="var(--bg-surface)" stroke="var(--border-active)" stroke-width="1"/>
      <text x="149" y="30" font-size="11" fill="var(--text-primary)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600">H</text>
      <rect x="170" y="15" width="28" height="22" rx="4" fill="var(--bg-surface)" stroke="var(--border-active)" stroke-width="1"/>
      <text x="184" y="30" font-size="11" fill="var(--text-primary)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600">D</text>
      <rect x="205" y="15" width="28" height="22" rx="4" fill="var(--bg-surface)" stroke="var(--border-active)" stroke-width="1"/>
      <text x="219" y="30" font-size="11" fill="var(--text-primary)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600">S</text>
      <text x="44" y="52" font-size="8" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">Select</text>
      <text x="79" y="52" font-size="8" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">Point</text>
      <text x="114" y="52" font-size="8" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">Line</text>
      <text x="149" y="52" font-size="8" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">H-Ref</text>
      <text x="184" y="52" font-size="8" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">Dim</text>
      <text x="219" y="52" font-size="8" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">Snap</text>
    </svg>`,
    prefer: 'right',
    panel: 'left',
  },

  /* 13 ── Graph Range ── */
  {
    target: '#xMin',
    title: 'Graph Range',
    desc: 'Set the X and Y axis boundaries and grid spacing. CamForge defaults to 0&ndash;360&deg; by 0&ndash;100&thinsp;mm, but you can configure any range to match your cam specification.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="40" y1="65" x2="250" y2="65" stroke="var(--axis-color)" stroke-width="1.5"/>
      <line x1="40" y1="15" x2="40" y2="65" stroke="var(--axis-color)" stroke-width="1.5"/>
      <text x="40" y="76" font-size="8" fill="var(--accent-green)" text-anchor="middle" font-family="JetBrains Mono, monospace">0</text>
      <text x="250" y="76" font-size="8" fill="var(--accent-green)" text-anchor="middle" font-family="JetBrains Mono, monospace">360</text>
      <text x="32" y="67" font-size="8" fill="var(--accent-green)" text-anchor="end" font-family="JetBrains Mono, monospace">0</text>
      <text x="32" y="19" font-size="8" fill="var(--accent-green)" text-anchor="end" font-family="JetBrains Mono, monospace">100</text>
      <rect x="36" y="61" width="218" height="8" rx="1" fill="none" stroke="var(--accent-green)" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="36" y="11" width="4" height="58" rx="1" fill="none" stroke="var(--accent-green)" stroke-width="1" stroke-dasharray="3 2"/>
    </svg>`,
    prefer: 'left',
    panel: 'right',
  },

  /* 14 ── Grid Mode ── */
  {
    target: '#gridMode',
    title: 'Grid Mode',
    desc: '<strong>Bounded</strong> limits the grid to your axis range. <strong>Infinite</strong> extends the grid in all directions. Enable <strong>Repeat Profile</strong> to tile the cam profile periodically, and <strong>Rollover</strong> for axis wrapping.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="120" height="60" rx="4" stroke="var(--border-active)" stroke-width="1" fill="var(--bg-surface)"/>
      <text x="70" y="76" font-size="8" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">BOUNDED</text>
      <line x1="10" y1="30" x2="130" y2="30" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="10" y1="50" x2="130" y2="50" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="50" y1="10" x2="50" y2="70" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="90" y1="10" x2="90" y2="70" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="150" y1="10" x2="150" y2="70" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="190" y1="10" x2="190" y2="70" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="230" y1="10" x2="230" y2="70" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="270" y1="10" x2="270" y2="70" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="150" y1="30" x2="280" y2="30" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="150" y1="50" x2="280" y2="50" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="150" y1="10" x2="280" y2="10" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <line x1="150" y1="70" x2="280" y2="70" stroke="var(--grid-minor)" stroke-width="0.5"/>
      <text x="215" y="76" font-size="8" fill="var(--text-dim)" text-anchor="middle" font-family="JetBrains Mono, monospace">INFINITE</text>
    </svg>`,
    prefer: 'left',
    panel: 'right',
  },

  /* 15 ── Axis Labels ── */
  {
    target: '#xLabel',
    title: 'Axis Labels',
    desc: 'Customise the X and Y axis titles to match your engineering units. These labels appear on exports and printouts so your graphs are self-documenting.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="50" y1="60" x2="240" y2="60" stroke="var(--axis-color)" stroke-width="1.5"/>
      <line x1="50" y1="15" x2="50" y2="60" stroke="var(--axis-color)" stroke-width="1.5"/>
      <text x="145" y="76" font-size="10" fill="var(--accent-cyan)" text-anchor="middle" font-family="JetBrains Mono, monospace">Degrees (°)</text>
      <text x="20" y="42" font-size="10" fill="var(--accent-cyan)" text-anchor="middle" font-family="JetBrains Mono, monospace" transform="rotate(-90 20 42)">Disp (mm)</text>
    </svg>`,
    prefer: 'left',
    panel: 'right',
  },

  /* 16 ── Intersection Data ── */
  {
    target: '#intersectList',
    title: 'Intersection Data',
    desc: 'When intersections are enabled, this panel lists every point where your spline crosses the X or Y axis. Click any entry to highlight it on the graph. Marker shapes and callout modes are configurable per intersection.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="30" y1="45" x2="260" y2="45" stroke="var(--axis-color)" stroke-width="1"/>
      <path d="M30 65 Q90 58 130 45 T200 25 L260 18" stroke="var(--accent-blue)" stroke-width="1.5" fill="none"/>
      <circle cx="130" cy="45" r="5" fill="none" stroke="var(--accent-green)" stroke-width="1.8"/>
      <circle cx="130" cy="45" r="2" fill="var(--accent-green)"/>
      <rect x="105" y="28" width="50" height="13" rx="3" fill="var(--bg-panel)" stroke="var(--accent-green)" stroke-width="0.8"/>
      <text x="130" y="38" font-size="8" fill="var(--accent-green)" text-anchor="middle" font-family="JetBrains Mono, monospace">X = 130</text>
    </svg>`,
    prefer: 'left',
    panel: 'right',
  },

  /* 17 ── Spline Analytics ── */
  {
    target: '#analyticsContent',
    title: 'Spline Analytics',
    desc: 'Live numerical analysis of the active path: displacement range, maximum velocity, maximum acceleration, and total stroke. Values update in real-time as you add or move points.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 60 Q100 55 140 35 T250 15" stroke="var(--accent-blue)" stroke-width="1.5" fill="none"/>
      <text x="30" y="12" font-size="8" fill="var(--text-dim)" font-family="JetBrains Mono, monospace">displacement</text>
      <path d="M30 60 Q80 55 120 50 T180 55 Q210 58 250 60" stroke="var(--accent-orange)" stroke-width="1.2" fill="none" stroke-dasharray="4 2"/>
      <text x="180" y="70" font-size="8" fill="var(--accent-orange)" font-family="JetBrains Mono, monospace">velocity</text>
      <path d="M30 50 Q70 42 100 50 T170 50 Q200 48 250 52" stroke="var(--accent-red)" stroke-width="1.2" fill="none" stroke-dasharray="2 2"/>
      <text x="100" y="42" font-size="8" fill="var(--accent-red)" font-family="JetBrains Mono, monospace">acceleration</text>
    </svg>`,
    prefer: 'left',
    panel: 'right',
  },

  /* 18 ── Finish ── */
  {
    target: null,
    title: "You're Ready!",
    desc: 'You know the essentials. Start plotting your cam profile, add reference geometry, and export when you\'re done. Hit the <strong>?</strong> button in the toolbar any time to replay this guide.',
    svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="140" cy="40" r="28" fill="none" stroke="var(--accent-green)" stroke-width="2.5"/>
      <polyline points="125,40 136,52 158,28" fill="none" stroke="var(--accent-green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    prefer: 'bottom',
  },
];

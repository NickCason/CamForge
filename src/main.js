import './style.css';
import { app } from './state.js';
import { cssVar } from './coords.js';
import { resize } from './render.js';
import { refreshAll } from './ui/panels.js';
import { initEvents } from './ui/events.js';

app.canvas = document.getElementById('mainCanvas');
app.ctx = app.canvas.getContext('2d');
app.container = document.getElementById('canvasContainer');

app.paths[0].color = cssVar('--accent-blue');

initEvents();
resize();
refreshAll();

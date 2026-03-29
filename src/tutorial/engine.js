import { STEPS } from './steps.js';
import './tutorial.css';

const STORAGE_KEY = 'camforge-tutorial-off';
const PAD = 8;

let overlay = null;
let backdrop = null;
let pulse = null;
let card = null;
let arrow = null;
let currentStep = 0;
let running = false;

function ensureDOM() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';

  backdrop = document.createElement('div');
  backdrop.className = 'tutorial-backdrop';
  overlay.appendChild(backdrop);

  pulse = document.createElement('div');
  pulse.className = 'tutorial-pulse';
  pulse.style.display = 'none';
  overlay.appendChild(pulse);

  card = document.createElement('div');
  card.className = 'tutorial-card';
  overlay.appendChild(card);

  arrow = document.createElement('div');
  arrow.className = 'tutorial-card-arrow';
  card.appendChild(arrow);

  document.body.appendChild(overlay);
}

function expandPanelIfNeeded(side) {
  const layout = document.querySelector('.app-layout');
  if (!layout) return;
  if (side === 'left' && layout.classList.contains('left-collapsed')) {
    const panel = document.querySelector('.left-panel');
    layout.classList.remove('left-collapsed');
    if (panel) panel.classList.remove('collapsed');
  }
  if (side === 'right' && layout.classList.contains('right-collapsed')) {
    const panel = document.querySelector('.right-panel');
    layout.classList.remove('right-collapsed');
    if (panel) panel.classList.remove('collapsed');
  }
}

function getTargetRect(step) {
  if (!step.target) return null;
  const el = document.querySelector(step.target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return r;
}

function positionBackdrop(rect) {
  if (!rect) {
    backdrop.classList.remove('has-target');
    backdrop.classList.add('no-target');
    backdrop.style.top = '';
    backdrop.style.left = '';
    backdrop.style.width = '';
    backdrop.style.height = '';
    return;
  }
  backdrop.classList.remove('no-target');
  backdrop.classList.add('has-target');
  backdrop.style.top = (rect.top - PAD) + 'px';
  backdrop.style.left = (rect.left - PAD) + 'px';
  backdrop.style.width = (rect.width + PAD * 2) + 'px';
  backdrop.style.height = (rect.height + PAD * 2) + 'px';
}

function positionPulse(rect) {
  if (!rect) {
    pulse.style.display = 'none';
    return;
  }
  pulse.style.display = '';
  pulse.style.top = (rect.top - PAD) + 'px';
  pulse.style.left = (rect.left - PAD) + 'px';
  pulse.style.width = (rect.width + PAD * 2) + 'px';
  pulse.style.height = (rect.height + PAD * 2) + 'px';
}

function positionCard(step, rect) {
  const isCentered = !rect;
  card.classList.toggle('centered', isCentered);

  if (isCentered) {
    card.style.top = '';
    card.style.left = '';
    arrow.style.display = 'none';
    return;
  }

  arrow.style.display = '';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = 340;
  const cardH = card.offsetHeight || 260;
  const gap = 16;

  let pos = step.prefer || 'bottom';
  if (pos === 'bottom' && rect.bottom + gap + cardH > vh) pos = 'top';
  if (pos === 'top' && rect.top - gap - cardH < 0) pos = 'bottom';
  if (pos === 'right' && rect.right + gap + cardW > vw) pos = 'left';
  if (pos === 'left' && rect.left - gap - cardW < 0) pos = 'right';

  let top, left;
  arrow.className = 'tutorial-card-arrow';

  const targetCX = rect.left + rect.width / 2;
  const targetCY = rect.top + rect.height / 2;

  switch (pos) {
    case 'bottom':
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - cardW / 2;
      arrow.classList.add('arrow-top');
      break;
    case 'top':
      top = rect.top - gap - cardH;
      left = rect.left + rect.width / 2 - cardW / 2;
      arrow.classList.add('arrow-bottom');
      break;
    case 'right':
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.right + gap;
      arrow.classList.add('arrow-left');
      break;
    case 'left':
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.left - gap - cardW;
      arrow.classList.add('arrow-right');
      break;
  }

  left = Math.max(12, Math.min(left, vw - cardW - 12));
  top = Math.max(12, Math.min(top, vh - cardH - 12));

  arrow.style.top = '';
  arrow.style.left = '';
  arrow.style.right = '';
  arrow.style.bottom = '';

  if (pos === 'bottom' || pos === 'top') {
    const arrowX = Math.max(16, Math.min(targetCX - left - 6, cardW - 28));
    arrow.style.left = arrowX + 'px';
  } else {
    const arrowY = Math.max(16, Math.min(targetCY - top - 6, cardH - 28));
    arrow.style.top = arrowY + 'px';
  }

  card.style.top = top + 'px';
  card.style.left = left + 'px';
}

function buildProgressDots() {
  let html = '';
  for (let i = 0; i < STEPS.length; i++) {
    const cls = i === currentStep ? 'active' : (i < currentStep ? 'done' : '');
    html += `<span class="tutorial-dot ${cls}"></span>`;
  }
  return html;
}

function renderStep() {
  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  if (step.panel) expandPanelIfNeeded(step.panel);

  const rect = getTargetRect(step);

  positionBackdrop(rect);
  positionPulse(rect);

  const disableChecked = localStorage.getItem(STORAGE_KEY) === '1';
  const showDisable = isFirst || isLast;

  card.classList.remove('visible');

  card.innerHTML = `
    <div class="tutorial-card-arrow"></div>
    <div class="tutorial-step-counter">Step ${currentStep + 1} of ${STEPS.length}</div>
    <h3>${step.title}</h3>
    ${step.svg ? `<div class="tutorial-diagram">${step.svg}</div>` : ''}
    <p class="tutorial-desc">${step.desc}</p>
    ${showDisable ? `
      <label class="tutorial-disable-row">
        <input type="checkbox" id="tutorialDisableCheck" ${disableChecked ? 'checked' : ''}>
        Don't show on startup
      </label>` : ''}
    <div class="tutorial-nav">
      <div class="tutorial-progress">${buildProgressDots()}</div>
      <button class="tutorial-btn-back" ${isFirst ? 'disabled' : ''} id="tutBtnBack">&larr; Back</button>
      <button class="tutorial-btn-next" id="tutBtnNext">${isLast ? 'Finish' : 'Next &rarr;'}</button>
      <button class="tutorial-btn-skip" id="tutBtnSkip">${isLast ? 'Close' : 'Skip'}</button>
    </div>
  `;

  arrow = card.querySelector('.tutorial-card-arrow');
  positionCard(step, rect);

  requestAnimationFrame(() => {
    positionCard(step, rect);
    card.classList.add('visible');
  });

  card.querySelector('#tutBtnNext').addEventListener('click', () => {
    if (isLast) {
      close();
    } else {
      currentStep++;
      renderStep();
    }
  });

  card.querySelector('#tutBtnBack').addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      renderStep();
    }
  });

  card.querySelector('#tutBtnSkip').addEventListener('click', close);

  const disableCheckbox = card.querySelector('#tutorialDisableCheck');
  if (disableCheckbox) {
    disableCheckbox.addEventListener('change', e => {
      if (e.target.checked) {
        localStorage.setItem(STORAGE_KEY, '1');
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    });
  }
}

function onKeyDown(e) {
  if (!running) return;
  if (e.key === 'Escape') {
    e.stopPropagation();
    e.preventDefault();
    close();
    return;
  }
  if (e.key === 'ArrowRight' || e.key === 'Enter') {
    e.stopPropagation();
    e.preventDefault();
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      renderStep();
    } else {
      close();
    }
    return;
  }
  if (e.key === 'ArrowLeft') {
    e.stopPropagation();
    e.preventDefault();
    if (currentStep > 0) {
      currentStep--;
      renderStep();
    }
    return;
  }
}

function onResize() {
  if (!running) return;
  const step = STEPS[currentStep];
  const rect = getTargetRect(step);
  positionBackdrop(rect);
  positionPulse(rect);
  positionCard(step, rect);
}

function onOverlayClick(e) {
  if (e.target === overlay || e.target === backdrop) close();
}

export function start() {
  ensureDOM();
  currentStep = 0;
  running = true;
  overlay.classList.add('active');
  overlay.classList.remove('fade-out');

  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('resize', onResize);
  overlay.addEventListener('click', onOverlayClick);

  renderStep();
}

function close() {
  if (!running) return;
  running = false;
  card.classList.remove('visible');
  overlay.classList.remove('active');
  overlay.classList.add('fade-out');
  pulse.style.display = 'none';
  backdrop.classList.remove('has-target', 'no-target');

  setTimeout(() => {
    overlay.classList.remove('fade-out');
  }, 300);

  document.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('resize', onResize);
  overlay.removeEventListener('click', onOverlayClick);
}

export function tryAutoLaunch() {
  if (localStorage.getItem(STORAGE_KEY) === '1') return;
  setTimeout(start, 400);
}

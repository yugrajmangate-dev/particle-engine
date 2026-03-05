/**
 * Particle Engine — Entry Point
 * Manages initialization, loading states, and keyboard controls.
 *
 * @module main
 */

import { World } from './world/World.js';
import './styles/main.css';

const $ = (sel) => document.querySelector(sel);

/* ── Loading helpers ── */

function setLoadingState(message, progress) {
  const status = $('#loading-status');
  const bar = $('#loading-bar');
  if (status) status.textContent = message;
  if (bar) bar.style.width = `${progress}%`;
}

function hideLoadingScreen() {
  const screen = $('#loading-screen');
  if (screen) {
    screen.classList.add('fade-out');
    setTimeout(() => screen.remove(), 800);
  }
}

/* ── Keyboard controls ── */

function initKeyboardControls() {
  window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
      case 'h':
        $('#ui-layer')?.classList.toggle('hidden');
        break;
      case '?':
        $('#controls-overlay')?.classList.toggle('hidden');
        break;
      case '/':
        if (e.shiftKey) $('#controls-overlay')?.classList.toggle('hidden');
        break;
      case 'f':
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
        break;
      case 'escape':
        $('#controls-overlay')?.classList.add('hidden');
        break;
    }
  });

  // Close button
  $('#close-controls')?.addEventListener('click', () => {
    $('#controls-overlay')?.classList.add('hidden');
  });
}

/* ── FPS counter ── */

function initFPSCounter() {
  let frames = 0;
  let lastTime = performance.now();
  const display = $('#fps-display');

  (function loop() {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      if (display) display.textContent = `${frames} FPS`;
      frames = 0;
      lastTime = now;
    }
    requestAnimationFrame(loop);
  })();
}

/* ── Bootstrap ── */

async function main() {
  setLoadingState('Initializing renderer...', 10);

  const container = $('#scene-container');
  if (!container) throw new Error('Scene container not found');

  const world = new World(container);

  setLoadingState('Starting particle system...', 30);

  try {
    await world.start((message, progress) => setLoadingState(message, progress));
  } catch (err) {
    console.warn('Camera init failed — falling back to mouse mode:', err.message || err);
    world.startMouseMode();
  }

  setLoadingState('Ready!', 100);
  setTimeout(hideLoadingScreen, 500);

  initKeyboardControls();
  initFPSCounter();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  const status = $('#loading-status');
  if (status) {
    status.textContent = 'Failed to initialize. Please refresh the page.';
    status.style.color = '#ff3d71';
  }
});

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

function showCamPermission() {
  const overlay = $('#camera-permission');
  if (overlay) overlay.classList.remove('hidden');
}

function hideCamPermission() {
  const overlay = $('#camera-permission');
  if (overlay) overlay.classList.add('hidden');
}

function showCamError(msg) {
  const el = $('#cam-error-msg');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
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

let worldInstance = null;

async function startWithCamera(world) {
  try {
    await world.start((message, progress) => setLoadingState(message, progress));
    return true;
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
      showCamError('Camera access was denied. Please allow camera in your browser settings, then click \"Enable Camera\" again.');
    } else if (msg.includes('NotFound') || msg.includes('Devices')) {
      showCamError('No camera found on this device. Using mouse mode instead.');
      world.startMouseMode();
    } else {
      showCamError(`Camera error: ${msg}. Falling back to mouse mode.`);
      world.startMouseMode();
    }
    return false;
  }
}

async function main() {
  setLoadingState('Initializing renderer...', 10);

  const container = $('#scene-container');
  if (!container) throw new Error('Scene container not found');

  const world = new World(container);
  worldInstance = world;

  setLoadingState('Starting particle system...', 30);

  // Show camera permission screen first
  showCamPermission();

  // "Enable Camera" button
  $('#cam-allow-btn')?.addEventListener('click', async () => {
    const errEl = $('#cam-error-msg');
    if (errEl) errEl.classList.add('hidden');
    $('#cam-allow-btn').textContent = 'Connecting...';
    $('#cam-allow-btn').disabled = true;

    const ok = await startWithCamera(world);
    if (ok) {
      hideCamPermission();
      setLoadingState('Ready!', 100);
      setTimeout(hideLoadingScreen, 500);
    } else {
      $('#cam-allow-btn').textContent = 'Try Again';
      $('#cam-allow-btn').disabled = false;
    }
  });

  // "Use Mouse" button
  $('#cam-skip-btn')?.addEventListener('click', () => {
    hideCamPermission();
    world.startMouseMode();
    setLoadingState('Ready!', 100);
    setTimeout(hideLoadingScreen, 500);
  });

  // "Retry Camera" button in HUD
  $('#retry-cam-btn')?.addEventListener('click', async () => {
    if (!world.useCamera) {
      showCamPermission();
      $('#cam-allow-btn').textContent = 'Enable Camera';
      $('#cam-allow-btn').disabled = false;
      const errEl = $('#cam-error-msg');
      if (errEl) errEl.classList.add('hidden');
    }
  });

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

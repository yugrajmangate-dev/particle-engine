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

async function main() {
  setLoadingState('Initializing renderer...', 10);

  const container = $('#scene-container');
  if (!container) throw new Error('Scene container not found');

  const world = new World(container);
  worldInstance = world;

  setLoadingState('Ready to start...', 30);

  // Show camera permission screen first
  showCamPermission();

  // "Enable Camera" button — getUserMedia fires HERE, inside the click handler,
  // so the browser permission prompt appears immediately before any CDN loading.
  $('#cam-allow-btn')?.addEventListener('click', async () => {
    const errEl = $('#cam-error-msg');
    if (errEl) errEl.classList.add('hidden');
    $('#cam-allow-btn').textContent = 'Requesting camera…';
    $('#cam-allow-btn').disabled = true;

    let stream;
    try {
      // This call is inside a user gesture — browser WILL show the permission popup
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: 640 },
          height:     { ideal: 480 },
          facingMode: 'user',   // front camera on mobile
        },
        audio: false,
      });
    } catch (err) {
      const name = err?.name || '';
      const msg  = err?.message || String(err);
      if (name === 'NotAllowedError' || msg.includes('denied') || msg.includes('Permission')) {
        showCamError('Camera permission denied.\nTap the camera/lock icon in your browser address bar → allow camera → tap "Try Again".');
      } else if (name === 'NotFoundError' || msg.includes('NotFound')) {
        showCamError('No camera found on this device. Use "Skip — Use Mouse Instead" below.');
      } else {
        showCamError('Camera error: ' + msg);
      }
      $('#cam-allow-btn').textContent = 'Try Again';
      $('#cam-allow-btn').disabled = false;
      return;
    }

    // Camera granted — now load AI models and start
    try {
      hideCamPermission();
      setLoadingState('Starting AI models…', 40);

      await world.start(stream, (message, progress) => setLoadingState(message, progress));

      setLoadingState('Ready!', 100);
      setTimeout(hideLoadingScreen, 500);
    } catch (err) {
      showCamPermission();
      showCamError('AI model failed to load: ' + (err?.message || err) + '\nPlease refresh and try again.');
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
  $('#retry-cam-btn')?.addEventListener('click', () => {
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

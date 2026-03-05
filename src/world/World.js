/**
 * World — Scene graph, renderer, post-processing & tracking orchestration.
 *
 * @module World
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { ParticleSystem } from './components/Particles.js';
import { HandTracker }    from '../systems/HandTracker.js';
import { FaceTracker }    from '../systems/FaceTracker.js';
import { MouseTracker }   from '../core/MouseTracker.js';
import { Config }         from '../core/Config.js';

export class World {
  /**
   * @param {HTMLElement} container — DOM element to inject the canvas into
   */
  constructor(container) {
    /* ── Renderer ── */
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    /* ── Scene ── */
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010108);

    /* ── Camera ── */
    this.camera = new THREE.PerspectiveCamera(
      Config.camera.fov,
      window.innerWidth / window.innerHeight,
      Config.camera.near,
      Config.camera.far,
    );
    this.camera.position.z = Config.camera.z;

    /* ── Particles ── */
    this.particles = new ParticleSystem();
    this.scene.add(this.particles.mesh);

    /* ── Background stars ── */
    this._createStars();

    /* ── Post-processing (bloom) ── */
    this._initBloom();

    /* ── Trackers (initialised later) ── */
    this.handTracker  = null;
    this.faceTracker  = null;
    this.mouseTracker = null;
    this.useCamera    = false;

    /* ── Timing ── */
    this.clock = new THREE.Clock();

    /* ── Resize ── */
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  /* ════════════════════════════════════════════════
     Private helpers
     ════════════════════════════════════════════════ */

  _createStars() {
    const count = 2000;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.1,
        color: 0x8899bb,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    this.scene.add(this.stars);
  }

  _initBloom() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      Config.bloom.strength,
      Config.bloom.radius,
      Config.bloom.threshold,
    );
    this.composer.addPass(this.bloomPass);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  _updateInputBadge(text, isCamera) {
    const el  = document.getElementById('input-mode-text');
    const dot = document.querySelector('.input-dot');
    if (el) el.textContent = text;
    if (dot) {
      dot.classList.toggle('camera', isCamera);
      dot.classList.toggle('mouse', !isCamera);
    }
  }

  /* ════════════════════════════════════════════════
     Public API
     ════════════════════════════════════════════════ */

  /**
   * Start with camera-based AI tracking.
   * Throws if camera access is denied so the caller can fall back to mouse mode.
   *
   * @param {(msg: string, pct: number) => void} [onProgress]
   */
  /**
   * Start with camera-based AI tracking.
   * Accepts a MediaStream already obtained by the caller
   * so the browser permission prompt fires BEFORE any CDN loading.
   *
   * @param {MediaStream} stream
   * @param {(msg: string, pct: number) => void} [onProgress]
   */
  async start(stream, onProgress) {
    onProgress?.('Starting camera feed…', 45);

    this.handTracker = new HandTracker();
    this.faceTracker = new FaceTracker();
    this.useCamera   = true;

    // Attach the already-granted stream to a hidden video element
    this.videoElement = document.createElement('video');
    this.videoElement.setAttribute('playsinline', '');
    this.videoElement.setAttribute('muted', '');
    this.videoElement.muted = true;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);
    this.videoElement.srcObject = stream;
    await this.videoElement.play();

    onProgress?.('Loading hand tracker…', 60);
    this.handTracker.init();

    onProgress?.('Loading face tracker…', 75);
    this.faceTracker.init(this.videoElement);

    onProgress?.('Starting AI processing…', 88);

    // Continuous frame loop for MediaPipe processing
    const processFrame = async () => {
      if (this.videoElement.readyState >= 2) {
        await this.handTracker.send(this.videoElement);
        await this.faceTracker.send(this.videoElement);
      }
      requestAnimationFrame(processFrame);
    };
    requestAnimationFrame(processFrame);

    this._updateInputBadge('CAMERA AI', true);
    onProgress?.('System ready!', 95);

    this.renderer.setAnimationLoop(() => this.tick());
  }

  /** Start with mouse / touch fallback (no camera). */
  startMouseMode() {
    this.mouseTracker = new MouseTracker();
    this.useCamera = false;
    this._updateInputBadge('MOUSE / TOUCH', false);
    this.renderer.setAnimationLoop(() => this.tick());
  }

  /** Main render loop — called every frame by setAnimationLoop. */
  tick() {
    const time = this.clock.getElapsedTime();

    // Collect tracking data
    let handsData, faceData;

    if (this.useCamera && this.handTracker && this.faceTracker) {
      handsData = this.handTracker.getData();
      faceData  = this.faceTracker.getData();
    } else if (this.mouseTracker) {
      handsData = this.mouseTracker.getData();
      faceData  = null;
    } else {
      handsData = {
        left:  { present: false, x: 0, y: 0, gesture: 'NONE' },
        right: { present: false, x: 0, y: 0, gesture: 'NONE' },
      };
      faceData = null;
    }

    this.particles.update(handsData, faceData, time);

    // Rotate background stars slowly
    if (this.stars) {
      this.stars.rotation.y += 0.0002;
      this.stars.rotation.x += 0.0001;
    }

    // Render through post-processing pipeline
    this.composer.render();
  }
}

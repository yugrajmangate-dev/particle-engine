/**
 * ParticleSystem — GPU-accelerated particle system with custom GLSL shaders.
 *
 * Supports 7+ morphable shapes, face/hand interaction, and smooth transitions.
 *
 * @module ParticleSystem
 */

import * as THREE from 'three';
import { Config }  from '../../core/Config.js';

/* ═══════ Custom Shaders ═══════ */

const vertexShader = /* glsl */ `
  attribute vec3  color;
  attribute float aScale;
  attribute float aRandom;

  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;

  varying vec3  vColor;

  void main() {
    vColor = color;

    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Crisp per-particle size with very subtle variation
    float size = uSize * aScale * uPixelRatio;
    size *= (1.0 + 0.05 * sin(uTime * 1.5 + aRandom * 6.283));

    gl_PointSize = size * (250.0 / -mvPos.z);
    gl_PointSize = max(gl_PointSize, 0.5);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    // Sharp crisp circular particle — no glow
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    // Hard edge with slight anti-aliasing at boundary only
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);

    gl_FragColor = vec4(vColor, alpha);
  }
`;

/* ═══════ Particle System ═══════ */

export class ParticleSystem {
  constructor() {
    this.count = Config.particles.count;

    /* ── Geometry buffers ── */
    this.geometry        = new THREE.BufferGeometry();
    this.positions       = new Float32Array(this.count * 3);
    this.colors          = new Float32Array(this.count * 3);
    this.targetPositions = new Float32Array(this.count * 3);
    this.scales          = new Float32Array(this.count);
    this.randoms         = new Float32Array(this.count);

    // Default shape: sphere
    for (let i = 0; i < this.count; i++) {
      const phi   = Math.acos(-1 + (2 * i) / this.count);
      const theta = Math.sqrt(this.count * Math.PI) * phi;
      const r     = Config.shapes.sphereRadius;

      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(phi);

      this.positions[i * 3]     = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      this.targetPositions[i * 3]     = x;
      this.targetPositions[i * 3 + 1] = y;
      this.targetPositions[i * 3 + 2] = z;

      this.colors[i * 3]     = 0.0;
      this.colors[i * 3 + 1] = 1.0;
      this.colors[i * 3 + 2] = 1.0;

      this.scales[i]  = 0.7 + Math.random() * 0.6;
      this.randoms[i] = Math.random();
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color',    new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aScale',   new THREE.BufferAttribute(this.scales, 1));
    this.geometry.setAttribute('aRandom',  new THREE.BufferAttribute(this.randoms, 1));

    /* ── Shader material ── */
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime:       { value: 0 },
        uSize:       { value: Config.particles.size * 5 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    this.mesh        = new THREE.Points(this.geometry, this.material);
    this.currentMode = 'SPHERE';
  }

  /* ════════════════════════════════════════════
     Shape generators
     ════════════════════════════════════════════ */

  /** Populate targetPositions for the requested shape type. */
  generateShape(type) {
    const c = Config.shapes;

    for (let i = 0; i < this.count; i++) {
      let x, y, z;
      const t = i / this.count;

      switch (type) {

        /* ── Cube (surface) ── */
        case 'CUBE': {
          const s    = c.cubeSize;
          const half = s / 2;
          const face = Math.floor(Math.random() * 6);
          const u    = (Math.random() - 0.5) * s;
          const v    = (Math.random() - 0.5) * s;
          if      (face === 0) { x =  half; y = u; z = v; }
          else if (face === 1) { x = -half; y = u; z = v; }
          else if (face === 2) { x = u; y =  half; z = v; }
          else if (face === 3) { x = u; y = -half; z = v; }
          else if (face === 4) { x = u; y = v; z =  half; }
          else                 { x = u; y = v; z = -half; }
          break;
        }

        /* ── Torus ── */
        case 'TORUS': {
          const u = Math.random() * Math.PI * 2;
          const v = Math.random() * Math.PI * 2;
          x = (c.torusR + c.torusr * Math.cos(v)) * Math.cos(u);
          y = (c.torusR + c.torusr * Math.cos(v)) * Math.sin(u);
          z = c.torusr * Math.sin(v);
          break;
        }

        /* ── DNA double helix ── */
        case 'DNA': {
          const dt = t * 20;
          x = c.dnaRadius * Math.cos(dt);
          y = (t - 0.5) * c.dnaLength;
          z = c.dnaRadius * Math.sin(dt);
          if (i % 2 === 0) { x *= -1; z *= -1; }
          break;
        }

        /* ── Planet + ring ── */
        case 'PLANET': {
          if (i < this.count * 0.7) {
            const r   = c.planetRadius;
            const phi = Math.acos(-1 + (2 * i) / (this.count * 0.7));
            const th  = Math.sqrt(this.count * 0.7 * Math.PI) * phi;
            x = r * Math.cos(th) * Math.sin(phi);
            y = r * Math.sin(th) * Math.sin(phi);
            z = r * Math.cos(phi);
          } else {
            const angle = Math.random() * Math.PI * 2;
            const r = c.ringInner + Math.random() * (c.ringOuter - c.ringInner);
            x = r * Math.cos(angle);
            y = (Math.random() - 0.5) * 0.5;
            z = r * Math.sin(angle);
          }
          break;
        }

        /* ── Galaxy spiral ── */
        case 'GALAXY': {
          const arms     = 4;
          const arm      = i % arms;
          const armAngle = (arm / arms) * Math.PI * 2;
          const dist     = Math.pow(t, 0.5) * 18;
          const spiral   = dist * 0.8 + armAngle;
          const spread   = 0.5 + dist * 0.15;
          x = Math.cos(spiral) * dist + (Math.random() - 0.5) * spread;
          y = (Math.random() - 0.5) * spread * 0.3;
          z = Math.sin(spiral) * dist + (Math.random() - 0.5) * spread;
          break;
        }

        /* ── Wave grid ── */
        case 'WAVE': {
          const grid = Math.ceil(Math.sqrt(this.count));
          const gx   = (i % grid) / grid;
          const gz   = Math.floor(i / grid) / grid;
          x = (gx - 0.5) * 30;
          z = (gz - 0.5) * 30;
          y = Math.sin(gx * 8 + gz * 6) * 3;
          break;
        }

        /* ── Sphere (default) ── */
        default: {
          const r   = c.sphereRadius;
          const phi = Math.acos(-1 + (2 * i) / this.count);
          const th  = Math.sqrt(this.count * Math.PI) * phi;
          x = r * Math.cos(th) * Math.sin(phi);
          y = r * Math.sin(th) * Math.sin(phi);
          z = r * Math.cos(phi);
          break;
        }
      }

      this.targetPositions[i * 3]     = x;
      this.targetPositions[i * 3 + 1] = y;
      this.targetPositions[i * 3 + 2] = z;
    }
  }

  /* ════════════════════════════════════════════
     Per-frame update
     ════════════════════════════════════════════ */

  /**
   * @param {{ left: object, right: object }} handsData
   * @param {Array|null} faceData
   * @param {number} time — elapsed seconds
   */
  update(handsData, faceData, time) {
    this.material.uniforms.uTime.value = time;

    const pos = this.geometry.attributes.position.array;
    const col = this.geometry.attributes.color.array;

    /* ── 1. Determine mode from hand gestures ── */
    let mode = 'SPHERE';

    if (handsData.left.present && handsData.right.present) {
      const d = Math.hypot(
        handsData.left.x - handsData.right.x,
        handsData.left.y - handsData.right.y,
      );
      if (d < 0.2) mode = 'DNA';
      else if (handsData.left.gesture === 'OPEN' && handsData.right.gesture === 'OPEN') mode = 'PLANET';
      else mode = 'TORUS';
    } else if (handsData.right.present) {
      if      (handsData.right.gesture === 'FIST')     mode = 'BLACKHOLE';
      else if (handsData.right.gesture === 'POINT')    mode = 'ATTRACT';
      else if (handsData.right.gesture === 'PEACE')    mode = 'TORUS';
      else if (handsData.right.gesture === 'THUMB_UP') mode = 'GALAXY';
      else mode = 'CUBE';
    } else if (handsData.left.present) {
      if (handsData.left.gesture === 'FIST') mode = 'BLACKHOLE';
      else mode = 'WAVE';
    }

    // Update HUD badge
    const badge = document.getElementById('current-mode');
    if (badge) badge.textContent = mode;

    /* ── 2. Face interaction ── */
    let gazeForce = { x: 0, y: 0 };
    let explode   = false;
    let mouthAmp  = 1.0;

    if (faceData) {
      const iris = faceData[468]; // centre iris landmark
      gazeForce.x = (0.5 - iris.x) * 80;
      gazeForce.y = (0.5 - iris.y) * 80;

      const leftOpen  = Math.abs(faceData[159].y - faceData[145].y);
      const rightOpen = Math.abs(faceData[386].y - faceData[374].y);
      if (leftOpen < 0.012 && rightOpen < 0.012) explode = true;

      const mouthH = Math.abs(faceData[13].y - faceData[14].y);
      if (mouthH > 0.05) mouthAmp = 2.0;
    }

    /* ── 3. Shape morphing ── */
    if (mode !== this.currentMode && mode !== 'BLACKHOLE' && mode !== 'ATTRACT') {
      this.generateShape(mode);
      this.currentMode = mode;
    }

    const morphSpeed = Config.particles.morphSpeed;
    const colorLerp  = Config.particles.colorLerpSpeed;

    for (let i = 0; i < this.count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      let tx = this.targetPositions[ix];
      let ty = this.targetPositions[iy];
      let tz = this.targetPositions[iz];

      // Dynamic physics overrides
      if (mode === 'BLACKHOLE') {
        const hx    = (handsData.right.present ? handsData.right.x : handsData.left.x) * 30;
        const hy    = (handsData.right.present ? handsData.right.y : handsData.left.y) * 20;
        const angle = time * 5 + i * 0.01;
        const r     = i % 10;
        tx = hx + Math.cos(angle) * r;
        ty = hy + Math.sin(angle) * r;
        tz = Math.sin(angle * 0.5) * r * 0.5;
      } else if (mode === 'ATTRACT') {
        const hx = handsData.right.x * 30;
        const hy = handsData.right.y * 20;
        tx = hx + (Math.random() - 0.5) * 10;
        ty = hy + (Math.random() - 0.5) * 10;
        tz = (Math.random() - 0.5) * 5;
      }

      // Face gaze
      if (faceData) { tx += gazeForce.x; ty += gazeForce.y; }

      // Blink → explosion
      if (explode) { tx *= 5; ty *= 5; tz *= 5; }

      // Mouth → amplify
      tx *= mouthAmp; ty *= mouthAmp; tz *= mouthAmp;

      // Smooth morphing
      pos[ix] += (tx - pos[ix]) * morphSpeed;
      pos[iy] += (ty - pos[iy]) * morphSpeed;
      pos[iz] += (tz - pos[iz]) * morphSpeed;

      // ── Color ──
      const [cr, cg, cb] = this._getModeColor(mode);
      let r = cr, g = cg, b = cb;

      // position-based variation
      const v = Math.sin(pos[ix] * 0.1 + time) * 0.15;
      r = Math.min(1, Math.max(0, r + v));
      g = Math.min(1, Math.max(0, g + v * 0.5));

      if (explode) { r = 1; g = 1; b = 1; }

      col[ix] += (r - col[ix]) * colorLerp;
      col[iy] += (g - col[iy]) * colorLerp;
      col[iz] += (b - col[iz]) * colorLerp;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate    = true;

    // Global rotation
    this.mesh.rotation.y += (mode === 'SPHERE' || mode === 'GALAXY') ? 0.003 : 0.008;

    // Tilt for galaxy
    if (mode === 'GALAXY') this.mesh.rotation.x = 0.3;
    else this.mesh.rotation.x *= 0.98;
  }

  /* ── Helpers ── */

  /** @returns {[number, number, number]} RGB triplet for mode */
  _getModeColor(mode) {
    const c = Config.colors;
    switch (mode) {
      case 'BLACKHOLE': return c.red;
      case 'DNA':       return c.purple;
      case 'PLANET':    return c.gold;
      case 'GALAXY':    return c.pink;
      case 'WAVE':      return c.green;
      case 'ATTRACT':   return c.red;
      default:          return c.cyan;
    }
  }
}

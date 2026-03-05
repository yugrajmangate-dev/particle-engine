/**
 * MouseTracker — Mouse & touch fallback controller.
 * Provides the same data interface as HandTracker so the
 * particle system works identically in mouse mode.
 *
 * @module MouseTracker
 */

/** @typedef {{ present: boolean, x: number, y: number, gesture: string }} HandData */

export class MouseTracker {
  constructor() {
    /** @type {{ left: HandData, right: HandData }} */
    this.data = {
      left:  { present: false, x: 0, y: 0, gesture: 'NONE' },
      right: { present: true,  x: 0, y: 0, gesture: 'OPEN' },
    };

    this._shapeIndex = 0;
    this._shapes = ['SPHERE', 'CUBE', 'TORUS', 'DNA', 'PLANET', 'GALAXY', 'WAVE'];
    this._bind();
  }

  /* ---- private ---- */

  _bind() {
    // Mouse
    window.addEventListener('mousemove', (e) => {
      this.data.right.present = true;
      this.data.right.x = (e.clientX / window.innerWidth - 0.5) * -1;
      this.data.right.y = (e.clientY / window.innerHeight - 0.5) * -1;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.data.right.gesture = 'FIST';
      else if (e.button === 2) this.data.right.gesture = 'PEACE';
    });

    window.addEventListener('mouseup', () => {
      this.data.right.gesture = 'OPEN';
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch
    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      this.data.right.present = true;
      this.data.right.x = (t.clientX / window.innerWidth - 0.5) * -1;
      this.data.right.y = (t.clientY / window.innerHeight - 0.5) * -1;
    }, { passive: true });

    window.addEventListener('touchstart', () => {
      this.data.right.gesture = 'FIST';
      this.data.right.present = true;
    });

    window.addEventListener('touchend', () => {
      this.data.right.gesture = 'OPEN';
    });

    // Keyboard shape switching (1–7)
    window.addEventListener('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= this._shapes.length) {
        this._shapeIndex = n - 1;
      }
    });
  }

  /* ---- public API ---- */

  /** @returns {{ left: HandData, right: HandData }} */
  getData() {
    return this.data;
  }

  /** @returns {string} Currently selected shape name */
  getCurrentShape() {
    return this._shapes[this._shapeIndex];
  }
}

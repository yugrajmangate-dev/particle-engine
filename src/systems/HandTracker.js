/**
 * HandTracker — AI-powered hand gesture recognition.
 * Uses MediaPipe Hands for real-time tracking of up to 2 hands.
 *
 * @module HandTracker
 */

import { Hands } from '@mediapipe/hands';

/** @typedef {{ present: boolean, x: number, y: number, gesture: string }} HandData */

export class HandTracker {
  constructor() {
    /** @type {import('@mediapipe/hands').Results|null} */
    this.results = null;
    /** @type {Hands|null} */
    this.hands   = null;
    /** @type {{ left: HandData, right: HandData }} */
    this.data = {
      left:  { present: false, x: 0, y: 0, gesture: 'NONE' },
      right: { present: false, x: 0, y: 0, gesture: 'NONE' },
    };
  }

  /** Initialise the MediaPipe Hands model. */
  init() {
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results) => {
      this.results = results;
      this._processData();
      this._updateUI();
    });
  }

  /**
   * Send a video frame for processing.
   * @param {HTMLVideoElement} image
   */
  async send(image) {
    try {
      if (this.hands) await this.hands.send({ image });
    } catch {
      // Non-fatal frame error — skip
    }
  }

  /* ── Private ── */

  /** Convert raw landmarks into clean hand data. */
  _processData() {
    this.data.left.present  = false;
    this.data.right.present = false;

    if (!this.results?.multiHandLandmarks) return;

    this.results.multiHandLandmarks.forEach((landmarks, idx) => {
      const label = this.results.multiHandedness?.[idx]?.label;
      if (!label) return;

      const target = label === 'Right' ? this.data.right : this.data.left;
      target.present = true;
      target.x       = (landmarks[9].x - 0.5) * -1;  // mirror X
      target.y       = (landmarks[9].y - 0.5) * -1;  // flip Y
      target.gesture  = this._detectGesture(landmarks);
    });
  }

  /**
   * Detect gesture from finger landmark positions.
   * @param {Array} lm — MediaPipe hand landmarks
   * @returns {string} Gesture name
   */
  _detectGesture(lm) {
    let up = 0;
    const tips  = [8, 12, 16, 20];
    const bases = [5,  9, 13, 17];

    tips.forEach((tip, i) => {
      if (lm[tip].y < lm[bases[i]].y) up++;
    });

    // Thumb (x-axis check)
    if (Math.abs(lm[4].x - lm[2].x) > 0.05) up++;

    if (up >= 5) return 'OPEN';
    if (up === 0) return 'FIST';
    if (up === 1) return 'POINT';
    if (up === 2) return 'PEACE';
    if (up <= 2 && lm[4].y < lm[3].y) return 'THUMB_UP';

    return 'UNKNOWN';
  }

  /** Update HUD elements. */
  _updateUI() {
    const lVal = document.getElementById('left-hand-val');
    const rVal = document.getElementById('right-hand-val');
    const gVal = document.getElementById('gesture-val');

    if (lVal) lVal.textContent = this.data.left.present  ? 'ACTIVE' : 'OFFLINE';
    if (rVal) rVal.textContent = this.data.right.present ? 'ACTIVE' : 'OFFLINE';

    if (gVal) {
      if (this.data.right.present)      gVal.textContent = this.data.right.gesture;
      else if (this.data.left.present)  gVal.textContent = this.data.left.gesture;
      else                              gVal.textContent = 'NONE';
    }
  }

  /* ── Public API ── */

  /** @returns {{ left: HandData, right: HandData }} */
  getData() {
    return this.data;
  }
}

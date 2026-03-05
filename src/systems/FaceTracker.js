/**
 * FaceTracker — AI-powered face mesh & iris tracking.
 * Uses MediaPipe FaceMesh for real-time facial landmark detection.
 *
 * @module FaceTracker
 */

import { FaceMesh } from '@mediapipe/face_mesh';

export class FaceTracker {
  constructor() {
    /** @type {import('@mediapipe/face_mesh').Results|null} */
    this.results   = null;
    /** @type {FaceMesh|null} */
    this.faceMesh  = null;
    /** @type {HTMLVideoElement|null} */
    this.videoElement = null;
  }

  /**
   * Initialise the FaceMesh model.
   * @param {HTMLVideoElement} videoElement
   */
  init(videoElement) {
    this.videoElement = videoElement;

    this.faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,          // required for iris tracking
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.faceMesh.onResults((results) => {
      this.results = results;
      this._updateUI();
    });
  }

  /**
   * Send a video frame for processing.
   * @param {HTMLVideoElement} image
   */
  async send(image) {
    try {
      if (this.faceMesh) await this.faceMesh.send({ image });
    } catch {
      // Non-fatal frame error — skip
    }
  }

  /* ── Private ── */

  /** @returns {Array|null} Raw face landmarks or null */
  _getMesh() {
    if (
      !this.results?.multiFaceLandmarks ||
      this.results.multiFaceLandmarks.length === 0
    ) {
      return null;
    }
    return this.results.multiFaceLandmarks[0];
  }

  /** Update HUD telemetry panel */
  _updateUI() {
    const eyeVal   = document.getElementById('eye-val');
    const mouthVal = document.getElementById('mouth-val');
    const gazeVal  = document.getElementById('gaze-val');

    const mesh = this._getMesh();

    if (!mesh) {
      if (eyeVal) eyeVal.textContent = 'NO LOCK';
      return;
    }

    // Eye openness
    const leftOpen  = Math.abs(mesh[159].y - mesh[145].y);
    const rightOpen = Math.abs(mesh[386].y - mesh[374].y);
    const isBlinking = leftOpen < 0.012 && rightOpen < 0.012;

    // Mouth
    const mouthOpen   = Math.abs(mesh[13].y - mesh[14].y);
    const isMouthOpen = mouthOpen > 0.05;

    // Gaze via iris position
    const iris = mesh[468];
    let gaze = 'CENTER';
    if      (iris.x < 0.45) gaze = 'RIGHT \u00BB';
    else if (iris.x > 0.55) gaze = '\u00AB LEFT';
    if      (iris.y < 0.40) gaze = '\u2191 UP';
    else if (iris.y > 0.60) gaze = '\u2193 DOWN';

    // Update DOM
    if (eyeVal) {
      eyeVal.textContent = isBlinking ? 'BLINK DETECTED' : 'OPEN';
      eyeVal.style.color = isBlinking ? '#ff3d71' : '#fff';
    }
    if (mouthVal) mouthVal.textContent = isMouthOpen ? 'OPEN (AMPLIFY)' : 'CLOSED';
    if (gazeVal)  gazeVal.textContent  = gaze;
  }

  /* ── Public API ── */

  /**
   * Get face landmark data for particle interaction.
   * @returns {Array|null}
   */
  getData() {
    return this._getMesh();
  }
}

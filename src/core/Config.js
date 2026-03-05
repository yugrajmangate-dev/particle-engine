/**
 * Particle Engine — Central Configuration
 * All tunable constants in one place for easy tweaking.
 *
 * @module Config
 */
export const Config = {
  particles: {
    count: 22000,
    size: 0.10,
    morphSpeed: 0.05,
    colorLerpSpeed: 0.08,
  },

  shapes: {
    sphereRadius: 15,
    cubeSize: 15,
    torusR: 10,
    torusr: 3,
    dnaRadius: 5,
    dnaLength: 40,
    planetRadius: 8,
    ringInner: 12,
    ringOuter: 16,
  },

  bloom: {
    strength: 0.0,
    radius: 0.0,
    threshold: 1.0,
  },

  camera: {
    fov: 75,
    near: 0.1,
    far: 1000,
    z: 40,
  },

  colors: {
    cyan:   [0.0, 1.0, 1.0],
    red:    [1.0, 0.0, 0.2],
    purple: [0.8, 0.0, 1.0],
    gold:   [1.0, 0.8, 0.2],
    white:  [1.0, 1.0, 1.0],
    green:  [0.2, 1.0, 0.5],
    pink:   [1.0, 0.3, 0.6],
  },
};

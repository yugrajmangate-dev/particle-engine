# Particle Engine

An interactive 3D particle system powered by AI hand & face tracking. Built with **Three.js**, **MediaPipe**, and custom **GLSL shaders**.

**[Live Demo](https://yugrajmangate-dev.github.io/particle-engine/)**

---

## Features

- **12,000+ GPU-accelerated particles** with custom vertex & fragment shaders
- **Real-time hand gesture recognition** — 6 distinct gestures via MediaPipe Hands
- **Face tracking with iris gaze control** — look, blink, and speak to interact
- **7 morphable shapes** — Sphere, Cube, Torus, DNA Helix, Planet, Galaxy Spiral, Wave Grid
- **Post-processing bloom** — UnrealBloomPass for cinematic glow
- **Mouse / touch fallback** — works without a camera on any device
- **Glassmorphism HUD** — responsive, accessible telemetry panels
- **60 FPS** performance-optimised render loop

---

## Controls

### Camera Mode (AI)

| Gesture | Effect |
|---------|--------|
| Open Hand | Cube / Planet |
| Fist | Black Hole vortex |
| Point | Attract particles |
| Peace Sign | Torus |
| Thumbs Up | Galaxy spiral |
| Both Hands Close | DNA Helix |
| Blink Eyes | Particle explosion |
| Open Mouth | Amplify size |

### Mouse / Touch / Keyboard

| Input | Effect |
|-------|--------|
| Move mouse | Direct particles |
| Left click / touch | Black Hole |
| Right click | Torus |
| `1` – `7` | Switch shapes |
| `H` | Toggle HUD |
| `F` | Fullscreen |
| `?` | Controls overlay |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Rendering | Three.js (WebGL) |
| AI Vision | MediaPipe Hands + FaceMesh |
| Shaders | Custom GLSL (vertex + fragment) |
| Post-Processing | UnrealBloomPass |
| Build Tool | Vite 5 |
| Deployment | GitHub Pages (Actions CI/CD) |

---

## Getting Started

```bash
# Clone
git clone https://github.com/yugrajmangate-dev/particle-engine.git
cd particle-engine

# Install
npm install

# Dev server
npm run dev

# Production build
npm run build
```

---

## Project Structure

```
├── index.html                  # Entry HTML with loading screen & HUD
├── vite.config.js              # Vite build config (GitHub Pages base)
├── package.json
├── src/
│   ├── main.js                 # Bootstrap, keyboard controls, FPS counter
│   ├── core/
│   │   ├── Config.js           # Centralised constants
│   │   └── MouseTracker.js     # Mouse/touch fallback controller
│   ├── systems/
│   │   ├── FaceTracker.js      # MediaPipe FaceMesh wrapper
│   │   └── HandTracker.js      # MediaPipe Hands wrapper
│   ├── world/
│   │   ├── World.js            # Scene, renderer, bloom, orchestration
│   │   └── components/
│   │       └── Particles.js    # GPU particle system + GLSL shaders
│   └── styles/
│       └── main.css            # Glassmorphism UI, responsive, animations
└── .github/
    └── workflows/
        └── deploy.yml          # Automatic GitHub Pages deployment
```

---

## Deployment

This project uses **GitHub Actions** for automatic deployment to GitHub Pages.

1. Push to `main` branch
2. GitHub Actions builds the project with Vite
3. The `dist/` output is deployed to GitHub Pages

To enable: Go to **Settings → Pages → Source → GitHub Actions** in your repository.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

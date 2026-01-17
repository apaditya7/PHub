# Neon Racer

A futuristic, high-octane 3D racing game controlled entirely by your head movements. Built with React Three Fiber and MediaPipe.

![Neon Racer](https://img.shields.io/badge/Status-Playable-brightgreen)

## 🎮 How to Play
1. **Start the Game**: Click "START MISSION" to initialize the audio and tracking systems.
2. **Steer**: Tilt your head **Left** or **Right** to move your spaceship.
3. **Objective**: Dodge the asteroids and survive as long as possible.
4. **Scoring**: Earn points for distance traveled. Speed increases over time!

## 🛠️ Tech Stack
- **Framework**: React + Vite
- **3D Graphics**: Three.js / React Three Fiber (R3F) / Drei
- **Head Tracking**: Google MediaPipe Face Landmarker
- **State Management**: Zustand
- **Post-Processing**: React Three Postprocessing (Bloom)
- **Audio**: Web Audio API (Real-time synthesis)

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to the local URL (usually `http://localhost:5173`).
   *Note: Allow camera access when prompted for head tracking to work.*

## 🌟 Features
- **Immersive 3D World**: Infinite scrolling terrain, retro sun, and starfield.
- **Synthwave Aesthetic**: Neon visuals, bloom effects, and procedural grid lines.
- **Generative Audio**: Real-time synthesized soundtrack and sound effects (no external audio files!).
- **High Score System**: Persists your best runs locally.
- **Responsive Controls**: Smooth head-tracking integration for intuitive steering.

## 📝 Credits
- Spaceship & Obstacle Models: [Kenney Assets](https://kenney.nl/) / Custom GLB
- Developed by: Trae (AI Pair Programmer) & User

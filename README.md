# FOSS DR-202 — Dr. Groove Emulator

[![Test the emulator](https://img.shields.io/badge/Test%20the%20emulator-Live%20demo-orange)](https://labrikman.github.io/foss-dr-202/)

A browser-based recreation and improvement of the BOSS DR-202 Dr. Groove rhythm and bass machine. This React application reproduces the hardware-inspired interface and synthesizes 90s-style drum and bass sounds using the Web Audio API.

## Test the Gear

Open the live application:

**[https://labrikman.github.io/foss-dr-202/](https://labrikman.github.io/foss-dr-202/)**

Before producing sound, click **Power On Audio** or press **Space** / any trigger key. Modern browsers require a user interaction to initialize audio.

## Features

- Interactive 13-pad chromatic drum and bass interface
- 16-step drum and bass sequencer
- Synthesized kick, snare, clap, rimshot, hi-hats, toms, crash, and percussion
- Fat dual-oscillator bass synthesizer
- Tempo, swing/groove, cutoff, resonance, and decay controls
- Independent drum and bass stereo panning
- Master volume, mute, and solo controls
- 100 built-in preset patterns
- Random pattern, drum, and bass generators
- Live step recording and playback
- Eight quick-access bank slots
- Chain/song mode with repeat counts
- TAP tempo, drum/bass track editing, and pattern reset
- Preset and bank import/export using JSON
- Personal preset and bank storage in browser `localStorage`
- Computer keyboard support

## Controls

| Control | Action |
|---|---|
| `A W S E D F T G Y H U J K` | Trigger the 13 chromatic pads |
| `Space` | Start or stop playback |
| Cutoff | Adjust the master low-pass filter |
| Resonance | Adjust filter resonance |
| Decay | Adjust drum and sound decay |
| D-PAN | Adjust drum stereo position |
| B-PAN | Adjust bass stereo position |
| DRUMS / BASS SYNTH | Switch the active track |
| RND buttons | Randomize a complete pattern, drums, or bass |
| Bank slots | Tap to load; right-click or hold to assign a preset |

## Sequencer

1. Power on the Web Audio engine.
2. Select **DRUMS** or **BASS SYNTH**.
3. Click the 16 step buttons to edit the selected lane.
4. For bass editing, select a bass octave and a note from the trigger pads.
5. Press **PLAY** or `Space` to start playback.
6. Enable **REC** to record pad presses into the current pattern while the sequencer is running.

## Presets and Banks

Presets and bank configurations can be saved locally in the browser. They can also be downloaded and shared as JSON files.

- **SAVE JSON / LOAD JSON**: Export or import the active pattern.
- **My Preset Store**: Save, load, download, or delete personal presets.
- **Bank Slots Store**: Save, export, or import eight-slot bank configurations.
- **CHAIN MODE**: Play selected bank slots in sequence with configurable repetitions.

## Local Development

Requirements:

- Node.js
- npm

```bash
npm install
npm run dev
```

Vite will print the local development URL, normally `http://localhost:5173/`.

### Available Scripts

```bash
npm run dev      # Start the development server
npm run build    # Build the production version
npm run preview  # Preview the production build locally
npm run lint     # Run Oxlint
```

## Production Build

```bash
npm run build
npm run preview
```

The generated `dist/` directory can be deployed to a static web host.

## GitHub Pages

The Vite configuration uses the repository base path:

```js
base: '/foss-dr-202/'
```

This allows the application to be served from:

**https://labrikman.github.io/foss-dr-202/**

## Project Structure

```text
src/
├── App.jsx                 # Interface, sequencer, and Web Audio engine
├── main.jsx                # React entry point
├── index.css               # Global styles
├── presetManager.js        # Preset/bank storage and JSON import/export
├── presets/
│   └── presetsBank.js      # Built-in preset patterns
└── assets/                 # Static assets
```

## Technology

- React 19
- Vite 8
- Tailwind CSS 4
- Lucide React
- Web Audio API
- Local Storage
- GitHub Pages

## Browser Notes

Audio is generated locally in the browser. A successful start depends on browser support for `AudioContext` and user permission to play audio. Use a recent version of Chrome, Edge, Firefox, or Safari for the best experience.

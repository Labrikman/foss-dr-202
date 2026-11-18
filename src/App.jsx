import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  Circle,
  Volume2,
  VolumeX,
  Sliders,
  Music,
  Zap,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Radio,
  Disc,
  Power
} from 'lucide-react';
import { exportPresetToFile, importPresetFromFile } from './presetManager';
import { DR202_100_PRESETS } from './presets/presetsBank';

/**
 * BOSS DR-202 Dr. Groove (1998) Emulator
 * Single-file React application with Web Audio API Drum & Bass Synthesis,
 * 16-Step Sequencer with Groove/Swing, 13-Pad Chromatic Trigger Layout,
 * Interactive Rotary Knobs, and Amber Backlit LCD Display.
 */

// --- CONSTANTS & MUSICAL DATA ---


const NOTE_FREQS = {
  'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89,
  'E1': 41.20, 'F1': 43.65, 'F#1': 46.25, 'G1': 49.00,
  'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78,
  'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00,
  'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81
};

// 13-Pad Chromatic Layout (C to C) matching DR-202 lower/upper pad layout
const PAD_CONFIG = [
  { id: 0, note: 'C', fullNote: 'C2', isBlack: false, keyHint: 'A', drumName: 'KICK 1', drumId: 'kick', color: 'amber' },
  { id: 1, note: 'C#', fullNote: 'C#2', isBlack: true, keyHint: 'W', drumName: 'RIMSHOT', drumId: 'rim', color: 'red' },
  { id: 2, note: 'D', fullNote: 'D2', isBlack: false, keyHint: 'S', drumName: 'SNARE 1', drumId: 'snare', color: 'amber' },
  { id: 3, note: 'D#', fullNote: 'D#2', isBlack: true, keyHint: 'E', drumName: 'CLAP', drumId: 'clap', color: 'red' },
  { id: 4, note: 'E', fullNote: 'E2', isBlack: false, keyHint: 'D', drumName: 'SNARE 2', drumId: 'snare2', color: 'amber' },
  { id: 5, note: 'F', fullNote: 'F2', isBlack: false, keyHint: 'F', drumName: 'LOW TOM', drumId: 'tomLow', color: 'amber' },
  { id: 6, note: 'F#', fullNote: 'F#2', isBlack: true, keyHint: 'T', drumName: 'CL HAT', drumId: 'chh', color: 'red' },
  { id: 7, note: 'G', fullNote: 'G2', isBlack: false, keyHint: 'G', drumName: 'MID TOM', drumId: 'tomMid', color: 'amber' },
  { id: 8, note: 'G#', fullNote: 'G#2', isBlack: true, keyHint: 'Y', drumName: 'PDL HAT', drumId: 'phh', color: 'red' },
  { id: 9, note: 'A', fullNote: 'A2', isBlack: false, keyHint: 'H', drumName: 'HI TOM', drumId: 'tomHi', color: 'amber' },
  { id: 10, note: 'A#', fullNote: 'A#2', isBlack: true, keyHint: 'U', drumName: 'OP HAT', drumId: 'ohh', color: 'red' },
  { id: 11, note: 'B', fullNote: 'B2', isBlack: false, keyHint: 'J', drumName: 'CRASH', drumId: 'crash', color: 'amber' },
  { id: 12, note: 'C+', fullNote: 'C3', isBlack: false, keyHint: 'K', drumName: 'PERC / FX', drumId: 'perc', color: 'amber' },
];

const DRUM_VOICES = [
  { id: 'kick', label: 'KICK', group: 'KICK' },
  { id: 'snare', label: 'SNARE', group: 'SNARE' },
  { id: 'clap', label: 'CLAP', group: 'SNARE' },
  { id: 'rim', label: 'RIM', group: 'SNARE' },
  { id: 'chh', label: 'CL HAT', group: 'HATS' },
  { id: 'ohh', label: 'OP HAT', group: 'HATS' },
  { id: 'tomLow', label: 'TOM', group: 'PERC' },
  { id: 'perc', label: 'PERC', group: 'PERC' },
];

const normalizePreset = (preset, index) => {
  const rawSteps = preset.steps || {};
  const empty16 = () => Array(16).fill(0);

  return {
    id: preset.id || String(index + 1).padStart(2, '0'),
    name: preset.name || `Pattern ${index + 1}`,
    genre: preset.genre || 'Preset',
    bpm: preset.bpm || 92,
    swing: preset.swing ?? 50,
    cutoff: preset.cutoff ?? 75,
    resonance: preset.resonance ?? 40,
    decay: preset.decay ?? 60,
    bassOctave: preset.bassOctave ?? 0,
    drums: preset.drums || {
      kick: rawSteps.kick || empty16(),
      snare: rawSteps.snare || empty16(),
      clap: rawSteps.clap || empty16(),
      rim: rawSteps.rim || empty16(),
      chh: rawSteps.ch || empty16(),
      ohh: rawSteps.oh || empty16(),
      tomLow: rawSteps.tom || empty16(),
      perc: rawSteps.perc || empty16(),
    },
    bass: preset.bass || (rawSteps.bass || empty16()).map((value) =>
      value ? 'C2' : null
    ),
  };
};

const PRESET_PATTERNS = DR202_100_PRESETS.map(normalizePreset);

// --- WEB AUDIO API SYNTHESIZER ENGINE ---

class DR202AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.masterFilter = null;
    this.compressor = null;
    this.noiseBuffer = null;

    // Live controllable parameters (0 - 100)
    this.cutoff = 75;
    this.resonance = 40;
    this.decay = 60;
    this.masterVolume = 0.85;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Dynamics Compressor for punchy 90s glue
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      // Master Low-Pass Filter (DR-202's signature real-time DJ/Groove filter!)
      this.masterFilter = this.ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.updateFilterParams();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      this.masterFilter.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Pre-generate 2 seconds of white noise for snares, hats, claps
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setParams({ cutoff, resonance, decay, volume }) {
    if (cutoff !== undefined) this.cutoff = cutoff;
    if (resonance !== undefined) this.resonance = resonance;
    if (decay !== undefined) this.decay = decay;
    if (volume !== undefined) {
      this.masterVolume = volume;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.015);
      }
    }
    this.updateFilterParams();
  }

  updateFilterParams() {
    if (!this.masterFilter || !this.ctx) return;
    // Exponential mapping from 0..100 to 120Hz..18000Hz
    const minFreq = 120;
    const maxFreq = 18000;
    const freq = minFreq * Math.pow(maxFreq / minFreq, this.cutoff / 100);
    // Resonance Q from 0.7 to 14
    const q = 0.7 + (this.resonance / 100) * 13.5;

    this.masterFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    this.masterFilter.Q.setTargetAtTime(q, this.ctx.currentTime, 0.02);
  }

  // Trigger a synthesized 90s Drum Sound
  triggerDrum(drumId, time = null, velocity = 1.0) {
    this.init();
    const t = time || this.ctx.currentTime;
    const decayScale = 0.45 + (this.decay / 100) * 1.15;

    switch (drumId) {
      case 'kick':
        this._synthKick(t, velocity, decayScale);
        break;
      case 'snare':
        this._synthSnare(t, velocity, decayScale, 195);
        break;
      case 'snare2':
        this._synthSnare(t, velocity, decayScale * 0.85, 240);
        break;
      case 'clap':
        this._synthClap(t, velocity, decayScale);
        break;
      case 'rim':
        this._synthRim(t, velocity);
        break;
      case 'chh':
        this._synthHiHat(t, velocity, 0.045 * decayScale, 7500);
        break;
      case 'phh':
        this._synthHiHat(t, velocity * 0.85, 0.075 * decayScale, 6800);
        break;
      case 'ohh':
        this._synthHiHat(t, velocity, 0.34 * decayScale, 6500);
        break;
      case 'tomLow':
        this._synthTom(t, velocity, 95, 45, decayScale);
        break;
      case 'tomMid':
        this._synthTom(t, velocity, 145, 72, decayScale);
        break;
      case 'tomHi':
        this._synthTom(t, velocity, 210, 105, decayScale);
        break;
      case 'crash':
        this._synthCrash(t, velocity, decayScale);
        break;
      case 'perc':
        this._synthPerc(t, velocity, decayScale);
        break;
      default:
        this._synthKick(t, velocity, decayScale);
    }
  }

  _synthKick(t, vel, decayScale) {
    // Sub body oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.045);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.32 * decayScale);

    gain.gain.setValueAtTime(1.15 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36 * decayScale);

    osc.connect(gain);
    gain.connect(this.masterFilter);
    osc.start(t);
    osc.stop(t + 0.38 * decayScale);

    // Punchy 90s beater click
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(950, t);
    clickOsc.frequency.exponentialRampToValueAtTime(90, t + 0.022);
    clickGain.gain.setValueAtTime(0.55 * vel, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    clickOsc.connect(clickGain);
    clickGain.connect(this.masterFilter);
    clickOsc.start(t);
    clickOsc.stop(t + 0.03);
  }

  _synthSnare(t, vel, decayScale, baseFreq) {
    // Drum shell tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 1.4, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, t + 0.08);
    oscGain.gain.setValueAtTime(0.65 * vel, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14 * decayScale);

    osc.connect(oscGain);
    oscGain.connect(this.masterFilter);
    osc.start(t);
    osc.stop(t + 0.15 * decayScale);

    // Snare wire crisp noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1100, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8 * vel, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.21 * decayScale);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterFilter);
    noise.start(t);
    noise.stop(t + 0.22 * decayScale);
  }

  _synthClap(t, vel, decayScale) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, t);
    filter.Q.setValueAtTime(1.8, t);

    const gain = this.ctx.createGain();
    // Classic 3-burst clap envelope + tail
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.85 * vel, t + 0.005);
    gain.gain.linearRampToValueAtTime(0.15 * vel, t + 0.014);
    gain.gain.linearRampToValueAtTime(0.85 * vel, t + 0.022);
    gain.gain.linearRampToValueAtTime(0.2 * vel, t + 0.032);
    gain.gain.linearRampToValueAtTime(0.9 * vel, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25 * decayScale);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterFilter);
    noise.start(t);
    noise.stop(t + 0.26 * decayScale);
  }

  _synthRim(t, vel) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(480, t);
    osc2.frequency.setValueAtTime(1680, t);

    gain.gain.setValueAtTime(0.75 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterFilter);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.042);
    osc2.stop(t + 0.042);
  }

  _synthHiHat(t, vel, duration, hpFreq) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(hpFreq, t);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(9800, t);
    bp.Q.setValueAtTime(1.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.55 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterFilter);

    noise.start(t);
    noise.stop(t + duration + 0.01);
  }

  _synthTom(t, vel, startFreq, endFreq, decayScale) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.18 * decayScale);

    gain.gain.setValueAtTime(0.85 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24 * decayScale);

    osc.connect(gain);
    gain.connect(this.masterFilter);
    osc.start(t);
    osc.stop(t + 0.26 * decayScale);
  }

  _synthCrash(t, vel, decayScale) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(4800, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75 * decayScale);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterFilter);
    noise.start(t);
    noise.stop(t + 0.8 * decayScale);
  }

  _synthPerc(t, vel, decayScale) {
    // Classic 90s FM/Cowbell-ish metallic perc
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const bp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(540, t);
    osc2.frequency.setValueAtTime(810, t);

    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t);
    bp.Q.setValueAtTime(2.5, t);

    gain.gain.setValueAtTime(0.45 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16 * decayScale);

    osc1.connect(bp);
    osc2.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterFilter);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.18 * decayScale);
    osc2.stop(t + 0.18 * decayScale);
  }

  // Trigger a fat 90s DR-202 Bass Synth note
  triggerBass(noteName, octaveShift = 0, time = null, duration = 0.28) {
    this.init();
    const t = time || this.ctx.currentTime;
    const baseFreq = NOTE_FREQS[noteName] || 65.41;
    const freq = baseFreq * Math.pow(2, octaveShift);
    const decayTime = 0.14 + (this.decay / 100) * 0.55;

    // Dual-oscillator fat bass: Sawtooth + Sub-Square
    const oscSaw = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();
    oscSaw.type = 'sawtooth';
    oscSub.type = 'square';

    oscSaw.frequency.setValueAtTime(freq, t);
    oscSub.frequency.setValueAtTime(freq * 0.5, t);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.45, t);

    // Dedicated Bass Resonant Low-Pass Filter with Envelope
    const bassFilter = this.ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';

    // Cutoff knob directly shapes bass filter sweep!
    const minCut = 90;
    const maxCut = 3400;
    const targetCut = minCut * Math.pow(maxCut / minCut, this.cutoff / 100);
    const envPeak = Math.min(6000, targetCut * 2.6 + 180);

    bassFilter.frequency.setValueAtTime(envPeak, t);
    bassFilter.frequency.exponentialRampToValueAtTime(Math.max(70, targetCut * 0.65), t + decayTime);
    bassFilter.Q.setValueAtTime(1.5 + (this.resonance / 100) * 12, t);

    const ampGain = this.ctx.createGain();
    ampGain.gain.setValueAtTime(0.001, t);
    ampGain.gain.linearRampToValueAtTime(0.75, t + 0.008);
    ampGain.gain.exponentialRampToValueAtTime(0.001, t + Math.max(duration, decayTime));

    oscSaw.connect(bassFilter);
    oscSub.connect(subGain);
    subGain.connect(bassFilter);
    bassFilter.connect(ampGain);
    ampGain.connect(this.masterFilter);

    oscSaw.start(t);
    oscSub.start(t);
    const stopTime = t + Math.max(duration, decayTime) + 0.02;
    oscSaw.stop(stopTime);
    oscSub.stop(stopTime);
  }
}

const audioEngine = new DR202AudioEngine();

// --- ROTARY KNOB HARDWARE COMPONENT ---

const RotaryKnob = ({ label, subLabel, value, onChange, accentColor = '#f97316' }) => {
  const knobRef = useRef(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startValRef = useRef(value);

  const handleMouseDown = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startValRef.current = value;
    document.body.style.cursor = 'ns-resize';
  };

  const handleTouchStart = (e) => {
    draggingRef.current = true;
    startYRef.current = e.touches[0].clientY;
    startValRef.current = value;
  };

  useEffect(() => {
    const handleMove = (clientY) => {
      if (!draggingRef.current) return;
      const deltaY = startYRef.current - clientY;
      const newVal = Math.min(100, Math.max(0, Math.round(startValRef.current + deltaY * 0.65)));
      onChange(newVal);
    };

    const onMouseMove = (e) => handleMove(e.clientY);
    const onTouchMove = (e) => {
      if (draggingRef.current) {
        e.preventDefault();
        handleMove(e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [onChange]);

  // Rotation angle from -135 deg (0) to +135 deg (100)
  const rotation = -135 + (value / 100) * 270;

  return (
    <div className="flex flex-col items-center select-none group">
      <div className="text-[10px] font-extrabold tracking-wider text-zinc-800 uppercase mb-1">
        {label}
      </div>

      {/* Knob outer housing & dial ticks */}
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={() => onChange(50)}
        title="Drag up/down to adjust (Double-click to center)"
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center cursor-ns-resize touch-none"
      >
        {/* Outer tick ring */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 64 64">
          {Array.from({ length: 11 }).map((_, idx) => {
            const angle = (-135 + idx * 27) * (Math.PI / 180);
            const r1 = 27;
            const r2 = 31;
            const x1 = 32 + r1 * Math.sin(angle);
            const y1 = 32 - r1 * Math.cos(angle);
            const x2 = 32 + r2 * Math.sin(angle);
            const y2 = 32 - r2 * Math.cos(angle);
            const active = idx * 10 <= value;
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={active ? accentColor : '#52525b'}
                strokeWidth={idx === 0 || idx === 5 || idx === 10 ? '2' : '1.3'}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Tactile 90s charcoal rubberized knob cap */}
        <div
          style={{ transform: `rotate(${rotation}deg)` }}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-zinc-900 flex items-start justify-center pt-1 transition-transform duration-75"
        >
          {/* Indicator notch */}
          <div
            className="w-1 h-3 rounded-full"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 4px ${accentColor}` }}
          />
        </div>
      </div>

      <div className="mt-0.5 flex items-center gap-1">
        <span className="text-[9px] font-mono font-bold text-zinc-600">{subLabel}</span>
        <span className="text-[9px] font-mono font-bold text-zinc-900 bg-zinc-300/80 px-1 rounded">
          {value}
        </span>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION COMPONENT ---

export default function App() {
  // Audio Unlock State
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const fileInputRef = useRef(null);
  // Sequencer & Transport State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(PRESET_PATTERNS[0].bpm);
  const [swing, setSwing] = useState(PRESET_PATTERNS[0].swing);
  const [patternIndex, setPatternIndex] = useState(0);
  const [bank, setBank] = useState('A'); // A = Preset, B = User Edit

  // Track & Mode Selection ('DRUM' | 'BASS')
  const [activeTrack, setActiveTrack] = useState('DRUM');
  const [selectedDrumVoice, setSelectedDrumVoice] = useState('kick');
  const [bassOctave, setBassOctave] = useState(PRESET_PATTERNS[0].bassOctave);
  const [selectedBassNote, setSelectedBassNote] = useState('C2');

  // Realtime Sound Shaping Knobs (0-100)
  const [cutoff, setCutoff] = useState(PRESET_PATTERNS[0].cutoff);
  const [resonance, setResonance] = useState(PRESET_PATTERNS[0].resonance);
  const [decay, setDecay] = useState(PRESET_PATTERNS[0].decay);
  const [masterVol, setMasterVol] = useState(85);

  // Pattern Data (cloned from presets so user can live-edit)
  const [patterns, setPatterns] = useState(PRESET_PATTERNS);

  // Tracks which preset index (0 to 199) is assigned to each of the 8 hardware slots
const [bankSlots, setBankSlots] = useState([0, 1, 2, 3, 4, 5, 6, 7]);

// Tracks which slot currently has its configuration menu open (null if closed)
const [configuringSlotIndex, setConfiguringSlotIndex] = useState(null);
  // Part Mutes & Solos
  const [mutedParts, setMutedParts] = useState({
    KICK: false,
    SNARE: false,
    HATS: false,
    PERC: false,
    BASS: false,
  });
  const [soloPart, setSoloPart] = useState(null);

  // Visual LED feedback for triggered pads
  const [activePads, setActivePads] = useState({});
  const [lastTriggeredLabel, setLastTriggeredLabel] = useState('READY');

  // Tap Tempo tracking
  const tapTimesRef = useRef([]);

  // Refs for accurate timing inside setInterval/scheduler
  const stateRef = useRef({
    isPlaying,
    isRecording,
    bpm,
    swing,
    patternIndex,
    patterns,
    mutedParts,
    soloPart,
    bassOctave,
    activeTrack,
    currentStep: -1,
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      isRecording,
      bpm,
      swing,
      patternIndex,
      patterns,
      mutedParts,
      soloPart,
      bassOctave,
      activeTrack,
      currentStep,
    };
  }, [
    isPlaying,
    isRecording,
    bpm,
    swing,
    patternIndex,
    patterns,
    mutedParts,
    soloPart,
    bassOctave,
    activeTrack,
    currentStep,
  ]);

  // Sync knob changes with Web Audio Engine
  useEffect(() => {
    audioEngine.setParams({
      cutoff,
      resonance,
      decay,
      volume: masterVol / 100,
    });
  }, [cutoff, resonance, decay, masterVol]);

  // Unlock Audio Handler
  const handleUnlockAudio = useCallback(() => {
    audioEngine.init();
    setAudioUnlocked(true);
  }, []);

  // Flash pad LED visually
  const flashPad = useCallback((padId) => {
    setActivePads((prev) => ({ ...prev, [padId]: true }));
    setTimeout(() => {
      setActivePads((prev) => ({ ...prev, [padId]: false }));
    }, 130);
  }, []);

  // Load a Preset Pattern
  const selectPattern = useCallback(
    (newIndex) => {
      const wrapped = (newIndex + patterns.length) % patterns.length;
      setPatternIndex(wrapped);
      const pat = patterns[wrapped];
      setBpm(pat.bpm);
      setSwing(pat.swing);
      setCutoff(pat.cutoff);
      setResonance(pat.resonance);
      setDecay(pat.decay);
      setBassOctave(pat.bassOctave);
      setLastTriggeredLabel(`LOAD ${pat.id}`);
    },
    [patterns]
  );

  // Reset current pattern back to factory preset
  const handleResetPattern = () => {
    const factory = PRESET_PATTERNS[patternIndex];
    setPatterns((prev) => {
      const next = [...prev];
      next[patternIndex] = {
        ...factory,
        drums: JSON.parse(JSON.stringify(factory.drums)),
        bass: [...factory.bass],
      };
      return next;
    });
    selectPattern(patternIndex);
    setBank('A');
    setLastTriggeredLabel('FACTORY RST');
  };

  // Trigger a Pad (Drum or Bass depending on activeTrack)
  const triggerPad = useCallback(
    (pad) => {
      if (!audioUnlocked) handleUnlockAudio();
      flashPad(pad.id);

      const { activeTrack: track, isPlaying: playing, isRecording: rec, currentStep: step, patternIndex: pIdx, bassOctave: oct } =
        stateRef.current;

      if (track === 'DRUM') {
        audioEngine.triggerDrum(pad.drumId);
        setLastTriggeredLabel(pad.drumName);
        // Select corresponding voice in sequencer if available
        if (DRUM_VOICES.some((v) => v.id === pad.drumId)) {
          setSelectedDrumVoice(pad.drumId);
        }
        // Live step recording
        if (playing && rec && step >= 0 && DRUM_VOICES.some((v) => v.id === pad.drumId)) {
          setBank('B');
          setPatterns((prev) => {
            const next = [...prev];
            const pat = { ...next[pIdx], drums: { ...next[pIdx].drums } };
            const arr = [...pat.drums[pad.drumId]];
            arr[step] = 1;
            pat.drums[pad.drumId] = arr;
            next[pIdx] = pat;
            return next;
          });
        }
      } else {
        // BASS TRACK MODE
        audioEngine.triggerBass(pad.fullNote, oct);
        setSelectedBassNote(pad.fullNote);
        setLastTriggeredLabel(`BASS ${pad.fullNote}`);

        // Live step recording
        if (playing && rec && step >= 0) {
          setBank('B');
          setPatterns((prev) => {
            const next = [...prev];
            const pat = { ...next[pIdx], bass: [...next[pIdx].bass] };
            pat.bass[step] = pad.fullNote;
            next[pIdx] = pat;
            return next;
          });
        }
      }
    },
    [audioUnlocked, flashPad, handleUnlockAudio]
  );

  // Check if a part is audible given Mute & Solo states
  const isPartAudible = (group) => {
    const { mutedParts: m, soloPart: s } = stateRef.current;
    if (s) return s === group;
    return !m[group];
  };

  const handleExportPreset = () => {
  const activePattern = patterns[patternIndex];
  const safeName = (activePattern.name || `pattern-${patternIndex + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  exportPresetToFile(activePattern, `dr202-${safeName}.json`);
};

const handleImportPreset = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const importedPattern = await importPresetFromFile(file);
    setPatterns((prev) => {
      const updated = [...prev];
      updated[patternIndex] = normalizePreset(
        {
          ...importedPattern,
          name: importedPattern.name || `IMP ${patternIndex + 1}`,
        },
        patternIndex
      );
      return updated;
    });
  } catch (err) {
    alert(`Import Error: ${err.message}`);
  } finally {
    // Reset input so the same file can be re-imported if needed
    e.target.value = '';
  }
};

  // --- SEQUENCER ENGINE LOOP ---
  useEffect(() => {
    if (!isPlaying) {
      setCurrentStep(-1);
      return;
    }

    audioEngine.init();
    let step = 0;
    let timerId = null;

    const tick = () => {
      const st = stateRef.current;
      if (!st.isPlaying) return;

      setCurrentStep(step);
      const currentPat = st.patterns[st.patternIndex];

      // 1. Play Drum Voices for this step
      DRUM_VOICES.forEach((voice) => {
        if (currentPat.drums[voice.id]?.[step] === 1) {
          if (isPartAudible(voice.group)) {
            audioEngine.triggerDrum(voice.id);
            // Light up matching pad
            const matchingPad = PAD_CONFIG.find((p) => p.drumId === voice.id);
            if (matchingPad && st.activeTrack === 'DRUM') {
              flashPad(matchingPad.id);
            }
          }
        }
      });

      // 2. Play Bass Note for this step
      const bassNote = currentPat.bass[step];
      if (bassNote && isPartAudible('BASS')) {
        audioEngine.triggerBass(bassNote, st.bassOctave);
        const matchingPad = PAD_CONFIG.find((p) => p.fullNote === bassNote);
        if (matchingPad && st.activeTrack === 'BASS') {
          flashPad(matchingPad.id);
        }
      }

      // Calculate next step interval with DR-202 Groove/Swing!
      const sixteenthMs = (60 / st.bpm / 4) * 1000;
      // Swing shifts even-indexed 16th steps (0, 2, 4...) vs odd steps (1, 3, 5...)
      const swingFactor = (st.swing - 50) / 50; // -0.5 to +0.5
      const delay =
        step % 2 === 0
          ? sixteenthMs * (1 + swingFactor * 0.45)
          : sixteenthMs * (1 - swingFactor * 0.45);

      step = (step + 1) % 16;
      timerId = setTimeout(tick, Math.max(35, delay));
    };

    tick();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isPlaying, flashPad]);

  // --- COMPUTER KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const keyMap = {};
    PAD_CONFIG.forEach((p) => {
      keyMap[p.keyHint.toLowerCase()] = p;
    });

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!audioUnlocked) handleUnlockAudio();
        setIsPlaying((prev) => !prev);
        return;
      }

      const pad = keyMap[e.key.toLowerCase()];
      if (pad) {
        e.preventDefault();
        triggerPad(pad);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerPad, audioUnlocked, handleUnlockAudio]);

  // Tap Tempo Handler
  const handleTapTempo = () => {
    if (!audioUnlocked) handleUnlockAudio();
    const now = performance.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 2500);
    taps.push(now);
    tapTimesRef.current = taps;

    if (taps.length >= 2) {
      let sum = 0;
      for (let i = 1; i < taps.length; i++) {
        sum += taps[i] - taps[i - 1];
      }
      const avgMs = sum / (taps.length - 1);
      const newBpm = Math.min(180, Math.max(60, Math.round(60000 / avgMs)));
      setBpm(newBpm);
      setLastTriggeredLabel(`TAP ${newBpm}`);
    } else {
      setLastTriggeredLabel('TAP...');
    }
  };

  // Toggle Step in 16-Step Sequencer Grid
  const toggleStep = (stepIdx) => {
    if (!audioUnlocked) handleUnlockAudio();
    setBank('B');

    setPatterns((prev) => {
      const next = [...prev];
      const pat = { ...next[patternIndex] };

      if (activeTrack === 'DRUM') {
        const drums = { ...pat.drums };
        const arr = [...drums[selectedDrumVoice]];
        arr[stepIdx] = arr[stepIdx] ? 0 : 1;
        drums[selectedDrumVoice] = arr;
        pat.drums = drums;
        if (arr[stepIdx] === 1) {
          audioEngine.triggerDrum(selectedDrumVoice);
        }
      } else {
        const bass = [...pat.bass];
        bass[stepIdx] = bass[stepIdx] === selectedBassNote ? null : selectedBassNote;
        pat.bass = bass;
        if (bass[stepIdx]) {
          audioEngine.triggerBass(bass[stepIdx], bassOctave);
        }
      }

      next[patternIndex] = pat;
      return next;
    });
  };

  // Toggle Mute for a group
  const toggleMute = (group) => {
    setMutedParts((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Toggle Solo for a group
  const toggleSolo = (group) => {
    setSoloPart((prev) => (prev === group ? null : group));
  };

  const currentPattern = patterns[patternIndex];

  // Helper for long press timer (iPad / Touch support)
let pressTimer = null;

const handleSlotTouchStart = (index) => {
  pressTimer = setTimeout(() => {
    setConfiguringSlotIndex(index);
  }, 2000); // 2 seconds hold
};

const handleSlotTouchEnd = () => {
  if (pressTimer) clearTimeout(pressTimer);
};

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-900 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 font-sans select-none overflow-x-hidden">
      {/* Audio Engine Activation Banner (Required by browser Web Audio policy) */}
      {!audioUnlocked && (
        <div className="w-full max-w-4xl mb-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-zinc-950 px-4 py-3 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.4)] flex flex-col sm:flex-row items-center justify-between gap-3 border border-amber-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-950 text-amber-400 rounded-lg animate-pulse">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-wider">
                FOSS DR-202 Sound Engine Standby
              </p>
              <p className="text-xs font-medium text-zinc-900">
                Click &ldquo;Power On Audio&rdquo; or press any pad / Spacebar to initialize the 1998 Drum &amp; Bass Synth.
              </p>
            </div>
          </div>
          <button
            onClick={handleUnlockAudio}
            className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-amber-400 font-black text-xs uppercase tracking-widest rounded-lg shadow transition cursor-pointer whitespace-nowrap"
          >
            Power On Audio
          </button>
        </div>
      )}

      {/* =====================================================================
          BOSS DR-202 HARDWARE CHASSIS
         ===================================================================== */}
      <div className="w-full max-w-5xl rounded-[24px] sm:rounded-[30px] p-3 sm:p-5 lg:p-6 bg-gradient-to-b from-[#d2d5da] via-[#b8bcc4] to-[#989da6] shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_2px_3px_rgba(255,255,255,0.8),inset_0_-4px_8px_rgba(0,0,0,0.35)] border-2 border-zinc-500 relative overflow-hidden">
        {/* Subtle metallic grain highlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_70%)]" />

        {/* TOP HARDWARE BRANDING & GROOVE STRIP */}
        <div className="relative flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-zinc-500/50">
          <div className="flex items-baseline gap-3">
            <span className="font-black text-xl sm:text-2xl tracking-tighter text-zinc-900 italic">
              FOSS
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-lg sm:text-xl tracking-tight text-zinc-800">
                DR-202
              </span>
              <span className="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-orange-700 bg-zinc-900/10 px-2 py-0.5 rounded">
                Dr. Groove
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-widest text-zinc-700">
              Rhythm &amp; Bass Machine • 1998 PCM/Synth Engine
            </span>
            <div className="flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1 rounded-full shadow-inner">
              <span
                className={`w-2 h-2 rounded-full ${
                  audioUnlocked
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-red-500 animate-pulse'
                }`}
              />
              <span className="text-[10px] font-mono font-bold text-zinc-300">
                {audioUnlocked ? 'DC IN 9V ON' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================================
            UPPER CONTROL DECK: 3 REAL-TIME KNOBS + AMBER BACKLIT LCD + NAV
           ===================================================================== */}
        <div className="relative grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4 mb-4 sm:mb-5 items-center">
          {/* LEFT: 3 REALTIME MODIFY KNOBS (Cutoff, Resonance, Decay) */}
          <div className="lg:col-span-4 bg-zinc-400/40 rounded-2xl p-2.5 sm:p-3 border border-zinc-500/40 shadow-inner">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-800 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-orange-700" />
                Realtime Modify
              </span>
              <span className="text-[9px] font-bold text-zinc-600">DRUM / BASS</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <RotaryKnob
                label="CUTOFF"
                subLabel="LPF"
                value={cutoff}
                onChange={setCutoff}
                accentColor="#f97316"
              />
              <RotaryKnob
                label="RESONANCE"
                subLabel="Q"
                value={resonance}
                onChange={setResonance}
                accentColor="#ef4444"
              />
              <RotaryKnob
                label="DECAY"
                subLabel="ENV"
                value={decay}
                onChange={setDecay}
                accentColor="#eab308"
              />
            </div>
          </div>

          {/* CENTER: ICONIC AMBER/ORANGE BACKLIT LCD DISPLAY */}
          <div className="lg:col-span-5">
            <div className="bg-zinc-900 p-2.5 rounded-2xl shadow-[inset_0_3px_10px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.5)] border-2 border-zinc-700">
              {/* Amber LCD Glass */}
              <div className="relative rounded-xl bg-gradient-to-b from-[#ff9e1b] via-[#ff8c00] to-[#e67300] p-3 text-zinc-950 font-mono shadow-[inset_0_0_20px_rgba(120,40,0,0.55)] overflow-hidden">
                {/* Subtle LCD scanline / pixel grid texture */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-15"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)',
                    backgroundSize: '3px 3px',
                  }}
                />

                {/* LCD Row 1: Pattern ID, Bank, BPM, Groove */}
                <div className="relative flex items-center justify-between border-b border-zinc-950/25 pb-1.5 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-zinc-950 text-[#ff9e1b] text-xs font-black px-1.5 py-0.5 rounded">
                      {bank}-{currentPattern.id}
                    </span>
                    <span className="text-xs sm:text-sm font-black tracking-tight uppercase truncate max-w-[130px]">
                      {currentPattern.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[9px] font-bold block leading-none opacity-75">
                        BPM
                      </span>
                      <span className="text-base font-black leading-none">{bpm}</span>
                    </div>
                    <div className="text-right border-l border-zinc-950/30 pl-2">
                      <span className="text-[9px] font-bold block leading-none opacity-75">
                        SWING
                      </span>
                      <span className="text-base font-black leading-none">{swing}%</span>
                    </div>
                  </div>
                </div>

                {/* LCD Row 2: Active Mode, Genre, Last Triggered */}
                <div className="relative flex items-center justify-between text-[11px] font-bold mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 bg-zinc-950/15 rounded font-black">
                      TRK:{activeTrack}
                    </span>
                    <span className="opacity-85">[{currentPattern.genre}]</span>
                  </div>
                  <span className="font-black tracking-wider bg-zinc-950/15 px-1.5 rounded">
                    {lastTriggeredLabel}
                  </span>
                </div>

                {/* LCD Row 3: Part Mute/Solo Status Bar */}
                <div className="relative grid grid-cols-5 gap-1 pt-1 border-t border-zinc-950/25 text-[9px] font-black text-center">
                  {['KICK', 'SNARE', 'HATS', 'PERC', 'BASS'].map((part) => {
                    const isMuted = mutedParts[part];
                    const isSolo = soloPart === part;
                    return (
                      <div
                        key={part}
                        className={`py-0.5 rounded transition ${
                          isSolo
                            ? 'bg-zinc-950 text-[#ff9e1b]'
                            : isMuted
                            ? 'opacity-30 line-through'
                            : 'bg-zinc-950/15 text-zinc-950'
                        }`}
                      >
                        {part}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: PATTERN SELECT, TEMPO / SWING & MASTER VOLUME */}
          <div className="lg:col-span-3 bg-zinc-400/40 rounded-2xl p-2.5 sm:p-3 border border-zinc-500/40 shadow-inner flex flex-col justify-between gap-2.5">
            {/* Pattern Selector */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-800 mb-1">
                <span>Pattern Select</span>
                <button
                  onClick={handleResetPattern}
                  title="Reset current pattern to factory preset"
                  className="flex items-center gap-0.5 text-[9px] text-zinc-700 hover:text-zinc-950 underline cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Reset
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => selectPattern(patternIndex - 1)}
                  className="bg-zinc-800 hover:bg-zinc-700 active:translate-y-0.5 text-zinc-100 py-1.5 rounded-lg shadow flex items-center justify-center cursor-pointer"
                  aria-label="Previous Pattern"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="bg-zinc-900 text-amber-400 font-mono font-black text-xs rounded-lg flex items-center justify-center border border-zinc-700">
                  {currentPattern.id}
                </div>
                <button
                  onClick={() => selectPattern(patternIndex + 1)}
                  className="bg-zinc-800 hover:bg-zinc-700 active:translate-y-0.5 text-zinc-100 py-1.5 rounded-lg shadow flex items-center justify-center cursor-pointer"
                  aria-label="Next Pattern"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tempo & Swing Quick Adjusters */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-300/70 p-1.5 rounded-lg border border-zinc-500/30">
                <span className="block text-[9px] font-black text-zinc-700 uppercase">
                  Tempo (BPM)
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <button
                    onClick={() => setBpm((b) => Math.max(60, b - 2))}
                    className="w-6 h-6 bg-zinc-800 text-white rounded text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-xs">{bpm}</span>
                  <button
                    onClick={() => setBpm((b) => Math.min(180, b + 2))}
                    className="w-6 h-6 bg-zinc-800 text-white rounded text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-zinc-300/70 p-1.5 rounded-lg border border-zinc-500/30">
                <span className="block text-[9px] font-black text-zinc-700 uppercase">
                  Groove Swing
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <button
                    onClick={() => setSwing((s) => Math.max(50, s - 2))}
                    className="w-6 h-6 bg-zinc-800 text-white rounded text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-xs">{swing}%</span>
                  <button
                    onClick={() => setSwing((s) => Math.min(75, s + 2))}
                    className="w-6 h-6 bg-zinc-800 text-white rounded text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Master Output Slider */}
            <div className="flex items-center gap-2 px-1">
              <Volume2 className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
              <input
                type="range"
                min="0"
                max="100"
                value={masterVol}
                onChange={(e) => setMasterVol(Number(e.target.value))}
                className="w-full accent-orange-600 h-1.5 bg-zinc-600 rounded-lg cursor-pointer"
                aria-label="Master Volume"
              />
              <span className="text-[9px] font-mono font-bold text-zinc-800 w-6 text-right">
                {masterVol}
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================================
            MIDDLE DECK: TRACK SELECT, MUTE/SOLO MIXER & 16-STEP SEQUENCER
           ===================================================================== */}
        <div className="relative bg-zinc-800/95 text-zinc-100 rounded-2xl p-3 sm:p-4 mb-5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] border border-zinc-700">
          {/* Top Bar of Sequencer: Track Mode Toggle & Part Mute/Solo */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-700/80">
            {/* Track Select (DRUM vs BASS) */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Track Edit:
              </span>
              <div className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-700">
                <button
                  onClick={() => setActiveTrack('DRUM')}
                  className={`px-3 py-1 rounded-md text-xs font-black tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                    activeTrack === 'DRUM'
                      ? 'bg-amber-500 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Disc className="w-3.5 h-3.5" /> DRUMS
                </button>
                <button
                  onClick={() => setActiveTrack('BASS')}
                  className={`px-3 py-1 rounded-md text-xs font-black tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                    activeTrack === 'BASS'
                      ? 'bg-orange-500 text-zinc-950 shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" /> BASS SYNTH
                </button>
              </div>
            </div>

            {/* Part Mute / Solo Strip */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mr-1">
                Part Mixer:
              </span>
              {['KICK', 'SNARE', 'HATS', 'PERC', 'BASS'].map((group) => {
                const muted = mutedParts[group];
                const soloed = soloPart === group;
                return (
                  <div
                    key={group}
                    className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-700/80 gap-1"
                  >
                    <button
                      onClick={() => toggleMute(group)}
                      title={`Mute/Unmute ${group}`}
                      className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                        muted
                          ? 'bg-red-600/80 text-white'
                          : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700'
                      }`}
                    >
                      {group}
                    </button>
                    <button
                      onClick={() => toggleSolo(group)}
                      title={`Solo ${group}`}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black transition cursor-pointer ${
                        soloed
                          ? 'bg-amber-400 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      S
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-selector for Drum Voice OR Bass Octave/Note */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            {activeTrack === 'DRUM' ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-zinc-400 mr-1">
                  Lane:
                </span>
                {DRUM_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      setSelectedDrumVoice(voice.id);
                      audioEngine.triggerDrum(voice.id);
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                      selectedDrumVoice === voice.id
                        ? 'bg-amber-500 text-zinc-950 shadow'
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                    }`}
                  >
                    {voice.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    Bass Octave:
                  </span>
                  {[-1, 0, 1].map((oct) => (
                    <button
                      key={oct}
                      onClick={() => setBassOctave(oct)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                        bassOctave === oct
                          ? 'bg-orange-500 text-zinc-950'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {oct === -1 ? 'SUB (-1)' : oct === 0 ? 'STD (0)' : 'HIGH (+1)'}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-amber-400 font-mono">
                  Active Note: <strong>{selectedBassNote}</strong> (Click pads below to pick pitch, then click steps)
                </span>
              </div>
            )}

            <span className="text-[10px] font-mono text-zinc-400">
              16-STEP GROOVE MATRIX
            </span>
          </div>

          {/* 16-STEP SEQUENCER BUTTONS */}
          <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-1.5">
            {Array.from({ length: 16 }).map((_, stepIdx) => {
              const isCurrent = currentStep === stepIdx;
              const isBeatStart = stepIdx % 4 === 0;
              const isActive =
                activeTrack === 'DRUM'
                  ? currentPattern.drums[selectedDrumVoice]?.[stepIdx] === 1
                  : Boolean(currentPattern.bass[stepIdx]);

              const bassLabel =
                activeTrack === 'BASS' && currentPattern.bass[stepIdx]
                  ? currentPattern.bass[stepIdx].replace(/[0-9]/g, '')
                  : null;

              return (
                <button
                  key={stepIdx}
                  onClick={() => toggleStep(stepIdx)}
                  className={`relative h-10 sm:h-12 lg:h-14 rounded-lg flex flex-col items-center justify-between p-1 border sm:p-1.5 border transition cursor-pointer ${
                    isActive
                      ? activeTrack === 'DRUM'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-orange-500/25 border-orange-400 text-orange-300'
                      : isBeatStart
                      ? 'bg-zinc-900 border-zinc-600 text-zinc-400 hover:border-zinc-500'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                  } ${isCurrent ? 'ring-2 ring-white scale-[1.03]' : ''}`}
                >
                  {/* Step LED */}
                  <span
                    className={`w-2 h-2 rounded-full transition-all ${
                      isCurrent
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : isActive
                        ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                        : 'bg-zinc-700'
                    }`}
                  />

                  {/* Bass Note Badge if in Bass Mode */}
                  {bassLabel && (
                    <span className="text-[9px] font-mono font-black leading-none text-orange-300">
                      {bassLabel}
                    </span>
                  )}

                  {/* Step Number */}
                  <span className="text-[8px] sm:text-[9px] font-mono font-bold opacity-80">
                    {stepIdx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            LOWER DECK: TRANSPORT CONTROLS + 13 RUBBERIZED CHROMATIC PADS
           ===================================================================== */}
        <div className="relative grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4 items-stretch">
          {/* TRANSPORT SECTION (Left 4 cols) */}
          <div className="lg:col-span-4 bg-zinc-400/50 rounded-2xl p-2.5 sm:p-3.5 border border-zinc-500/40 shadow-inner flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-800">
                Transport &amp; Sync
              </span>
              <span className="text-[9px] font-mono font-bold text-zinc-700">
                [SPACE = PLAY]
              </span>
            </div>

            {/* Play / Stop / Rec / Tap Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* PLAY / STOP */}
              <button
                onClick={() => {
                  if (!audioUnlocked) handleUnlockAudio();
                  setIsPlaying((p) => !p);
                }}
                className={`py-3.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 transition cursor-pointer border ${
                  isPlaying
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border-zinc-900'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-4 h-4 fill-current" /> STOP
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> PLAY
                  </>
                )}
              </button>

              {/* REALTIME REC */}
              <button
                onClick={() => {
                  if (!audioUnlocked) handleUnlockAudio();
                  setIsRecording((r) => !r);
                  if (!isPlaying && !isRecording) {
                    setIsPlaying(true);
                  }
                }}
                className={`py-3.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 transition cursor-pointer border ${
                  isRecording
                    ? 'bg-red-600 text-white border-red-300 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-red-400 border-zinc-900'
                }`}
              >
                <Circle className="w-4 h-4 fill-current" /> REC
              </button>

              {/* TAP TEMPO */}
              <button
                onClick={handleTapTempo}
                className="col-span-2 py-2.5 px-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:translate-y-0.5 text-amber-300 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_3px_0_rgba(0,0,0,0.4)] border border-zinc-800 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" /> TAP TEMPO
              </button>
            </div>

            {/* Preset Quick-Load Pills */}
            {/* Preset Import / Export Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportPreset}
                title="Export Current Pattern (.json)"
                className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase bg-zinc-700 hover:bg-zinc-600 text-amber-400 border border-zinc-900 rounded shadow active:translate-y-0.5"
              >
                SAVE JSON
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Load Pattern from File (.json)"
                className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase bg-zinc-700 hover:bg-zinc-600 text-emerald-400 border border-zinc-900 rounded shadow active:translate-y-0.5"
              >
                LOAD JSON
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportPreset}
                className="hidden"
              />
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase text-zinc-700 mb-1">
                90s Groove Presets:
              </span>
              <div className="flex flex-wrap gap-1">
                {patterns.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => selectPattern(idx)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-black transition cursor-pointer ${
                      patternIndex === idx
                        ? 'bg-zinc-900 text-amber-400 shadow'
                        : 'bg-zinc-300/80 text-zinc-800 hover:bg-zinc-200'
                    }`}
                  >
                    {p.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 13 RUBBERIZED CHROMATIC TRIGGER PADS (Right 8 cols) */}
          <div className="lg:col-span-8 bg-zinc-900 rounded-2xl p-2.5 sm:p-3.5 lg:p-4 shadow-[inset_0_3px_10px_rgba(0,0,0,0.9)] border-2 border-zinc-700 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-500" />
                Dynamic Velocity Pads ({activeTrack === 'DRUM' ? 'Drum Kit' : 'Bass Chromatic C–C'})
              </span>
              <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                KEYS: A W S E D F T G Y H U J K
              </span>
            </div>

            {/* Top Row: 5 Sharp/Black-Key Pads (C#, D#, F#, G#, A#) */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 mb-2.5 px-1 sm:px-3 lg:px-8">
              {PAD_CONFIG.filter((p) => p.isBlack).map((pad) => {
                const isLit = activePads[pad.id];
                const isSelectedBass =
                  activeTrack === 'BASS' && selectedBassNote === pad.fullNote;
                return (
                  <button
                    key={pad.id}
                    onMouseDown={() => triggerPad(pad)}
                    className={`group relative h-12 sm:h-14 lg:h-16 rounded-xl flex flex-col items-center justify-between p-1.5 sm:p-2 transition-all duration-75 cursor-pointer border-2 ${
                      isLit
                        ? 'bg-gradient-to-b from-amber-400 to-orange-500 border-amber-200 translate-y-0.5 shadow-[0_0_20px_rgba(245,158,11,0.8)]'
                        : isSelectedBass
                        ? 'bg-gradient-to-b from-zinc-700 to-zinc-800 border-orange-500 shadow-[0_4px_0_#09090b]'
                        : 'bg-gradient-to-b from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border-zinc-600 shadow-[0_4px_0_#09090b]'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isLit
                            ? 'bg-white shadow-[0_0_8px_#fff]'
                            : 'bg-red-500/70'
                        }`}
                      />
                      <span
                        className={`text-[9px] font-mono font-bold px-1 rounded ${
                          isLit ? 'text-zinc-950' : 'text-zinc-400'
                        }`}
                      >
                        {pad.keyHint}
                      </span>
                    </div>

                    <div className="text-center leading-tight">
                      <div
                        className={`text-[8px] sm:text-[10px] lg:text-xs font-black tracking-tight truncate ${
                          isLit ? 'text-zinc-950' : 'text-zinc-100'
                        }`}
                      >
                        {activeTrack === 'DRUM' ? pad.drumName : pad.fullNote}
                      </div>
                      <div
                        className={`text-[8px] font-mono ${
                          isLit ? 'text-zinc-900' : 'text-zinc-400'
                        }`}
                      >
                        {activeTrack === 'DRUM' ? pad.note : pad.drumName}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Row: 8 Natural/White-Key Pads (C, D, E, F, G, A, B, C+) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {PAD_CONFIG.filter((p) => !p.isBlack).map((pad) => {
                const isLit = activePads[pad.id];
                const isSelectedBass =
                  activeTrack === 'BASS' && selectedBassNote === pad.fullNote;
                return (
                  <button
                    key={pad.id}
                    onMouseDown={() => triggerPad(pad)}
                    className={`group relative h-14 sm:h-16 lg:h-20 rounded-xl flex flex-col items-center justify-between p-1.5 sm:p-2 transition-all duration-75 cursor-pointer border-2 ${
                      isLit
                        ? 'bg-gradient-to-b from-amber-300 to-orange-500 border-white translate-y-0.5 shadow-[0_0_22px_rgba(251,191,36,0.85)]'
                        : isSelectedBass
                        ? 'bg-gradient-to-b from-zinc-500 to-zinc-600 border-orange-400 shadow-[0_4px_0_#09090b]'
                        : 'bg-gradient-to-b from-zinc-500 to-zinc-600 hover:from-zinc-400 hover:to-zinc-500 border-zinc-400/60 shadow-[0_4px_0_#09090b]'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isLit
                            ? 'bg-white shadow-[0_0_8px_#fff]'
                            : 'bg-amber-400/80'
                        }`}
                      />
                      <span
                        className={`text-[9px] font-mono font-bold px-1 rounded ${
                          isLit ? 'text-zinc-950' : 'text-zinc-900/80 bg-white/25'
                        }`}
                      >
                        {pad.keyHint}
                      </span>
                    </div>

                    <div className="text-center leading-tight w-full">
                      <div
                        className={`text-[8px] sm:text-[10px] lg:text-[11px] font-black tracking-tight truncate ${
                          isLit ? 'text-zinc-950' : 'text-zinc-950'
                        }`}
                      >
                        {activeTrack === 'DRUM' ? pad.drumName : pad.fullNote}
                      </div>
                      <div
                        className={`text-[8px] font-mono font-bold truncate ${
                          isLit ? 'text-zinc-900' : 'text-zinc-800'
                        }`}
                      >
                        {activeTrack === 'DRUM' ? pad.note : pad.drumName}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Quick Guide */}
      <div className="mt-4 text-center text-[11px] text-zinc-500 max-w-2xl">
        Tip: Drag the <strong className="text-zinc-300">Cutoff</strong>,{' '}
        <strong className="text-zinc-300">Resonance</strong>, and{' '}
        <strong className="text-zinc-300">Decay</strong> knobs vertically during playback for real-time 90s filter sweeps, or switch between <strong className="text-zinc-300">Drums</strong> and <strong className="text-zinc-300">Bass Synth</strong> to program your own grooves.
      </div>
    </div>
  );
}
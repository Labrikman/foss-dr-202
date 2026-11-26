// --- CONSTANTS & MUSICAL DATA ---
import { DR202_100_PRESETS } from "./presets/presetsBank";

export const NOTE_FREQS = {
  C1: 32.7,
  "C#1": 34.65,
  D1: 36.71,
  "D#1": 38.89,
  E1: 41.2,
  F1: 43.65,
  "F#1": 46.25,
  G1: 49.0,
  "G#1": 51.91,
  A1: 55.0,
  "A#1": 58.27,
  B1: 61.74,
  C2: 65.41,
  "C#2": 69.3,
  D2: 73.42,
  "D#2": 77.78,
  E2: 82.41,
  F2: 87.31,
  "F#2": 92.5,
  G2: 98.0,
  "G#2": 103.83,
  A2: 110.0,
  "A#2": 116.54,
  B2: 123.47,
  C3: 130.81,
};

// 13-Pad Chromatic Layout (C to C) matching DR-202 lower/upper pad layout
export const PAD_CONFIG = [
  {
    id: 0,
    note: "C",
    fullNote: "C2",
    isBlack: false,
    keyHint: "A",
    drumName: "KICK 1",
    drumId: "kick",
    color: "amber",
  },
  {
    id: 1,
    note: "C#",
    fullNote: "C#2",
    isBlack: true,
    keyHint: "W",
    drumName: "RIMSHOT",
    drumId: "rim",
    color: "red",
  },
  {
    id: 2,
    note: "D",
    fullNote: "D2",
    isBlack: false,
    keyHint: "S",
    drumName: "SNARE 1",
    drumId: "snare",
    color: "amber",
  },
  {
    id: 3,
    note: "D#",
    fullNote: "D#2",
    isBlack: true,
    keyHint: "E",
    drumName: "CLAP",
    drumId: "clap",
    color: "red",
  },
  {
    id: 4,
    note: "E",
    fullNote: "E2",
    isBlack: false,
    keyHint: "D",
    drumName: "SNARE 2",
    drumId: "snare2",
    color: "amber",
  },
  {
    id: 5,
    note: "F",
    fullNote: "F2",
    isBlack: false,
    keyHint: "F",
    drumName: "LOW TOM",
    drumId: "tomLow",
    color: "amber",
  },
  {
    id: 6,
    note: "F#",
    fullNote: "F#2",
    isBlack: true,
    keyHint: "T",
    drumName: "CL HAT",
    drumId: "chh",
    color: "red",
  },
  {
    id: 7,
    note: "G",
    fullNote: "G2",
    isBlack: false,
    keyHint: "G",
    drumName: "MID TOM",
    drumId: "tomMid",
    color: "amber",
  },
  {
    id: 8,
    note: "G#",
    fullNote: "G#2",
    isBlack: true,
    keyHint: "Y",
    drumName: "PDL HAT",
    drumId: "phh",
    color: "red",
  },
  {
    id: 9,
    note: "A",
    fullNote: "A2",
    isBlack: false,
    keyHint: "H",
    drumName: "HI TOM",
    drumId: "tomHi",
    color: "amber",
  },
  {
    id: 10,
    note: "A#",
    fullNote: "A#2",
    isBlack: true,
    keyHint: "U",
    drumName: "OP HAT",
    drumId: "ohh",
    color: "red",
  },
  {
    id: 11,
    note: "B",
    fullNote: "B2",
    isBlack: false,
    keyHint: "J",
    drumName: "CRASH",
    drumId: "crash",
    color: "amber",
  },
  {
    id: 12,
    note: "C+",
    fullNote: "C3",
    isBlack: false,
    keyHint: "K",
    drumName: "PERC / FX",
    drumId: "perc",
    color: "amber",
  },
];

export const PAD_BY_DRUM_ID = new Map(
  PAD_CONFIG.filter((pad) => pad.drumId).map((pad) => [pad.drumId, pad]),
);

export const PAD_BY_FULL_NOTE = new Map(
  PAD_CONFIG.filter((pad) => pad.fullNote).map((pad) => [pad.fullNote, pad]),
);

export const DRUM_VOICES = [
  { id: "kick", label: "KICK", group: "KICK" },
  { id: "snare", label: "SNARE", group: "SNARE" },
  { id: "clap", label: "CLAP", group: "SNARE" },
  { id: "rim", label: "RIM", group: "SNARE" },
  { id: "chh", label: "CL HAT", group: "HATS" },
  { id: "ohh", label: "OP HAT", group: "HATS" },
  { id: "tomLow", label: "TOM", group: "PERC" },
  { id: "perc", label: "PERC", group: "PERC" },
];

export const normalizePreset = (preset, index) => {
  const rawSteps = preset.steps || {};
  const empty16 = () => Array(16).fill(0);

  return {
    id: preset.id || String(index + 1).padStart(2, "0"),
    name: preset.name || `Pattern ${index + 1}`,
    genre: preset.genre || "Preset",
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
    bass:
      preset.bass ||
      (rawSteps.bass || empty16()).map((value) => (value ? "C2" : null)),
  };
};

export const PRESET_PATTERNS = DR202_100_PRESETS.map(normalizePreset);

// --- CONTRÔLEUR UNIVERSEL (MIDI / LPD8 + CLAVIER + MANETTE GAMEPAD) ---
export const CONTROLLER_STORAGE_KEY = 'dr202_controller_bindings_v1';

export const CONTROL_TARGETS = [
    { id: 'slot_0', label: 'Bank Slot 1', type: 'trigger' },
    { id: 'slot_1', label: 'Bank Slot 2', type: 'trigger' },
    { id: 'slot_2', label: 'Bank Slot 3', type: 'trigger' },
    { id: 'slot_3', label: 'Bank Slot 4', type: 'trigger' },
    { id: 'slot_4', label: 'Bank Slot 5', type: 'trigger' },
    { id: 'slot_5', label: 'Bank Slot 6', type: 'trigger' },
    { id: 'slot_6', label: 'Bank Slot 7', type: 'trigger' },
    { id: 'slot_7', label: 'Bank Slot 8', type: 'trigger' },
    { id: 'cutoff', label: 'Potard Cutoff', type: 'axis' },
    { id: 'resonance', label: 'Potard Resonance', type: 'axis' },
    { id: 'decay', label: 'Potard Decay', type: 'axis' },
    { id: 'drumPan', label: 'Potard Drum Pan', type: 'axis' },
    { id: 'bassPan', label: 'Potard Bass Pan', type: 'axis' },
    { id: 'masterVol', label: 'Potard Volume', type: 'axis' },
    { id: 'bpm', label: 'Potard BPM', type: 'axis' },
    { id: 'swing', label: 'Potard Swing', type: 'axis' },
    { id: 'bitcrusherAmount', label: 'Potard Bitcrush', type: 'axis' },
  ];

  // Bindings par défaut : Pads LPD8 -> Slots 1..8, CC LPD8 -> Potards, Manette -> Slots/Axes
export const DEFAULT_BINDINGS = {
    slot_0: ['midi:note:49', 'gamepad:btn:0'],
    slot_1: ['midi:note:55', 'gamepad:btn:1'],
    slot_2: ['midi:note:51', 'gamepad:btn:2'],
    slot_3: ['midi:note:53', 'gamepad:btn:3'],
    slot_4: ['midi:note:48', 'gamepad:btn:4'],
    slot_5: ['midi:note:47', 'gamepad:btn:5'],
    slot_6: ['midi:note:45', 'gamepad:btn:6'],
    slot_7: ['midi:note:43', 'gamepad:btn:7'],
    cutoff: ['midi:cc:1', 'gamepad:axis:0'],
    resonance: ['midi:cc:2', 'gamepad:axis:1'],
    decay: ['midi:cc:3'],
    drumPan: ['midi:cc:4'],
    bassPan: ['midi:cc:5'],
    bitcrusherAmount: ['midi:cc:6'],
    bpm: ['midi:cc:7'],
    swing: ['midi:cc:8'],
    masterVol: [],
  };

export const KIT_FLAVORS = [
  "dr202",
  "tr808",
  "tr909",
  "electro",
  "lofi",
  "dub",
  "industrial",
];

export const DRUM_KITS = [
  { id: "dr202", label: "DR-202 Groove", mapping: { KICK: "dr202", SNARE: "dr202", HATS: "dr202", PERC: "dr202" } },
  { id: "tr808", label: "TR-808 Sub",    mapping: { KICK: "tr808", SNARE: "tr808", HATS: "tr808", PERC: "tr808" } },
  { id: "tr909", label: "TR-909 Club",   mapping: { KICK: "tr909", SNARE: "tr909", HATS: "tr909", PERC: "tr909" } },
  { id: "electro", label: "Electro FM",  mapping: { KICK: "electro", SNARE: "electro", HATS: "electro", PERC: "electro" } },
  { id: "lofi", label: "90s Break/LoFi", mapping: { KICK: "lofi", SNARE: "lofi", HATS: "lofi", PERC: "lofi" } },
  { id: "dub", label: "Dub Sub",        mapping: { KICK: "dub", SNARE: "dub", HATS: "dub", PERC: "dub" } },
  { id: "industrial", label: "Industrial", mapping: { KICK: "industrial", SNARE: "industrial", HATS: "industrial", PERC: "industrial" } },
];
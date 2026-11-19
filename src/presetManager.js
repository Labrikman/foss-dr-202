// src/presetManager.js

/**
 * Triggers a browser download of a single pattern or all user patterns as a .json file.
 */
export function exportPresetToFile(patternData, filename = 'dr202-preset.json') {
  const payload = {
    device: 'BOSS DR-202 Dr. Groove Emulator',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: patternData,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Reads an uploaded .json file, validates its DR-202 structure, and resolves with the pattern data.
 */
export function importPresetFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        // Support both wrapped exports ({ device, data }) and raw pattern objects
        const pattern = parsed.data || parsed;

        // Basic validation to ensure it's a valid DR-202 pattern
        if (
          typeof pattern !== 'object' ||
          !pattern.steps ||
          typeof pattern.bpm !== 'number'
        ) {
          throw new Error('Invalid DR-202 preset file structure.');
        }

        resolve(pattern);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read the preset file.'));
    reader.readAsText(file);
  });
}

// src/presetManager.js (à ajouter à la suite de vos fonctions existantes)

const STORAGE_KEY = 'dr202_user_presets_v1';

/**
 * Récupère la liste des presets sauvegardés dans le localStorage.
 */
export function getSavedUserPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erreur de lecture localStorage:', e);
    return [];
  }
}

/**
 * Sauvegarde un preset dans le localStorage (ajoute ou met à jour par ID/nom).
 */
export function saveUserPresetToStorage(patternData, customName) {
  const existing = getSavedUserPresets();
  const entry = {
    ...JSON.parse(JSON.stringify(patternData)),
    uid: `usr_${Date.now()}`,
    name: (customName || patternData.name || 'User Groove').trim(),
    savedAt: new Date().toISOString(),
  };

  const updated = [entry, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Supprime un preset personnel du localStorage via son uid.
 */
export function deleteUserPresetFromStorage(uid) {
  const existing = getSavedUserPresets();
  const updated = existing.filter((item) => item.uid !== uid);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Exporte toute la banque personnelle en un seul fichier .json téléchargeable.
 */
export function exportAllUserPresetsToFile() {
  const all = getSavedUserPresets();
  exportPresetToFile(all, `dr202-my-store-${all.length}-presets.json`);
}
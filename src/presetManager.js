/**
 * Triggers a browser download of a single pattern or all user patterns as a .json file.
 */
export function exportPresetToFile(patternData, filename = 'dr202-preset.json') {
  const payload = {
    device: 'FOSS DR-202 Dr. Groove Emulator',
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


const STORAGE_KEY = 'dr202_user_presets_v1';

/**
 * Retrieves the list of user presets saved in localStorage.
 */
export function getSavedUserPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading user presets from localStorage:', e);
    return [];
  }
}

/**
 * Saves a user preset to the localStorage (adds or updates by ID/name).
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
 * Deletes a user preset from the localStorage via its uid.
 */
export function deleteUserPresetFromStorage(uid) {
  const existing = getSavedUserPresets();
  const updated = existing.filter((item) => item.uid !== uid);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Export all user presets to a single downloadable .json file.
 */
export function exportAllUserPresetsToFile() {
  const all = getSavedUserPresets();
  exportPresetToFile(all, `dr202-my-store-${all.length}-presets.json`);
}

// src/presetManager.js (à ajouter à la suite)

const BANK_STORAGE_KEY = 'dr202_user_banks_v1';

/**
 * get list of 8 Bank Slots ssave in localStorage.
 */
export function getSavedUserBanks() {
  try {
    const raw = localStorage.getItem(BANK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading banks from localStorage:', e);
    return [];
  }
}

/**
 * Saves Bank Slots to the localStorage.
 */
export function saveUserBankToStorage(bankSlotsArray, customName) {
  const existing = getSavedUserBanks();
  const entry = {
    uid: `bank_${Date.now()}`,
    name: (customName || `Bank Set #${existing.length + 1}`).trim(),
    slots: [...bankSlotsArray],
    savedAt: new Date().toISOString(),
  };

  const updated = [entry, ...existing];
  localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Deletes Bank Slots via their uid.
 */
export function deleteUserBankFromStorage(uid) {
  const existing = getSavedUserBanks();
  const updated = existing.filter((item) => item.uid !== uid);
  localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Exporte une configuration de Bank Slots en incluant l'instantané
 * des presets assignés aux 8 slots pour éviter toute désynchronisation.
 */
export function exportBankToFile(
  bankEntry,
  patternsList = [],
  filename = 'dr202-bank-slots.json'
) {
  const slots = Array.isArray(bankEntry.slots) ? bankEntry.slots : [];
  const embeddedPresets = {};

  slots.forEach((presetIdx, slotIdx) => {
    const pat = patternsList[presetIdx];
    if (pat) {
      embeddedPresets[slotIdx] = JSON.parse(JSON.stringify(pat));
    }
  });

  const payload = {
    device: 'BOSS DR-202 Dr. Groove Emulator',
    type: 'bank_slots',
    version: '1.1',
    exportedAt: new Date().toISOString(),
    data: {
      uid: bankEntry.uid || `bank_${Date.now()}`,
      name: bankEntry.name || 'Custom Bank',
      slots: [...slots],
      embeddedPresets,
    },
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
 * Importe un fichier .json de Bank Slots et retourne les slots + presets embarqués.
 */
export function importBankFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Aucun fichier sélectionné.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const bankData = parsed.data || parsed;
        const slots = Array.isArray(bankData) ? bankData : bankData.slots;

        if (!Array.isArray(slots) || slots.length !== 8) {
          throw new Error('Format de Bank Slots invalide (8 slots attendus).');
        }

        resolve({
          name: bankData.name || 'Imported Bank',
          slots: slots.map((n) => (typeof n === 'number' ? n : 0)),
          embeddedPresets: bankData.embeddedPresets || {},
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    reader.readAsText(file);
  });
}
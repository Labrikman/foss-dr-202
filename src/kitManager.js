const KIT_STORE_KEY = "dr202_custom_kits_v1";

export const ALL_LANE_IDS = [
  "kick",
  "snare",
  "snare2",
  "clap",
  "rim",
  "chh",
  "phh",
  "ohh",
  "tomLow",
  "tomMid",
  "tomHi",
  "crash",
  "perc",
];

export const createDefaultLaneConfig = (synthType = "dr202") => ({
  synthType,
  useSample: false,
  sampleName: "",
  sampleDataUrl: "", // Data URL (base64) pour sauvegarde/export portable
  pitch: 0,          // -24 à +24 demi-tons
  gain: 100,         // 0 à 150 %
  trimStart: 0,      // 0 à 90 % du début du sample
});

export function buildDefaultKitLanes(synthType = "dr202") {
  const lanes = {};
  ALL_LANE_IDS.forEach((id) => {
    lanes[id] = createDefaultLaneConfig(synthType);
  });
  return lanes;
}

export function getSavedCustomKits() {
  try {
    const raw = JSON.parse(localStorage.getItem(KIT_STORE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveCustomKitToStorage(kitPayload, name) {
  const existing = getSavedCustomKits();
  const uid = `kit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const entry = {
    uid,
    name: (name || kitPayload.name || "Custom Kit").trim(),
    updatedAt: new Date().toISOString(),
    lanes: kitPayload.lanes,
  };
  const updated = [entry, ...existing];
  try {
    localStorage.setItem(KIT_STORE_KEY, JSON.stringify(updated));
  } catch (err) {
    alert(
      "Espace localStorage saturé (samples trop longs). Exportez le kit en .json pour le conserver."
    );
    console.error(err);
  }
  return updated;
}

export function deleteCustomKitFromStorage(uid) {
  const updated = getSavedCustomKits().filter((k) => k.uid !== uid);
  localStorage.setItem(KIT_STORE_KEY, JSON.stringify(updated));
  return updated;
}

export function exportKitToFile(kitPayload, filename = "dr202-kit.json") {
  const data = {
    format: "FOSS-DR202-KIT-V1",
    exportedAt: new Date().toISOString(),
    name: kitPayload.name || "Custom Kit",
    lanes: kitPayload.lanes,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importKitFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const srcLanes = parsed.lanes || parsed.data?.lanes;
        if (!srcLanes || typeof srcLanes !== "object") {
          throw new Error("Format de fichier Kit invalide.");
        }
        const normalizedLanes = buildDefaultKitLanes("dr202");
        ALL_LANE_IDS.forEach((laneId) => {
          if (srcLanes[laneId]) {
            normalizedLanes[laneId] = {
              ...createDefaultLaneConfig("dr202"),
              ...srcLanes[laneId],
            };
          }
        });
        resolve({
          name: parsed.name || file.name.replace(/\.json$/i, ""),
          lanes: normalizedLanes,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsText(file);
  });
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
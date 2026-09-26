import type { Settings } from "../types";

const KEY = "hanguk.settings";

export const DEFAULT_MODEL = "claude-sonnet-5";

export const MODELS = [
  { id: "claude-sonnet-5", label: "Sonnet 5 (nhanh, rẻ)" },
  { id: "claude-opus-5", label: "Opus 5 (tốt hơn, đắt hơn)" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5 (rẻ nhất)" },
];

export function defaultSettings(): Settings {
  return {
    apiKey: "",
    model: DEFAULT_MODEL,
    ttsRate: 1,
    field:
      "computational fluid dynamics, multiphase flow, chemical engineering; teaches and does research at a Korean university",
    levels: { listen: 3, speak: 3, read: 3, write: 3 },
    history: { listen: [], speak: [], read: [], write: [] },
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(): Settings {
  const d = defaultSettings();
  const raw = storage()?.getItem(KEY);
  if (!raw) return d;
  try {
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      ...d,
      ...p,
      levels: { ...d.levels, ...(p.levels ?? {}) },
      history: { ...d.history, ...(p.history ?? {}) },
    };
  } catch {
    return d;
  }
}

export function saveSettings(s: Settings): void {
  storage()?.setItem(KEY, JSON.stringify(s));
}

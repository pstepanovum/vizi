import { File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';

// Small persisted user preferences store (JSON file in the app's documents).

export type AppSettings = {
  haptics: boolean;
  ambientNarration: boolean;
};

const DEFAULTS: AppSettings = {
  haptics: true,
  ambientNarration: true,
};

let current: AppSettings = { ...DEFAULTS };
let loaded = false;
const listeners = new Set<() => void>();

function settingsFile(): File {
  return new File(Paths.document, 'vizi-settings.json');
}

export function getSettings(): AppSettings {
  if (!loaded) {
    loaded = true;
    try {
      const file = settingsFile();
      if (file.exists) {
        current = { ...DEFAULTS, ...(JSON.parse(file.textSync()) as Partial<AppSettings>) };
      }
    } catch (error) {
      console.warn('[vizi:settings] failed to load, using defaults:', error);
    }
  }
  return current;
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  current = { ...getSettings(), [key]: value };
  console.log(`[vizi:settings] ${key} = ${value}`);
  listeners.forEach((listener) => listener());
  try {
    settingsFile().write(JSON.stringify(current));
  } catch (error) {
    console.warn('[vizi:settings] failed to persist:', error);
  }
}

export function useSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  useEffect(() => {
    const listener = () => setSettings({ ...current });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return settings;
}

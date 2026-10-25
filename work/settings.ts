export const SettingsSchemaVersion = 1;

export interface Settings {
  schemaVersion: number;
  dasMs: number;
  arrMs: number;
  touchSensitivity: number;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  showGhostPiece: boolean;
  showGrid: boolean;
  vibrationEnabled: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  language: string;
}

export function defaultSettings(): Settings {
  return {
    schemaVersion: SettingsSchemaVersion,
    dasMs: 150,
    arrMs: 33,
    touchSensitivity: 1.0,
    masterVolume: 0.8,
    sfxVolume: 1.0,
    musicVolume: 0.7,
    showGhostPiece: true,
    showGrid: true,
    vibrationEnabled: true,
    reduceMotion: false,
    highContrast: false,
    language: 'en',
  };
}

export function migrateSettings(oldVersion: number, oldSettings: Partial<Settings>): Settings {
  const base = defaultSettings();
  if (oldVersion >= 1) {
    return {
      ...base,
      ...oldSettings,
      schemaVersion: SettingsSchemaVersion,
    };
  }
  return base;
}

export function validateSettings(settings: unknown): settings is Settings {
  if (!settings || typeof settings !== 'object') return false;
  const s = settings as Record<string, unknown>;

  if (s.schemaVersion !== SettingsSchemaVersion) return false;
  if (typeof s.dasMs !== 'number' || s.dasMs < 0 || s.dasMs > 1000) return false;
  if (typeof s.arrMs !== 'number' || s.arrMs < 0 || s.arrMs > 100) return false;
  if (typeof s.touchSensitivity !== 'number' || s.touchSensitivity < 0.1 || s.touchSensitivity > 3.0) return false;
  if (typeof s.masterVolume !== 'number' || s.masterVolume < 0 || s.masterVolume > 1) return false;
  if (typeof s.sfxVolume !== 'number' || s.sfxVolume < 0 || s.sfxVolume > 1) return false;
  if (typeof s.musicVolume !== 'number' || s.musicVolume < 0 || s.musicVolume > 1) return false;
  if (typeof s.showGhostPiece !== 'boolean') return false;
  if (typeof s.showGrid !== 'boolean') return false;
  if (typeof s.vibrationEnabled !== 'boolean') return false;
  if (typeof s.reduceMotion !== 'boolean') return false;
  if (typeof s.highContrast !== 'boolean') return false;
  if (typeof s.language !== 'string' || s.language.length === 0) return false;

  return true;
}
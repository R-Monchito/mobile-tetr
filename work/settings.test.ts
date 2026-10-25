import { SettingsSchemaVersion, defaultSettings, migrateSettings, validateSettings, type Settings } from './settings.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, got ${actual}`);
}

function runTests() {
  console.log('Running settings tests...');

  // Test defaultSettings
  const defaults = defaultSettings();
  assert(defaults.schemaVersion === SettingsSchemaVersion, 'default schema version');
  assert(defaults.dasMs === 150, 'default dasMs');
  assert(defaults.arrMs === 33, 'default arrMs');
  assert(defaults.touchSensitivity === 1.0, 'default touchSensitivity');
  assert(defaults.masterVolume === 0.8, 'default masterVolume');
  assert(defaults.sfxVolume === 1.0, 'default sfxVolume');
  assert(defaults.musicVolume === 0.7, 'default musicVolume');
  assert(defaults.showGhostPiece === true, 'default showGhostPiece');
  assert(defaults.showGrid === true, 'default showGrid');
  assert(defaults.vibrationEnabled === true, 'default vibrationEnabled');
  assert(defaults.reduceMotion === false, 'default reduceMotion');
  assert(defaults.highContrast === false, 'default highContrast');
  assert(defaults.language === 'en', 'default language');
  console.log('  defaultSettings: OK');

  // Test validateSettings with valid settings
  assert(validateSettings(defaults), 'validateSettings accepts valid defaults');
  console.log('  validateSettings valid: OK');

  // Test validateSettings rejects invalid
  assert(!validateSettings(null), 'rejects null');
  assert(!validateSettings(undefined), 'rejects undefined');
  assert(!validateSettings({}), 'rejects empty object');
  assert(!validateSettings({ ...defaults, schemaVersion: 999 }), 'rejects wrong schema version');
  assert(!validateSettings({ ...defaults, dasMs: -1 }), 'rejects negative dasMs');
  assert(!validateSettings({ ...defaults, dasMs: 1001 }), 'rejects dasMs > 1000');
  assert(!validateSettings({ ...defaults, arrMs: -1 }), 'rejects negative arrMs');
  assert(!validateSettings({ ...defaults, arrMs: 101 }), 'rejects arrMs > 100');
  assert(!validateSettings({ ...defaults, touchSensitivity: 0 }), 'rejects touchSensitivity < 0.1');
  assert(!validateSettings({ ...defaults, touchSensitivity: 3.1 }), 'rejects touchSensitivity > 3.0');
  assert(!validateSettings({ ...defaults, masterVolume: -0.1 }), 'rejects masterVolume < 0');
  assert(!validateSettings({ ...defaults, masterVolume: 1.1 }), 'rejects masterVolume > 1');
  assert(!validateSettings({ ...defaults, sfxVolume: -0.1 }), 'rejects sfxVolume < 0');
  assert(!validateSettings({ ...defaults, sfxVolume: 1.1 }), 'rejects sfxVolume > 1');
  assert(!validateSettings({ ...defaults, musicVolume: -0.1 }), 'rejects musicVolume < 0');
  assert(!validateSettings({ ...defaults, musicVolume: 1.1 }), 'rejects musicVolume > 1');
  assert(!validateSettings({ ...defaults, showGhostPiece: 'true' }), 'rejects non-boolean showGhostPiece');
  assert(!validateSettings({ ...defaults, showGrid: 'true' }), 'rejects non-boolean showGrid');
  assert(!validateSettings({ ...defaults, vibrationEnabled: 'true' }), 'rejects non-boolean vibrationEnabled');
  assert(!validateSettings({ ...defaults, reduceMotion: 'true' }), 'rejects non-boolean reduceMotion');
  assert(!validateSettings({ ...defaults, highContrast: 'true' }), 'rejects non-boolean highContrast');
  assert(!validateSettings({ ...defaults, language: '' }), 'rejects empty language');
  assert(!validateSettings({ ...defaults, language: 123 }), 'rejects non-string language');
  console.log('  validateSettings invalid: OK');

  // Test migrateSettings from version 0 (pre-v1)
  const migratedFromZero = migrateSettings(0, {});
  assertEqual(migratedFromZero.schemaVersion, SettingsSchemaVersion, 'migrate from v0 sets schema version');
  assertEqual(migratedFromZero.dasMs, 150, 'migrate from v0 uses default dasMs');
  console.log('  migrateSettings from v0: OK');

  // Test migrateSettings from version 1 preserves values
  const v1Settings: Partial<Settings> = {
    dasMs: 200,
    arrMs: 50,
    touchSensitivity: 1.5,
    masterVolume: 0.5,
    language: 'es',
  };
  const migratedFromOne = migrateSettings(1, v1Settings);
  assertEqual(migratedFromOne.schemaVersion, SettingsSchemaVersion, 'migrate from v1 sets schema version');
  assertEqual(migratedFromOne.dasMs, 200, 'migrate from v1 preserves dasMs');
  assertEqual(migratedFromOne.arrMs, 50, 'migrate from v1 preserves arrMs');
  assertEqual(migratedFromOne.touchSensitivity, 1.5, 'migrate from v1 preserves touchSensitivity');
  assertEqual(migratedFromOne.masterVolume, 0.5, 'migrate from v1 preserves masterVolume');
  assertEqual(migratedFromOne.language, 'es', 'migrate from v1 preserves language');
  // Unspecified fields get defaults
  assertEqual(migratedFromOne.sfxVolume, 1.0, 'migrate from v1 defaults unspecified sfxVolume');
  assertEqual(migratedFromOne.musicVolume, 0.7, 'migrate from v1 defaults unspecified musicVolume');
  console.log('  migrateSettings from v1: OK');

  // Test SettingsSchemaVersion constant
  assertEqual(SettingsSchemaVersion, 1, 'SettingsSchemaVersion is 1');
  console.log('  SettingsSchemaVersion: OK');

  console.log('\nAll settings tests passed!');
}

runTests();
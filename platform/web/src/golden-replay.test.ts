import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as core from 'tetrio-mobile-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Golden replay verification', () => {
  it('matches expected checksum aca04ded', () => {
    const wasmPath = path.resolve(__dirname, '../pkg/tetrio_mobile_core_bg.wasm');
    const wasmBytes = fs.readFileSync(wasmPath);
    const wasmModule = new WebAssembly.Module(wasmBytes);
    core.initSync({ module: wasmModule });
    const checksum = core.golden_replay_checksum();
    expect(checksum).toBe('aca04ded');
  });
});
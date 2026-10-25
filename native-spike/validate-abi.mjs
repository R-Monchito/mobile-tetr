import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const udl = readFileSync(resolve(here, "src", "tetrio_mobile.udl"), "utf8");
const rust = readFileSync(resolve(here, "src", "lib.rs"), "utf8");
const ts = readFileSync(resolve(root, "work", "engine.ts"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/^namespace tetrio_mobile_core\s*\{/.test(udl), "UDL namespace mismatch");
assert(/\}\s*;\s*$/.test(udl), "UDL namespace must end with `};`");
assert(!/\brecord\b/.test(udl), "UDL must use UniFFI dictionary declarations, not record");
assert((udl.match(/\{/g) ?? []).length === (udl.match(/\}/g) ?? []).length, "UDL braces are unbalanced");
assert(!udl.includes("void apply_command"), "apply_command must return EngineResult");

const enumValues = {
  CommandKind: ["move_left", "move_right", "soft_drop", "hard_drop", "rotate_cw", "rotate_ccw", "rotate_180", "hold", "tick"],
  PieceType: ["I", "J", "L", "O", "S", "T", "Z"],
  LastAction: ["spawn", "move", "rotate", "drop", "hold", "lock"],
  EngineEventKind: ["spawned", "moved", "rotated", "soft_dropped", "hard_dropped", "locked", "lines_cleared", "held", "game_over"],
  EngineError: ["invalid_board", "game_over", "invalid_command"],
};
for (const [name, values] of Object.entries(enumValues)) {
  const block = udl.match(new RegExp(`(?:enum)\\s+${name}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
  assert(block, `UDL enum missing: ${name}`);
  for (const value of values) assert(block.includes(`"${value}"`), `UDL enum ${name} missing ${value}`);
}

const fields = {
  EngineCommand: ["CommandKind kind;", "u32 delta_ms;"],
  BoardState: ["u16 width;", "u16 height;", "sequence<u8> cells;"],
  SnapshotContract: ["BoardState board;", "u64 score;", "u32 soft_drop_cells;", "LockDelayState lock_delay;"],
  EngineResult: ["SnapshotContract snapshot;", "sequence<EngineEvent> events;", "EngineError? error;"],
};
for (const [name, expectedFields] of Object.entries(fields)) {
  const block = udl.match(new RegExp(`(?:dictionary)\\s+${name}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
  assert(block, `UDL dictionary missing: ${name}`);
  for (const field of expectedFields) assert(block.includes(field), `UDL ${name} missing ${field}`);
}
assert(/EngineResult\s+apply_command\(EngineCommand command\);/.test(udl), "UDL command method mismatch");

for (const symbol of ["CommandKind", "EngineCommand", "PieceType", "BoardState", "SnapshotContract", "EngineResult", "EngineError"]) {
  assert(rust.includes(` ${symbol}`) || rust.includes(` ${symbol} {`), `Rust ABI symbol missing: ${symbol}`);
}
assert(rust.includes("network: false"), "Rust capability contract must remain offline-only");
assert(ts.includes('readonly deltaMs: number'), "TypeScript tick payload is missing");
for (const command of ["moveLeft", "moveRight", "softDrop", "hardDrop", "rotateCW", "rotateCCW", "rotate180", "hold", "tick"]) {
  assert(ts.includes(`type: \"${command}\"`), `TypeScript command missing: ${command}`);
}

console.log("native ABI/UDL contract: ok");
import { createInputAdapter, DEFAULT_SETTINGS, type InputSettings, type AdapterState } from "./input-adapter.ts";
import type { EngineCommand } from "./engine.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertEqual<T>(a: T, b: T, msg: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  }
}

function assertCommands(cmds: EngineCommand[], expected: EngineCommand[], msg: string) {
  assertEqual(cmds.map(c => c.type), expected.map(c => c.type), msg);
  for (let i = 0; i < expected.length; i++) {
    if (expected[i].type === "tick") {
      assert((cmds[i] as { type: "tick"; deltaMs: number }).deltaMs === (expected[i] as { type: "tick"; deltaMs: number }).deltaMs, `${msg} tick deltaMs`);
    }
  }
}

const testSettings: InputSettings = {
  dasMs: 100,
  arrMs: 50,
  softDropFactor: 20,
  tapThresholdMs: 180,
  tapMaxDistancePx: 12,
};

// Test 1: Tap -> rotateCW
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  const cmds = adapter.onTouchEnd(1, 100);
  assertCommands(cmds, [{ type: "rotateCW" }], "tap should emit rotateCW");
  console.log("Test 1 passed: tap -> rotateCW");
}

// Test 2: Tap with movement -> no rotateCW
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  adapter.onTouchMove(115, 100, 1, 50);
  const cmds = adapter.onTouchEnd(1, 100);
  assert(cmds.length === 0, "drag beyond threshold should not emit rotateCW");
  console.log("Test 2 passed: drag beyond threshold -> no rotateCW");
}

// Test 3: Tap too slow -> no rotateCW
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  const cmds = adapter.onTouchEnd(1, 200);
  assert(cmds.length === 0, "tap exceeding threshold should not emit rotateCW");
  console.log("Test 3 passed: slow tap -> no rotateCW");
}

// Test 4: Horizontal drag right -> moveRight
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  const cmds = adapter.onTouchMove(130, 100, 1, 50);
  assertCommands(cmds, [{ type: "moveRight" }], "right drag should emit moveRight");
  console.log("Test 4 passed: right drag -> moveRight");
}

// Test 5: Horizontal drag left -> moveLeft
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  const cmds = adapter.onTouchMove(70, 100, 1, 50);
  assertCommands(cmds, [{ type: "moveLeft" }], "left drag should emit moveLeft");
  console.log("Test 5 passed: left drag -> moveLeft");
}

// Test 6: DAS fires after dasMs
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  adapter.onTouchMove(130, 100, 1, 50);
  const cmds = adapter.update(110);
  assertCommands(cmds, [{ type: "moveRight" }], "DAS should fire after dasMs");
  console.log("Test 6 passed: DAS fires after dasMs");
}

// Test 7: ARR repeats after arrMs
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  adapter.onTouchMove(130, 100, 1, 50);
  adapter.update(110);
  const cmds = adapter.update(210);
  assert(cmds.length === 2, "ARR should repeat twice in 100ms with arrMs=50");
  assertCommands(cmds, [{ type: "moveRight" }, { type: "moveRight" }], "ARR repeats");
  console.log("Test 7 passed: ARR repeats after arrMs");
}

// Test 8: Direction change resets DAS/ARR
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  adapter.onTouchMove(130, 100, 1, 50);
  adapter.update(110);
  adapter.onTouchMove(70, 100, 1, 200);
  const cmds = adapter.update(300);
  assertCommands(cmds, [{ type: "moveLeft" }], "direction change resets and fires opposite");
  console.log("Test 8 passed: direction change resets DAS/ARR");
}

// Test 9: Sustained downward -> softDrop + tick
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  const cmds = adapter.onTouchMove(100, 150, 1, 50);
  assertCommands(cmds, [{ type: "softDrop" }, { type: "tick", deltaMs: 50 }], "downward drag emits softDrop + tick");
  console.log("Test 9 passed: downward drag -> softDrop + tick");
}

// Test 10: Soft drop continues with update()
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  adapter.onTouchMove(100, 150, 1, 50);
  const cmds = adapter.update(66);
  assertCommands(cmds, [{ type: "tick", deltaMs: 16 }], "update emits tick while softDrop active");
  console.log("Test 10 passed: softDrop continues with update()");
}

// Test 11: Two-finger tap -> rotateCCW
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 2, 0);
  const cmds = adapter.onTouchEnd(2, 100);
  assertCommands(cmds, [{ type: "rotateCCW" }], "two-finger tap should emit rotateCCW");
  console.log("Test 11 passed: two-finger tap -> rotateCCW");
}

// Test 12: Two-finger drag cancels horizontal/softDrop
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  adapter.onTouchMove(130, 100, 1, 50);
  adapter.onTouchMove(100, 150, 2, 100);
  const state = adapter.getState();
  assert(state.horizontal.direction === 0, "horizontal cancelled on two-finger");
  assert(state.softDrop.active === false, "softDrop cancelled on two-finger");
  console.log("Test 12 passed: two-finger cancels horizontal/softDrop");
}

// Test 13: Hold button -> hold once per piece
{
  const adapter = createInputAdapter(testSettings);
  let cmds = adapter.onHoldPress();
  assertCommands(cmds, [{ type: "hold" }], "first hold press emits hold");
  cmds = adapter.onHoldPress();
  assert(cmds.length === 0, "second hold press emits nothing");
  adapter.onPieceSpawn();
  cmds = adapter.onHoldPress();
  assertCommands(cmds, [{ type: "hold" }], "hold works again after piece spawn");
  console.log("Test 13 passed: hold once per piece");
}

// Test 14: Settings persistence separate from replay state
{
  const adapter = createInputAdapter(testSettings);
  const settings = adapter.getSettings();
  assertEqual(settings, testSettings, "getSettings returns current settings");
  adapter.setSettings({ dasMs: 200, arrMs: 40 });
  const newSettings = adapter.getSettings();
  assert(newSettings.dasMs === 200 && newSettings.arrMs === 40, "setSettings updates settings");
  assert(newSettings.tapThresholdMs === testSettings.tapThresholdMs, "unchanged settings preserved");
  console.log("Test 14 passed: settings persistence separate from replay state");
}

// Test 15: Default settings used when not provided
{
  const adapter = createInputAdapter({});
  const settings = adapter.getSettings();
  assertEqual(settings, DEFAULT_SETTINGS, "default settings applied");
  console.log("Test 15 passed: default settings used");
}

// Test 16: Vertical drag upward does not trigger softDrop
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  const cmds = adapter.onTouchMove(100, 50, 1, 50);
  assert(cmds.length === 0, "upward drag should not trigger softDrop");
  console.log("Test 16 passed: upward drag -> no softDrop");
}

// Test 17: Horizontal drag small distance does not trigger move
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  const cmds = adapter.onTouchMove(105, 100, 1, 50);
  assert(cmds.length === 0, "small horizontal drag should not trigger move");
  console.log("Test 17 passed: small horizontal drag -> no move");
}

// Test 18: Release ends softDrop
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  adapter.onTouchMove(100, 150, 1, 50);
  adapter.onTouchEnd(1, 100);
  adapter.update(150);
  const state = adapter.getState();
  assert(state.softDrop.active === false, "softDrop inactive after release");
  console.log("Test 18 passed: release ends softDrop");
}

// Test 19: Release ends horizontal repeat
{
  const adapter = createInputAdapter(testSettings);
  adapter.onTouchStart(100, 100, 1, 0);
  adapter.onTouchMove(130, 100, 1, 50);
  adapter.update(250);
  adapter.onTouchEnd(1, 300);
  adapter.update(350);
  const state = adapter.getState();
  assert(state.horizontal.direction === 0, "horizontal inactive after release");
  console.log("Test 19 passed: release ends horizontal repeat");
}

// Test 20: Settings schema version concept (settings are just data)
{
  const adapter = createInputAdapter(testSettings);
  const s1 = adapter.getSettings();
  const s2 = { ...s1, dasMs: 999 };
  adapter.setSettings(s2);
  const s3 = adapter.getSettings();
  assert(s3.dasMs === 999, "settings are mutable data");
  console.log("Test 20 passed: settings are plain data for persistence");
}

console.log("\nAll input-adapter tests passed!");
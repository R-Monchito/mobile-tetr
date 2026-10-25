import { advanceLockDelay, createLockDelay, defaultLockDelay, resetLockDelay } from "./lock-delay.ts";

let one = advanceLockDelay(createLockDelay(), 1000, true);
let many = createLockDelay();
for (let i = 0; i < 10; i++) many = advanceLockDelay(many, 100, true);
if (one.elapsedMs !== many.elapsedMs || one.locked !== many.locked) throw new Error("tick partition changed lock result");
if (!one.locked || one.elapsedMs !== defaultLockDelay.delayMs) throw new Error("lock delay did not preserve elapsed time");
let reset = resetLockDelay(createLockDelay(), true);
if (reset.resets !== 1 || reset.elapsedMs !== 0) throw new Error("lock reset failed");
const airborne = advanceLockDelay(reset, 100, false);
if (airborne.elapsedMs !== 0 || airborne.locked) throw new Error("airborne state retained lock timer");
console.log("lock-delay invariants: ok");


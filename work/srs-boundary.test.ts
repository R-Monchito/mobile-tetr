import { selectFirstFreeKick, selectFirstFreeKickByCollision } from "./srs.ts";

const candidates = [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]] as const;
const first = selectFirstFreeKick(candidates, new Set([0]));
if (!first.accepted || first.index !== 1 || first.offset?.[0] !== -1) throw new Error("first free kick selection failed");
const third = selectFirstFreeKick(candidates, new Set([0,1]));
if (!third.accepted || third.index !== 2) throw new Error("third kick selection failed");
const rejected = selectFirstFreeKick(candidates, new Set([0,1,2,3,4]));
if (rejected.accepted || rejected.index !== -1) throw new Error("rejected rotation was not atomic");
const collision = selectFirstFreeKickByCollision(candidates, ([x, y]) => x === 0 && y >= -2);
if (!collision.accepted || collision.index !== 1 || collision.offset?.[0] !== -1) throw new Error("collision-based kick selection failed");
console.log("srs boundary invariants: ok");

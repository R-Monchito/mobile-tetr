import type { EngineCommand, EngineSnapshot } from "./engine.ts";

export interface ReplayDocument {
  readonly formatVersion: 1;
  readonly engineVersion: string;
  readonly rulesetVersion: string;
  readonly initial: EngineSnapshot;
  readonly commands: readonly EngineCommand[];
  readonly finalChecksum?: string;
}

export function createReplay(initial: EngineSnapshot, commands: readonly EngineCommand[], engineVersion = "0.1.0", rulesetVersion = "draft"): ReplayDocument {
  return { formatVersion: 1, engineVersion, rulesetVersion, initial, commands };
}

export function serializeReplay(replay: ReplayDocument): string {
  return JSON.stringify(replay);
}

export function deserializeReplay(serialized: string): ReplayDocument {
  const parsed: unknown = JSON.parse(serialized);
  if (!parsed || typeof parsed !== "object") throw new Error("invalid-replay");
  const value = parsed as Partial<ReplayDocument>;
  if (value.formatVersion !== 1 || !value.initial || !Array.isArray(value.commands)) throw new Error("invalid-replay");
  return value as ReplayDocument;
}

export function checksumSnapshot(snapshot: EngineSnapshot): string {
  const json = JSON.stringify(snapshot);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function replayAndChecksum(replay: ReplayDocument, apply: (snapshot: EngineSnapshot, command: EngineCommand) => { snapshot: EngineSnapshot }): string {
  let snapshot = replay.initial;
  for (const command of replay.commands) snapshot = apply(snapshot, command).snapshot;
  return checksumSnapshot(snapshot);
}

export interface KickSelection {
  readonly accepted: boolean;
  readonly index: number;
  readonly offset?: readonly [number, number];
}

export function selectFirstFreeKick(
  candidates: readonly (readonly [number, number])[],
  blocked: ReadonlySet<number>,
): KickSelection {
  for (let index = 0; index < candidates.length; index++) {
    if (!blocked.has(index)) return { accepted: true, index, offset: candidates[index] };
  }
  return { accepted: false, index: -1 };
}

export function selectFirstFreeKickByCollision(
  candidates: readonly (readonly [number, number])[],
  isBlocked: (offset: readonly [number, number], index: number) => boolean,
): KickSelection {
  for (let index = 0; index < candidates.length; index++) {
    const offset = candidates[index];
    if (!isBlocked(offset, index)) return { accepted: true, index, offset };
  }
  return { accepted: false, index: -1 };
}

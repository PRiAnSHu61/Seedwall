import type { Box } from "./text";

/**
 * The largest gap along one axis of [0, extent] that none of the given intervals cover.
 * Used to fit a look's main subject around the quote instead of cutting the quote's clear zone out of it.
 */
export function largestGap(extent: number, blocks: readonly (readonly [number, number])[]): { from: number; to: number } {
  const sorted = blocks
    .map(([a, b]) => [Math.max(0, a), Math.min(extent, b)] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let best = { from: 0, to: 0 };
  let cur = 0;
  for (const [a, b] of sorted) {
    if (a - cur > best.to - best.from) best = { from: cur, to: a };
    cur = Math.max(cur, b);
  }
  if (extent - cur > best.to - best.from) best = { from: cur, to: extent };
  return best;
}

/** Free vertical band, counting only zones that overlap the subject's horizontal span [x0, x1]. */
export function freeRows(h: number, zones: readonly Box[], x0: number, x1: number): { from: number; to: number } {
  return largestGap(h, zones.filter((z) => z.x < x1 && z.x + z.w > x0).map((z) => [z.y, z.y + z.h] as const));
}

/** Free horizontal span, counting only zones that overlap the vertical span [y0, y1]. */
export function freeCols(w: number, zones: readonly Box[], y0: number, y1: number): { from: number; to: number } {
  return largestGap(w, zones.filter((z) => z.y < y1 && z.y + z.h > y0).map((z) => [z.x, z.x + z.w] as const));
}

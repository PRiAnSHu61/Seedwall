/** mulberry32 — tiny, fast, deterministic PRNG. Returns floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = Math.floor(seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (rng: () => number, min: number, max: number): number => min + rng() * (max - min);
export const pick = <T>(rng: () => number, items: readonly T[]): T => {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick() from empty list");
  return item;
};

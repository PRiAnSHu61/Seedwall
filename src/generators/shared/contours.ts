/**
 * Marching squares over a scalar grid (cols+1 × rows+1 samples, `cell` px apart).
 * Pad the grid border with a very low value and pass `closed` to get closed loops,
 * which filled with fill-rule="evenodd" give the region where field > t.
 */
export function contourPaths(field: Float32Array, cols: number, rows: number, cell: number, t: number, opts: { closed?: boolean; ox?: number; oy?: number } = {}): string {
  const ox = opts.ox ?? 0;
  const oy = opts.oy ?? 0;
  const segs: [number, number, number, number][] = [];
  const at = (i: number, j: number): number => field[j * (cols + 1) + i] ?? 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const idx = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = ox + i * cell, y = oy + j * cell;
      const lerp = (v1: number, v2: number): number => (t - v1) / (v2 - v1 || 1e-9);
      const top: [number, number] = [x + lerp(a, b) * cell, y];
      const right: [number, number] = [x + cell, y + lerp(b, c) * cell];
      const bottom: [number, number] = [x + lerp(d, c) * cell, y + cell];
      const left: [number, number] = [x, y + lerp(a, d) * cell];
      const add = (p: [number, number], q: [number, number]) => segs.push([p[0], p[1], q[0], q[1]]);
      switch (idx) {
        case 1: case 14: add(left, bottom); break;
        case 2: case 13: add(bottom, right); break;
        case 3: case 12: add(left, right); break;
        case 4: case 11: add(top, right); break;
        case 6: case 9: add(top, bottom); break;
        case 7: case 8: add(left, top); break;
        case 5: add(left, top); add(bottom, right); break;
        case 10: add(top, right); add(left, bottom); break;
      }
    }

  // Chain segments sharing endpoints into polylines (much smaller SVG).
  const key = (x: number, y: number): string => `${Math.round(x * 4)},${Math.round(y * 4)}`;
  const ends = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const k of [key(s[0], s[1]), key(s[2], s[3])]) ends.set(k, [...(ends.get(k) ?? []), i]);
  });
  const used = new Uint8Array(segs.length);
  const f = (v: number): string => String(Math.round(v * 10) / 10);
  const out: string[] = [];
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const first = segs[s0]!;
    const pts: number[] = [first[0], first[1], first[2], first[3]];
    for (;;) {
      const lx = pts[pts.length - 2]!, ly = pts[pts.length - 1]!;
      const next = (ends.get(key(lx, ly)) ?? []).find((i) => !used[i]);
      if (next === undefined) break;
      used[next] = 1;
      const s = segs[next]!;
      if (key(s[0], s[1]) === key(lx, ly)) pts.push(s[2], s[3]);
      else pts.push(s[0], s[1]);
    }
    let d = `M${f(pts[0]!)} ${f(pts[1]!)}`;
    for (let k = 2; k < pts.length; k += 2) d += `L${f(pts[k]!)} ${f(pts[k + 1]!)}`;
    out.push(opts.closed ? `${d}Z` : d);
  }
  return out.join("");
}


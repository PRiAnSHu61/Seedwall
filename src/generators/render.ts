import type { AnyGenerator, ParamDef, Params, ParamValue, Size } from "./types";
import { createRng } from "./shared/rng";

/** Schema defaults for a generator. */
export function defaultParams(gen: AnyGenerator): Params {
  const out: Params = {};
  for (const [key, def] of Object.entries(gen.params)) out[key] = def.default;
  return out;
}

/** Coerce an untrusted value (URL, CLI, localStorage) to the def's type, or undefined if invalid. */
export function coerceParam(def: ParamDef, raw: unknown): ParamValue | undefined {
  switch (def.kind) {
    case "toggle":
      if (typeof raw === "boolean") return raw;
      if (raw === "1" || raw === "true") return true;
      if (raw === "0" || raw === "false") return false;
      return undefined;
    case "range":
    case "seed": {
      const v = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
      if (!Number.isFinite(v)) return undefined;
      if (def.kind === "seed") return Math.abs(Math.floor(v)) % 1_000_000;
      return Math.min(def.max, Math.max(def.min, v));
    }
    case "select":
      return typeof raw === "string" && def.options.some((o) => o.value === raw) ? raw : undefined;
    case "color":
      return typeof raw === "string" && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : undefined;
    case "text":
      return typeof raw === "string" ? raw.slice(0, def.maxLength ?? 400) : undefined;
  }
}

/** defaults ← preset ← overrides (validated). */
export function resolveParams(gen: AnyGenerator, presetId?: string, overrides: Record<string, unknown> = {}): Params {
  const out = defaultParams(gen);
  const preset = gen.presets.find((p) => p.id === presetId);
  const layers: Record<string, unknown>[] = [preset?.params ?? {}, overrides];
  for (const layer of layers)
    for (const [key, raw] of Object.entries(layer)) {
      const def = gen.params[key];
      if (!def) continue;
      const v = coerceParam(def, raw);
      if (v !== undefined) out[key] = v;
    }
  return out;
}

/** Render with the rng seeded from params.seed — the single entry point for site, CLI and tests. */
export function renderWallpaper(gen: AnyGenerator, params: Params, size: Size): string {
  const seed = typeof params.seed === "number" ? params.seed : 1;
  return gen.render(params, { w: Math.round(size.w), h: Math.round(size.h) }, createRng(seed));
}

/** Only the keys that differ from the preset — keeps share links and CLI commands short. */
export function diffFromPreset(gen: AnyGenerator, presetId: string | undefined, params: Params): Params {
  const base = resolveParams(gen, presetId);
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) if (base[k] !== v) out[k] = v;
  return out;
}

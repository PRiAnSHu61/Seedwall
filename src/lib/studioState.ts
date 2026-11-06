import { DEFAULT_DEVICE, clampDimension, getDevice } from "@/config/devices";
import { GENERATORS, diffFromPreset, getGenerator, resolveParams, type AnyGenerator, type Params } from "@/generators";

/** Everything needed to reproduce a wallpaper exactly. */
export interface StudioState {
  gen: string;
  preset: string;
  /** Device id, or "custom". */
  device: string;
  w: number;
  h: number;
  params: Params;
}

const b64urlEncode = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64urlDecode = (s: string): string => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

function firstGen(): AnyGenerator {
  const g = GENERATORS[0];
  if (!g) throw new Error("No generators registered");
  return g;
}

export function initialState(genId?: string, presetId?: string): StudioState {
  const gen = (genId && getGenerator(genId)) || firstGen();
  const preset = gen.presets.find((p) => p.id === presetId)?.id ?? gen.presets[0]?.id ?? "";
  const d = getDevice(DEFAULT_DEVICE);
  return { gen: gen.id, preset, device: DEFAULT_DEVICE, w: d?.w ?? 3024, h: d?.h ?? 1964, params: resolveParams(gen, preset) };
}

/** Query string: g, p, d (or w+h for custom), x = base64url JSON of params that differ from the preset. */
export function encodeState(s: StudioState): string {
  const gen = getGenerator(s.gen);
  const q = new URLSearchParams({ g: s.gen, p: s.preset });
  if (s.device === "custom") {
    q.set("w", String(s.w));
    q.set("h", String(s.h));
  } else q.set("d", s.device);
  if (gen) {
    const diff = diffFromPreset(gen, s.preset, s.params);
    if (Object.keys(diff).length) q.set("x", b64urlEncode(JSON.stringify(diff)));
  }
  return q.toString();
}

export function decodeState(query: URLSearchParams): StudioState {
  const base = initialState(query.get("g") ?? undefined, query.get("p") ?? undefined);
  const gen = getGenerator(base.gen);
  if (!gen) return base;

  let overrides: Record<string, unknown> = {};
  const x = query.get("x");
  if (x) {
    try {
      const parsed: unknown = JSON.parse(b64urlDecode(x));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) overrides = parsed as Record<string, unknown>;
    } catch {
      /* malformed share link — fall back to the preset */
    }
  }

  const out: StudioState = { ...base, params: resolveParams(gen, base.preset, overrides) };
  const d = getDevice(query.get("d") ?? "");
  const w = Number(query.get("w"));
  const h = Number(query.get("h"));
  if (d) Object.assign(out, { device: d.id, w: d.w, h: d.h });
  else if (w > 0 && h > 0) Object.assign(out, { device: "custom", w: clampDimension(w), h: clampDimension(h) });
  return out;
}

export const studioHref = (s: StudioState): string => `/studio?${encodeState(s)}`;

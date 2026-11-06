/** A single parameter value. Every generator's params are a flat record of these. */
export type ParamValue = string | number | boolean;
export type Params = Record<string, ParamValue>;

interface BaseDef {
  label: string;
  /** Optional UI group heading ("Colours", "Grid", "Text"…). */
  group?: string;
  help?: string;
}

export interface ColorDef extends BaseDef { kind: "color"; default: string }
export interface SelectDef extends BaseDef {
  kind: "select";
  options: readonly { value: string; label: string }[];
  default: string;
}
export interface TextDef extends BaseDef { kind: "text"; default: string; multiline?: boolean; maxLength?: number }
export interface RangeDef extends BaseDef { kind: "range"; min: number; max: number; step: number; default: number }
export interface SeedDef extends BaseDef { kind: "seed"; default: number }
export interface ToggleDef extends BaseDef { kind: "toggle"; default: boolean }

export type ParamDef = ColorDef | SelectDef | TextDef | RangeDef | SeedDef | ToggleDef;

/** Picks the definitions that can describe a value of type V. */
export type ParamDefFor<V> = V extends string
  ? ColorDef | SelectDef | TextDef
  : V extends number
    ? RangeDef | SeedDef
    : V extends boolean
      ? ToggleDef
      : never;

/** A typed schema: one definition per key of P, matched to its value type. */
export type ParamSchema<P extends Params> = { [K in keyof P]: ParamDefFor<P[K]> };

export interface Preset<P extends Params = Params> {
  id: string;
  title: string;
  /** Overrides on top of the schema defaults. */
  params: Partial<P>;
}

export interface Size { w: number; h: number }

export interface Generator<P extends Params = Params> {
  id: string;
  name: string;
  description: string;
  params: ParamSchema<P>;
  presets: Preset<P>[];
  /** Pure + deterministic: same (p, size, rng seed) → same SVG string. */
  render(p: P, size: Size, rng: () => number): string;
}

/** The type-erased form stored in the registry. */
export type AnyGenerator = Generator<Params>;

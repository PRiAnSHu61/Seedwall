"use client";

import { useId } from "react";
import type { AnyGenerator, ParamDef, Params, ParamValue } from "@/generators/types";

interface Props {
  gen: AnyGenerator;
  params: Params;
  onChange: (key: string, value: ParamValue) => void;
}

/** Builds the controls automatically from a generator's params schema. */
export function ParamsPanel({ gen, params, onChange }: Props) {
  const groups = new Map<string, [string, ParamDef][]>();
  for (const [key, def] of Object.entries(gen.params)) {
    if (def.hidden) continue;
    const g = def.group ?? "General";
    groups.set(g, [...(groups.get(g) ?? []), [key, def]]);
  }
  const textOff = params["text.none"] === true;

  return (
    <div className="params">
      {[...groups.entries()].map(([group, fields]) => (
        <details key={`${gen.id}-${group}`} className="param-group" open>
          <summary className="label">{group}</summary>
          {fields.map(([key, def]) =>
            group === "Text" && textOff && key !== "text.none" ? null : (
              <Field key={key} k={key} def={def} value={params[key] ?? def.default} onChange={onChange} />
            ),
          )}
        </details>
      ))}
    </div>
  );
}

interface FieldProps {
  k: string;
  def: ParamDef;
  value: ParamValue;
  onChange: (key: string, value: ParamValue) => void;
}

function Field({ k, def, value, onChange }: FieldProps) {
  const id = useId();
  const help = def.help ? <small id={`${id}-h`}>{def.help}</small> : null;
  const describedBy = def.help ? `${id}-h` : undefined;

  switch (def.kind) {
    case "toggle":
      return (
        <label className="toggle" htmlFor={id}>
          {def.label}
          <input id={id} type="checkbox" role="switch" checked={value === true} onChange={(e) => onChange(k, e.target.checked)} />
        </label>
      );
    case "range": {
      const v = typeof value === "number" ? value : def.default;
      return (
        <div className="field">
          <div className="field-row">
            <label htmlFor={id}>{def.label}</label>
            <output htmlFor={id}>{Number.isInteger(def.step) ? v : v.toFixed(2)}</output>
          </div>
          <input id={id} type="range" min={def.min} max={def.max} step={def.step} value={v} onChange={(e) => onChange(k, Number(e.target.value))} />
        </div>
      );
    }
    case "seed": {
      const v = typeof value === "number" ? value : def.default;
      return (
        <div className="field">
          <label className="field-row" htmlFor={id}>{def.label}</label>
          <div className="seed-row">
            <input id={id} className="input mono" type="number" min={0} value={v} onChange={(e) => onChange(k, Math.abs(Math.floor(Number(e.target.value) || 0)))} />
            <button type="button" className="btn btn-sm" onClick={() => onChange(k, Math.floor(Math.random() * 999_999))}>
              Randomise
            </button>
          </div>
        </div>
      );
    }
    case "select":
      return (
        <div className="field">
          <label className="field-row" htmlFor={id}>{def.label}</label>
          <select id={id} className="select" value={String(value)} onChange={(e) => onChange(k, e.target.value)}>
            {def.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      );
    case "color": {
      const v = String(value);
      return (
        <div className="field">
          <label className="field-row" htmlFor={id}>{def.label}</label>
          <div className="color-field">
            <input type="color" aria-label={`${def.label} picker`} value={v} onChange={(e) => onChange(k, e.target.value)} />
            <input
              id={id}
              className="input"
              value={v}
              spellCheck={false}
              maxLength={7}
              onChange={(e) => {
                const t = e.target.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(t)) onChange(k, t.toLowerCase());
              }}
            />
          </div>
        </div>
      );
    }
    case "text":
      return (
        <div className="field">
          <label className="field-row" htmlFor={id}>{def.label}</label>
          {def.multiline ? (
            <textarea id={id} className="textarea" value={String(value)} maxLength={def.maxLength} aria-describedby={describedBy} onChange={(e) => onChange(k, e.target.value)} />
          ) : (
            <input id={id} className="input" value={String(value)} maxLength={def.maxLength} aria-describedby={describedBy} onChange={(e) => onChange(k, e.target.value)} />
          )}
          {help}
        </div>
      );
  }
}

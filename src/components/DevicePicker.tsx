"use client";

import { useId } from "react";
import { DEVICES, CUSTOM_LIMITS, clampDimension } from "@/config/devices";

interface Props {
  device: string;
  w: number;
  h: number;
  onChange: (device: string, w: number, h: number) => void;
}

export function DevicePicker({ device, w, h, onChange }: Props) {
  const id = useId();
  return (
    <div className="device-picker">
      <label className="visually-hidden" htmlFor={id}>Device</label>
      <select
        id={id}
        className="select"
        value={device}
        onChange={(e) => {
          const d = DEVICES.find((x) => x.id === e.target.value);
          if (d) onChange(d.id, d.w, d.h);
          else onChange("custom", w, h);
        }}
      >
        {DEVICES.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label} — {d.w}×{d.h}
          </option>
        ))}
        <option value="custom">Custom size…</option>
      </select>
      <div className="custom-size">
        <input
          className="input"
          type="number"
          aria-label="Width in pixels"
          min={CUSTOM_LIMITS.min}
          max={CUSTOM_LIMITS.max}
          value={w}
          onChange={(e) => onChange("custom", clampDimension(Number(e.target.value)), h)}
        />
        <span aria-hidden="true">×</span>
        <input
          className="input"
          type="number"
          aria-label="Height in pixels"
          min={CUSTOM_LIMITS.min}
          max={CUSTOM_LIMITS.max}
          value={h}
          onChange={(e) => onChange("custom", w, clampDimension(Number(e.target.value)))}
        />
      </div>
      <button type="button" className="btn btn-sm" onClick={() => onChange(device === "custom" ? "custom" : device, h, w)}>
        ⇄ Rotate
      </button>
    </div>
  );
}

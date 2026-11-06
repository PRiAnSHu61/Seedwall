export interface Device {
  id: string;
  label: string;
  w: number;
  h: number;
  kind: "desktop" | "phone" | "tablet";
}

export const DEVICES = [
  { id: "macbook14", label: 'MacBook Pro 14"', w: 3024, h: 1964, kind: "desktop" },
  { id: "macbookAir13", label: 'MacBook Air 13"', w: 2560, h: 1664, kind: "desktop" },
  { id: "1080p", label: "1080p", w: 1920, h: 1080, kind: "desktop" },
  { id: "1440p", label: "1440p", w: 2560, h: 1440, kind: "desktop" },
  { id: "4k", label: "4K", w: 3840, h: 2160, kind: "desktop" },
  { id: "ultrawide", label: "Ultrawide", w: 3440, h: 1440, kind: "desktop" },
  { id: "iphone", label: "iPhone", w: 1290, h: 2796, kind: "phone" },
  { id: "android", label: "Android", w: 1440, h: 3120, kind: "phone" },
  { id: "ipad", label: "iPad", w: 2048, h: 2732, kind: "tablet" },
] as const satisfies readonly Device[];

export type DeviceId = (typeof DEVICES)[number]["id"];

export const DEFAULT_DEVICE: DeviceId = "macbook14";

export function getDevice(id: string): Device | undefined {
  return DEVICES.find((d) => d.id === id);
}

/** Bounds for the custom WxH input. */
export const CUSTOM_LIMITS = { min: 200, max: 8192 } as const;

export function clampDimension(v: number): number {
  if (!Number.isFinite(v)) return CUSTOM_LIMITS.min;
  return Math.round(Math.min(CUSTOM_LIMITS.max, Math.max(CUSTOM_LIMITS.min, v)));
}

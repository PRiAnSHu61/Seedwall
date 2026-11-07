"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_DEVICE, getDevice } from "@/config/devices";
import { getGenerator, renderWallpaper, type Params } from "@/generators";
import { scopeSvgIds } from "@/lib/scopeSvg";
import { studioHref } from "@/lib/studioState";
import { downloadBlob, svgToPngBlob } from "@/lib/svgToPng";
import { useDebounced } from "@/lib/useDebounced";
import { DevicePicker } from "./DevicePicker";
import { Preview } from "./Preview";

interface Props {
  gen: string;
  preset: string;
  params: Params;
  /** Download filename stem, e.g. "seedwall-48213". */
  name: string;
  /** Path to copy as the share link (origin is added). */
  sharePath: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Extra controls above the device picker. */
  side?: ReactNode;
  /** Shown under the preview. */
  footer?: ReactNode;
}

/** Preview + device + download / share — the stage shared by seed and personal pages. */
export function WallpaperStage({ gen, preset, params, name, sharePath, title, subtitle, side, footer }: Props) {
  const fallback = getDevice(DEFAULT_DEVICE)!;
  const [size, setSize] = useState({ device: fallback.id as string, w: fallback.w, h: fallback.h });
  const [toast, setToast] = useState("");
  const [exporting, setExporting] = useState(false);
  const g = getGenerator(gen);

  // Phones get a phone-shaped wallpaper first.
  useEffect(() => {
    if (window.matchMedia("(max-width: 600px)").matches) {
      const phone = getDevice("iphone");
      if (phone) setSize({ device: phone.id, w: phone.w, h: phone.h });
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Generator and params must change together: rendering one generator with another's
  // params (e.g. mid-debounce after switching looks) crashes.
  const input = useMemo(() => ({ gen, params, ...size }), [gen, params, size]);
  const debounced = useDebounced(input, 60);
  const svg = useMemo(() => {
    const dg = getGenerator(debounced.gen);
    return dg ? scopeSvgIds(renderWallpaper(dg, debounced.params, { w: debounced.w, h: debounced.h }), "ws") : "";
  }, [debounced]);

  const fullSvg = () => (g ? renderWallpaper(g, params, { w: size.w, h: size.h }) : "");
  const file = (ext: string) => `${name}-${size.w}x${size.h}.${ext}`;

  const downloadPng = async () => {
    setExporting(true);
    try {
      downloadBlob(await svgToPngBlob(fullSvg(), size.w, size.h), file("png"));
      setToast(`Saved ${size.w}×${size.h} PNG`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
      setToast("Link copied");
    } catch {
      setToast("Couldn't access the clipboard");
    }
  };

  const studio = studioHref({ gen, preset, device: size.device, w: size.w, h: size.h, params });

  return (
    <div className="viewer">
      <section className="viewer-stage" aria-label="Preview">
        <div className="stage-bar">
          <div className="stage-title">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={downloadPng} disabled={exporting}>
              {exporting ? "Rendering…" : "Download PNG"}
            </button>
            <button type="button" className="btn" onClick={() => downloadBlob(new Blob([fullSvg()], { type: "image/svg+xml" }), file("svg"))}>
              SVG
            </button>
            <button type="button" className="btn" onClick={copyLink}>Copy link</button>
            <Link className="btn" href={studio}>Edit in Studio</Link>
          </div>
        </div>
        <Preview svg={svg} w={debounced.w} h={debounced.h} busy={debounced !== input} />
        {footer}
      </section>
      <aside className="viewer-side" aria-label="Options">
        {side}
        <section className="col-section">
          <span className="label">Device</span>
          <DevicePicker device={size.device} w={size.w} h={size.h} onChange={(device, w, h) => setSize({ device, w, h })} />
        </section>
      </aside>
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

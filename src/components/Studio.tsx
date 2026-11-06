"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GENERATORS, getGenerator, renderWallpaper, resolveParams, type ParamValue } from "@/generators";
import { decodeState, encodeState, initialState, type StudioState } from "@/lib/studioState";
import { scopeSvgIds } from "@/lib/scopeSvg";
import { downloadBlob, svgToPngBlob } from "@/lib/svgToPng";
import { buildClaudePrompt, buildCliCommand } from "@/lib/prompt";
import { useDebounced } from "@/lib/useDebounced";
import { saveToCollection } from "@/lib/collection";
import { DevicePicker } from "./DevicePicker";
import { ParamsPanel } from "./ParamsPanel";
import { Preview } from "./Preview";
import { LiveThumb } from "./LiveThumb";
import { CollectionPanel } from "./CollectionPanel";

export function Studio() {
  const search = useSearchParams();
  const [state, setState] = useState<StudioState>(() => decodeState(new URLSearchParams(search.toString())));
  const [toast, setToast] = useState("");
  const [exporting, setExporting] = useState(false);
  const [collectionVersion, setCollectionVersion] = useState(0);

  const gen = getGenerator(state.gen) ?? GENERATORS[0]!;
  const debounced = useDebounced(state, 90);
  const busy = debounced !== state;

  const svg = useMemo(() => {
    const g = getGenerator(debounced.gen);
    return g ? renderWallpaper(g, debounced.params, { w: debounced.w, h: debounced.h }) : "";
  }, [debounced]);
  const scoped = useMemo(() => scopeSvgIds(svg, "pv"), [svg]);

  // Keep the URL shareable without triggering navigation.
  useEffect(() => {
    const q = encodeState(debounced);
    if (`?${q}` !== window.location.search) window.history.replaceState(null, "", `/studio?${q}`);
  }, [debounced]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const setParam = useCallback((key: string, value: ParamValue) => {
    setState((s) => ({ ...s, params: { ...s.params, [key]: value } }));
  }, []);

  const pickGenerator = (id: string) => {
    const next = initialState(id);
    setState((s) => ({ ...next, device: s.device, w: s.w, h: s.h, params: { ...next.params, "text.none": s.params["text.none"] ?? false } }));
  };

  const pickPreset = (presetId: string) => {
    setState((s) => {
      const g = getGenerator(s.gen);
      if (!g) return s;
      return { ...s, preset: presetId, params: { ...resolveParams(g, presetId), "text.none": s.params["text.none"] ?? false } };
    });
  };

  const filename = (ext: string) => `${state.gen}-${state.preset}-${state.w}x${state.h}.${ext}`;
  const fullSvg = () => renderWallpaper(gen, state.params, { w: state.w, h: state.h });
  const shareUrl = () => `${window.location.origin}/studio?${encodeState(state)}`;

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(msg);
    } catch {
      setToast("Couldn't access the clipboard");
    }
  };

  const downloadPng = async () => {
    setExporting(true);
    try {
      downloadBlob(await svgToPngBlob(fullSvg(), state.w, state.h), filename("png"));
      setToast(`Saved ${state.w}×${state.h} PNG`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const presetTitle = gen.presets.find((p) => p.id === state.preset)?.title ?? state.preset;

  return (
    <div className="studio">
      <aside className="studio-col picker-col" aria-label="Generators and presets">
        <section className="col-section">
          <span className="label">Generator</span>
          <div className="gen-list">
            {GENERATORS.map((g) => (
              <button key={g.id} type="button" aria-pressed={g.id === state.gen} onClick={() => pickGenerator(g.id)}>
                {g.name}
                <span className="count">{g.presets.length}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="col-section">
          <span className="label">Presets</span>
          <div className="preset-grid">
            {gen.presets.map((p) => (
              <button key={`${gen.id}-${p.id}`} type="button" className="preset-btn" aria-pressed={p.id === state.preset} onClick={() => pickPreset(p.id)}>
                <div className="pm">
                  <LiveThumb gen={gen.id} preset={p.id} w={800} h={500} label={p.title} />
                </div>
                <span>{p.title}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="col-section">
          <span className="label">My collection</span>
          <CollectionPanel version={collectionVersion} onLoad={(s) => setState(s)} />
        </section>
      </aside>

      <section className="studio-stage" aria-label="Preview">
        <div className="stage-bar">
          <div className="stage-title">
            <h1>{gen.name}</h1>
            <p>{presetTitle} · {state.w}×{state.h}</p>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={downloadPng} disabled={exporting}>
              {exporting ? "Rendering…" : "Download PNG"}
            </button>
            <button type="button" className="btn" onClick={() => downloadBlob(new Blob([fullSvg()], { type: "image/svg+xml" }), filename("svg"))}>
              SVG
            </button>
            <button type="button" className="btn" onClick={() => copy(shareUrl(), "Share link copied")}>
              Copy link
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                saveToCollection(state, `${gen.name} · ${presetTitle}`);
                setCollectionVersion((v) => v + 1);
                setToast("Saved to your collection");
              }}
            >
              Save
            </button>
          </div>
        </div>

        <Preview svg={scoped} w={debounced.w} h={debounced.h} busy={busy} />

        <div className="stage-bar">
          <p className="preview-dims">Rendered from code · deterministic for seed {String(state.params.seed ?? "—")}</p>
          <div className="actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => copy(buildClaudePrompt(state, shareUrl()), "Claude Code prompt copied")}>
              Copy Claude Code prompt
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => copy(buildCliCommand(state), "CLI command copied")}>
              Copy CLI command
            </button>
          </div>
        </div>
      </section>

      <aside className="studio-col params-col" aria-label="Controls">
        <section className="col-section">
          <span className="label">Device</span>
          <DevicePicker device={state.device} w={state.w} h={state.h} onChange={(device, w, h) => setState((s) => ({ ...s, device, w, h }))} />
        </section>
        <section className="col-section">
          <ParamsPanel gen={gen} params={state.params} onChange={setParam} />
          <button type="button" className="btn btn-sm btn-block" onClick={() => pickPreset(state.preset)}>
            Reset to preset
          </button>
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

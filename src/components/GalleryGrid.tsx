"use client";

import { useMemo, useState } from "react";
import type { GalleryItem } from "@/lib/gallery";
import { WallpaperDialog } from "./WallpaperDialog";

interface Props {
  items: GalleryItem[];
  generators: { id: string; name: string }[];
  /** Hide the filter bar (used for the featured strip on the home page). */
  compact?: boolean;
}

type Shape = "all" | "desktop" | "phone";
type TextFilter = "all" | "text-free" | "with-text";
type Source = "all" | "drive" | "samples";

export function GalleryGrid({ items, generators, compact }: Props) {
  const [gen, setGen] = useState("all");
  const [shape, setShape] = useState<Shape>("all");
  const [text, setText] = useState<TextFilter>("all");
  const [source, setSource] = useState<Source>("all");
  const [tag, setTag] = useState("all");
  const [open, setOpen] = useState<GalleryItem | null>(null);

  const tags = useMemo(() => {
    const skip = new Set(["desktop", "phone", "text-free", "with-text"]);
    return [...new Set(items.flatMap((i) => i.tags))].filter((t) => !skip.has(t)).sort();
  }, [items]);

  const shown = items.filter(
    (i) =>
      (gen === "all" || i.generator === gen) &&
      (shape === "all" || (shape === "phone" ? i.height > i.width : i.width >= i.height)) &&
      (text === "all" || (text === "text-free") === i.hasTextFree) &&
      (source === "all" || i.source === source) &&
      (tag === "all" || i.tags.includes(tag)),
  );

  const chips = <T extends string>(value: T, set: (v: T) => void, options: [T, string][], label: string) => (
    <div className="field">
      <span className="label">{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={v} type="button" className="chip" aria-pressed={value === v} onClick={() => set(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {!compact && (
        <div className="filters">
          {chips(source, setSource, [["all", "All"], ["drive", "Drive pack"], ["samples", "Generated"]], "Source")}
          {chips(shape, setShape, [["all", "Any"], ["desktop", "Desktop"], ["phone", "Phone"]], "Device")}
          {chips(text, setText, [["all", "Any"], ["text-free", "Text-free"], ["with-text", "With text"]], "Text")}
          <div className="field">
            <label className="label" htmlFor="gf-gen">Generator</label>
            <select id="gf-gen" className="select" value={gen} onChange={(e) => setGen(e.target.value)}>
              <option value="all">All generators</option>
              {generators.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="gf-tag">Tag</label>
            <select id="gf-tag" className="select" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="all">All tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      {!compact && <p className="result-count" aria-live="polite">{shown.length} wallpapers</p>}
      <div className="gallery-grid">
        {shown.map((item) => (
          <button key={item.id} type="button" className={`gallery-item${item.height > item.width ? " portrait" : ""}`} onClick={() => setOpen(item)}>
            <div className="gi-media">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote Drive thumbnails, no optimiser needed */}
              <img src={item.previewUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            </div>
            <div className="gi-body">
              <strong>{item.title}</strong>
              <span className="tag">{item.height > item.width ? "phone" : "desktop"}{item.hasTextFree ? " · no text" : ""}</span>
            </div>
          </button>
        ))}
      </div>
      {!shown.length && <p className="empty">No wallpapers match those filters.</p>}
      <WallpaperDialog item={open} onClose={() => setOpen(null)} />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { loadCollection, removeFromCollection, savedState, type SavedWallpaper } from "@/lib/collection";
import type { StudioState } from "@/lib/studioState";
import { LiveThumb } from "./LiveThumb";

interface Props {
  /** Bump to reload from localStorage after a save. */
  version: number;
  onLoad: (s: StudioState) => void;
}

export function CollectionPanel({ version, onLoad }: Props) {
  const [items, setItems] = useState<SavedWallpaper[]>([]);
  useEffect(() => setItems(loadCollection()), [version]);

  if (!items.length) return <p className="empty">Nothing saved yet. Hit “Save” to keep a wallpaper in this browser.</p>;

  return (
    <div className="collection-list">
      {items.map((item) => {
        const s = savedState(item);
        return (
          <div key={item.id} className="collection-item">
            <div className="ci-thumb">
              <LiveThumb gen={s.gen} params={s.params} w={640} h={400} label={item.title} />
            </div>
            <button type="button" className="load" onClick={() => onLoad(s)}>
              {item.title}
              <small>{s.w}×{s.h}</small>
            </button>
            <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${item.title}`} onClick={() => setItems(removeFromCollection(item.id))}>
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

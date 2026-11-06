"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { getGenerator } from "@/generators";
import { studioLinkFor, type GalleryItem } from "@/lib/gallery";

interface Props {
  item: GalleryItem | null;
  onClose: () => void;
}

export function WallpaperDialog({ item, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);

  const studio = item ? studioLinkFor(item) : null;
  const gen = item ? getGenerator(item.generator) : undefined;
  const fullPreview = item?.source === "drive" ? item.previewUrl.replace(/sz=w\d+/, "sz=w1800") : item?.previewUrl;

  return (
    <dialog
      ref={ref}
      className="wp-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="wp-dialog-title"
    >
      {item && (
        <div className="dialog-body">
          <div className="dialog-media">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote Drive thumbnails */}
            <img src={fullPreview} alt={item.title} referrerPolicy="no-referrer" />
          </div>
          <div className="dialog-side">
            <div>
              <span className="eyebrow">{item.source === "drive" ? "Cutting Mat pack" : gen?.name ?? item.generator}</span>
              <h2 id="wp-dialog-title">{item.title}</h2>
            </div>
            <dl>
              <dt>Size</dt>
              <dd>{item.width}×{item.height}</dd>
              <dt>Generator</dt>
              <dd>{gen?.name ?? item.generator}</dd>
              <dt>Text</dt>
              <dd>{item.hasTextFree ? "Text-free" : "With text"}</dd>
              <dt>Tags</dt>
              <dd>{item.tags.join(", ")}</dd>
            </dl>
            <a className="btn btn-primary btn-block" href={item.downloadUrl} download target={item.source === "drive" ? "_blank" : undefined} rel="noreferrer">
              Download PNG
            </a>
            {studio ? (
              <Link className="btn btn-block" href={studio}>
                Open in Studio
              </Link>
            ) : (
              <Link className="btn btn-block" href={`/studio?g=cutting-mat&p=shadow-grey${item.height > item.width ? "&d=iphone" : ""}`}>
                Make one like this
              </Link>
            )}
            <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

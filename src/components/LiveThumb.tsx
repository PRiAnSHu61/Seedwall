"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getGenerator, renderWallpaper, resolveParams, type Params } from "@/generators";
import { scopeSvgIds } from "@/lib/scopeSvg";

interface Props {
  gen: string;
  preset?: string;
  params?: Params;
  w?: number;
  h?: number;
  label?: string;
}

/** A small live render of a generator, drawn only once it scrolls into view. */
export function LiveThumb({ gen, preset, params, w = 1600, h = 1000, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const scope = `t${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const svg = useMemo(() => {
    if (!visible) return "";
    const g = getGenerator(gen);
    if (!g) return "";
    return scopeSvgIds(renderWallpaper(g, params ?? resolveParams(g, preset), { w, h }), scope);
  }, [visible, gen, preset, params, w, h, scope]);

  return (
    <div
      ref={ref}
      className={`thumb${svg ? "" : " thumb-loading"}`}
      role="img"
      aria-label={label ?? `${gen} wallpaper preview`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  svg: string;
  w: number;
  h: number;
  busy?: boolean;
}

/** Shows the full-size SVG inline, scaled to fit the stage while keeping its aspect ratio. */
export function Preview({ svg, w, h, busy }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const cs = getComputedStyle(el);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      setBox({ w: el.clientWidth - padX, h: window.innerHeight * (window.innerWidth < 760 ? 0.6 : 0.68) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit to the stage width and ~2/3 of the viewport height.
  const scale = Math.min((box.w || 320) / w, Math.max(240, box.h || 560) / h);
  const dw = Math.max(1, Math.floor(w * scale));
  const dh = Math.max(1, Math.floor(h * scale));

  return (
    <div className="preview-wrap" ref={wrap}>
      <div
        className="preview"
        data-busy={busy ? "true" : "false"}
        style={{ width: dw, height: dh }}
        role="img"
        aria-label={`Wallpaper preview, ${w} by ${h} pixels`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

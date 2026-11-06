"use client";

import { THEMES } from "@/generators/shared/themes";

/** One-click editor themes — recolours whichever generator is open. */
export function ThemePicker({ onApply }: { onApply: (themeId: string) => void }) {
  return (
    <div className="theme-grid" role="group" aria-label="Apply a syntax theme">
      {THEMES.map((t) => (
        <button key={t.id} type="button" className="theme-chip" onClick={() => onApply(t.id)} title={`Apply ${t.name}`} style={{ background: t.bg, color: t.fg }}>
          <span className="theme-dots" aria-hidden="true">
            {t.accents.slice(0, 4).map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </span>
          <span className="theme-name">{t.name}</span>
        </button>
      ))}
    </div>
  );
}

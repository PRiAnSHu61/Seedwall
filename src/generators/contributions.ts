import type { Generator, ParamSchema, Preset, Size } from "./types";
import { darken, mix } from "./shared/color";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, fontStack, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
  gradient: boolean;
  style: string;
  layout: string;
  scale: number;
  gap: number;
  round: number;
  height: number;
  labels: boolean;
  data: string;
  start: string;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#0d1117", group: "Colours", role: "bg" },
  fg: { kind: "color", label: "Labels + empty days", default: "#8b949e", group: "Colours", role: "fg" },
  accent: { kind: "color", label: "Busiest days", default: "#39d353", group: "Colours", role: "accent" },
  accent2: { kind: "color", label: "Gradient to", default: "#58a6ff", group: "Colours", role: "accent" },
  gradient: { kind: "toggle", label: "Blend colour across the year", default: false, group: "Colours" },
  style: {
    kind: "select",
    label: "Style",
    default: "squares",
    group: "Grid",
    options: [
      { value: "squares", label: "Squares" },
      { value: "dots", label: "Dots (sized by activity)" },
      { value: "skyline", label: "Skyline (3D bars)" },
    ],
  },
  layout: {
    kind: "select",
    label: "Layout",
    default: "auto",
    group: "Grid",
    options: [
      { value: "auto", label: "Auto (strip on desktop, stacked on phone)" },
      { value: "strip", label: "One strip" },
      { value: "bands", label: "Stacked bands" },
    ],
  },
  scale: { kind: "range", label: "Size", min: 0.4, max: 0.95, step: 0.01, default: 0.82, group: "Grid" },
  gap: { kind: "range", label: "Gap", min: 0, max: 0.5, step: 0.01, default: 0.18, group: "Grid" },
  round: { kind: "range", label: "Corner radius", min: 0, max: 1, step: 0.05, default: 0.25, group: "Grid" },
  height: { kind: "range", label: "Skyline height", min: 0.5, max: 5, step: 0.1, default: 1.6, group: "Grid" },
  labels: { kind: "toggle", label: "Months, weekdays + legend", default: true, group: "Grid" },
  data: { kind: "text", label: "Activity levels", default: "", maxLength: 400, hidden: true },
  start: { kind: "text", label: "First day", default: "", maxLength: 10, hidden: true },
  seed: { kind: "seed", label: "Seed", default: 2024 },
  ...textParams({ "text.line1": "Ship *every* day.", "text.line2": "", "text.font": "mono", "text.size": 3.2, "text.color": "#e6edf3", "text.position": "top-left" }),
};

const presets: Preset<P>[] = [
  { id: "github-dark", title: "GitHub dark", params: {} },
  { id: "github-light", title: "GitHub light", params: { bg: "#ffffff", fg: "#57606a", accent: "#216e39", "text.color": "#1f2328" } },
  { id: "skyline", title: "Neon skyline", params: { style: "skyline", bg: "#0b0820", fg: "#6c5f9e", accent: "#ff4fd8", accent2: "#3ef2ff", gradient: true, labels: false, "text.color": "#f4eaff", "text.position": "top-right", seed: 77 } },
  { id: "pumpkin", title: "Pumpkin", params: { bg: "#120c06", fg: "#7a5a3a", accent: "#ffb000", accent2: "#fd5a1e", gradient: true, "text.color": "#ffe8c2", seed: 31 } },
  { id: "dots-ocean", title: "Ocean dots", params: { style: "dots", bg: "#06141f", fg: "#3f6b85", accent: "#5ce1e6", gap: 0.1, "text.color": "#d8f6ff", seed: 5 } },
  { id: "paper", title: "Paper", params: { bg: "#f5f0e6", fg: "#9a8f7f", accent: "#2b2b2b", round: 0, gap: 0.24, labels: false, "text.color": "#2b2b2b", "text.font": "serif", "text.line1": "One *square* at a time.", seed: 12 } },
];

const WEEKS = 53;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Levels 0–4, one per day, oldest first, starting on a Sunday. */
export function parseLevels(data: string): number[] {
  return [...data].filter((c) => c >= "0" && c <= "4").map(Number).slice(0, WEEKS * 7);
}

/** A believable year: busy and quiet spells, lighter weekends, the odd streak. */
function syntheticLevels(rng: () => number): number[] {
  const out: number[] = [];
  let mood = rng();
  for (let w = 0; w < WEEKS; w++) {
    mood = Math.min(1, Math.max(0, mood + (rng() - 0.5) * 0.45));
    const vacation = rng() < 0.05;
    for (let d = 0; d < 7; d++) {
      const weekend = d === 0 || d === 6;
      let v = vacation ? 0 : mood * (weekend ? 0.45 : 1) + (rng() - 0.35) * 0.6;
      if (rng() < 0.03) v = 1.2;
      out.push(v <= 0.12 ? 0 : Math.min(4, 1 + Math.floor(v * 3.4)));
    }
  }
  return out;
}

interface Grid {
  bands: number;
  cols: number;
  pitch: number;
  x0: number;
  y0: number;
  /** Vertical distance between bands, in px. */
  bandStep: number;
}

function planGrid(p: P, size: Size, weeks: number, labelRoom: number): Grid {
  const wantBands = p.layout === "bands" || (p.layout === "auto" && size.h > size.w);
  let best = { bands: 1, cols: weeks, pitch: 0 };
  for (let b = 1; b <= (wantBands ? 6 : 1); b++) {
    const cols = Math.ceil(weeks / b);
    const rows = 7 * b + (b - 1) * (1.6 + labelRoom);
    const pitch = Math.min((size.w * p.scale) / (cols + labelRoom * 1.5), (size.h * 0.7) / rows);
    if (pitch > best.pitch) best = { bands: b, cols, pitch };
  }
  const { bands, cols, pitch } = best;
  const bandStep = pitch * (7 + 1.6 + labelRoom);
  const gw = cols * pitch;
  const gh = bandStep * (bands - 1) + 7 * pitch;
  return { bands, cols, pitch, x0: (size.w - gw) / 2 + (labelRoom * pitch) / 1.4, y0: (size.h - gh) / 2, bandStep };
}

export const contributions: Generator<P> = {
  id: "contributions",
  name: "Contribution Grid",
  description: "A year of commits as a wallpaper: the familiar contribution grid as squares, dots or a 3D skyline. Feed it your real GitHub history at /u/your-name.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const real = parseLevels(p.data);
    const levels = real.length >= 7 ? real : syntheticLevels(rng);
    const weeks = Math.ceil(levels.length / 7);
    const empty = mix(p.bg, p.fg, 0.16);
    const colorFor = (level: number, week: number): string => {
      if (level <= 0) return empty;
      const top = p.gradient ? mix(p.accent, p.accent2, weeks > 1 ? week / (weeks - 1) : 0) : p.accent;
      return mix(p.bg, top, [0, 0.3, 0.52, 0.76, 1][level] ?? 1);
    };

    const start = /^\d{4}-\d{2}-\d{2}$/.test(p.start) ? Date.parse(`${p.start}T00:00:00Z`) : Number.NaN;
    const showLabels = p.labels && p.style !== "skyline";
    const showMonths = showLabels && Number.isFinite(start);
    const labelRoom = showLabels ? 2.2 : 0;
    const text = layoutText(p, size);
    const fam = esc(fontStack("mono"));
    const cells: string[] = [];
    const labels: string[] = [];

    if (p.style === "skyline") {
      // Isometric bars, one band per row of weeks, drawn back to front.
      const wantBands = p.layout === "bands" || (p.layout === "auto" && size.h > size.w);
      const bands = wantBands ? Math.max(1, Math.min(4, Math.round(size.h / size.w / 0.55))) : 1;
      const cols = Math.ceil(weeks / bands);
      const k = 0.866;
      const footW = (cols + 7) * k;
      const footH = (cols + 7) * 0.5;
      const lift = 4 * p.height;
      const c = Math.min((size.w * p.scale) / footW, (size.h * 0.78) / (bands * (footH + lift) + (bands - 1) * 0.6));
      const blockH = (footH + lift) * c;
      const totalH = bands * blockH + (bands - 1) * 0.6 * c;
      const g = p.gap / 2;
      for (let b = 0; b < bands; b++) {
        const ox = (size.w - footW * c) / 2 + 7 * k * c;
        const oy = (size.h - totalH) / 2 + b * (blockH + 0.6 * c) + lift * c;
        const pt = (a: number, d: number, hgt: number): string => `${n(ox + (a - d) * k * c)},${n(oy + (a + d) * 0.5 * c - hgt)}`;
        const order: [number, number][] = [];
        for (let col = 0; col < cols; col++) for (let d = 0; d < 7; d++) if ((b * cols + col) * 7 + d < levels.length) order.push([col, d]);
        order.sort((x, y) => x[0] + x[1] - (y[0] + y[1]) || x[0] - y[0]);
        for (const [col, d] of order) {
          const week = b * cols + col;
          const level = levels[week * 7 + d] ?? 0;
          const top = colorFor(level, week);
          const hgt = (level === 0 ? 0.12 : level * p.height) * c;
          const [a0, a1, d0, d1] = [col + g, col + 1 - g, d + g, d + 1 - g];
          cells.push(
            `<polygon points="${pt(a1, d0, hgt)} ${pt(a1, d1, hgt)} ${pt(a1, d1, 0)} ${pt(a1, d0, 0)}" fill="${esc(darken(top, 0.42))}"/>` +
              `<polygon points="${pt(a0, d1, hgt)} ${pt(a1, d1, hgt)} ${pt(a1, d1, 0)} ${pt(a0, d1, 0)}" fill="${esc(darken(top, 0.22))}"/>` +
              `<polygon points="${pt(a0, d0, hgt)} ${pt(a1, d0, hgt)} ${pt(a1, d1, hgt)} ${pt(a0, d1, hgt)}" fill="${esc(top)}"/>`,
          );
        }
      }
    } else {
      const grid = planGrid(p, size, weeks, labelRoom);
      const s = grid.pitch;
      const inner = s * (1 - p.gap);
      const fs = Math.max(0.9 * u, s * 0.62);
      for (let i = 0; i < levels.length; i++) {
        const week = Math.floor(i / 7);
        const d = i % 7;
        const band = Math.floor(week / grid.cols);
        const x = grid.x0 + (week % grid.cols) * s + (s - inner) / 2;
        const y = grid.y0 + band * grid.bandStep + d * s + (s - inner) / 2;
        const level = levels[i] ?? 0;
        const fill = esc(colorFor(level, week));
        if (p.style === "dots") {
          const r = (inner / 2) * (level === 0 ? 0.32 : 0.45 + 0.55 * (level / 4));
          cells.push(`<circle cx="${n(x + inner / 2)}" cy="${n(y + inner / 2)}" r="${n(r)}" fill="${fill}"/>`);
        } else cells.push(rect(x, y, inner, inner, `rx="${n((inner / 2) * p.round)}" fill="${fill}"`));
      }
      if (showLabels) {
        for (let band = 0; band < grid.bands; band++) {
          const by = grid.y0 + band * grid.bandStep;
          for (const [d, name] of [[1, "Mon"], [3, "Wed"], [5, "Fri"]] as const)
            labels.push(`<text x="${n(grid.x0 - s * 0.5)}" y="${n(by + d * s + s * 0.72)}" text-anchor="end">${name}</text>`);
          if (showMonths) {
            let last = -1;
            for (let col = 0; col < grid.cols; col++) {
              const week = band * grid.cols + col;
              if (week >= weeks) break;
              const m = new Date(start + week * 7 * 86_400_000).getUTCMonth();
              if (m !== last && (col > 0 || band === 0)) {
                if (col < grid.cols - 2) labels.push(`<text x="${n(grid.x0 + col * s)}" y="${n(by - s * 0.55)}">${MONTHS[m]}</text>`);
                last = m;
              }
            }
          }
        }
        // Legend under the last band, right-aligned.
        const lastBandWeeks = weeks - (grid.bands - 1) * grid.cols;
        const right = grid.x0 + Math.min(grid.cols, lastBandWeeks) * s;
        const ly = grid.y0 + (grid.bands - 1) * grid.bandStep + 7 * s + s * 0.7;
        const legend: string[] = [];
        for (let l = 0; l <= 4; l++) {
          const lx = right - (5 - l) * s - s * 2.6;
          legend.push(p.style === "dots"
            ? `<circle cx="${n(lx + inner / 2)}" cy="${n(ly + inner / 2)}" r="${n((inner / 2) * (l === 0 ? 0.32 : 0.45 + 0.55 * (l / 4)))}" fill="${esc(colorFor(l, weeks - 1))}"/>`
            : rect(lx, ly, inner, inner, `rx="${n((inner / 2) * p.round)}" fill="${esc(colorFor(l, weeks - 1))}"`));
        }
        labels.push(`<text x="${n(right - 5 * s - s * 2.9)}" y="${n(ly + s * 0.72)}" text-anchor="end">Less</text>`);
        labels.push(`<text x="${n(right - s * 2.3)}" y="${n(ly + s * 0.72)}">More</text>`);
        cells.push(...legend);
      }
      labels.unshift(`<g font-family="${fam}" font-size="${n(fs)}" fill="${esc(p.fg)}">`);
      labels.push(`</g>`);
    }

    return svgDoc(
      size,
      clearZonesMask("cg-zones", size, text.zones),
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) + `<g mask="url(#cg-zones)">${cells.join("")}${labels.join("")}</g>` + text.svg,
    );
  },
};

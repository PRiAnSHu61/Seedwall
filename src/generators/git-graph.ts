import type { Generator, ParamSchema, Preset } from "./types";
import { pick } from "./shared/rng";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, fontStack, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  fg: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  lanes: number;
  commits: number;
  labels: boolean;
  direction: string;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#0d1117", group: "Colours", role: "bg" },
  fg: { kind: "color", label: "Labels", default: "#8b949e", group: "Colours", role: "fg" },
  c1: { kind: "color", label: "Branch 1", default: "#58a6ff", group: "Colours", role: "accent" },
  c2: { kind: "color", label: "Branch 2", default: "#3fb950", group: "Colours", role: "accent" },
  c3: { kind: "color", label: "Branch 3", default: "#d2a8ff", group: "Colours", role: "accent" },
  c4: { kind: "color", label: "Branch 4", default: "#f78166", group: "Colours", role: "accent" },
  lanes: { kind: "range", label: "Max branches", min: 2, max: 10, step: 1, default: 6, group: "Graph" },
  commits: { kind: "range", label: "Commits", min: 12, max: 90, step: 1, default: 40, group: "Graph" },
  labels: { kind: "toggle", label: "Hashes + messages", default: true, group: "Graph" },
  direction: {
    kind: "select",
    label: "Direction",
    default: "auto",
    group: "Graph",
    options: [
      { value: "auto", label: "Auto (along the long side)" },
      { value: "horizontal", label: "Left → right" },
      { value: "vertical", label: "Top → bottom" },
    ],
  },
  seed: { kind: "seed", label: "Seed", default: 42 },
  ...textParams({ "text.line1": "git commit -m", "text.line2": "\"*ship it*\"", "text.font": "mono", "text.size": 4, "text.color": "#e6edf3", "text.position": "top-right" }),
};

const presets: Preset<P>[] = [
  { id: "github-dark", title: "GitHub dark", params: {} },
  { id: "dracula", title: "Dracula", params: { bg: "#282a36", fg: "#6272a4", c1: "#bd93f9", c2: "#ff79c6", c3: "#50fa7b", c4: "#ffb86c", seed: 7, "text.color": "#f8f8f2" } },
  { id: "paper-log", title: "Paper log", params: { bg: "#f6f3ee", fg: "#6b6b6b", c1: "#0969da", c2: "#1a7f37", c3: "#8250df", c4: "#cf222e", seed: 11, "text.color": "#1f2328" } },
  { id: "dense-monorepo", title: "Dense monorepo", params: { lanes: 10, commits: 80, labels: false, seed: 99, "text.none": true } },
  { id: "minimal-trunk", title: "Minimal trunk", params: { bg: "#111111", c1: "#ffffff", c2: "#9a9a9a", c3: "#5a5a5a", c4: "#cfcfcf", lanes: 3, commits: 24, seed: 3, "text.color": "#ffffff", "text.line1": "Keep main", "text.line2": "*green*." } },
];

const MESSAGES = ["fix: off-by-one in pager", "feat: add dark mode", "refactor: extract hook", "chore: bump deps", "perf: memoise layout", "docs: update README", "test: cover edge case", "feat: share links", "fix: race in cache", "style: tidy imports", "feat: export PNG", "revert: flaky change", "ci: cache node_modules", "feat: seeded rng"];

interface Seg { lane: number; from: number; to: number; fromLane?: number; toLane?: number }

export const gitGraph: Generator<P> = {
  id: "git-graph",
  name: "Git Graph",
  description: "A stylised git log: coloured branch lanes forking and merging, commit dots, short hashes and messages.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const horizontal = p.direction === "horizontal" || (p.direction === "auto" && size.w >= size.h);
    const maxLanes = Math.round(p.lanes);
    const commits = Math.round(p.commits);
    const colors = [p.c1, p.c2, p.c3, p.c4];

    // Simulate history: lane 0 is main and never ends.
    const active = new Set<number>([0]);
    const start = new Map<number, number>([[0, 0]]);
    const segs: Seg[] = [];
    const dots: { lane: number; t: number; merge: boolean }[] = [];
    for (let t = 0; t < commits; t++) {
      const lanes = [...active];
      const r = rng();
      if (r < 0.22 && active.size < maxLanes) {
        const from = pick(rng, lanes);
        let lane = 1;
        while (active.has(lane)) lane++;
        active.add(lane);
        start.set(lane, t);
        segs.push({ lane, from: t - 1, to: t, fromLane: from });
      } else if (r < 0.4 && active.size > 1) {
        const lane = pick(rng, lanes.filter((l) => l !== 0));
        const into = pick(rng, lanes.filter((l) => l !== lane));
        segs.push({ lane, from: start.get(lane) ?? 0, to: t - 1 }, { lane, from: t - 1, to: t, toLane: into });
        dots.push({ lane: into, t, merge: true });
        active.delete(lane);
        continue;
      }
      dots.push({ lane: pick(rng, [...active]), t, merge: false });
    }
    for (const lane of active) segs.push({ lane, from: start.get(lane) ?? 0, to: commits - 1 });

    // Map (time, lane) → (x, y).
    const along = horizontal ? size.w : size.h;
    const across = horizontal ? size.h : size.w;
    const pad = along * 0.08;
    const step = (along - pad * 2) / Math.max(1, commits - 1);
    // Centre on the lanes the history actually used, not the maximum allowed.
    const used = Math.max(1, ...segs.map((s) => s.lane + 1), ...dots.map((d) => d.lane + 1));
    const laneGap = Math.min(11 * u, (across * 0.6) / used);
    const laneBase = horizontal ? across * 0.5 + ((used - 1) * laneGap) / 2 : across * 0.08;
    const pos = (t: number, lane: number): [number, number] => {
      const a = pad + Math.max(0, t) * step;
      const b = horizontal ? laneBase - lane * laneGap : laneBase + lane * laneGap;
      return horizontal ? [a, b] : [b, a];
    };
    const col = (lane: number): string => esc(colors[lane % colors.length] ?? p.c1);

    const paths = segs
      .map((s) => {
        const a = pos(s.from, s.fromLane ?? s.lane);
        const b = pos(s.to, s.toLane ?? s.lane);
        const mid = horizontal ? `C${n((a[0] + b[0]) / 2)} ${n(a[1])} ${n((a[0] + b[0]) / 2)} ${n(b[1])}` : `C${n(a[0])} ${n((a[1] + b[1]) / 2)} ${n(b[0])} ${n((a[1] + b[1]) / 2)}`;
        return `<path d="M${n(a[0])} ${n(a[1])}${mid} ${n(b[0])} ${n(b[1])}" stroke="${col(s.lane)}"/>`;
      })
      .join("");

    const r = Math.min(1.5 * u, laneGap * 0.3);
    const fs = 1.25 * u;
    const dotSvg: string[] = [];
    const labels: string[] = [];
    const hex = "0123456789abcdef";
    for (const d of dots) {
      const [x, y] = pos(d.t, d.lane);
      dotSvg.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(d.merge ? r * 1.25 : r)}" fill="${d.merge ? esc(p.bg) : col(d.lane)}" stroke="${col(d.lane)}"/>`);
      if (p.labels) {
        const hash = Array.from({ length: 7 }, () => hex[Math.floor(rng() * 16)]).join("");
        const msg = pick(rng, MESSAGES);
        if (horizontal) {
          if (d.t % 2 === 0) labels.push(`<text transform="translate(${n(x)} ${n(laneBase + 3.2 * u)}) rotate(50)">${hash}</text>`);
        } else {
          const lx = laneBase + (used - 1) * laneGap + 4 * u;
          labels.push(`<text x="${n(lx)}" y="${n(y + fs * 0.35)}"><tspan fill="${col(d.lane)}">${hash}</tspan> ${esc(msg)}</text>`);
        }
      }
    }

    const text = layoutText(p, size);
    return svgDoc(
      size,
      clearZonesMask("gg-zones", size, text.zones),
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        `<g mask="url(#gg-zones)">` +
        `<g fill="none" stroke-width="${n(0.55 * u)}" stroke-linecap="round">${paths}</g>` +
        `<g stroke-width="${n(0.3 * u)}">${dotSvg.join("")}</g>` +
        `<g font-family="${esc(fontStack("mono"))}" font-size="${n(fs)}" fill="${esc(p.fg)}" xml:space="preserve">${labels.join("")}</g>` +
        `</g>` +
        text.svg,
    );
  },
};

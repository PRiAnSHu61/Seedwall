import type { Generator, ParamSchema, Preset } from "./types";
import { pick, range } from "./shared/rng";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, fontStack, layoutText, measure, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
  window: boolean;
  code: number;
  prompt: string;
  cursor: boolean;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#0d1117", group: "Colours" },
  fg: { kind: "color", label: "Text", default: "#c9d1d9", group: "Colours" },
  accent: { kind: "color", label: "Keywords", default: "#ff7b72", group: "Colours" },
  accent2: { kind: "color", label: "Strings", default: "#a5d6ff", group: "Colours" },
  window: { kind: "toggle", label: "Window chrome", default: true, group: "Terminal" },
  code: { kind: "range", label: "Code visibility", min: 0, max: 0.5, step: 0.01, default: 0.24, group: "Terminal" },
  prompt: { kind: "text", label: "Prompt line", default: "~/projects/seedwall $ npm run ship", group: "Terminal", maxLength: 80 },
  cursor: { kind: "toggle", label: "Cursor", default: true, group: "Terminal" },
  seed: { kind: "seed", label: "Seed", default: 1 },
  ...textParams({ "text.line1": "// it works on", "text.line2": "my *machine*", "text.font": "mono", "text.size": 4.6, "text.color": "#e6edf3" }),
};

const presets: Preset<P>[] = [
  { id: "github-dark", title: "GitHub dark", params: {} },
  { id: "dracula", title: "Dracula", params: { bg: "#282a36", fg: "#f8f8f2", accent: "#ff79c6", accent2: "#f1fa8c", seed: 6, "text.line1": "sleep(8h);", "text.line2": "commit();", "text.color": "#f8f8f2" } },
  { id: "phosphor", title: "Green phosphor", params: { bg: "#031a0b", fg: "#33ff66", accent: "#9dff9d", accent2: "#00cc44", window: false, code: 0.22, seed: 19, prompt: "guest@mainframe:~$ ./run", "text.line1": "WAKE UP,", "text.line2": "NEO.", "text.color": "#66ff88" } },
  { id: "paper-light", title: "Paper light", params: { bg: "#fafaf7", fg: "#383a42", accent: "#a626a4", accent2: "#50a14f", seed: 4, "text.color": "#1f2328" } },
  { id: "solarized", title: "Solarized", params: { bg: "#002b36", fg: "#93a1a1", accent: "#b58900", accent2: "#2aa198", seed: 31, "text.line1": "Read the logs.", "text.line2": "They *know*.", "text.color": "#eee8d5" } },
];

const CODE = [
  "import { render } from './core';",
  "export async function ship(build: Build) {",
  "  const assets = await bundle(build.entry);",
  "  if (!assets.ok) throw new Error('bundle failed');",
  "  for (const file of assets.files) {",
  "    await upload(file, { cache: 'immutable' });",
  "  }",
  "  return { url: build.url, ms: Date.now() - t0 };",
  "}",
  "const seed = hash(params) >>> 0;",
  "type Wallpaper = { w: number; h: number; svg: string };",
  "// TODO: make it faster",
  "let retries = 3;",
  "while (retries-- > 0) await tick();",
  "return items.filter(Boolean).map(toRow);",
  "if (cache.has(key)) return cache.get(key);",
  "console.log('ready in', ms, 'ms');",
  "export default defineConfig({ strict: true });",
];

const KEYWORDS = new Set(["import", "export", "async", "function", "const", "let", "if", "for", "while", "return", "await", "throw", "new", "type", "default", "from"]);

function colorize(line: string, p: P): string {
  return line
    .split(/('[^']*'|\/\/.*$|\b\w+\b)/)
    .filter(Boolean)
    .map((tok) => {
      if (tok.startsWith("'")) return `<tspan fill="${esc(p.accent2)}">${esc(tok)}</tspan>`;
      if (tok.startsWith("//")) return `<tspan fill-opacity="0.6">${esc(tok)}</tspan>`;
      if (KEYWORDS.has(tok)) return `<tspan fill="${esc(p.accent)}">${esc(tok)}</tspan>`;
      return esc(tok);
    })
    .join("");
}

export const terminal: Generator<P> = {
  id: "terminal",
  name: "Terminal",
  description: "A dark editor / terminal: faint syntax-coloured code, a prompt line with a blinking-block cursor, and your quote on top.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const mono = fontStack("mono");
    const pad = p.window ? 6 * u : 0;
    const bar = p.window ? 4 * u : 0;
    const fx = pad, fy = pad, fw = size.w - pad * 2, fh = size.h - pad * 2;

    const chrome = p.window
      ? rect(fx, fy, fw, fh, `rx="${n(1.2 * u)}" fill="${esc(p.bg)}" stroke="${esc(p.fg)}" stroke-opacity="0.14" stroke-width="${n(0.12 * u)}"`) +
        `<path d="M${n(fx)} ${n(fy + bar)}H${n(fx + fw)}" stroke="${esc(p.fg)}" stroke-opacity="0.12" stroke-width="${n(0.1 * u)}"/>` +
        ["#ff5f57", "#febc2e", "#28c840"].map((c, i) => `<circle cx="${n(fx + 2.6 * u + i * 2.2 * u)}" cy="${n(fy + bar / 2)}" r="${n(0.65 * u)}" fill="${c}"/>`).join("")
      : "";

    const fs = 1.35 * u;
    const lh = fs * 1.7;
    const top = fy + bar + 3 * u;
    const bottom = fy + fh - 9 * u;
    const lines: string[] = [];
    let ln = 1 + Math.floor(rng() * 200);
    for (let y = top; y < bottom; y += lh, ln++) {
      if (rng() < 0.12) continue;
      const src = pick(rng, CODE);
      lines.push(
        `<text x="${n(fx + 2.5 * u)}" y="${n(y)}" fill-opacity="0.45">${ln}</text>` +
          `<text x="${n(fx + 7 * u + Math.floor(range(rng, 0, 3)) * 2 * fs * 0.6)}" y="${n(y)}">${colorize(src, p)}</text>`,
      );
    }

    const py = fy + fh - 4 * u;
    const pfs = 1.7 * u;
    const pw = measure(p.prompt, "mono", pfs);
    const promptSvg =
      `<text x="${n(fx + 2.5 * u)}" y="${n(py)}" font-size="${n(pfs)}" fill="${esc(p.fg)}"><tspan fill="${esc(p.accent2)}">› </tspan>${esc(p.prompt)}</text>` +
      (p.cursor ? rect(fx + 2.5 * u + pw + measure("› ", "mono", pfs) + 0.4 * u, py - pfs * 0.82, pfs * 0.6, pfs * 1.05, `fill="${esc(p.fg)}" opacity="0.85"`) : "");

    const text = layoutText(p, size, { inset: pad + 9 * u });
    return svgDoc(
      size,
      clearZonesMask("tm-zones", size, text.zones),
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        chrome +
        `<g mask="url(#tm-zones)" font-family="${esc(mono)}" font-size="${n(fs)}" fill="${esc(p.fg)}" opacity="${n(p.code)}" xml:space="preserve">${lines.join("")}</g>` +
        `<g font-family="${esc(mono)}" xml:space="preserve">${promptSvg}</g>` +
        text.svg,
    );
  },
};

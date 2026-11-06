/**
 * Editor syntax themes. Applying one recolours any generator: every colour param
 * declares a role (bg / fg / accent), and accents are dealt out in order.
 */
export interface SyntaxTheme {
  id: string;
  name: string;
  bg: string;
  fg: string;
  /** Most characteristic first — generators with one accent get accents[0]. */
  accents: readonly string[];
}

export const THEMES: readonly SyntaxTheme[] = [
  { id: "dracula", name: "Dracula", bg: "#282a36", fg: "#f8f8f2", accents: ["#bd93f9", "#ff79c6", "#50fa7b", "#8be9fd", "#ffb86c", "#f1fa8c"] },
  { id: "nord", name: "Nord", bg: "#2e3440", fg: "#eceff4", accents: ["#88c0d0", "#81a1c1", "#a3be8c", "#b48ead", "#ebcb8b", "#bf616a"] },
  { id: "tokyo-night", name: "Tokyo Night", bg: "#1a1b26", fg: "#c0caf5", accents: ["#7aa2f7", "#bb9af7", "#7dcfff", "#9ece6a", "#ff9e64", "#f7768e"] },
  { id: "gruvbox", name: "Gruvbox", bg: "#282828", fg: "#ebdbb2", accents: ["#fabd2f", "#fe8019", "#b8bb26", "#83a598", "#d3869b", "#fb4934"] },
  { id: "catppuccin", name: "Catppuccin Mocha", bg: "#1e1e2e", fg: "#cdd6f4", accents: ["#cba6f7", "#f5c2e7", "#89b4fa", "#a6e3a1", "#fab387", "#94e2d5"] },
  { id: "one-dark", name: "One Dark", bg: "#282c34", fg: "#abb2bf", accents: ["#61afef", "#c678dd", "#98c379", "#e5c07b", "#e06c75", "#56b6c2"] },
  { id: "rose-pine", name: "Rosé Pine", bg: "#191724", fg: "#e0def4", accents: ["#ebbcba", "#c4a7e7", "#9ccfd8", "#f6c177", "#31748f", "#eb6f92"] },
  { id: "solarized", name: "Solarized Dark", bg: "#002b36", fg: "#eee8d5", accents: ["#268bd2", "#2aa198", "#b58900", "#cb4b16", "#d33682", "#859900"] },
  { id: "github-light", name: "GitHub Light", bg: "#ffffff", fg: "#1f2328", accents: ["#0969da", "#8250df", "#1a7f37", "#cf222e", "#bc4c00", "#0550ae"] },
];

export function getTheme(id: string): SyntaxTheme | undefined {
  return THEMES.find((t) => t.id === id);
}

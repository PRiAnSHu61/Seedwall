/**
 * Inline SVGs share one id namespace with the page, so two wallpapers on screen would
 * fight over "#cm-grain". Prefix every id and its references with a unique scope.
 */
export function scopeSvgIds(svg: string, scope: string): string {
  return svg
    .replace(/\bid="([^"]+)"/g, `id="${scope}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${scope}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${scope}-$1"`);
}

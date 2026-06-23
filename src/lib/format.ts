export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)), units.length - 1)
  const value = bytes / Math.pow(k, i)
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatPct(pct: number): string {
  const sign = pct > 0 ? '−' : pct < 0 ? '+' : ''
  return `${sign}${Math.abs(pct).toFixed(1)}%`
}

/** Filename-safe slug, used to namespace SVG ids and label downloads. */
export function slugify(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'asset'
  )
}

export function classifyMime(file: File): { kind: 'raster' | 'svg' | 'unsupported'; mime: string } {
  const name = file.name.toLowerCase()
  const type = file.type
  if (type === 'image/svg+xml' || name.endsWith('.svg')) return { kind: 'svg', mime: 'image/svg+xml' }
  if (type === 'image/png' || name.endsWith('.png')) return { kind: 'raster', mime: 'image/png' }
  if (type === 'image/jpeg' || /\.jpe?g$/.test(name)) return { kind: 'raster', mime: 'image/jpeg' }
  if (type === 'image/webp' || name.endsWith('.webp')) return { kind: 'raster', mime: 'image/webp' }
  return { kind: 'unsupported', mime: type || 'application/octet-stream' }
}

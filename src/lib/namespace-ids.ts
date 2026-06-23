// Prefix every id in an SVG and rewrite all internal references, so the file
// can be safely inlined alongside others without cross-file id collisions.

const URL_REF = /url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g

export function namespaceIds(text: string, prefix: string): string {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return text

  const elements = [svg, ...Array.from(svg.getElementsByTagName('*'))] as Element[]

  const map = new Map<string, string>()
  for (const el of elements) {
    const id = el.getAttribute('id')
    if (id && !map.has(id)) map.set(id, `${prefix}__${id}`)
  }
  if (!map.size) return text

  for (const el of elements) {
    const id = el.getAttribute('id')
    if (id && map.has(id)) el.setAttribute('id', map.get(id)!)

    for (const attr of Array.from(el.attributes)) {
      let value = attr.value
      let changed = false

      const replaced = value.replace(URL_REF, (full, refId: string) => {
        const mapped = map.get(refId)
        if (!mapped) return full
        changed = true
        return `url(#${mapped})`
      })
      if (replaced !== value) value = replaced

      if (attr.localName === 'href' && value.startsWith('#')) {
        const mapped = map.get(value.slice(1))
        if (mapped) {
          value = `#${mapped}`
          changed = true
        }
      }

      if (changed) el.setAttribute(attr.name, value)
    }
  }

  return new XMLSerializer().serializeToString(svg)
}

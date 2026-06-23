// ---------------------------------------------------------------------------
// SVG Health Check — DOMParser-based static analysis. Pure, no rendering.
// Produces a severity-graded report of performance + correctness findings.
// ---------------------------------------------------------------------------

import type { SvgFinding, SvgReport, WorstSeverity } from '../types'

// Filter primitives that are cheap-ish vs. genuinely expensive on mobile GPUs.
const EXPENSIVE_PRIMITIVES = [
  'feTurbulence',
  'feDisplacementMap',
  'feMorphology',
  'feConvolveMatrix',
  'feSpecularLighting',
  'feDiffuseLighting',
]
const ANIMATION_TAGS = ['animate', 'animateTransform', 'animateMotion', 'set']
const DEF_TAGS = ['linearGradient', 'radialGradient', 'filter', 'clipPath', 'mask', 'pattern']

const NODE_WARN = 1500
const NODE_ERROR = 5000
const PATH_CMD_WARN = 1000
const BLUR_ERROR_STDDEV = 4

const URL_REF = /url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g

function rollup(findings: SvgFinding[]): { worst: WorstSeverity; counts: SvgReport['counts'] } {
  const counts = { error: 0, warn: 0, info: 0 }
  for (const f of findings) counts[f.severity]++
  const worst: WorstSeverity = counts.error ? 'error' : counts.warn ? 'warn' : counts.info ? 'info' : 'ok'
  return { worst, counts }
}

/** Largest number appearing in a space/comma separated attribute (e.g. stdDeviation="2 4"). */
function maxNumber(value: string | null): number {
  if (!value) return 0
  let max = 0
  for (const m of value.trim().split(/[\s,]+/)) {
    const n = parseFloat(m)
    if (!Number.isNaN(n)) max = Math.max(max, Math.abs(n))
  }
  return max
}

function ancestorHasFilter(el: Element, root: Element): boolean {
  let cur: Element | null = el
  while (cur && cur !== root.parentElement) {
    if (cur.getAttribute('filter') || /filter\s*:/.test(cur.getAttribute('style') ?? '')) return true
    cur = cur.parentElement
  }
  return false
}

export function analyzeSvg(text: string): SvgReport {
  const findings: SvgFinding[] = []
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')

  const parseError = doc.querySelector('parsererror')
  const svg = doc.querySelector('svg')
  if (parseError || !svg) {
    findings.push({
      severity: 'error',
      code: 'parse-error',
      title: 'SVG failed to parse',
      detail: parseError?.textContent?.trim().slice(0, 200) || 'No <svg> root element found.',
    })
    const { worst, counts } = rollup(findings)
    return { findings, worst, counts, ids: [], duplicateIds: {}, nodeCount: 0 }
  }

  const all = Array.from(svg.getElementsByTagName('*')) as Element[]
  const elements = [svg, ...all]
  const nodeCount = elements.length

  // --- id bookkeeping ------------------------------------------------------
  const idCounts: Record<string, number> = {}
  const ids: string[] = []
  for (const el of elements) {
    const id = el.getAttribute('id')
    if (id) {
      idCounts[id] = (idCounts[id] ?? 0) + 1
      if (idCounts[id] === 1) ids.push(id)
    }
  }
  const duplicateIds: Record<string, number> = {}
  for (const [id, n] of Object.entries(idCounts)) if (n > 1) duplicateIds[id] = n

  // Collect every referenced id (url(#x) in any attribute + href="#x").
  const referenced = new Set<string>()
  for (const el of elements) {
    for (const attr of Array.from(el.attributes)) {
      const v = attr.value
      if (attr.localName === 'href' && v.startsWith('#')) referenced.add(v.slice(1))
      URL_REF.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = URL_REF.exec(v))) referenced.add(m[1])
    }
  }

  // --- correctness checks --------------------------------------------------
  if (!svg.getAttribute('viewBox')) {
    findings.push({
      severity: 'warn',
      code: 'no-viewbox',
      title: 'Missing viewBox',
      detail: 'Without a viewBox the SVG will not scale responsively.',
    })
  }

  const dupEntries = Object.entries(duplicateIds)
  if (dupEntries.length) {
    findings.push({
      severity: 'error',
      code: 'dup-id',
      title: `${dupEntries.length} duplicate id${dupEntries.length > 1 ? 's' : ''} in file`,
      detail: dupEntries.map(([id, n]) => `#${id} ×${n}`).join(', ') + ' — url(#…) refs may resolve to the wrong node.',
    })
  }

  const dangling = [...referenced].filter((id) => !(id in idCounts))
  if (dangling.length) {
    findings.push({
      severity: 'error',
      code: 'dangling-ref',
      title: `${dangling.length} dangling reference${dangling.length > 1 ? 's' : ''}`,
      detail: dangling.map((id) => `#${id}`).join(', ') + ' — referenced but not defined.',
    })
  }

  const unusedDefs = elements.filter((el) => {
    const id = el.getAttribute('id')
    return id && DEF_TAGS.includes(el.localName) && !referenced.has(id)
  })
  if (unusedDefs.length) {
    findings.push({
      severity: 'info',
      code: 'unused-defs',
      title: `${unusedDefs.length} unused def${unusedDefs.length > 1 ? 's' : ''}`,
      detail: unusedDefs.map((el) => `<${el.localName} #${el.getAttribute('id')}>`).join(', ') + ' — SVGO will strip these.',
    })
  }

  // --- node count ----------------------------------------------------------
  if (nodeCount > NODE_ERROR) {
    findings.push({
      severity: 'error',
      code: 'node-count',
      title: `Very high node count (${nodeCount})`,
      detail: `> ${NODE_ERROR} elements — expect slow parsing and layout on mobile.`,
    })
  } else if (nodeCount > NODE_WARN) {
    findings.push({
      severity: 'warn',
      code: 'node-count',
      title: `High node count (${nodeCount})`,
      detail: `> ${NODE_WARN} elements.`,
    })
  }

  // --- blur filters --------------------------------------------------------
  const blurs = elements.filter((el) => el.localName === 'feGaussianBlur')
  if (blurs.length) {
    const maxStd = Math.max(...blurs.map((b) => maxNumber(b.getAttribute('stdDeviation'))))
    if (maxStd > BLUR_ERROR_STDDEV) {
      findings.push({
        severity: 'error',
        code: 'blur-heavy',
        title: `Heavy blur (max stdDeviation ${maxStd})`,
        detail: `${blurs.length} feGaussianBlur — large blur radii jank on mobile scroll/animation.`,
      })
    } else {
      findings.push({
        severity: 'warn',
        code: 'blur',
        title: `${blurs.length} blur filter${blurs.length > 1 ? 's' : ''} (max stdDeviation ${maxStd})`,
        detail: 'feGaussianBlur forces an offscreen buffer; use sparingly.',
      })
    }
  }

  // --- expensive primitives ------------------------------------------------
  const expensive = elements.filter((el) => EXPENSIVE_PRIMITIVES.includes(el.localName))
  if (expensive.length) {
    const tally: Record<string, number> = {}
    for (const el of expensive) tally[el.localName] = (tally[el.localName] ?? 0) + 1
    findings.push({
      severity: 'error',
      code: 'expensive-primitive',
      title: 'Expensive filter primitive(s)',
      detail: Object.entries(tally).map(([t, n]) => `${t} ×${n}`).join(', ') + ' — costly per-pixel work.',
    })
  }

  // --- oversized filter region --------------------------------------------
  const viewBox = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
  const maxDim = viewBox.length === 4 ? Math.max(viewBox[2], viewBox[3]) : 0
  for (const filter of elements.filter((el) => el.localName === 'filter')) {
    const units = filter.getAttribute('filterUnits') ?? 'objectBoundingBox'
    const w = filter.getAttribute('width')
    const h = filter.getAttribute('height')
    const oversized = [w, h].some((dim) => {
      if (!dim) return false
      const pct = dim.endsWith('%')
      const n = parseFloat(dim)
      if (Number.isNaN(n)) return false
      if (units === 'objectBoundingBox') return (pct ? n / 100 : n) > 2.5
      return maxDim > 0 && n > maxDim * 2.5
    })
    if (oversized) {
      findings.push({
        severity: 'warn',
        code: 'filter-region',
        title: 'Oversized filter region',
        detail: `<filter${filter.id ? ` #${filter.id}` : ''}> region (${w ?? '?'}×${h ?? '?'}) much larger than its target — large offscreen buffer.`,
      })
    }
  }

  // --- path complexity -----------------------------------------------------
  let worstPath = 0
  for (const path of elements.filter((el) => el.localName === 'path')) {
    const d = path.getAttribute('d') ?? ''
    const cmds = (d.match(/[a-df-zA-DF-Z]/g) ?? []).length // command letters (excludes 'e' in exponents)
    worstPath = Math.max(worstPath, cmds)
  }
  if (worstPath > PATH_CMD_WARN) {
    findings.push({
      severity: 'warn',
      code: 'path-complexity',
      title: `Very complex path (${worstPath} commands)`,
      detail: 'Consider simplifying — high command counts slow rasterization.',
    })
  }

  // --- animated filters ----------------------------------------------------
  const animations = elements.filter((el) => ANIMATION_TAGS.includes(el.localName))
  const animatedFilter = animations.some((anim) => {
    // Inside a <filter> subtree, or on/within a filtered element.
    let cur: Element | null = anim
    while (cur) {
      if (cur.localName === 'filter') return true
      cur = cur.parentElement
    }
    return ancestorHasFilter(anim, svg)
  })
  if (animatedFilter) {
    findings.push({
      severity: 'error',
      code: 'animated-filter',
      title: 'Animation on a filtered element',
      detail: 'SMIL animation forces the filter to re-rasterize every frame.',
    })
  }

  // --- misc perf warnings --------------------------------------------------
  const hasBlend = elements.some(
    (el) => el.getAttribute('mix-blend-mode') || /mix-blend-mode\s*:/.test(el.getAttribute('style') ?? ''),
  )
  if (hasBlend) {
    findings.push({ severity: 'warn', code: 'blend-mode', title: 'mix-blend-mode used', detail: 'Blend modes trigger offscreen compositing.' })
  }

  const nestedClip = elements.some((el) => {
    if (el.localName !== 'clipPath' && el.localName !== 'mask') return false
    return Array.from(el.getElementsByTagName('*')).some(
      (c) => c.getAttribute('clip-path') || c.getAttribute('mask'),
    )
  })
  if (nestedClip) {
    findings.push({ severity: 'warn', code: 'nested-clip', title: 'Nested clipPath/mask', detail: 'Nested clipping/masking is expensive to composite.' })
  }

  if (elements.some((el) => el.localName === 'foreignObject')) {
    findings.push({ severity: 'warn', code: 'foreign-object', title: '<foreignObject> present', detail: 'Embeds HTML — inconsistent across renderers and costly.' })
  }

  const embeddedRaster = elements.filter((el) => {
    if (el.localName !== 'image') return false
    const href = el.getAttribute('href') ?? el.getAttribute('xlink:href') ?? ''
    return href.startsWith('data:')
  })
  if (embeddedRaster.length) {
    findings.push({
      severity: 'warn',
      code: 'embedded-raster',
      title: `${embeddedRaster.length} embedded raster image${embeddedRaster.length > 1 ? 's' : ''}`,
      detail: 'data: URI raster inside SVG bloats the file and defeats vector scaling.',
    })
  }

  const { worst, counts } = rollup(findings)
  return { findings, worst, counts, ids, duplicateIds, nodeCount }
}

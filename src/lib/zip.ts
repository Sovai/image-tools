import { zipSync, strToU8, type Zippable } from 'fflate'
import type { FileResult } from '../types'

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

/** Disambiguate identical paths within the zip by appending -2, -3, … */
function uniquePath(used: Set<string>, path: string): string {
  if (!used.has(path)) {
    used.add(path)
    return path
  }
  const dot = path.lastIndexOf('.')
  const stem = dot === -1 ? path : path.slice(0, dot)
  const ext = dot === -1 ? '' : path.slice(dot)
  let i = 2
  let candidate = `${stem}-${i}${ext}`
  while (used.has(candidate)) candidate = `${stem}-${++i}${ext}`
  used.add(candidate)
  return candidate
}

function download(bytes: Uint8Array, filename: string) {
  // Copy into a fresh ArrayBuffer-backed view for a clean Blob part.
  const blob = new Blob([bytes.slice()], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Smallest-per-image output that actually beat the original. */
export function zipWinners(files: FileResult[]) {
  const entries: Zippable = {}
  const used = new Set<string>()
  for (const f of files) {
    if (f.status !== 'done') continue
    if (f.kind === 'raster' && f.winner) {
      const path = uniquePath(used, `${baseName(f.name)}.${f.winner.ext}`)
      entries[path] = new Uint8Array(f.winner.buffer)
    } else if (f.kind === 'svg' && f.svg) {
      const text = f.svg.fixedText ?? f.svg.optimizedText
      const path = uniquePath(used, `${baseName(f.name)}.svg`)
      entries[path] = strToU8(text)
    }
  }
  if (!Object.keys(entries).length) return false
  download(zipSync(entries), 'winners.zip')
  return true
}

/** Everything, organized into per-format folders. */
export function zipAll(files: FileResult[]) {
  const entries: Zippable = {}
  const used = new Set<string>()
  for (const f of files) {
    if (f.status !== 'done') continue
    if (f.kind === 'raster' && f.outputs) {
      for (const o of f.outputs) {
        const tag = o.fileTag ? `.${o.fileTag}` : ''
        const path = uniquePath(used, `${o.ext}/${baseName(f.name)}${tag}.${o.ext}`)
        entries[path] = new Uint8Array(o.buffer)
      }
    } else if (f.kind === 'svg' && f.svg) {
      entries[uniquePath(used, `svg/${baseName(f.name)}.svg`)] = strToU8(f.svg.optimizedText)
      if (f.svg.fixedText) {
        entries[uniquePath(used, `svg/${baseName(f.name)}.namespaced.svg`)] = strToU8(f.svg.fixedText)
      }
    }
  }
  if (!Object.keys(entries).length) return false
  download(zipSync(entries), 'image-tools-export.zip')
  return true
}

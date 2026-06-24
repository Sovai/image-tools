import { computed, reactive, ref } from 'vue'
import type {
  FileResult,
  RasterOutput,
  RasterRequest,
  RasterResponse,
  SvgRequest,
  SvgResponse,
} from '../types'
import { classifyMime, slugify } from '../lib/format'
import { analyzeSvg } from '../lib/svg-health'
import { namespaceIds } from '../lib/namespace-ids'

// --- raster worker pool -----------------------------------------------------

interface RasterHandlers {
  onProgress: (progress: number, stage: string) => void
  onOutput: (output: RasterOutput) => void
}

interface RasterTask extends RasterHandlers {
  req: RasterRequest
  resolve: () => void
  reject: (e: Error) => void
}

interface PoolWorker {
  worker: Worker
  currentId?: string
}

class RasterPool {
  private workers: PoolWorker[] = []
  private idle: PoolWorker[] = []
  private queue: RasterTask[] = []
  private tasks = new Map<string, RasterTask>()

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL('../workers/raster.worker.ts', import.meta.url), {
        type: 'module',
      })
      const pw: PoolWorker = { worker }
      worker.onmessage = (e: MessageEvent<RasterResponse>) => this.onMessage(pw, e.data)
      worker.onerror = (e) => this.onWorkerError(pw, e.message || 'worker crashed')
      this.workers.push(pw)
      this.idle.push(pw)
    }
  }

  process(req: RasterRequest, handlers: RasterHandlers): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ req, ...handlers, resolve, reject })
      this.pump()
    })
  }

  private pump() {
    while (this.idle.length && this.queue.length) {
      const pw = this.idle.pop()!
      const task = this.queue.shift()!
      pw.currentId = task.req.id
      this.tasks.set(task.req.id, task)
      // The buffer is transferred to the worker (zero-copy); the main thread
      // loses access, which is fine — we keep the original File for thumbnails.
      pw.worker.postMessage(task.req, [task.req.buffer])
    }
  }

  private free(pw: PoolWorker) {
    pw.currentId = undefined
    this.idle.push(pw)
    this.pump()
  }

  private onMessage(pw: PoolWorker, msg: RasterResponse) {
    const task = this.tasks.get(msg.id)
    if (!task) return
    if (msg.type === 'progress') {
      task.onProgress(msg.progress, msg.stage)
    } else if (msg.type === 'output') {
      task.onOutput(msg.output)
    } else if (msg.type === 'done') {
      this.tasks.delete(msg.id)
      this.free(pw)
      task.resolve()
    } else {
      this.tasks.delete(msg.id)
      this.free(pw)
      task.reject(new Error(msg.message))
    }
  }

  private onWorkerError(pw: PoolWorker, message: string) {
    if (pw.currentId) {
      const task = this.tasks.get(pw.currentId)
      this.tasks.delete(pw.currentId)
      task?.reject(new Error(message))
    }
    this.free(pw)
  }
}

// --- svg (SVGO) worker ------------------------------------------------------

class SvgOptimizer {
  private worker: Worker
  private pending = new Map<string, { resolve: (s: string) => void; reject: (e: Error) => void }>()

  constructor() {
    this.worker = new Worker(new URL('../workers/svg.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e: MessageEvent<SvgResponse>) => {
      const msg = e.data
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      if (msg.type === 'done') p.resolve(msg.optimizedText)
      else p.reject(new Error(msg.message))
    }
  }

  optimize(req: SvgRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pending.set(req.id, { resolve, reject })
      this.worker.postMessage(req)
    })
  }
}

// --- composable -------------------------------------------------------------

export function useProcessor() {
  const files = ref<FileResult[]>([])
  const objectUrls: string[] = []

  const poolSize = Math.max(1, Math.min((navigator.hardwareConcurrency || 4) - 1, 4))
  const pool = new RasterPool(poolSize)
  const svgo = new SvgOptimizer()

  let counter = 0
  const nextId = () => `f${Date.now().toString(36)}-${counter++}`

  function trackUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob)
    objectUrls.push(url)
    return url
  }

  function pickWinner(outputs: RasterOutput[]): RasterOutput | undefined {
    const smaller = outputs.filter((o) => o.smaller)
    if (!smaller.length) return undefined
    return smaller.reduce((best, o) => (o.size < best.size ? o : best))
  }

  async function processRaster(file: File, result: FileResult) {
    try {
      result.thumbnailUrl = trackUrl(file)
      const buffer = await file.arrayBuffer()
      result.status = 'processing'
      result.outputs = []
      await pool.process(
        { id: result.id, mime: result.mime, name: file.name, buffer },
        {
          onProgress: (p, stage) => {
            result.progress = p
            result.stage = stage
          },
          // Each format streams in as it finishes (revealed immediately), but
          // the winner is only decided once every output is in — see below.
          onOutput: (output) => {
            result.outputs!.push(output)
          },
        },
      )
      result.winner = pickWinner(result.outputs)
      result.progress = 100
      result.status = 'done'
    } catch (err) {
      result.status = 'error'
      result.error = err instanceof Error ? err.message : String(err)
    }
  }

  async function processSvg(file: File, result: FileResult) {
    try {
      result.status = 'processing'
      const text = await file.text()
      result.originalText = text
      result.thumbnailUrl = trackUrl(new Blob([text], { type: 'image/svg+xml' }))

      // Health check on the main thread (DOMParser); SVGO in the worker.
      const report = analyzeSvg(text)
      result.progress = 50
      let optimizedText = text
      try {
        optimizedText = await svgo.optimize({ id: result.id, text })
      } catch {
        // Keep the original markup if SVGO chokes; the health report still stands.
      }
      const optimizedSize = new Blob([optimizedText]).size
      const savedBytes = result.originalSize - optimizedSize
      result.svg = {
        optimizedText,
        optimizedSize,
        savedBytes,
        savedPct: result.originalSize > 0 ? (savedBytes / result.originalSize) * 100 : 0,
        report,
      }
      result.progress = 100
      result.status = 'done'
    } catch (err) {
      result.status = 'error'
      result.error = err instanceof Error ? err.message : String(err)
    }
  }

  function addFiles(fileList: FileList | File[]) {
    for (const file of Array.from(fileList)) {
      const { kind, mime } = classifyMime(file)
      const result = reactive<FileResult>({
        id: nextId(),
        name: file.name,
        slug: slugify(file.name),
        mime,
        kind,
        status: kind === 'unsupported' ? 'error' : 'queued',
        progress: 0,
        originalSize: file.size,
        error: kind === 'unsupported' ? 'Unsupported file type' : undefined,
      }) as FileResult
      files.value.push(result)

      if (kind === 'raster') void processRaster(file, result)
      else if (kind === 'svg') void processSvg(file, result)
    }
  }

  /** Apply the namespace-ids auto-fix to one SVG and re-run the pipeline. */
  async function applyNamespaceFix(result: FileResult) {
    if (result.kind !== 'svg' || !result.originalText || !result.svg) return
    const fixed = namespaceIds(result.originalText, result.slug)
    let optimized = fixed
    try {
      optimized = await svgo.optimize({ id: `${result.id}-fix`, text: fixed })
    } catch {
      /* fall back to un-optimized fixed text */
    }
    const report = analyzeSvg(optimized)
    const optimizedSize = new Blob([optimized]).size
    const savedBytes = result.originalSize - optimizedSize
    result.svg = {
      ...result.svg,
      optimizedText: optimized,
      fixedText: optimized,
      fixApplied: true,
      optimizedSize,
      savedBytes,
      savedPct: result.originalSize > 0 ? (savedBytes / result.originalSize) * 100 : 0,
      report,
    }
  }

  function removeFile(id: string) {
    files.value = files.value.filter((f) => f.id !== id)
  }

  function clearAll() {
    for (const url of objectUrls.splice(0)) URL.revokeObjectURL(url)
    files.value = []
  }

  function downloadOutput(name: string, output: RasterOutput) {
    const base = name.replace(/\.[^.]+$/, '')
    const tag = output.fileTag ? `.${output.fileTag}` : ''
    const blob = new Blob([new Uint8Array(output.buffer)], { type: output.mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}${tag}.${output.ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  function downloadSvg(result: FileResult) {
    if (!result.svg) return
    const text = result.svg.fixedText ?? result.svg.optimizedText
    const base = result.name.replace(/\.[^.]+$/, '')
    const blob = new Blob([text], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}.svg`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  // --- aggregate views ------------------------------------------------------

  const svgFiles = computed(() => files.value.filter((f) => f.kind === 'svg' && f.svg))

  /** ids that appear in more than one SVG file — the inline-SVG footgun. */
  const crossFileCollisions = computed(() => {
    const map = new Map<string, string[]>()
    for (const f of svgFiles.value) {
      for (const id of f.svg!.report.ids) {
        const arr = map.get(id) ?? []
        arr.push(f.name)
        map.set(id, arr)
      }
    }
    return [...map.entries()]
      .filter(([, names]) => new Set(names).size > 1)
      .map(([id, names]) => ({ id, files: [...new Set(names)] }))
      .sort((a, b) => b.files.length - a.files.length)
  })

  const summary = computed(() => {
    let originalTotal = 0
    let optimizedTotal = 0
    let savedFiles = 0
    for (const f of files.value) {
      if (f.status !== 'done') continue
      originalTotal += f.originalSize
      if (f.kind === 'raster') {
        const best = f.winner?.size ?? f.originalSize
        optimizedTotal += best
        if (f.winner) savedFiles++
      } else if (f.kind === 'svg' && f.svg) {
        optimizedTotal += Math.min(f.svg.optimizedSize, f.originalSize)
        if (f.svg.savedBytes > 0) savedFiles++
      }
    }
    const savedBytes = originalTotal - optimizedTotal
    return {
      count: files.value.length,
      done: files.value.filter((f) => f.status === 'done').length,
      originalTotal,
      optimizedTotal,
      savedBytes,
      savedPct: originalTotal > 0 ? (savedBytes / originalTotal) * 100 : 0,
      savedFiles,
    }
  })

  const svgSummary = computed(() => {
    const counts = { error: 0, warn: 0, info: 0, ok: 0 }
    for (const f of svgFiles.value) counts[f.svg!.report.worst]++
    return { total: svgFiles.value.length, counts }
  })

  return {
    files,
    summary,
    svgFiles,
    svgSummary,
    crossFileCollisions,
    addFiles,
    removeFile,
    clearAll,
    applyNamespaceFix,
    downloadOutput,
    downloadSvg,
  }
}

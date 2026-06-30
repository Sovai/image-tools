// ---------------------------------------------------------------------------
// Shared types across UI, workers and lib helpers.
// ---------------------------------------------------------------------------

export type Severity = 'error' | 'warn' | 'info'
/** Worst-case rollup including the "nothing wrong" state. */
export type WorstSeverity = Severity | 'ok'

export type RasterKind = 'optimized' | 'quantized' | 'express' | 'webp' | 'avif'

export interface RasterOutput {
  kind: RasterKind
  /** Human label, e.g. "Optimized PNG", "PNG (quantized)", "WebP", "AVIF". */
  label: string
  mime: string
  ext: string
  /** Optional filename stem suffix to disambiguate same-ext outputs (e.g. "min"). */
  fileTag?: string
  /** True when this output is lossy/visually-lossless rather than bit-exact. */
  lossy?: boolean
  buffer: ArrayBuffer
  size: number
  /** Positive = bytes saved vs original. Negative = output is larger. */
  savedBytes: number
  savedPct: number
  /** True only when this output is strictly smaller than the source. */
  smaller: boolean
}

export interface SvgFinding {
  severity: Severity
  /** Stable code, e.g. "blur-heavy", "dup-id". */
  code: string
  title: string
  detail?: string
}

export interface SvgReport {
  findings: SvgFinding[]
  worst: WorstSeverity
  counts: { error: number; warn: number; info: number }
  /** Every id declared in the file (used for cross-file collision detection). */
  ids: string[]
  /** id -> occurrence count, only for ids appearing more than once. */
  duplicateIds: Record<string, number>
  /** Total element count in the parsed document. */
  nodeCount: number
}

export interface SvgData {
  /** Optimized SVG markup (after SVGO). */
  optimizedText: string
  optimizedSize: number
  savedBytes: number
  savedPct: number
  report: SvgReport
  /** Set after a namespace-ids auto-fix has been applied. */
  fixedText?: string
  fixApplied?: boolean
}

export type FileKind = 'raster' | 'svg' | 'unsupported'
// 'ready' = loaded, size set, waiting for the user to optimize.
export type FileStatus = 'ready' | 'queued' | 'processing' | 'done' | 'error'

/** Crop (in source pixels) + output size applied to a raster before encoding. */
export interface Transform {
  cropX: number
  cropY: number
  cropW: number
  cropH: number
  outW: number
  outH: number
  /** When true, output W/H stay locked to the crop's aspect ratio. */
  lockAspect: boolean
}

/** Global "downscale on import" default. */
export type ResizeMode = 'none' | 'half' | 'third' | 'quarter' | 'max'
export interface GlobalResize {
  mode: ResizeMode
  /** Longest-side cap in px, used when mode === 'max'. */
  maxDim: number
}

export interface FileResult {
  id: string
  name: string
  /** Lower-cased slug derived from the filename, used for id namespacing. */
  slug: string
  mime: string
  kind: FileKind
  status: FileStatus
  progress: number
  /** Human-readable current step, e.g. "Encoding AVIF (slowest)…". */
  stage?: string
  error?: string
  originalSize: number
  thumbnailUrl?: string

  // raster
  /** Source pixel dimensions (rasters only). */
  naturalWidth?: number
  naturalHeight?: number
  /** Crop + resize to apply before encoding. */
  transform?: Transform
  /** True once the user has manually edited this file's transform. */
  edited?: boolean
  outputs?: RasterOutput[]
  winner?: RasterOutput

  // svg
  svg?: SvgData
  /** Raw original markup, kept so auto-fixes can re-run the pipeline. */
  originalText?: string
}

// --- Worker message protocol (raster) -------------------------------------

export interface RasterRequest {
  id: string
  mime: string
  name: string
  buffer: ArrayBuffer
  /** Optional crop + resize applied before encoding (null = original pixels). */
  transform?: Transform | null
}

export interface RasterProgressMsg {
  type: 'progress'
  id: string
  progress: number
  stage: string
}

/** Emitted once per output as soon as it finishes encoding (streamed). */
export interface RasterOutputMsg {
  type: 'output'
  id: string
  output: RasterOutput
}

export interface RasterDoneMsg {
  type: 'done'
  id: string
}

export interface RasterErrorMsg {
  type: 'error'
  id: string
  message: string
}

export type RasterResponse = RasterProgressMsg | RasterOutputMsg | RasterDoneMsg | RasterErrorMsg

// --- Worker message protocol (svg / SVGO) ---------------------------------

export interface SvgRequest {
  id: string
  text: string
}

export interface SvgDoneMsg {
  type: 'done'
  id: string
  optimizedText: string
}

export interface SvgErrorMsg {
  type: 'error'
  id: string
  message: string
}

export type SvgResponse = SvgDoneMsg | SvgErrorMsg

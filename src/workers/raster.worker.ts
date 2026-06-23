/// <reference lib="webworker" />
// Handles all raster codecs off the main thread. Decodes the input to
// ImageData exactly once, then fans out to the lossless encoders.

import { decode as decodePng } from '@jsquash/png'
import optimisePng from '@jsquash/oxipng/optimise'
import { decode as decodeJpeg, encode as encodeJpeg } from '@jsquash/jpeg'
import { decode as decodeWebp, encode as encodeWebp } from '@jsquash/webp'
import { encode as encodeAvif } from '@jsquash/avif'
import { applyPaletteSync, buildPaletteSync, utils as iqUtils } from 'image-q'

import type { RasterKind, RasterOutput, RasterRequest, RasterResponse } from '../types'

const ctx = self as unknown as DedicatedWorkerGlobalScope

function post(msg: RasterResponse, transfer: Transferable[] = []) {
  ctx.postMessage(msg, transfer)
}

async function decode(mime: string, buffer: ArrayBuffer): Promise<ImageData> {
  switch (mime) {
    case 'image/png':
      return decodePng(buffer)
    case 'image/jpeg':
      return decodeJpeg(buffer)
    case 'image/webp':
      return decodeWebp(buffer)
    default:
      throw new Error(`Unsupported raster type: ${mime}`)
  }
}

function makeOutput(
  kind: RasterKind,
  label: string,
  mime: string,
  ext: string,
  buffer: ArrayBuffer,
  originalSize: number,
  extra: Partial<Pick<RasterOutput, 'fileTag' | 'lossy'>> = {},
): RasterOutput {
  const size = buffer.byteLength
  const savedBytes = originalSize - size
  return {
    kind,
    label,
    mime,
    ext,
    buffer,
    size,
    savedBytes,
    savedPct: originalSize > 0 ? (savedBytes / originalSize) * 100 : 0,
    smaller: size < originalSize,
    ...extra,
  }
}

// Visually-lossless palette quantization (pngquant-style): reduce to an optimal
// ≤256-color palette with Floyd–Steinberg dithering. NOT bit-exact, but
// imperceptible on flat UI art/gradients. The reduced pixels are reused by both
// the quantized-PNG and the Express (WebP) outputs.
function quantize(image: ImageData): ImageData {
  const inPoints = iqUtils.PointContainer.fromUint8Array(image.data, image.width, image.height)
  const palette = buildPaletteSync([inPoints], {
    colorDistanceFormula: 'pngquant',
    paletteQuantization: 'wuquant',
    colors: 256,
  })
  const outPoints = applyPaletteSync(inPoints, palette, {
    colorDistanceFormula: 'pngquant',
    imageQuantization: 'floyd-steinberg',
  })
  return new ImageData(new Uint8ClampedArray(outPoints.toUint8Array()), image.width, image.height)
}

interface Descriptor {
  label: string
  mime: string
  ext: string
  buffer: ArrayBuffer
  lossy?: boolean
}

/** Re-encode the source format (metadata/EXIF is dropped). */
async function encodeOptimized(mime: string, image: ImageData): Promise<Descriptor | null> {
  switch (mime) {
    case 'image/png': {
      const buffer = await optimisePng(image, { level: 6, interlace: false, optimiseAlpha: true })
      return { label: 'Optimized PNG', mime: 'image/png', ext: 'png', buffer }
    }
    case 'image/webp': {
      const buffer = await encodeWebp(image, { lossless: 1 })
      return { label: 'Optimized WebP', mime: 'image/webp', ext: 'webp', buffer }
    }
    case 'image/jpeg': {
      // JPEG has no true lossless re-encode path in mozjpeg; we re-compress at
      // high quality (visually lossless, not bit-exact) and strip all metadata.
      const buffer = await encodeJpeg(image, { quality: 92 })
      return { label: 'Optimized JPEG', mime: 'image/jpeg', ext: 'jpg', buffer, lossy: true }
    }
    default:
      return null
  }
}

async function process(req: RasterRequest) {
  const originalSize = req.buffer.byteLength
  const image = await decode(req.mime, req.buffer)
  post({ type: 'progress', id: req.id, progress: 20 })

  const outputs: RasterOutput[] = []

  // 1. Optimized original (same format). Lossless for PNG/WebP, visually
  //    lossless for JPEG (mozjpeg has no bit-exact re-encode).
  const optimized = await encodeOptimized(req.mime, image)
  if (optimized) {
    outputs.push(
      makeOutput('optimized', optimized.label, optimized.mime, optimized.ext, optimized.buffer, originalSize, {
        lossy: optimized.lossy,
      }),
    )
  }
  post({ type: 'progress', id: req.id, progress: 30 })

  // 2 + 3. Quantized outputs (visually lossless) — only for PNG sources, where
  //    palette reduction is the big win (this is what TinyPNG-style tools do).
  //    The quantized pixels are reused: once as an 8-bit palette PNG, and once
  //    as a lossless WebP ("Express") — WebP's entropy coding beats PNG on the
  //    same indexed pixels, so Express is usually the smallest of all.
  if (req.mime === 'image/png') {
    const q = quantize(image)
    post({ type: 'progress', id: req.id, progress: 45 })

    const pngBuf = await optimisePng(q, { level: 6, interlace: false, optimiseAlpha: true })
    outputs.push(
      makeOutput('quantized', 'PNG (quantized)', 'image/png', 'png', pngBuf, originalSize, {
        fileTag: 'min',
        lossy: true,
      }),
    )
    post({ type: 'progress', id: req.id, progress: 55 })

    const expressBuf = await encodeWebp(q, { lossless: 1 })
    outputs.push(
      makeOutput('express', 'Express (WebP)', 'image/webp', 'webp', expressBuf, originalSize, {
        fileTag: 'express',
        lossy: true,
      }),
    )
  }
  post({ type: 'progress', id: req.id, progress: 65 })

  // 4. Lossless WebP from the original pixels (skip if the source is WebP).
  if (req.mime !== 'image/webp') {
    const buf = await encodeWebp(image, { lossless: 1 })
    outputs.push(makeOutput('webp', 'WebP', 'image/webp', 'webp', buf, originalSize))
  }
  post({ type: 'progress', id: req.id, progress: 82 })

  // 5. Lossless AVIF.
  const avifBuf = await encodeAvif(image, { lossless: true })
  outputs.push(makeOutput('avif', 'AVIF', 'image/avif', 'avif', avifBuf, originalSize))

  post({ type: 'progress', id: req.id, progress: 100 })
  post(
    { type: 'done', id: req.id, outputs },
    outputs.map((o) => o.buffer),
  )
}

ctx.onmessage = async (e: MessageEvent<RasterRequest>) => {
  const req = e.data
  try {
    await process(req)
  } catch (err) {
    post({ type: 'error', id: req.id, message: err instanceof Error ? err.message : String(err) })
  }
}

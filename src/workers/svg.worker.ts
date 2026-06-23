/// <reference lib="webworker" />
// Runs the SVGO optimization pass off the main thread. SVGO uses its own
// parser (no DOM), so this is safe in a worker. The DOMParser-based health
// check runs on the main thread, where DOMParser is available.

import { optimize, type Config } from 'svgo/dist/svgo.browser.js'
import type { SvgRequest, SvgResponse } from '../types'

const ctx = self as unknown as DedicatedWorkerGlobalScope

const config: Config = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Keep viewBox so the SVG stays responsive.
          removeViewBox: false,
        },
      },
    },
    // preset-default already removes comments + metadata; listed for clarity.
    'removeComments',
    'removeMetadata',
  ],
}

ctx.onmessage = (e: MessageEvent<SvgRequest>) => {
  const req = e.data
  try {
    const result = optimize(req.text, config)
    const msg: SvgResponse = { type: 'done', id: req.id, optimizedText: result.data }
    ctx.postMessage(msg)
  } catch (err) {
    const msg: SvgResponse = {
      type: 'error',
      id: req.id,
      message: err instanceof Error ? err.message : String(err),
    }
    ctx.postMessage(msg)
  }
}

# Image Tools

A 100% client-side browser app for **losslessly optimizing** and **quality-checking** image assets (great for design exports). No backend, no uploads — every byte is processed in your browser using WebAssembly codecs running in Web Workers.

## What it does

**Raster (PNG / JPEG / WebP)** — decodes each image once, then produces:

| Output                | Codec                       | Fidelity |
| --------------------- | --------------------------- | -------- |
| Optimized original    | oxipng (PNG) · mozjpeg (JPEG) · WebP lossless | lossless\* |
| **PNG (quantized)** — PNG sources only | `image-q` (≤256-color palette + Floyd–Steinberg dither) → oxipng 8-bit palette PNG | visually lossless |
| **Express (WebP)** — PNG sources only | the quantized pixels, re-encoded as lossless WebP — usually the smallest output of all | visually lossless |
| Lossless WebP         | `@jsquash/webp` `lossless: 1` (from the original pixels) | lossless |
| Lossless AVIF         | `@jsquash/avif` `lossless: true` | lossless |

The tool **highlights the smallest output that actually beats the original** and greys out any format that ended up larger (common with lossless AVIF) as _"skip — larger"_. Each output is tagged **lossless** or **visually lossless**. All EXIF/metadata is stripped on output.

> **Lossless vs. visually lossless.** True lossless re-encoding (oxipng) keeps every pixel bit-exact, so its ceiling is modest. Tools like TinyPNG get much smaller files because they're *lossy* — they reduce the image to an optimized color palette (the pngquant approach). The **PNG (quantized)** output does the same: imperceptible on flat UI art and gradients, but not bit-exact. Use the slider compare to verify before shipping.
>
> \*JPEG has no true lossless re-encode path in mozjpeg, so the JPEG "optimized original" is a high-quality (q92) visually-lossless re-compression with metadata stripped.

**SVG** — runs SVGO (multipass, keeps `viewBox`, strips comments/metadata) **and** a DOMParser-based **Health Check** that grades findings as error / warn / info:

- **Performance**: heavy `feGaussianBlur`, expensive primitives (`feTurbulence`, `feDisplacementMap`, …), oversized filter regions, high node counts, complex paths, animated filters, `mix-blend-mode`, nested clip/mask, `<foreignObject>`, embedded raster.
- **Correctness**: duplicate ids in a file, **cross-file id collisions across the whole batch** (the inline-SVG footgun), dangling `url(#…)` refs, unused defs, missing `viewBox`.
- **Auto-fix**: namespace every id (`<slug>__<id>`) and rewrite internal refs, eliminating cross-file collisions when SVGs are inlined.

**Batch** — "Download all winners" (smallest per image) and "Download all" (organized by format) as zips via `fflate`, plus a summary header and an SVG batch panel listing every cross-file id collision.

## Requirements

Node **20+** (Vite 6 / Tailwind 4). A `.nvmrc` pins Node 22.

```bash
nvm use            # or: nvm install
```

## Getting started

```bash
yarn install
yarn dev           # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
yarn build         # type-check + production build
yarn preview       # preview the production build
yarn typecheck     # vue-tsc, no emit
```

## Stack

Vue 3 (`<script setup>` + TypeScript), Vite, Tailwind CSS v4, lucide icons. Codecs: `@jsquash/{png,oxipng,jpeg,webp,avif}`, `image-q` (PNG quantization), `svgo`, `fflate`. All encoding/decoding runs in Web Workers so the UI never blocks on large batches.

## Notes

- AVIF lossless encoding is CPU-heavy; large images take a few seconds each (workers keep the UI responsive).
- oxipng uses multi-threading inside the worker when available.

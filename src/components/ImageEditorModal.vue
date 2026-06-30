<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { X, Lock, Unlock, Crop as CropIcon, RotateCcw, Download } from '@lucide/vue'
import type { Transform } from '../types'

const props = defineProps<{
  name: string
  src: string
  mime: string
  naturalWidth: number
  naturalHeight: number
  transform: Transform
}>()
const emit = defineEmits<{ apply: [Transform]; close: [] }>()

const previewImg = ref<HTMLImageElement>()

// --- state (seeded from the incoming transform) ----------------------------
const cropX = ref(props.transform.cropX)
const cropY = ref(props.transform.cropY)
const cropW = ref(props.transform.cropW)
const cropH = ref(props.transform.cropH)
const outW = ref(props.transform.outW)
const outH = ref(props.transform.outH)
const lockAspect = ref(props.transform.lockAspect)
const cropOn = ref(
  props.transform.cropX !== 0 ||
    props.transform.cropY !== 0 ||
    props.transform.cropW !== props.naturalWidth ||
    props.transform.cropH !== props.naturalHeight,
)

// --- preview geometry ------------------------------------------------------
const MAX_W = 460
const MAX_H = 380
const ps = computed(() => Math.min(MAX_W / props.naturalWidth, MAX_H / props.naturalHeight, 1))
const dispW = computed(() => Math.round(props.naturalWidth * ps.value))
const dispH = computed(() => Math.round(props.naturalHeight * ps.value))

const box = computed(() => ({
  left: `${cropX.value * ps.value}px`,
  top: `${cropY.value * ps.value}px`,
  width: `${cropW.value * ps.value}px`,
  height: `${cropH.value * ps.value}px`,
}))

const stage = ref<HTMLElement>()

// --- crop drag (move + corner resize) --------------------------------------
type Mode = 'move' | 'nw' | 'ne' | 'sw' | 'se'
let drag: {
  mode: Mode
  startX: number
  startY: number
  c: { x: number; y: number; w: number; h: number }
  sx: number
  sy: number
} | null = null

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}
function syncOutput() {
  // Keep the chosen zoom level while the crop region changes.
  if (!drag) return
  outW.value = Math.max(1, Math.round(cropW.value * drag.sx))
  outH.value = Math.max(1, Math.round(cropH.value * drag.sy))
}

function startDrag(mode: Mode, e: PointerEvent) {
  e.stopPropagation()
  drag = {
    mode,
    startX: e.clientX,
    startY: e.clientY,
    c: { x: cropX.value, y: cropY.value, w: cropW.value, h: cropH.value },
    sx: outW.value / cropW.value,
    sy: outH.value / cropH.value,
  }
}

function onMove(e: PointerEvent) {
  if (!drag) return
  const dx = (e.clientX - drag.startX) / ps.value
  const dy = (e.clientY - drag.startY) / ps.value
  const nat = { w: props.naturalWidth, h: props.naturalHeight }
  const c = drag.c
  const MIN = 16
  if (drag.mode === 'move') {
    cropX.value = clamp(c.x + dx, 0, nat.w - c.w)
    cropY.value = clamp(c.y + dy, 0, nat.h - c.h)
  } else {
    let x1 = c.x
    let y1 = c.y
    let x2 = c.x + c.w
    let y2 = c.y + c.h
    if (drag.mode.includes('w')) x1 = clamp(c.x + dx, 0, x2 - MIN)
    if (drag.mode.includes('e')) x2 = clamp(c.x + c.w + dx, x1 + MIN, nat.w)
    if (drag.mode.includes('n')) y1 = clamp(c.y + dy, 0, y2 - MIN)
    if (drag.mode.includes('s')) y2 = clamp(c.y + c.h + dy, y1 + MIN, nat.h)
    cropX.value = x1
    cropY.value = y1
    cropW.value = x2 - x1
    cropH.value = y2 - y1
  }
  syncOutput()
}
function endDrag() {
  drag = null
}

// --- output size edits -----------------------------------------------------
function setW(v: number) {
  outW.value = Math.max(1, Math.round(v || 1))
  if (lockAspect.value) outH.value = Math.max(1, Math.round(outW.value * (cropH.value / cropW.value)))
}
function setH(v: number) {
  outH.value = Math.max(1, Math.round(v || 1))
  if (lockAspect.value) outW.value = Math.max(1, Math.round(outH.value * (cropW.value / cropH.value)))
}
function toggleLock() {
  lockAspect.value = !lockAspect.value
  if (lockAspect.value) outH.value = Math.max(1, Math.round(outW.value * (cropH.value / cropW.value)))
}
function preset(f: number) {
  outW.value = Math.max(1, Math.round(cropW.value * f))
  outH.value = Math.max(1, Math.round(cropH.value * f))
}

function toggleCrop() {
  cropOn.value = !cropOn.value
  if (!cropOn.value) resetCrop()
}
function resetCrop() {
  const sx = outW.value / cropW.value
  const sy = outH.value / cropH.value
  cropX.value = 0
  cropY.value = 0
  cropW.value = props.naturalWidth
  cropH.value = props.naturalHeight
  outW.value = Math.max(1, Math.round(cropW.value * sx))
  outH.value = Math.max(1, Math.round(cropH.value * sy))
}

const cropPx = computed(() => `${Math.round(cropW.value)} × ${Math.round(cropH.value)}`)
const scalePct = computed(() => Math.round((outW.value / cropW.value) * 100))

function buildTransform(): Transform {
  return {
    cropX: Math.round(cropX.value),
    cropY: Math.round(cropY.value),
    cropW: Math.round(cropW.value),
    cropH: Math.round(cropH.value),
    outW: Math.max(1, Math.round(outW.value)),
    outH: Math.max(1, Math.round(outH.value)),
    lockAspect: lockAspect.value,
  }
}

function apply() {
  emit('apply', buildTransform())
}

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

// Crop/resize on a canvas and download straight away — skips the optimize
// pipeline, for when the user only wants the cropped image.
function cropDownload() {
  const img = previewImg.value
  if (!img) return
  const t = buildTransform()
  const canvas = document.createElement('canvas')
  canvas.width = t.outW
  canvas.height = t.outH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, t.cropX, t.cropY, t.cropW, t.cropH, 0, 0, t.outW, t.outH)
  const ext = EXT[props.mime] ?? 'png'
  const type = ext === 'jpg' ? 'image/jpeg' : props.mime
  canvas.toBlob(
    (blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${props.name.replace(/\.[^.]+$/, '')}-${t.outW}x${t.outH}.${ext}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      emit('close')
    },
    type,
    0.95,
  )
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" @pointerdown.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl border border-border-default bg-card shadow-2xl">
      <div class="flex items-start justify-between gap-4 border-b border-border-default p-4">
        <div class="min-w-0">
          <h2 class="font-display text-base font-semibold tracking-tight">Resize &amp; crop</h2>
          <p class="truncate font-mono text-xs text-text-secondary">{{ name }} · {{ naturalWidth }}×{{ naturalHeight }} px</p>
        </div>
        <button class="rounded-md p-1 text-text-secondary hover:bg-hover hover:text-text-primary" title="Close" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="grid gap-6 p-5 sm:grid-cols-[auto_1fr]">
        <!-- preview -->
        <div class="flex justify-center">
          <div
            ref="stage"
            class="relative select-none rounded-lg border border-border-default bg-input"
            :style="{ width: `${dispW}px`, height: `${dispH}px` }"
          >
            <!-- clipped layer: image + dimming (so the dim shadow can't escape) -->
            <div class="absolute inset-0 overflow-hidden rounded-lg">
              <img ref="previewImg" :src="src" :alt="name" draggable="false" class="absolute inset-0 h-full w-full object-contain" />
              <div v-if="cropOn" class="absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" :style="box" />
            </div>
            <!-- unclipped layer: crop border + corner handles (free to overflow) -->
            <div
              v-if="cropOn"
              class="absolute cursor-move border border-white/90"
              :style="box"
              @pointerdown="startDrag('move', $event)"
            >
              <span
                v-for="h in ['nw', 'ne', 'sw', 'se']"
                :key="h"
                class="absolute h-3 w-3 rounded-sm border border-zinc-700 bg-white"
                :class="{
                  '-left-1.5 -top-1.5 cursor-nwse-resize': h === 'nw',
                  '-right-1.5 -top-1.5 cursor-nesw-resize': h === 'ne',
                  '-bottom-1.5 -left-1.5 cursor-nesw-resize': h === 'sw',
                  '-bottom-1.5 -right-1.5 cursor-nwse-resize': h === 'se',
                }"
                @pointerdown="startDrag(h as any, $event)"
              />
            </div>
          </div>
        </div>

        <!-- controls -->
        <div class="flex flex-col gap-5">
          <!-- crop -->
          <div>
            <span class="font-mono text-[11px] uppercase tracking-[0.18em] text-text-secondary">Crop</span>

            <!-- off: clear call-to-action -->
            <div v-if="!cropOn" class="mt-2">
              <button
                class="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-hover"
                @click="toggleCrop"
              >
                <CropIcon :size="13" /> Crop to a region
              </button>
              <p class="mt-1.5 text-xs text-text-secondary">Trim away part of the image before resizing.</p>
            </div>

            <!-- on: region size + reset / remove -->
            <div v-else class="mt-2 space-y-2.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-input px-2.5 py-1.5 font-mono text-sm tabular-nums">
                  <CropIcon :size="13" class="text-text-secondary" />
                  {{ cropPx }} <span class="text-text-secondary">px</span>
                </span>
                <div class="flex gap-1.5">
                  <button
                    class="inline-flex items-center gap-1 rounded-md border border-border-default px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-hover"
                    @click="resetCrop"
                  >
                    <RotateCcw :size="13" /> Reset
                  </button>
                  <button
                    class="inline-flex items-center gap-1 rounded-md border border-border-default px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-hover"
                    @click="toggleCrop"
                  >
                    <X :size="13" /> Remove
                  </button>
                </div>
              </div>
              <p class="text-xs text-text-secondary">Drag the box and its corners on the preview.</p>
            </div>
          </div>

          <!-- output size -->
          <div>
            <span class="font-mono text-[11px] uppercase tracking-[0.18em] text-text-secondary">Output size</span>
            <div class="mt-2 flex items-end gap-2">
              <label class="flex-1">
                <span class="mb-1 block text-xs text-text-secondary">Width</span>
                <input
                  type="number"
                  min="1"
                  :value="outW"
                  class="h-9 w-full rounded-md border border-border-default bg-input px-2.5 font-mono text-sm tabular-nums focus:border-accent"
                  @input="setW(+($event.target as HTMLInputElement).value)"
                />
              </label>
              <div class="shrink-0">
                <span class="mb-1 block text-xs" aria-hidden="true">&nbsp;</span>
                <button
                  class="grid h-9 w-9 place-items-center rounded-md border transition-colors"
                  :class="lockAspect ? 'border-accent bg-accent/10 text-accent' : 'border-border-default text-text-secondary hover:bg-hover'"
                  :title="lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'"
                  @click="toggleLock"
                >
                  <component :is="lockAspect ? Lock : Unlock" :size="15" />
                </button>
              </div>
              <label class="flex-1">
                <span class="mb-1 block text-xs text-text-secondary">Height</span>
                <input
                  type="number"
                  min="1"
                  :value="outH"
                  class="h-9 w-full rounded-md border border-border-default bg-input px-2.5 font-mono text-sm tabular-nums focus:border-accent"
                  @input="setH(+($event.target as HTMLInputElement).value)"
                />
              </label>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-1.5">
              <button
                v-for="p in [{ l: '100%', f: 1 }, { l: '50%', f: 0.5 }, { l: '33%', f: 1 / 3 }, { l: '25%', f: 0.25 }]"
                :key="p.l"
                class="rounded-md border border-border-default px-2.5 py-1 font-mono text-xs font-medium transition-colors hover:bg-hover"
                @click="preset(p.f)"
              >
                {{ p.l }}
              </button>
              <span class="ml-auto font-mono text-xs text-text-secondary">{{ scalePct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 border-t border-border-default p-4">
        <p class="font-mono text-xs text-text-secondary">
          Output <span class="text-text-primary">{{ Math.round(outW) }} × {{ Math.round(outH) }}</span> px
        </p>
        <div class="flex flex-wrap justify-end gap-2">
          <button class="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-hover hover:text-text-primary" @click="emit('close')">
            Cancel
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-hover"
            @click="cropDownload"
          >
            <Download :size="15" /> Crop &amp; download
          </button>
          <button class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90" @click="apply">
            Apply &amp; optimize
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

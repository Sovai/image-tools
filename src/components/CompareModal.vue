<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { X, MoveHorizontal } from '@lucide/vue'
import { formatBytes, formatPct } from '../lib/format'

const props = defineProps<{
  name: string
  original: { url: string; size: number }
  optimized: { url: string; label: string; size: number }
}>()
const emit = defineEmits<{ close: [] }>()

const pos = ref(50)
const area = ref<HTMLElement>()
let dragging = false

const savedPct = computed(() =>
  props.original.size > 0 ? ((props.original.size - props.optimized.size) / props.original.size) * 100 : 0,
)

// --- display sizing ---------------------------------------------------------
// Tiny images (icons, 8×8 test art) are unusable at natural size, so scale the
// compare box up to a comfortable minimum; large images scale down to fit the
// viewport. Aspect ratio is preserved so the divider lines up with the pixels.
const MIN_LONG_SIDE = 360
const natW = ref(0)
const natH = ref(0)

function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement
  natW.value = img.naturalWidth
  natH.value = img.naturalHeight
}

const display = computed(() => {
  if (!natW.value || !natH.value) return { width: MIN_LONG_SIDE, height: MIN_LONG_SIDE, scale: 1 }
  const maxW = window.innerWidth * 0.92
  const maxH = window.innerHeight * 0.7
  const longest = Math.max(natW.value, natH.value)
  // upscale small images so the longer side reaches the minimum
  let scale = longest < MIN_LONG_SIDE ? MIN_LONG_SIDE / longest : 1
  // then clamp so nothing overflows the viewport
  scale *= Math.min(maxW / (natW.value * scale), maxH / (natH.value * scale), 1)
  return {
    width: Math.round(natW.value * scale),
    height: Math.round(natH.value * scale),
    scale,
  }
})

const boxStyle = computed(() => ({ width: `${display.value.width}px`, height: `${display.value.height}px` }))
// Crisp pixels when upscaling (so differences are visible, not blurred away).
const pixelated = computed(() => display.value.scale > 1)

function setFromClientX(clientX: number) {
  const el = area.value
  if (!el) return
  const r = el.getBoundingClientRect()
  pos.value = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))
}
function onDown(e: PointerEvent) {
  dragging = true
  setFromClientX(e.clientX)
}
function onMove(e: PointerEvent) {
  if (dragging) setFromClientX(e.clientX)
}
function onUp() {
  dragging = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') pos.value = Math.max(0, pos.value - 2)
  else if (e.key === 'ArrowRight') pos.value = Math.min(100, pos.value + 2)
}

onMounted(() => {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm" @pointerdown.self="emit('close')">
    <!-- header -->
    <div class="flex items-center justify-between gap-4 px-5 py-3 text-white">
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold">{{ name }}</div>
        <div class="text-xs text-white/60 tabular-nums">
          Original {{ formatBytes(original.size) }} · {{ optimized.label }} {{ formatBytes(optimized.size) }}
          <span :class="savedPct > 0 ? 'text-emerald-400' : 'text-white/60'">({{ formatPct(savedPct) }})</span>
        </div>
      </div>
      <button
        class="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
        @click="emit('close')"
      >
        <X :size="16" /> Close
      </button>
    </div>

    <!-- compare area -->
    <div class="flex flex-1 items-center justify-center overflow-hidden p-4" @pointerdown.self="emit('close')">
      <div
        ref="area"
        class="compare-checker relative cursor-ew-resize touch-none select-none overflow-hidden rounded-lg shadow-2xl"
        :style="boxStyle"
        @pointerdown="onDown"
      >
        <!-- bottom layer = optimized -->
        <img
          :src="optimized.url"
          alt="optimized"
          draggable="false"
          class="absolute inset-0 h-full w-full object-contain"
          :class="{ pixelated }"
          @load="onImageLoad"
        />
        <!-- top layer = original, clipped to the left of the divider -->
        <img
          :src="original.url"
          alt="original"
          draggable="false"
          class="pointer-events-none absolute inset-0 h-full w-full object-contain"
          :class="{ pixelated }"
          :style="{ clipPath: `inset(0 ${100 - pos}% 0 0)` }"
        />

        <!-- labels -->
        <span class="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          Original
        </span>
        <span class="pointer-events-none absolute right-2 top-2 rounded bg-accent px-2 py-0.5 text-xs font-medium text-white">
          {{ optimized.label }}
        </span>

        <!-- divider + handle -->
        <div class="pointer-events-none absolute inset-y-0 -ml-px w-0.5 bg-white/90" :style="{ left: `${pos}%` }">
          <div class="absolute top-1/2 left-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-zinc-800 shadow-lg">
            <MoveHorizontal :size="18" />
          </div>
        </div>
      </div>
    </div>

    <!-- range fallback -->
    <p class="pb-5 text-center text-xs text-white/45">Drag the divider · arrow keys to nudge · Esc to close</p>
  </div>
</template>

<style scoped>
/* Keep upscaled pixels crisp so compression differences stay visible. */
.pixelated {
  image-rendering: pixelated;
}
.compare-checker {
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #e2e2e2 25%, transparent 25%),
    linear-gradient(-45deg, #e2e2e2 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e2e2 75%),
    linear-gradient(-45deg, transparent 75%, #e2e2e2 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
}
</style>

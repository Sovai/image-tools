<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { X } from '@lucide/vue'
import type { RasterKind, RasterOutput } from '../types'

const props = defineProps<{ name: string; outputs: RasterOutput[] }>()
const emit = defineEmits<{ close: [] }>()

// Plain-language meaning of each output format.
const KIND_INFO: Record<RasterKind, string> = {
  optimized:
    'Re-encoded in the original format with no pixel changes — oxipng for PNG, lossless WebP, or high-quality mozjpeg for JPEG. EXIF/metadata stripped.',
  quantized:
    'Colors reduced to an optimal ≤256-color palette with dithering (the pngquant approach), packed as an 8-bit PNG. Much smaller, imperceptibly changed — not bit-exact.',
  express:
    'The quantized pixels re-encoded as lossless WebP. WebP packs indexed pixels tighter than PNG, so this is usually the smallest output of all.',
  webp: 'Lossless WebP from the original pixels — bit-exact, with broad browser support.',
  avif: 'Lossless AVIF from the original pixels. Newest format; for lossless it is often larger than WebP/PNG.',
}

const presentInfo = computed(() =>
  props.outputs.map((o) => ({ label: o.label, lossy: o.lossy, text: KIND_INFO[o.kind] })),
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" @pointerdown.self="emit('close')">
    <div class="max-h-[85vh] w-full max-w-md overflow-auto rounded-xl border border-border-default bg-card shadow-2xl">
      <div class="flex items-start justify-between gap-4 border-b border-border-default p-4">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold">About these outputs</h2>
          <p class="truncate text-xs text-text-secondary">{{ name }}</p>
        </div>
        <button class="rounded-md p-1 text-text-secondary hover:bg-hover hover:text-text-primary" title="Close" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="p-4 text-xs leading-relaxed">
        <p class="text-text-secondary">
          <span class="font-semibold text-text-primary">Lossless</span> keeps every pixel exact.
          <span class="font-semibold text-amber-600 dark:text-amber-400">Visually lossless</span> trades imperceptible
          changes for a much smaller file. The <span class="font-semibold text-accent">winner</span> is the smallest
          output that beats the original; anything larger than the source is marked <em>skip — larger</em>.
        </p>
        <dl v-if="presentInfo.length" class="mt-3 space-y-2.5 border-t border-border-default pt-3">
          <div v-for="info in presentInfo" :key="info.label">
            <dt class="font-medium text-text-primary">
              {{ info.label }}
              <span class="ml-1 font-normal" :class="info.lossy ? 'text-amber-600 dark:text-amber-400' : 'text-text-secondary'">
                · {{ info.lossy ? 'visually lossless' : 'lossless' }}
              </span>
            </dt>
            <dd class="text-text-secondary">{{ info.text }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

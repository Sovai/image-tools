<script setup lang="ts">
import { ref } from 'vue'
import { Download, Crown, X, SplitSquareHorizontal, Loader2, Info } from '@lucide/vue'
import type { FileResult, RasterOutput } from '../types'
import { formatBytes, formatPct } from '../lib/format'
import OutputInfoModal from './OutputInfoModal.vue'

defineProps<{ result: FileResult }>()
const emit = defineEmits<{ download: [RasterOutput]; compare: [RasterOutput]; remove: [] }>()

const showInfo = ref(false)
</script>

<template>
  <div class="rounded-xl border border-border-default bg-card p-4">
    <div class="flex gap-4">
      <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border-default bg-input">
        <img v-if="result.thumbnailUrl" :src="result.thumbnailUrl" :alt="result.name" class="h-full w-full object-contain" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate font-medium" :title="result.name">{{ result.name }}</div>
            <div class="font-mono text-xs text-text-secondary">{{ formatBytes(result.originalSize) }} original</div>
          </div>
          <div class="flex shrink-0 items-center gap-0.5">
            <button
              class="rounded-md p-1 hover:bg-hover hover:text-text-primary"
              :class="showInfo ? 'text-accent' : 'text-text-secondary'"
              title="What do these outputs mean?"
              @click="showInfo = !showInfo"
            >
              <Info :size="16" />
            </button>
            <button
              class="rounded-md p-1 text-text-secondary hover:bg-hover hover:text-text-primary"
              title="Remove"
              @click="emit('remove')"
            >
              <X :size="16" />
            </button>
          </div>
        </div>

        <!-- progress -->
        <div v-if="result.status !== 'done' && result.status !== 'error'" class="mt-3">
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-hover">
            <div class="relative h-full rounded-full bg-accent transition-all duration-300" :style="{ width: `${Math.max(result.progress, 4)}%` }">
              <div class="progress-shimmer absolute inset-0" />
            </div>
          </div>
          <div class="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
            <Loader2 :size="13" class="animate-spin" />
            <span>{{ result.stage || 'Working…' }}</span>
            <span class="ml-auto tabular-nums">{{ result.progress }}%</span>
          </div>
        </div>

        <div v-else-if="result.status === 'error'" class="mt-3 text-sm text-red-500">
          {{ result.error }}
        </div>
      </div>
    </div>

    <!-- outputs (revealed progressively as each format finishes) -->
    <div v-if="result.outputs && result.outputs.length" class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="o in result.outputs"
        :key="o.kind"
        class="flex flex-col rounded-lg border p-3 transition-colors"
        :class="
          o === result.winner
            ? 'border-accent bg-accent/10 ring-1 ring-accent/40'
            : o.smaller
              ? 'border-border-default'
              : 'border-border-default opacity-55'
        "
      >
        <div class="flex items-center justify-between gap-2">
          <span class="min-w-0 truncate text-sm font-medium">{{ o.label }}</span>
          <span
            v-if="o === result.winner"
            class="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
          >
            <Crown :size="11" /> Winner
            <span class="font-normal normal-case text-white/65">· {{ o.lossy ? 'lossy' : 'lossless' }}</span>
          </span>
          <span v-else-if="!o.smaller" class="shrink-0 text-[10px] font-semibold uppercase text-text-secondary">skip — larger</span>
        </div>
        <div class="mt-1 font-mono tabular-nums">
          <span class="text-sm">{{ formatBytes(o.size) }}</span>
          <span class="ml-1 text-xs" :class="o.smaller ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-secondary'">
            {{ formatPct(o.savedPct) }}
          </span>
        </div>
        <div class="mt-0.5 text-[10px] font-medium uppercase tracking-wide" :class="o.lossy ? 'text-amber-600 dark:text-amber-400' : 'text-text-secondary/70'">
          {{ o.lossy ? 'visually lossless' : 'lossless' }}
        </div>
        <div class="mt-2 flex gap-1.5">
          <button
            class="inline-flex items-center justify-center rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 text-text-primary transition-colors hover:bg-hover"
            title="Compare with original"
            @click="emit('compare', o)"
          >
            <SplitSquareHorizontal :size="14" />
          </button>
          <button
            class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-hover"
            @click="emit('download', o)"
          >
            <Download :size="14" /> Download
          </button>
        </div>
      </div>
    </div>

    <OutputInfoModal
      v-if="showInfo"
      :name="result.name"
      :outputs="result.outputs ?? []"
      @close="showInfo = false"
    />
  </div>
</template>

<style scoped>
/* Moving sheen over the filled portion so a long-running step never looks
   frozen, even while the percentage is static. */
.progress-shimmer {
  background-image: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.55), transparent);
  background-size: 200% 100%;
  animation: progress-shimmer 1.2s linear infinite;
}
@keyframes progress-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .progress-shimmer {
    animation: none;
  }
}
</style>

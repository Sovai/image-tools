<script setup lang="ts">
import { Download, Crown, X, SplitSquareHorizontal } from '@lucide/vue'
import type { FileResult, RasterOutput } from '../types'
import { formatBytes, formatPct } from '../lib/format'

defineProps<{ result: FileResult }>()
const emit = defineEmits<{ download: [RasterOutput]; compare: [RasterOutput]; remove: [] }>()
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
            <div class="text-xs text-text-secondary">{{ formatBytes(result.originalSize) }} original</div>
          </div>
          <button
            class="rounded-md p-1 text-text-secondary hover:bg-hover hover:text-text-primary"
            title="Remove"
            @click="emit('remove')"
          >
            <X :size="16" />
          </button>
        </div>

        <!-- progress -->
        <div v-if="result.status !== 'done' && result.status !== 'error'" class="mt-3">
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-hover">
            <div class="h-full rounded-full bg-accent transition-all" :style="{ width: `${result.progress}%` }" />
          </div>
          <div class="mt-1 text-xs text-text-secondary">Encoding… {{ result.progress }}%</div>
        </div>

        <div v-else-if="result.status === 'error'" class="mt-3 text-sm text-red-500">
          {{ result.error }}
        </div>
      </div>
    </div>

    <!-- outputs -->
    <div v-if="result.status === 'done' && result.outputs" class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
        <div class="mt-1 tabular-nums">
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
  </div>
</template>

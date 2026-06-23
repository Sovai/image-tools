<script setup lang="ts">
import { computed } from 'vue'
import { Download, Wand2, X } from '@lucide/vue'
import type { FileResult, WorstSeverity } from '../types'
import { formatBytes, formatPct } from '../lib/format'
import SvgHealthReport from './SvgHealthReport.vue'

const props = defineProps<{ result: FileResult; collides: boolean }>()
const emit = defineEmits<{ fix: []; download: []; remove: [] }>()

const badge: Record<WorstSeverity, { label: string; cls: string }> = {
  error: { label: 'Errors', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  warn: { label: 'Warnings', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  info: { label: 'Info', cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  ok: { label: 'Healthy', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
}

const worst = computed<WorstSeverity>(() => props.result.svg?.report.worst ?? 'ok')
const hasDupIds = computed(() => Object.keys(props.result.svg?.report.duplicateIds ?? {}).length > 0)
const canFix = computed(() => !props.result.svg?.fixApplied && (props.collides || hasDupIds.value))
</script>

<template>
  <div class="rounded-xl border border-border-default bg-card p-4">
    <div class="flex gap-4">
      <div class="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border-default bg-input p-1.5">
        <img v-if="result.thumbnailUrl" :src="result.thumbnailUrl" :alt="result.name" class="max-h-full max-w-full" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="truncate font-medium" :title="result.name">{{ result.name }}</span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" :class="badge[worst].cls">
                {{ badge[worst].label }}
              </span>
              <span v-if="collides" class="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">
                id collision
              </span>
              <span v-if="result.svg?.fixApplied" class="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                namespaced
              </span>
            </div>
            <div v-if="result.svg" class="mt-0.5 text-xs text-text-secondary tabular-nums">
              {{ formatBytes(result.originalSize) }} →
              {{ formatBytes(result.svg.optimizedSize) }}
              <span :class="result.svg.savedBytes > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-secondary'">
                ({{ formatPct(result.svg.savedPct) }})
              </span>
              · {{ result.svg.report.nodeCount }} nodes
            </div>
          </div>
          <button
            class="rounded-md p-1 text-text-secondary hover:bg-hover hover:text-text-primary"
            title="Remove"
            @click="emit('remove')"
          >
            <X :size="16" />
          </button>
        </div>

        <div v-if="result.status === 'error'" class="mt-2 text-sm text-red-500">{{ result.error }}</div>
        <div v-else-if="result.status !== 'done'" class="mt-2 text-xs text-text-secondary">Analyzing…</div>

        <SvgHealthReport v-if="result.svg" :report="result.svg.report" />
      </div>
    </div>

    <div v-if="result.status === 'done'" class="mt-3 flex flex-wrap gap-2">
      <button
        class="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-hover"
        @click="emit('download')"
      >
        <Download :size="14" /> Download optimized SVG
      </button>
      <button
        v-if="canFix"
        class="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        @click="emit('fix')"
      >
        <Wand2 :size="14" /> Auto-fix: namespace ids
      </button>
    </div>
  </div>
</template>

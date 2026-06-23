<script setup lang="ts">
import { computed } from 'vue'
import { formatBytes, formatPct } from '../lib/format'

const props = defineProps<{
  summary: {
    count: number
    done: number
    originalTotal: number
    optimizedTotal: number
    savedBytes: number
    savedPct: number
    savedFiles: number
  }
}>()

const positive = computed(() => props.summary.savedBytes > 0)
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div class="rounded-xl border border-border-default bg-card p-4">
      <div class="text-xs font-medium uppercase tracking-wide text-text-secondary">Files</div>
      <div class="mt-1 text-2xl font-semibold tabular-nums">{{ summary.done }}/{{ summary.count }}</div>
    </div>
    <div class="rounded-xl border border-border-default bg-card p-4">
      <div class="text-xs font-medium uppercase tracking-wide text-text-secondary">Original</div>
      <div class="mt-1 text-2xl font-semibold tabular-nums">{{ formatBytes(summary.originalTotal) }}</div>
    </div>
    <div class="rounded-xl border border-border-default bg-card p-4">
      <div class="text-xs font-medium uppercase tracking-wide text-text-secondary">Optimized</div>
      <div class="mt-1 text-2xl font-semibold tabular-nums">{{ formatBytes(summary.optimizedTotal) }}</div>
    </div>
    <div
      class="rounded-xl border p-4"
      :class="positive ? 'border-accent/40 bg-accent/10' : 'border-border-default bg-card'"
    >
      <div class="text-xs font-medium uppercase tracking-wide" :class="positive ? 'text-accent' : 'text-text-secondary'">
        Saved
      </div>
      <div class="mt-1 text-2xl font-semibold tabular-nums" :class="positive ? 'text-accent' : ''">
        {{ formatBytes(Math.abs(summary.savedBytes)) }}
        <span class="text-base font-normal opacity-80">({{ formatPct(summary.savedPct) }})</span>
      </div>
    </div>
  </div>
</template>

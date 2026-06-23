<script setup lang="ts">
import { AlertTriangle, CheckCircle, Wand2 } from '@lucide/vue'

defineProps<{
  svgSummary: { total: number; counts: { error: number; warn: number; info: number; ok: number } }
  collisions: { id: string; files: string[] }[]
}>()
const emit = defineEmits<{ fixAll: [] }>()
</script>

<template>
  <div class="rounded-xl border border-border-default bg-card p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        SVG Health — {{ svgSummary.total }} scanned
      </h2>
      <div class="flex flex-wrap gap-2 text-xs font-medium">
        <span class="rounded-full bg-red-500/15 px-2 py-0.5 text-red-600 dark:text-red-400">{{ svgSummary.counts.error }} error</span>
        <span class="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-600 dark:text-amber-400">{{ svgSummary.counts.warn }} warn</span>
        <span class="rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-600 dark:text-sky-400">{{ svgSummary.counts.info }} info</span>
        <span class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">{{ svgSummary.counts.ok }} clean</span>
      </div>
    </div>

    <div v-if="collisions.length" class="mt-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
          <AlertTriangle :size="16" />
          {{ collisions.length }} cross-file id collision{{ collisions.length > 1 ? 's' : '' }}
        </h3>
        <button
          class="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          @click="emit('fixAll')"
        >
          <Wand2 :size="14" /> Namespace all SVG ids
        </button>
      </div>
      <p class="mt-1 text-xs text-text-secondary">
        These ids appear in multiple files. When inlined into one DOM, url(#…) refs break silently.
      </p>
      <ul class="mt-2 max-h-48 space-y-1 overflow-auto text-sm">
        <li v-for="c in collisions" :key="c.id" class="flex flex-wrap items-baseline gap-2">
          <code class="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-red-600 dark:text-red-400">#{{ c.id }}</code>
          <span class="text-xs text-text-secondary">in {{ c.files.join(', ') }}</span>
        </li>
      </ul>
    </div>
    <p v-else-if="svgSummary.total > 0" class="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
      <CheckCircle :size="16" /> No cross-file id collisions
    </p>
  </div>
</template>

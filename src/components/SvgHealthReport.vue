<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight, AlertCircle, AlertTriangle, Info, CheckCircle } from '@lucide/vue'
import type { Severity, SvgReport } from '../types'

defineProps<{ report: SvgReport }>()
const open = ref(false)

const icon: Record<Severity, { comp: typeof AlertCircle; cls: string }> = {
  error: { comp: AlertCircle, cls: 'text-red-500' },
  warn: { comp: AlertTriangle, cls: 'text-amber-500' },
  info: { comp: Info, cls: 'text-sky-500' },
}
</script>

<template>
  <div v-if="report.findings.length" class="mt-3">
    <button
      class="flex w-full items-center gap-1.5 text-left text-xs font-medium text-text-secondary hover:text-text-primary"
      @click="open = !open"
    >
      <ChevronRight :size="14" class="transition-transform" :class="open ? 'rotate-90' : ''" />
      {{ report.findings.length }} finding{{ report.findings.length > 1 ? 's' : '' }}
      <span class="text-text-secondary/70">
        ({{ report.counts.error }} error · {{ report.counts.warn }} warn · {{ report.counts.info }} info)
      </span>
    </button>
    <ul v-show="open" class="mt-2 space-y-2">
      <li v-for="(f, i) in report.findings" :key="i" class="flex gap-2 text-sm">
        <component :is="icon[f.severity].comp" :size="16" class="mt-0.5 shrink-0" :class="icon[f.severity].cls" />
        <div>
          <div class="font-medium">{{ f.title }}</div>
          <div v-if="f.detail" class="text-xs text-text-secondary">{{ f.detail }}</div>
        </div>
      </li>
    </ul>
  </div>
  <div v-else class="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
    <CheckCircle :size="14" /> No issues found
  </div>
</template>

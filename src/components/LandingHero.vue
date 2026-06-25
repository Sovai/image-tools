<script setup lang="ts">
import { Sun, Moon } from '@lucide/vue'
import DropZone from './DropZone.vue'
import logoLight from '../assets/logo.png'
import logoDark from '../assets/logo-dark.png'

defineProps<{ isDark: boolean }>()
const emit = defineEmits<{ files: [File[]]; toggleDark: [] }>()

const capabilities = [
  {
    label: 'OUTPUTS',
    title: 'Every format, ranked',
    body: 'Up to five encodes per image — from lossless PNG to AVIF — with the true smallest flagged as the winner.',
  },
  {
    label: 'FIDELITY',
    title: 'Lossless, or close enough',
    body: 'Bit-exact where it counts, pngquant-style visually-lossless where it saves more. Compare any result side by side.',
  },
  {
    label: 'PRIVACY',
    title: 'Never leaves your device',
    body: 'WebAssembly codecs run client-side. No upload, no server, no tracking — it even works offline.',
  },
]
</script>

<template>
  <div class="mx-auto max-w-6xl px-5 sm:px-8">
    <!-- top bar -->
    <header class="flex items-center justify-between py-6">
      <div class="flex items-center gap-2.5">
        <img :src="isDark ? logoDark : logoLight" alt="" class="h-8 w-8" />
        <span class="font-display text-base font-semibold tracking-tight">Image Tools</span>
      </div>
      <button
        class="grid size-9 place-items-center rounded-full border border-border-default bg-bg-secondary transition-colors hover:bg-hover"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="emit('toggleDark')"
      >
        <component :is="isDark ? Sun : Moon" :size="16" />
      </button>
    </header>

    <!-- hero -->
    <section class="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      <div>
        <p class="reveal font-mono text-xs uppercase tracking-[0.22em] text-accent" style="--d: 0ms">
          In-browser image optimizer
        </p>
        <h1 class="reveal mt-5 font-display text-[2.75rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl" style="--d: 60ms">
          Smaller images.<br /><span class="text-accent">Same picture.</span>
        </h1>
        <p class="reveal mt-6 max-w-md text-base leading-relaxed text-text-secondary" style="--d: 120ms">
          Drop PNG, JPEG, WebP or SVG. Each file is re-encoded, quantized and converted locally, then ranked by size — so
          you ship the smallest version with no visible cost. Nothing is uploaded.
        </p>
        <p class="reveal mt-7 font-mono text-xs tracking-wide text-text-secondary/80" style="--d: 180ms">
          oxipng · mozjpeg · webp · avif · svgo
        </p>
      </div>

      <div class="reveal" style="--d: 140ms">
        <DropZone variant="hero" @files="emit('files', $event)" />
      </div>
    </section>

    <!-- capabilities -->
    <section class="grid gap-px overflow-hidden rounded-2xl border border-border-default bg-border-default sm:grid-cols-3">
      <div v-for="cap in capabilities" :key="cap.label" class="bg-bg-secondary p-6">
        <p class="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{{ cap.label }}</p>
        <h2 class="mt-3 font-display text-lg font-medium tracking-tight">{{ cap.title }}</h2>
        <p class="mt-1.5 text-sm leading-relaxed text-text-secondary">{{ cap.body }}</p>
      </div>
    </section>

    <footer class="py-10 text-center font-mono text-[11px] tracking-wide text-text-secondary/70">
      Runs entirely in your browser · oxipng · mozjpeg · WebP · AVIF · SVGO
    </footer>
  </div>
</template>

<style scoped>
.reveal {
  animation: reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--d, 0ms);
}
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .reveal {
    animation: none;
  }
}
</style>

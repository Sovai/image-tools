<script setup lang="ts">
import { ref } from 'vue'
import { UploadCloud, Plus } from '@lucide/vue'

withDefaults(defineProps<{ variant?: 'hero' | 'bar' }>(), { variant: 'bar' })
const emit = defineEmits<{ files: [File[]] }>()
const dragging = ref(false)
const input = ref<HTMLInputElement>()

function onDrop(e: DragEvent) {
  dragging.value = false
  const list = e.dataTransfer?.files
  if (list?.length) emit('files', Array.from(list))
}
function onPick(e: Event) {
  const t = e.target as HTMLInputElement
  if (t.files?.length) emit('files', Array.from(t.files))
  t.value = ''
}
function open() {
  input.value?.click()
}
</script>

<template>
  <input
    ref="input"
    type="file"
    multiple
    accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
    class="hidden"
    @change="onPick"
  />

  <!-- HERO: precision intake panel framed with corner registration marks -->
  <div
    v-if="variant === 'hero'"
    role="button"
    tabindex="0"
    aria-label="Drop images here or browse to select"
    class="dotgrid group relative flex min-h-[clamp(300px,42vh,460px)] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border bg-bg-secondary p-8 text-center transition-colors"
    :class="dragging ? 'border-accent' : 'border-border-default hover:border-accent/50'"
    @click="open"
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
    @dragover.prevent="dragging = true"
    @dragenter.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <!-- corner registration marks -->
    <span
      v-for="c in ['tl', 'tr', 'bl', 'br']"
      :key="c"
      class="pointer-events-none absolute h-5 w-5 transition-all duration-300"
      :class="[
        dragging ? 'border-accent' : 'border-text-secondary/35',
        c === 'tl' && 'left-3 top-3 border-l-2 border-t-2 group-hover:left-2 group-hover:top-2 group-hover:rounded-tl-lg',
        c === 'tr' && 'right-3 top-3 border-r-2 border-t-2 group-hover:right-2 group-hover:top-2 group-hover:rounded-tr-lg',
        c === 'bl' && 'bottom-3 left-3 border-b-2 border-l-2 group-hover:bottom-2 group-hover:left-2 group-hover:rounded-bl-lg',
        c === 'br' && 'bottom-3 right-3 border-b-2 border-r-2 group-hover:bottom-2 group-hover:right-2 group-hover:rounded-br-lg',
      ]"
    />

    <div class="relative z-10 flex flex-col items-center gap-3">
      <div
        class="grid h-12 w-12 place-items-center rounded-xl border transition-colors"
        :class="dragging ? 'border-accent bg-accent/15 text-accent' : 'border-border-default bg-bg-primary text-text-secondary group-hover:text-accent'"
      >
        <component :is="dragging ? UploadCloud : Plus" :size="22" :stroke-width="2" />
      </div>
      <p class="font-display text-lg font-medium text-text-primary">
        {{ dragging ? 'Release to optimize' : 'Drop images to optimize' }}
      </p>
      <p class="text-sm text-text-secondary">
        or <span class="font-medium text-accent underline-offset-4 group-hover:underline">browse your files</span> — batch is fine
      </p>
      <p class="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-secondary/80">
        PNG · JPEG · WEBP · SVG
      </p>
    </div>
  </div>

  <!-- BAR: compact "add more" strip for the working view -->
  <div
    v-else
    role="button"
    tabindex="0"
    aria-label="Add more images"
    class="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed bg-bg-secondary px-4 py-3 text-sm transition-colors"
    :class="dragging ? 'border-accent bg-accent/10' : 'border-border-default hover:border-accent/50'"
    @click="open"
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
    @dragover.prevent="dragging = true"
    @dragenter.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <Plus :size="16" class="text-accent" />
    <span class="font-medium text-text-primary">Add more images</span>
    <span class="ml-auto font-mono text-[11px] uppercase tracking-[0.16em] text-text-secondary/80">PNG · JPEG · WEBP · SVG</span>
  </div>
</template>

<style scoped>
/* Faint design-canvas dot grid behind the hero intake panel. */
.dotgrid::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--border-color) 1px, transparent 1px);
  background-size: 22px 22px;
  opacity: 0.6;
  pointer-events: none;
}
</style>

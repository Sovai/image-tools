<script setup lang="ts">
import { ref } from 'vue'
import { UploadCloud } from '@lucide/vue'

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
</script>

<template>
  <div
    class="relative rounded-2xl border-2 border-dashed p-12 text-center transition-colors"
    :class="
      dragging
        ? 'border-accent bg-accent/10'
        : 'border-border-default bg-bg-secondary hover:border-accent/60'
    "
    @dragover.prevent="dragging = true"
    @dragenter.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="input"
      type="file"
      multiple
      accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
      class="hidden"
      @change="onPick"
    />
    <div class="flex flex-col items-center gap-3">
      <div class="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
        <UploadCloud :size="26" :stroke-width="1.75" />
      </div>
      <div class="text-base font-medium text-text-primary">
        Drop images here, or
        <button class="font-semibold text-accent underline-offset-2 hover:underline" @click="input?.click()">
          browse
        </button>
      </div>
      <p class="text-xs text-text-secondary">
        PNG · JPEG · WebP · SVG — everything runs locally in your browser
      </p>
    </div>
  </div>
</template>

<script lang="ts">
  import { ImageUp } from 'lucide-svelte';

  interface Props {
    onfiles: (files: FileList) => void;
    multiple?: boolean;
    accept?: string;
    label?: string;
    description?: string;
  }

  let {
    onfiles,
    multiple = false,
    accept = 'image/*',
    label = 'Drop your images',
    description = 'PNG, JPG, WEBP supported'
  }: Props = $props();

  let fileInput: HTMLInputElement | undefined = $state();
  let isOver = $state(false);

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      onfiles(target.files);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isOver = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      onfiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isOver = true;
  }

  function handleDragLeave() {
    isOver = false;
  }
</script>

<div
  class="border border-dashed rounded-2xl p-12 lg:p-24 flex flex-col items-center justify-center gap-6 cursor-pointer group h-full min-h-100 {isOver ? 'border-primary bg-primary/10' : 'border-stone-200 dark:border-(--border-color) bg-stone-50/30 dark:bg-(--card-bg)/50 hover:bg-stone-50 dark:hover:bg-(--card-bg)'}"
  role="button"
  tabindex="0"
  onclick={() => fileInput?.click()}
  onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
>
  <input type="file" {multiple} {accept} class="hidden" bind:this={fileInput} onchange={handleFileChange} />

  <div class="bg-white dark:bg-(--bg-secondary) p-6 rounded-3xl group-hover:scale-105 transition-transform border border-stone-100 dark:border-(--border-color)">
    <ImageUp class="w-10 h-10 text-primary" />
  </div>

  <div class="text-center">
    <p class="text-lg text-stone-800 dark:text-stone-100 font-bold">{label}</p>
    <p class="text-sm text-stone-400 dark:text-stone-500 mt-1 font-medium">{description}</p>
  </div>
</div>

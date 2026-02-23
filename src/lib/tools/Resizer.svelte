<script lang="ts">
  import { Image as ImageIcon, Download, Settings2, Lock, Unlock } from 'lucide-svelte';
  import { downloadBlob, getImageDimensions } from '../utils/file';
  import Button from '../components/ui/Button.svelte';
  import Card from '../components/ui/Card.svelte';
  import Dropzone from '../components/ui/Dropzone.svelte';
  import Input from '../components/ui/Input.svelte';

  let src = $state<string | null>(null);
  let fileName = $state<string>('');
  let isResizing = $state(false);

  let originalWidth = $state<number>(0);
  let originalHeight = $state<number>(0);
  let originalAspectRatio = $state<number>(1);

  let targetWidth = $state<number | ''>('');
  let targetHeight = $state<number | ''>('');
  let keepAspectRatio = $state<boolean>(true);
  let selectedFormat = $state<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');

  let resizedBlob = $state<Blob | null>(null);
  let resizedSrc = $state<string | null>(null);

  async function processFiles(files: FileList | File[]) {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      fileName = file.name;
      const objectUrl = URL.createObjectURL(file);
      src = objectUrl;
      resizedBlob = null;
      resizedSrc = null;

      try {
        const dimensions = await getImageDimensions(objectUrl);
        originalWidth = dimensions.width;
        originalHeight = dimensions.height;
        originalAspectRatio = originalWidth / originalHeight;
        targetWidth = originalWidth;
        targetHeight = originalHeight;

        if (file.type === 'image/jpeg' || file.type === 'image/png') {
          selectedFormat = file.type;
        } else {
          selectedFormat = 'image/webp';
        }
      } catch (err) {
        console.error('Failed to load image dimensions', err);
      }
    }
  }

  function clearImage() {
    src = null;
    fileName = '';
    originalWidth = 0;
    originalHeight = 0;
    targetWidth = '';
    targetHeight = '';
    resizedBlob = null;
    resizedSrc = null;
  }

  function handleWidthChange() {
    if (keepAspectRatio && targetWidth && originalAspectRatio) {
      targetHeight = Math.round(Number(targetWidth) / originalAspectRatio);
    }
  }

  function handleHeightChange() {
    if (keepAspectRatio && targetHeight && originalAspectRatio) {
      targetWidth = Math.round(Number(targetHeight) * originalAspectRatio);
    }
  }

  function toggleAspectRatio() {
    keepAspectRatio = !keepAspectRatio;
    if (keepAspectRatio) handleWidthChange();
  }

  async function processImage() {
    if (!src || !targetWidth || !targetHeight) return;
    isResizing = true;

    try {
      const img = new Image();
      img.src = src;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = Number(targetWidth);
      canvas.height = Number(targetHeight);

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context');

      if (selectedFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), selectedFormat, 0.95);
      });

      if (blob) {
        resizedBlob = blob;
        if (resizedSrc) URL.revokeObjectURL(resizedSrc);
        resizedSrc = URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error('Resize Failed', error);
    } finally {
      isResizing = false;
    }
  }

  function handleDownload() {
    if (!resizedBlob) return;
    const ext = selectedFormat.split('/')[1];
    const name = fileName.split('.')[0] || 'resized';
    downloadBlob(resizedBlob, `${name}-${targetWidth}x${targetHeight}.${ext}`);
  }
</script>

<div class="space-y-6 lg:space-y-8">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 {src ? 'items-start' : 'items-stretch'}">
    <div class="lg:col-span-1">
      <Card title="Resize Settings" sticky={true}>
        <div class="space-y-8">
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <Input label="Width (px)" type="number" bind:value={targetWidth} oninput={handleWidthChange} />
            </div>

            <div class="pt-6">
              <button
                onclick={toggleAspectRatio}
                class="p-2 lg:p-2.5 rounded-xl transition-all {keepAspectRatio ? 'text-primary bg-primary/10 dark:bg-primary/10' : 'text-stone-300 dark:text-stone-600 hover:bg-stone-50 dark:hover:bg-(--hover-bg)'}"
                title="Maintain Aspect Ratio"
              >
                {#if keepAspectRatio}
                  <Lock class="w-4 h-4" />
                {:else}
                  <Unlock class="w-4 h-4" />
                {/if}
              </button>
            </div>

            <div class="flex-1">
              <Input label="Height (px)" type="number" bind:value={targetHeight} oninput={handleHeightChange} />
            </div>
          </div>

          <div class="space-y-3">
            <label for="output-format" class="block text-sm font-semibold text-stone-700 dark:text-stone-200">Output Format</label>
            <div id="output-format" class="grid grid-cols-3 gap-2">
              {#each ['image/webp', 'image/jpeg', 'image/png'] as format}
                <button
                  class="px-2 py-3 rounded-xl text-xs font-bold transition-all {selectedFormat === format ? 'bg-stone-900 dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-(--bg-secondary) border border-stone-200 dark:border-(--border-color) text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700'}"
                  onclick={() => selectedFormat = format as any}
                >
                  {format.split('/')[1].toUpperCase()}
                </button>
              {/each}
            </div>
          </div>

          <div class="space-y-3 pt-4">
            <Button variant="outline" class="w-full" onclick={processImage} disabled={isResizing || !targetWidth || !targetHeight} loading={isResizing}>
              <Settings2 class="w-5 h-5" />
              Resize
            </Button>

            <Button class="w-full" onclick={handleDownload} disabled={!resizedBlob}>
              <Download class="w-5 h-5" />
              Download Result
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <div class="lg:col-span-2">
      {#if !src}
        <Dropzone onfiles={processFiles} />
      {:else}
        <div class="space-y-4">
          <div class="aspect-video bg-white dark:bg-(--bg-color) rounded-2xl border border-stone-100 dark:border-(--border-color) flex items-center justify-center overflow-hidden relative min-h-100">
            <img src={resizedSrc || src} alt="Preview" class="max-w-full max-h-full object-contain p-8" />
            {#if resizedSrc}
              <div class="absolute top-4 right-4 px-3 py-1.5 bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                Resized Result
              </div>
            {/if}
          </div>
          <div class="flex items-center justify-between px-2">
            <div class="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
              <div class="p-2 bg-stone-100 dark:bg-(--bg-secondary) rounded-lg">
                <ImageIcon class="w-4 h-4 text-stone-400" />
              </div>
              <div class="flex flex-col">
                <span class="truncate max-w-50 font-bold text-stone-800 dark:text-stone-100">{fileName}</span>
                <span class="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">Original: {originalWidth}x{originalHeight}</span>
              </div>
            </div>
            <button class="text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider" onclick={clearImage}>
              Remove
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

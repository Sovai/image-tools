<script lang="ts">
  import { removeBackground, type Config } from '@imgly/background-removal';
  import { Eraser, Download, RotateCcw, ImageIcon, Loader2, Info } from 'lucide-svelte';
  import Dropzone from '../components/ui/Dropzone.svelte';
  import Card from '../components/ui/Card.svelte';
  import Button from '../components/ui/Button.svelte';
  import ImageSlider from '../components/ImageSlider.svelte';
  import Input from '../components/ui/Input.svelte';

  let originalFile = $state<File | null>(null);
  let originalSrc = $state<string>('');
  let processedSrc = $state<string>('');
  let isProcessing = $state(false);
  let error = $state<string>('');
  let progress = $state(0);
  let selectedModel = $state<Config['model']>('isnet');

  async function handleFiles(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error = 'Please upload an image file.';
      return;
    }

    error = '';
    if (originalSrc) URL.revokeObjectURL(originalSrc);
    if (processedSrc) URL.revokeObjectURL(processedSrc);

    originalFile = file;
    originalSrc = URL.createObjectURL(file);
    processedSrc = '';
    console.log('Original file set:', file.name, originalSrc);
  }

  async function processImage() {
    if (!originalFile) return;

    isProcessing = true;
    error = '';
    progress = 0;
    console.log(`Processing image with model: ${selectedModel}`);

    try {
      const resultBlob = await removeBackground(originalFile, {
        model: selectedModel,
        proxyToWorker: true,
        progress: (_, current: number, total: number) => {
          progress = Math.round((current / total) * 100);
          console.log(`Progress: ${progress}% (${current}/${total})`);
        }
      });
      if (processedSrc) URL.revokeObjectURL(processedSrc);
      processedSrc = URL.createObjectURL(resultBlob);
      console.log('Background removed successfully');
    } catch (e) {
      console.error('Background removal failed:', e);
      error = 'Failed to remove background. Try switching the model or check console for errors.';
    } finally {
      isProcessing = false;
      progress = 0;
    }
  }

  function handleDownload() {
    if (!processedSrc || !originalFile) return;
    const link = document.createElement('a');
    link.href = processedSrc;
    link.download = `${originalFile.name.split('.')[0]}-no-bg.png`;
    link.click();
  }

  function reset() {
    if (originalSrc) URL.revokeObjectURL(originalSrc);
    if (processedSrc) URL.revokeObjectURL(processedSrc);
    originalFile = null;
    originalSrc = '';
    processedSrc = '';
    isProcessing = false;
    error = '';
  }
</script>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
  <div class="lg:col-span-8 space-y-8">
    {#if !originalSrc}
      <div class="h-125">
        <Dropzone onfiles={handleFiles} accept="image/png,image/webp,image/jpeg" />
      </div>
    {:else}
      <div class="space-y-6">
        {#if processedSrc}
          <div class="bg-stone-50 dark:bg-(--card-bg)/50 rounded-2xl p-4 lg:p-8 border border-stone-200 dark:border-(--border-color)">
            <ImageSlider
              before={originalSrc}
              after={processedSrc}
              labelBefore="Original"
              labelAfter="Removed"
            />
          </div>
        {:else}
          <div class="relative aspect-video bg-white dark:bg-(--bg-color) rounded-3xl overflow-hidden border border-stone-200 dark:border-(--border-color) flex items-center justify-center p-8 group transparency-grid">
            <img src={originalSrc} alt="Original" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]" />
            {#if isProcessing}
              <div class="absolute inset-0 bg-stone-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-white">
                <Loader2 class="w-12 h-12 animate-spin text-primary" />
                <div class="flex flex-col items-center gap-1">
                  <span class="text-lg font-bold">
                    {#if progress > 0}
                      Removing Background {progress}%...
                    {:else}
                      Removing Background...
                    {/if}
                  </span>
                  <p class="text-sm text-stone-300">This might take a few seconds</p>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        {#if error}
          <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="lg:col-span-4 space-y-6">
    <Card title="Controls" sticky={true}>
      <div class="space-y-6">
        <div>
          <h5 class="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">Model Settings</h5>
          <Input
            id="model-select"
            type="select"
            bind:value={selectedModel}
            options={[
              { label: 'Standard (ISNet)', value: 'isnet' },
              { label: 'High Precision (ISNet FP16)', value: 'isnet_fp16' },
              { label: 'Small/Fast (ISNet Quint8)', value: 'isnet_quint8' }
            ]}
          />
          <p class="mt-2 text-[10px] text-stone-400 leading-tight flex gap-1.5">
            <Info class="w-3 h-3 shrink-0" />
            Standard is best for most subjects. Use High Precision for complex edges.
          </p>
        </div>

        <div>
          <h5 class="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">Action</h5>
          {#if !originalFile}
            <div class="p-4 bg-stone-100 dark:bg-(--bg-secondary) rounded-xl border border-dashed border-stone-200 dark:border-(--border-color) flex flex-col items-center justify-center gap-2 text-stone-400">
              <ImageIcon class="w-8 h-8 opacity-20" />
              <span class="text-xs font-medium">Upload an image to start</span>
            </div>
          {:else if processedSrc}
            <div class="flex flex-col gap-3">
              <Button class="w-full" onclick={handleDownload}>
                <Download class="w-4 h-4" />
                Download PNG
              </Button>
              <Button variant="outline" class="w-full" onclick={reset}>
                <RotateCcw class="w-4 h-4" />
                Start Over
              </Button>
            </div>
          {:else}
            <Button
              class="w-full"
              onclick={processImage}
              loading={isProcessing}
              disabled={!originalFile}
            >
              <Eraser class="w-4 h-4" />
              Remove Background
            </Button>
          {/if}
        </div>

        {#if originalFile && !isProcessing}
          <div class="pt-6 border-t border-stone-100 dark:border-(--border-color)">
            <h5 class="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">File Info</h5>
            <div class="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400 mb-4">
              <div class="p-2 bg-stone-100 dark:bg-(--bg-secondary) rounded-lg">
                <ImageIcon class="w-4 h-4 text-stone-400" />
              </div>
              <div class="flex flex-col">
                <span class="truncate max-w-50 font-bold text-stone-800 dark:text-stone-100">{originalFile.name}</span>
                <span class="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                  {originalFile.type.split('/')[1]?.toUpperCase()} • {(originalFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
            {#if !processedSrc}
              <Button variant="ghost" class="w-full justify-start! px-0!" onclick={reset}>
                <RotateCcw class="w-4 h-4" />
                Discard & Upload New
              </Button>
            {/if}
          </div>
        {/if}

        <div class="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
          <p class="text-[11px] text-primary leading-relaxed">
            <strong>Privacy Note:</strong> All processing happens directly in your browser. Your images are never uploaded to any server.
          </p>
        </div>
      </div>
    </Card>
  </div>
</div>

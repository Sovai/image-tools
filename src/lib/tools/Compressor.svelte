<script lang="ts">
  import { Image as ImageIcon, Download, ChevronDown, ChevronUp, Sliders } from 'lucide-svelte';
  import ImageSlider from '../components/ImageSlider.svelte';
  import Compressor from 'compressorjs';
  import { formatBytes } from '../utils/format';
  import { downloadBlob } from '../utils/file';
  import Button from '../components/ui/Button.svelte';
  import Card from '../components/ui/Card.svelte';
  import Dropzone from '../components/ui/Dropzone.svelte';
  import Input from '../components/ui/Input.svelte';

  let src = $state<string | null>(null);
  let fileName = $state<string>('');
  let originalSize = $state<number>(0);
  let isCompressing = $state(false);
  let originalFile = $state<File | null>(null);
  let showAdvanced = $state(false);

  let options = $state({
    quality: 0.8,
    strict: true,
    checkOrientation: true,
    maxWidth: undefined as number | undefined,
    maxHeight: undefined as number | undefined,
    mimeType: '',
    convertSize: 5000000,
  });

  let compressedBlob = $state<Blob | null>(null);
  let compressedSize = $state<number>(0);
  let compressedSrc = $state<string | null>(null);

  function processFiles(files: FileList | File[]) {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      originalFile = file;
      fileName = file.name;
      originalSize = file.size;
      src = URL.createObjectURL(file);

      compressedBlob = null;
      compressedSize = 0;
      if (compressedSrc) URL.revokeObjectURL(compressedSrc);
      compressedSrc = null;

      processImage();
    }
  }

  function clearImage() {
    src = null;
    originalFile = null;
    fileName = '';
    originalSize = 0;
    compressedBlob = null;
    compressedSize = 0;
    if (compressedSrc) URL.revokeObjectURL(compressedSrc);
    compressedSrc = null;
  }

  async function processImage() {
    if (!originalFile) return;
    isCompressing = true;

    try {
      new Compressor(originalFile, {
        ...options,
        success(result: Blob | File) {
          compressedBlob = result;
          compressedSize = result.size;
          if (compressedSrc) URL.revokeObjectURL(compressedSrc);
          compressedSrc = URL.createObjectURL(result);
          isCompressing = false;
        },
        error(err: Error) {
          console.error('Compression Failed', err);
          isCompressing = false;
        },
      });
    } catch (error) {
      console.error('Unexpected error', error);
      isCompressing = false;
    }
  }

  function handleDownload() {
    if (!compressedBlob) return;
    const ext = compressedBlob.type.split('/')[1] || 'jpg';
    const name = fileName.split('.')[0] || 'compressed';
    downloadBlob(compressedBlob, `${name}-compressed.${ext}`);
  }

  function handleOptionChange() {
    if (originalFile) processImage();
  }
</script>

<div class="space-y-6 lg:space-y-8">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 {src ? 'items-start' : 'items-stretch'}">
    <div class="lg:col-span-1">
      <Card title="Compression Settings" sticky={true}>
        <div class="space-y-8">
          <Input
            label="Quality"
            type="range"
            min={0}
            max={1}
            step={0.01}
            bind:value={options.quality}
            onchange={handleOptionChange}
            suffix="{Math.round(options.quality * 100)}%"
          />

          <button
            class="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            onclick={() => showAdvanced = !showAdvanced}
          >
            <div class="flex items-center gap-2">
              <Sliders class="w-3.5 h-3.5" />
              Advanced Settings
            </div>
            {#if showAdvanced}
              <ChevronUp class="w-4 h-4" />
            {:else}
              <ChevronDown class="w-4 h-4" />
            {/if}
          </button>

          {#if showAdvanced}
            <div class="space-y-6 pt-2 border-t border-stone-100 dark:border-(--border-color)">
              <div class="grid grid-cols-2 gap-4">
                <Input label="Max Width" type="number" placeholder="None" bind:value={options.maxWidth} onchange={handleOptionChange} />
                <Input label="Max Height" type="number" placeholder="None" bind:value={options.maxHeight} onchange={handleOptionChange} />
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold uppercase tracking-widest text-stone-400">Strict Mode</span>
                  <Input type="checkbox" bind:value={options.strict} onchange={handleOptionChange} />
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold uppercase tracking-widest text-stone-400">Check Orientation</span>
                  <Input type="checkbox" bind:value={options.checkOrientation} onchange={handleOptionChange} />
                </div>
              </div>

              <Input
                label="Convert To"
                type="select"
                bind:value={options.mimeType}
                onchange={handleOptionChange}
                options={[
                  { label: 'Original', value: '' },
                  { label: 'JPEG', value: 'image/jpeg' },
                  { label: 'PNG', value: 'image/png' },
                  { label: 'WebP', value: 'image/webp' }
                ]}
              />
            </div>
          {/if}

          {#if compressedBlob}
            <div class="space-y-4 pt-4">
              <div>
                <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  <span class="text-stone-400">Result</span>
                  <span class="text-stone-700 dark:text-stone-200">{formatBytes(compressedSize)}</span>
                </div>
                <div class="w-full bg-stone-200 dark:bg-(--bg-secondary) rounded-full h-1.5 overflow-hidden">
                  <div
                    class="bg-primary h-1.5 rounded-full transition-all duration-500"
                    style="width: {originalSize > 0 ? Math.min(100, (compressedSize / originalSize) * 100) : 100}%"
                  ></div>
                </div>
              </div>

              {#if originalSize > compressedSize}
                <div class="flex flex-col gap-2 p-5 rounded-2xl bg-primary/10 border border-primary/20">
                  <div class="flex justify-between items-center">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-primary">Optimization</span>
                    <span class="px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded-full">
                      -{Math.round(((originalSize - compressedSize) / originalSize) * 100)}%
                    </span>
                  </div>
                  <div class="flex justify-between items-baseline">
                    <span class="text-xl font-black text-stone-900 dark:text-white">Saved</span>
                    <span class="text-sm font-bold text-primary">{formatBytes(originalSize - compressedSize)}</span>
                  </div>
                </div>
              {:else if compressedSize > 0}
                 <div class="flex justify-between items-center text-xs font-bold bg-stone-100 dark:bg-(--bg-secondary) text-stone-500 dark:text-stone-400 p-4 rounded-xl border border-stone-200 dark:border-(--border-color)">
                  <span class="uppercase tracking-widest text-[10px]">Status</span>
                  <span class="font-black text-stone-700 dark:text-stone-300">Did not save</span>
                </div>
              {/if}
            </div>
          {/if}

          <Button class="w-full" onclick={handleDownload} disabled={!compressedBlob} loading={isCompressing}>
            <Download class="w-5 h-5" />
            Download Result
          </Button>
        </div>
      </Card>
    </div>

    <div class="lg:col-span-2">
      {#if !src}
        <Dropzone onfiles={processFiles} accept="image/jpeg, image/png, image/webp" />
      {:else}
        <div class="space-y-4">
          {#if compressedSrc}
            <ImageSlider
              before={src}
              after={compressedSrc}
              labelBefore="Original"
              labelAfter="Compressed"
              statsBefore={formatBytes(originalSize)}
              statsAfter="{formatBytes(compressedSize)} • {Math.round(((originalSize - compressedSize) / originalSize) * 100)}% Smallest"
            />
          {:else}
            <div class="aspect-video bg-white dark:bg-(--bg-color) rounded-2xl border border-stone-100 dark:border-(--border-color) flex items-center justify-center overflow-hidden">
              <img src={src} alt="Preview" class="max-w-full max-h-full object-contain p-8 animate-pulse" />
            </div>
          {/if}

          <div class="flex items-center justify-between px-2">
            <div class="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
              <div class="p-2 bg-stone-100 dark:bg-(--bg-secondary) rounded-lg">
                <ImageIcon class="w-4 h-4 text-stone-400" />
              </div>
              <div class="flex flex-col">
                <span class="truncate max-w-50 font-bold text-stone-800 dark:text-stone-100">{fileName}</span>
                <span class="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                  {originalFile?.type.split('/')[1]?.toUpperCase() || 'IMAGE'} • {formatBytes(originalSize)}
                </span>
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

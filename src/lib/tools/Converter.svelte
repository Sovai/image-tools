<script lang="ts">
  import { Download, Trash2, CheckCircle2, AlertCircle, X, Archive } from 'lucide-svelte';
  import JSZip from 'jszip';
  import { formatBytes } from '../utils/format';
  import { downloadBlob, getBaseName } from '../utils/file';
  import Button from '../components/ui/Button.svelte';
  import Card from '../components/ui/Card.svelte';
  import Dropzone from '../components/ui/Dropzone.svelte';
  import Input from '../components/ui/Input.svelte';

  interface ConversionTask {
    id: string;
    file: File;
    previewSrc: string;
    targetFormat: string;
    quality: number;
    status: 'pending' | 'converting' | 'done' | 'error';
    originalSize: number;
    convertedSize?: number;
    convertedBlob?: Blob;
    convertedUrl?: string;
    error?: string;
  }

  let tasks = $state<ConversionTask[]>([]);
  let globalFormat = $state('image/webp');
  let globalQuality = $state(80);
  let isProcessing = $state(false);

  const formatOptions = [
    { label: 'WebP', value: 'image/webp' },
    { label: 'JPEG', value: 'image/jpeg' },
    { label: 'PNG', value: 'image/png' },
  ];

  function handleFiles(files: FileList | File[]) {
    const newTasks: ConversionTask[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        newTasks.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewSrc: URL.createObjectURL(file),
          targetFormat: globalFormat,
          quality: globalQuality / 100,
          status: 'pending',
          originalSize: file.size,
        });
      }
    }
    tasks = [...tasks, ...newTasks];
  }

  let addMoreInput: HTMLInputElement | undefined = $state();

  function clearAll() {
    tasks.forEach(t => {
      URL.revokeObjectURL(t.previewSrc);
      if (t.convertedUrl) URL.revokeObjectURL(t.convertedUrl);
    });
    tasks = [];
  }

  function removeTask(id: string) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      URL.revokeObjectURL(task.previewSrc);
      if (task.convertedUrl) URL.revokeObjectURL(task.convertedUrl);
      tasks = tasks.filter(t => t.id !== id);
    }
  }

  async function convertFile(task: ConversionTask) {
    task.status = 'converting';
    try {
      const img = new Image();
      img.src = task.previewSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context');

      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), task.targetFormat, task.quality);
      });

      if (!blob) throw new Error('Conversion failed');

      task.convertedBlob = blob;
      task.convertedSize = blob.size;
      task.convertedUrl = URL.createObjectURL(blob);
      task.status = 'done';
    } catch (e) {
      console.error(e);
      task.status = 'error';
      task.error = 'Failed to convert';
    }
  }

  async function convertAll() {
    isProcessing = true;
    const pendingTasks = tasks.filter(t => t.status !== 'done');

    await Promise.all(pendingTasks.map(t => {
      t.targetFormat = globalFormat;
      t.quality = globalQuality / 100;
      return convertFile(t);
    }));

    isProcessing = false;
  }

  async function downloadAll() {
    const zip = new JSZip();
    const completedTasks = tasks.filter(t => t.status === 'done' && t.convertedBlob);

    if (completedTasks.length === 0) return;

    for (const task of completedTasks) {
      const ext = task.targetFormat.split('/')[1];
      const baseName = getBaseName(task.file.name);
      zip.file(`${baseName}-converted.${ext}`, task.convertedBlob!);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, 'converted-images.zip');
  }

  function downloadSingle(task: ConversionTask) {
    if (!task.convertedBlob) return;
    const ext = task.targetFormat.split('/')[1];
    const baseName = getBaseName(task.file.name);
    downloadBlob(task.convertedBlob, `${baseName}-converted.${ext}`);
  }
</script>

<div class="space-y-6 lg:space-y-8">
  {#if tasks.length > 0}
    <div class="flex justify-end p-2 -mb-4">
      <button
        onclick={clearAll}
        class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-xl transition-colors"
      >
        <Trash2 class="w-4 h-4" />
        Clear All
      </button>
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
    <div class="lg:col-span-1">
      <Card title="Settings" sticky={true}>
        <div class="space-y-6">
          <div class="space-y-3">
            <label for="target-extension" class="block text-sm font-semibold text-stone-700 dark:text-stone-200">Target Extension</label>
            <div id="target-extension" class="grid grid-cols-1 gap-2">
              {#each formatOptions as option}
                <button
                  class="px-4 py-3 rounded-xl text-left text-sm font-bold  {globalFormat === option.value ? 'bg-stone-900 dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-(--bg-secondary) border border-stone-200 dark:border-(--border-color) text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700'}"
                  onclick={() => globalFormat = option.value}
                >
                  {option.label}
                </button>
              {/each}
            </div>
          </div>

          {#if globalFormat !== 'image/png'}
            <Input
              label="Quality"
              type="range"
              min={1}
              max={100}
              bind:value={globalQuality}
              suffix="{globalQuality}%"
            />
          {/if}

          <div class="pt-4 space-y-3">
            <Button class="w-full" onclick={convertAll} disabled={isProcessing || tasks.length === 0} loading={isProcessing}>
              Convert All
            </Button>

            {#if tasks.some(t => t.status === 'done')}
              <Button variant="outline" class="w-full" onclick={downloadAll}>
                <Archive class="w-5 h-5" />
                Download All (.zip)
              </Button>
            {/if}
          </div>
        </div>
      </Card>
    </div>

    <div class="lg:col-span-2 space-y-4">
      {#if tasks.length === 0}
        <Dropzone onfiles={handleFiles} multiple={true} label="Drop your images" description="Multiple files supported" />
      {:else}
        <div class="space-y-3">
          {#each tasks as task (task.id)}
            <div class="group bg-white dark:bg-(--bg-secondary) border border-stone-100 dark:border-(--border-color) rounded-2xl p-3 lg:p-4 flex items-center gap-4 hover:border-stone-200 dark:hover:border-stone-700">
              <div class="w-16 h-16 lg:w-20 lg:h-20 bg-stone-50 dark:bg-(--bg-secondary) rounded-xl overflow-hidden shrink-0 relative">
                <img src={task.previewSrc} alt="Preview" class="w-full h-full object-cover" />
                {#if task.status === 'done'}
                  <div class="absolute top-1 right-1 p-0.5 bg-green-500 rounded-full">
                    <CheckCircle2 class="w-3 h-3 text-white" />
                  </div>
                {/if}
              </div>

              <div class="flex-1 min-w-0">
                <h5 class="text-sm font-bold text-stone-800 dark:text-stone-100 truncate mb-1">{task.file.name}</h5>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">{formatBytes(task.originalSize)}</span>
                  {#if task.convertedSize}
                    <span class="text-[10px] font-extrabold text-primary uppercase">
                      → {formatBytes(task.convertedSize)}
                    </span>
                    {@const savings = Math.round((1 - task.convertedSize / task.originalSize) * 100)}
                    {#if savings > 0}
                      <span class="text-[10px] px-2 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500 rounded-lg font-bold">
                        -{savings}%
                      </span>
                    {/if}
                  {/if}
                </div>

                {#if task.status === 'error'}
                  <p class="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle class="w-3 h-3" /> {task.error}
                  </p>
                {/if}

                {#if task.status === 'converting'}
                  <div class="mt-2 w-full bg-stone-100 dark:bg-(--bg-secondary) h-1 rounded-full overflow-hidden">
                    <div class="bg-primary h-full w-full animate-pulse rounded-full"></div>
                  </div>
                {/if}
              </div>

              <div class="flex gap-2">
                {#if task.status === 'done'}
                  <button
                    onclick={() => downloadSingle(task)}
                    class="p-2.5 bg-stone-50 dark:bg-(--bg-secondary) text-stone-400 dark:text-stone-500 hover:bg-stone-900 hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all"
                    title="Download"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                {/if}
                <button
                  onclick={() => removeTask(task.id)}
                  class="p-2.5 bg-stone-50 dark:bg-(--bg-secondary) text-stone-400 dark:text-stone-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white rounded-xl transition-all"
                  title="Remove"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          {/each}

          <button
            onclick={() => addMoreInput?.click()}
            class="w-full py-6 border border-dashed border-stone-200 dark:border-(--border-color) rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-stone-50 dark:hover:bg-(--bg-secondary) transition-all group"
          >
            <input
              type="file"
              multiple
              accept="image/*"
              class="hidden"
              bind:this={addMoreInput}
              onchange={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.files) handleFiles(target.files);
                target.value = ''; // Reset input to allow adding same files again
              }}
            />
             <span class="text-xs font-bold text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200">Drag or Click to Add More</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

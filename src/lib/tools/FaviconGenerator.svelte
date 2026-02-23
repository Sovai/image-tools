<script lang="ts">
  import { Image as ImageIcon, Box } from 'lucide-svelte';
  import JSZip from 'jszip';
  import { downloadBlob } from '../utils/file';
  import Button from '../components/ui/Button.svelte';
  import Card from '../components/ui/Card.svelte';
  import Dropzone from '../components/ui/Dropzone.svelte';
  import Input from '../components/ui/Input.svelte';

  let src = $state<string | null>(null);
  let fileName = $state<string>('');
  let isGenerating = $state(false);

  let includeIco = $state(true);
  let includeAppleTouch = $state(true);
  let includeAndroidIcon = $state(false);

  function processFiles(files: FileList) {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      fileName = file.name;
      src = URL.createObjectURL(file);
    }
  }

  function clearImage() {
    src = null;
    fileName = '';
  }

  async function generateFavicons() {
    if (!src) return;
    isGenerating = true;

    try {
      const img = new Image();
      img.src = src;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const zip = new JSZip();
      const sizes = [16, 32, 48];

      for (const size of sizes) {
        const blob = await generateResizedImage(img, size, size);
        if (blob) zip.file(`favicon-${size}x${size}.png`, blob);
      }

      if (includeIco) {
        const blobIco = await generateResizedImage(img, 32, 32);
        if (blobIco) zip.file('favicon.ico', blobIco);
      }

      if (includeAppleTouch) {
        const appleBlob = await generateResizedImage(img, 180, 180);
        if (appleBlob) zip.file('apple-touch-icon.png', appleBlob);
      }

      if (includeAndroidIcon) {
        const androidBlob192 = await generateResizedImage(img, 192, 192);
        const androidBlob512 = await generateResizedImage(img, 512, 512);
        if (androidBlob192) zip.file('android-chrome-192x192.png', androidBlob192);
        if (androidBlob512) zip.file('android-chrome-512x512.png', androidBlob512);

        const manifest = {
          "name": "App",
          "short_name": "App",
          "icons": [
            { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
            { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
          ],
          "theme_color": "#ffffff",
          "background_color": "#ffffff",
          "display": "standalone"
        };
        zip.file('site.webmanifest', JSON.stringify(manifest, null, 2));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'favicons.zip');
    } catch (error) {
      console.error('Generation Failed', error);
    } finally {
      isGenerating = false;
    }
  }

  function generateResizedImage(img: HTMLImageElement, width: number, height: number): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });
  }
</script>

<div class="space-y-6 lg:space-y-8">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 {src ? 'items-start' : 'items-stretch'}">
    <div class="lg:col-span-1">
      <Card title="Generator Options" sticky={true}>
        <div class="space-y-4">
          <label class="flex items-center justify-between p-4 rounded-xl border border-stone-200 dark:border-(--border-color) bg-white dark:bg-(--input-bg) cursor-pointer hover:border-primary transition-all group">
            <div class="flex flex-col">
              <span class="text-sm font-bold text-stone-700 dark:text-stone-200">Standard Favicon</span>
              <span class="text-[10px] font-bold uppercase tracking-wider text-stone-400">favicon.ico</span>
            </div>
            <Input type="checkbox" bind:value={includeIco} />
          </label>

          <label class="flex items-center justify-between p-4 rounded-xl border border-stone-200 dark:border-(--border-color) bg-white dark:bg-(--input-bg) cursor-pointer hover:border-primary transition-all group">
            <div class="flex flex-col">
              <span class="text-sm font-bold text-stone-700 dark:text-stone-200">Apple Touch Icon</span>
              <span class="text-[10px] font-bold uppercase tracking-wider text-stone-400">apple-touch-icon.png</span>
            </div>
            <Input type="checkbox" bind:value={includeAppleTouch} />
          </label>

          <label class="flex items-center justify-between p-4 rounded-xl border border-stone-200 dark:border-(--border-color) bg-white dark:bg-(--input-bg) cursor-pointer hover:border-primary transition-all group">
            <div class="flex flex-col">
              <span class="text-sm font-bold text-stone-700 dark:text-stone-200">Android / Chrome</span>
              <span class="text-[10px] font-bold uppercase tracking-wider text-stone-400">webmanifest + icons</span>
            </div>
            <Input type="checkbox" bind:value={includeAndroidIcon} />
          </label>

          <div class="pt-4">
            <Button variant="secondary" class="w-full" onclick={generateFavicons} disabled={isGenerating || !src} loading={isGenerating}>
              <Box class="w-5 h-5" />
              Download ZIP
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <div class="lg:col-span-2">
      {#if !src}
        <Dropzone onfiles={processFiles} label="Drop your logo" description="PNG, JPG or SVG (512x512 recommended)" />
      {:else}
        <div class="space-y-4">
          <div class="aspect-video bg-white dark:bg-(--bg-color) rounded-2xl border border-stone-100 dark:border-(--border-color) flex items-center justify-center overflow-hidden relative min-h-100">
            <img {src} alt="Preview" class="max-w-full max-h-full object-contain p-12" />
          </div>
          <div class="flex items-center justify-between px-2">
            <div class="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
              <div class="p-2 bg-stone-100 dark:bg-(--bg-secondary) rounded-lg">
                <ImageIcon class="w-4 h-4 text-stone-400" />
              </div>
              <span class="truncate max-w-50 font-bold text-stone-800 dark:text-stone-100">{fileName}</span>
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

<script lang="ts">
  import { FileCode2, Download, Copy, Check } from 'lucide-svelte';
  import { formatBytes } from '../utils/format';
  import { downloadBlob, getBaseName } from '../utils/file';
  import Button from '../components/ui/Button.svelte';
  import Card from '../components/ui/Card.svelte';
  import Dropzone from '../components/ui/Dropzone.svelte';

  let svgText = $state<string>('');
  let fileName = $state<string>('');
  let originalSize = $state<number>(0);
  let optimizedSize = $state<number>(0);
  let isOptimizing = $state(false);
  let copied = $state(false);

  function processFiles(files: FileList | File[]) {
    const file = files[0];
    if (file && (file.type === 'image/svg+xml' || file.name.endsWith('.svg'))) {
      fileName = file.name;
      originalSize = file.size;
      const reader = new FileReader();
      reader.onload = (e) => {
        svgText = e.target?.result as string;
        optimizeSvg();
      };
      reader.readAsText(file);
    }
  }

  function clearImage() {
    svgText = '';
    fileName = '';
    originalSize = 0;
    optimizedSize = 0;
    copied = false;
  }

  function cleanNode(node: Node) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i];
      if (child.nodeType === 8) {
        node.removeChild(child);
      } else if (child.nodeType === 1) {
        const el = child as Element;
        if (el.tagName.toLowerCase() === 'script') {
          node.removeChild(child);
          continue;
        }
        const attrs = el.attributes;
        for (let j = attrs.length - 1; j >= 0; j--) {
          const attr = attrs[j];
          if (attr.name.startsWith('on') || attr.name === 'data-name') {
            el.removeAttribute(attr.name);
          }
        }
        cleanNode(child);
        if (el.tagName.toLowerCase() === 'g' && el.childNodes.length === 0) {
          node.removeChild(child);
        }
      } else if (child.nodeType === 3) {
        if (!child.nodeValue?.trim()) {
          node.removeChild(child);
        }
      }
    }
  }

  function optimizeSvg() {
    isOptimizing = true;
    try {
      if (!svgText.trim()) return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      if (doc.querySelector('parsererror')) throw new Error('Invalid SVG XML');

      cleanNode(doc.documentElement);

      const serializer = new XMLSerializer();
      let optimized = serializer.serializeToString(doc.documentElement);
      optimized = optimized.replace(/>\s+</g, '><').replace(/"\s+\/>/g, '"/>');

      svgText = optimized;
      optimizedSize = new Blob([svgText]).size;
      if (originalSize === 0) originalSize = optimizedSize;
    } catch (error) {
      console.error('Optimization Failed', error);
    } finally {
      isOptimizing = false;
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text');
    if (text && text.trim().startsWith('<svg')) {
      svgText = text;
      fileName = 'pasted-vector.svg';
      originalSize = new Blob([svgText]).size;
      optimizeSvg();
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(svgText);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }

  function handleDownload() {
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const name = getBaseName(fileName) || 'optimized';
    downloadBlob(blob, `${name}-optimized.svg`);
  }
</script>

<svelte:window onpaste={handlePaste} />

<div class="space-y-6 lg:space-y-8">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 {svgText ? 'items-start' : 'items-stretch'}">
    <div class="lg:col-span-1">
      <Card title="Optimization Stats" sticky={true}>
        <div class="space-y-8">
          {#if svgText}
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  <span class="text-stone-400">Original Size</span>
                  <span class="text-stone-700 dark:text-stone-200">{formatBytes(originalSize)}</span>
                </div>
                <div class="w-full bg-stone-200 dark:bg-(--bg-secondary) rounded-full h-1.5">
                  <div class="bg-stone-400 dark:bg-stone-700 h-1.5 rounded-full w-full"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  <span class="text-stone-400">Optimized Size</span>
                  <span class="text-green-600 dark:text-green-500">{formatBytes(optimizedSize)}</span>
                </div>
                <div class="w-full bg-stone-200 dark:bg-(--bg-secondary) rounded-full h-1.5 overflow-hidden">
                  <div
                    class="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                    style="width: {originalSize > 0 ? Math.min(100, (optimizedSize / originalSize) * 100) : 100}%"
                  ></div>
                </div>
              </div>

              <div class="flex justify-between items-center text-xs font-bold bg-green-50 dark:bg-green-500/5 text-green-700 dark:text-green-400 p-4 rounded-xl border border-green-100 dark:border-green-500/10">
                <span class="uppercase tracking-widest">Reduction</span>
                <span>-{originalSize > 0 ? Math.round(((originalSize - optimizedSize) / originalSize) * 100) : 0}%</span>
              </div>
            </div>
          {:else}
            <div class="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-white/50 dark:bg-(--card-bg)/50 rounded-xl border border-dashed border-stone-200 dark:border-(--border-color)">
              <div class="p-3 bg-stone-100 dark:bg-(--bg-secondary) rounded-full text-stone-400">
                <FileCode2 class="w-6 h-6" />
              </div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-6">Upload an SVG to see optimization stats</p>
            </div>
          {/if}

          <div class="space-y-3 pt-4">
            <Button variant="outline" class="w-full" onclick={copyToClipboard} disabled={!svgText}>
              {#if copied}
                <Check class="w-5 h-5 text-green-500" />
                Copied!
              {:else}
                <Copy class="w-5 h-5" />
                Copy SVG
              {/if}
            </Button>

            <Button variant="secondary" class="w-full" onclick={handleDownload} disabled={!svgText}>
              <Download class="w-5 h-5" />
              Download SVG
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <div class="lg:col-span-2">
      {#if !svgText}
        <Dropzone onfiles={processFiles} accept=".svg, image/svg+xml" label="Drop your SVG" description="Click to upload or paste SVG code directly" />
      {:else}
        <div class="space-y-4">
          <div class="bg-white dark:bg-(--bg-color) rounded-2xl border border-stone-100 dark:border-(--border-color) overflow-hidden flex flex-col h-140">
            <div class="flex-1 min-h-[50%] border-stone-100 dark:border-(--border-color) p-8 flex items-center justify-center checkerboard-bg relative overflow-hidden">
              <div class="w-full h-full flex items-center justify-center">
                <div class="max-w-full max-h-full">
                  {@html svgText}
                </div>
              </div>
            </div>
            <div class="flex-1 min-h-[50%] p-6 overflow-auto bg-stone-50/50 dark:bg-(--bg-color) text-[11px] font-mono text-stone-500 dark:text-stone-500 leading-relaxed break-all scrollbar-thin">
              {svgText}
            </div>
          </div>

          <div class="flex items-center justify-between px-2">
            <div class="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
              <div class="p-2 bg-stone-100 dark:bg-(--bg-secondary) rounded-lg">
                <FileCode2 class="w-4 h-4 text-stone-400" />
              </div>
              <span class="truncate max-w-50 font-bold text-stone-800 dark:text-stone-100">{fileName || 'pasted-vector.svg'}</span>
            </div>
            <button class="text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider" onclick={clearImage}>
              Clear
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .checkerboard-bg {
    background-image: linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
                      linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.05) 75%),
                      linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.05) 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  }

  :global(.dark .checkerboard-bg) {
    background-image: linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
                      linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.05) 75%),
                      linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.05) 75%);
  }
</style>

<template>
  <div class="min-h-screen bg-bg-primary text-text-primary">
    <!-- LANDING — empty state showcase -->
    <LandingHero v-if="!files.length" :is-dark="isDark" @files="addFiles" @toggle-dark="toggleDark" />

    <!-- WORKING — results -->
    <div v-else class="mx-auto max-w-5xl px-5 py-7 sm:px-8">
      <header class="mb-7 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <img :src="isDark ? logoDark : logoLight" alt="" class="h-8 w-8" />
          <span class="font-display text-base font-semibold tracking-tight">Image Tools</span>
        </div>
        <button
          class="grid size-9 place-items-center rounded-full border border-border-default bg-bg-secondary transition-colors hover:bg-hover"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleDark"
        >
          <component :is="isDark ? Sun : Moon" :size="16" />
        </button>
      </header>

      <DropZone variant="bar" @files="addFiles" />

      <template v-if="files.length">
        <div class="mt-5 flex flex-wrap items-center gap-2">
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            :disabled="!hasDone"
            @click="zipWinners(files)"
          >
            <Download :size="16" /> Download winners
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-hover disabled:opacity-40"
            :disabled="!hasDone"
            @click="zipAll(files)"
          >
            <Package :size="16" /> Download all
          </button>
          <button
            class="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
            @click="clearAll"
          >
            <Trash2 :size="16" /> Clear all
          </button>
        </div>

        <section class="mt-6">
          <SummaryHeader :summary="summary" />
        </section>

        <section v-if="svgFiles.length" class="mt-6">
          <SvgBatchPanel
            :svg-summary="svgSummary"
            :collisions="crossFileCollisions"
            @fix-all="fixAllColliding"
          />
        </section>

        <section v-if="rasterFiles.length" class="mt-6 space-y-3">
          <h2
            class="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-text-secondary"
          >
            <ImageIcon :size="14" /> Raster — {{ rasterFiles.length }}
          </h2>
          <RasterCard
            v-for="f in rasterFiles"
            :key="f.id"
            :result="f"
            @download="(o) => downloadOutput(f.name, o)"
            @compare="(o) => openCompare(f, o)"
            @remove="removeFile(f.id)"
          />
        </section>

        <section v-if="svgFiles.length" class="mt-6 space-y-3">
          <h2
            class="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-text-secondary"
          >
            <FileCode :size="14" /> SVG — {{ svgFiles.length }}
          </h2>
          <SvgCard
            v-for="f in svgFiles"
            :key="f.id"
            :result="f"
            :collides="collidingNames.has(f.name)"
            @fix="applyNamespaceFix(f)"
            @download="downloadSvg(f)"
            @remove="removeFile(f.id)"
          />
        </section>

        <section v-if="unsupported.length" class="mt-6 space-y-2">
          <div
            v-for="f in unsupported"
            :key="f.id"
            class="flex items-center justify-between rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-sm"
          >
            <span>{{ f.name }} — unsupported file type, skipped</span>
            <button
              class="rounded p-1 text-text-secondary hover:text-text-primary"
              @click="removeFile(f.id)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </section>
      </template>

      <footer class="mt-12 text-center font-mono text-[11px] tracking-wide text-text-secondary/70">
        Runs entirely in your browser · oxipng · mozjpeg · WebP · AVIF · SVGO
      </footer>
    </div>

    <CompareModal
      v-if="compare"
      :name="compare.name"
      :original="compare.original"
      :optimized="compare.optimized"
      @close="closeCompare"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  Sun,
  Moon,
  Download,
  Package,
  Trash2,
  ImageIcon,
  FileCode,
} from "@lucide/vue";
import { useProcessor } from "./composables/useProcessor";
import { zipAll, zipWinners } from "./lib/zip";
import type { FileResult, RasterOutput } from "./types";
import DropZone from "./components/DropZone.vue";
import LandingHero from "./components/LandingHero.vue";
import SummaryHeader from "./components/SummaryHeader.vue";
import SvgBatchPanel from "./components/SvgBatchPanel.vue";
import RasterCard from "./components/RasterCard.vue";
import SvgCard from "./components/SvgCard.vue";
import CompareModal from "./components/CompareModal.vue";
import logoLight from "./assets/logo.png";
import logoDark from "./assets/logo-dark.png";

const {
  files,
  summary,
  svgFiles,
  svgSummary,
  crossFileCollisions,
  addFiles,
  removeFile,
  clearAll,
  applyNamespaceFix,
  downloadOutput,
  downloadSvg,
} = useProcessor();

// Light mode by default; persist the user's choice.
const isDark = ref(localStorage.getItem("theme") === "dark");
function applyTheme() {
  document.documentElement.classList.toggle("dark", isDark.value);
}
applyTheme();
function toggleDark() {
  isDark.value = !isDark.value;
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
  applyTheme();
}

const hasDone = computed(() => files.value.some((f) => f.status === "done"));
const unsupported = computed(() =>
  files.value.filter((f) => f.kind === "unsupported"),
);
const rasterFiles = computed(() =>
  files.value.filter((f) => f.kind === "raster"),
);

// File names that participate in a cross-file id collision.
const collidingNames = computed(() => {
  const set = new Set<string>();
  for (const c of crossFileCollisions.value)
    for (const n of c.files) set.add(n);
  return set;
});

function fixAllColliding() {
  for (const f of svgFiles.value) {
    if (collidingNames.value.has(f.name) && !f.svg?.fixApplied)
      void applyNamespaceFix(f);
  }
}

// --- side-by-side compare ---------------------------------------------------
interface CompareState {
  name: string;
  original: { url: string; size: number };
  optimized: { url: string; label: string; size: number };
}
const compare = ref<CompareState | null>(null);

function openCompare(result: FileResult, output: RasterOutput) {
  if (!result.thumbnailUrl) return;
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(output.buffer)], { type: output.mime }),
  );
  compare.value = {
    name: result.name,
    original: { url: result.thumbnailUrl, size: result.originalSize },
    optimized: { url, label: output.label, size: output.size },
  };
}
function closeCompare() {
  if (compare.value) URL.revokeObjectURL(compare.value.optimized.url);
  compare.value = null;
}
</script>

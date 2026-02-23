<script lang="ts">
  let {
    before,
    after,
    labelBefore = 'Before',
    labelAfter = 'After',
    statsBefore = '',
    statsAfter = ''
  } = $props<{
    before: string;
    after: string;
    labelBefore?: string;
    labelAfter?: string;
    statsBefore?: string;
    statsAfter?: string;
  }>();

  let sliderPos = $state(50);
  let container: HTMLElement | undefined = $state();

  function handleMove(e: MouseEvent | TouchEvent) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const relativeX = x - rect.left;
    sliderPos = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
  }

  function handleStart(e: MouseEvent | TouchEvent) {
    handleMove(e);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
  }

  function handleEnd() {
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('mouseup', handleEnd);
    window.removeEventListener('touchend', handleEnd);
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex justify-between items-end px-1 pb-1">
    <div class="flex flex-col gap-1.5">
      <span class="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400 dark:text-stone-600">{labelBefore}</span>
      {#if statsBefore}
        <span class="text-xs font-bold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-(--bg-secondary) px-3 py-1.5 rounded-xl border border-stone-200/60 dark:border-(--border-color) w-fit shadow-sm">
          {statsBefore}
        </span>
      {/if}
    </div>

    <div class="flex flex-col gap-1.5 items-end text-right">
      <span class="text-[10px] font-black uppercase tracking-[0.25em] text-primary">{labelAfter}</span>
      {#if statsAfter}
        <span class="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 w-fit shadow-sm">
          {statsAfter}
        </span>
      {/if}
    </div>
  </div>

  <div
    bind:this={container}
    class="slider-container relative w-full aspect-video rounded-2xl overflow-hidden cursor-ew-resize select-none bg-white dark:bg-(--bg-color) border border-stone-200/50 dark:border-(--border-color) shadow-inner transparency-grid"
    onmousedown={handleStart}
    ontouchstart={handleStart}
    role="presentation"
  >
    <img src={after} alt="After" class="absolute inset-0 w-full h-full object-contain p-4" />

    <img
      src={before}
      alt="Before"
      class="absolute inset-0 w-full h-full object-contain p-4"
      style="clip-path: inset(0 {100 - sliderPos}% 0 0)"
    />

    <div
      class="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_20px_rgba(0,0,0,0.4)] z-10"
      style="left: {sliderPos}%"
    >
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border-4 border-primary rounded-full flex items-center justify-center shadow-xl ring-4 ring-black/5">
        <div class="flex gap-0.5">
          <div class="w-1 h-3 bg-primary rounded-full"></div>
          <div class="w-1 h-3 bg-primary rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .slider-container {
    container-type: size;
  }
</style>

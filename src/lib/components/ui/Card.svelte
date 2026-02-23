<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    class?: string;
    sticky?: boolean;
    children: Snippet;
  }

  let { title, class: className = '', sticky = false, children }: Props = $props();
</script>

<div class="bg-stone-50 dark:bg-(--card-bg)/50 backdrop-blur-xl p-6 lg:p-8 rounded-2xl h-full {sticky ? 'lg:sticky lg:top-24' : ''} {className}">
  {#if title}
    <h4 class="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-6">{title}</h4>
  {/if}
  {@render children()}
</div>

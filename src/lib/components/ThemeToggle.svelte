<script lang="ts">
  import { Sun, Moon } from 'lucide-svelte';
  import { appState } from '../state.svelte';
</script>

<button
  class="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-(--hover-bg) text-stone-600 dark:text-stone-400 transition-colors"
  onclick={appState.toggleTheme.bind(appState)}
  aria-label="Toggle Theme"
>
  {#if appState.theme === 'dark'}
    <Sun class="w-5 h-5" />
  {:else}
    <Moon class="w-5 h-5" />
  {/if}
</button>

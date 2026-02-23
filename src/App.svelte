<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from './lib/state.svelte';
  import Landing from './lib/components/Landing.svelte';
  import ToolDashboard from './lib/components/ToolDashboard.svelte';

  let path = $state(window.location.pathname);

  onMount(() => {
    appState.initTheme();

    const handlePopState = () => {
      path = window.location.pathname;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  });
</script>

{#if path === '/app'}
  <ToolDashboard />
{:else}
  <Landing />
{/if}

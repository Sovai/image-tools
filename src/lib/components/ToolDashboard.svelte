<script lang="ts">
  import { Menu, X } from 'lucide-svelte';
  import Sidebar from './Sidebar.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import Converter from '../tools/Converter.svelte';
  import Compressor from '../tools/Compressor.svelte';
  import Resizer from '../tools/Resizer.svelte';
  import SvgOptimizer from '../tools/SvgOptimizer.svelte';
  import FaviconGenerator from '../tools/FaviconGenerator.svelte';
  import BackgroundRemover from '../tools/BackgroundRemover.svelte';
  import logo from '../../assets/logo.png';
  import logoDark from '../../assets/logo-dark.png';
  import { appState } from '../state.svelte';
  import Button from './ui/Button.svelte';

  const navigateToLanding = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  let isMobileMenuOpen = $state(false);
</script>

<div class="flex h-screen w-full bg-[#fdfdfd] dark:bg-(--bg-color) text-stone-900 dark:text-stone-100 overflow-hidden font-sans">
  <div class="hidden lg:block h-full shrink-0">
    <Sidebar />
  </div>

  {#if isMobileMenuOpen}
    <button
      class="fixed inset-0 bg-black/50 z-40 lg:hidden border-none outline-none"
      onclick={() => isMobileMenuOpen = false}
      aria-label="Close menu"
    ></button>
    <div class="fixed inset-y-0 left-0 w-64 bg-white dark:bg-(--bg-secondary) z-50 lg:hidden shadow-xl">
      <div class="flex flex-col h-full">
        <div class="p-6 flex items-center justify-between border-b border-stone-200 dark:border-stone-900">
          <button
            class="text-xl font-bold tracking-tight text-stone-800 dark:text-stone-100 flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer border-none bg-transparent p-0 text-left"
            onclick={() => {
              isMobileMenuOpen = false;
              navigateToLanding();
            }}
          >
            <img src={appState.theme === 'dark' ? logoDark : logo} alt="Logo" class="w-8 h-8 object-contain" />
            Image Tools
          </button>
          <button onclick={() => isMobileMenuOpen = false} class="p-2 -mr-2">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div
          class="flex-1 overflow-y-auto"
          onclick={() => isMobileMenuOpen = false}
          onkeydown={(e) => e.key === 'Enter' && (isMobileMenuOpen = false)}
          role="button"
          tabindex="0"
        >
          <Sidebar />
        </div>
      </div>
    </div>
  {/if}

  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <header class="h-20 flex items-center justify-between px-4 lg:px-8 bg-white dark:bg-(--bg-secondary)/50 backdrop-blur-xl border-b border-stone-200 dark:border-(--border-color) shrink-0 sticky top-0 z-30">
      <div class="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          class="lg:hidden p-2 px-2!"
          onclick={() => isMobileMenuOpen = true}
        >
          <Menu class="w-6 h-6" />
        </Button>
        <div class="flex flex-col -gap-0.5">
          <h2 class="text-base lg:text-lg font-bold text-stone-800 dark:text-white truncate">
            {appState.currentToolName}
          </h2>
          <p class="text-[10px] lg:text-xs text-stone-500 dark:text-stone-400 font-medium truncate">
            {appState.currentToolDescription}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>

    <main class="flex-1 overflow-auto p-4 lg:p-8 bg-dotted">
      <div class="max-w-6xl mx-auto bg-white dark:bg-(--card-bg)/50 backdrop-blur-xl lg:border border-stone-200 dark:border-(--border-color) lg:rounded-3xl min-h-full lg:min-h-125 p-4 lg:p-8 shadow-sm">
        {#if appState.currentTool === 'converter'}
          <Converter />
        {:else if appState.currentTool === 'compressor'}
          <Compressor />
        {:else if appState.currentTool === 'resizer'}
          <Resizer />
        {:else if appState.currentTool === 'svg'}
          <SvgOptimizer />
        {:else if appState.currentTool === 'favicon'}
          <FaviconGenerator />
        {:else if appState.currentTool === 'bg-remover'}
          <BackgroundRemover />
        {/if}
      </div>
    </main>
  </div>
</div>

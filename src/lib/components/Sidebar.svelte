<script lang="ts">
  import {
    Image,
    Minimize2,
    Maximize,
    CodeXml,
    AppWindow,
    Eraser,
  } from "lucide-svelte";
  import logo from "../../assets/logo.png";
  import logoDark from "../../assets/logo-dark.png";
  import { appState } from "../state.svelte";

  const navigateToLanding = () => {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const tools = appState.tools.map((t) => {
    const icons: Record<string, any> = {
      converter: Image,
      compressor: Minimize2,
      resizer: Maximize,
      svg: CodeXml,
      favicon: AppWindow,
      "bg-remover": Eraser,
    };
    return { ...t, icon: icons[t.id] };
  });
</script>

<aside
  class="w-full lg:w-64 h-full bg-white dark:bg-(--bg-secondary) lg:border-r border-stone-200 dark:border-(--border-color) flex flex-col transition-colors duration-200"
>
  <div class="p-6 hidden lg:block">
    <button
      class="text-xl font-bold tracking-tight text-stone-800 dark:text-stone-100 flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer border-none bg-transparent p-0 text-left w-full"
      onclick={navigateToLanding}
    >
      <img
        src={appState.theme === "dark" ? logoDark : logo}
        alt="Logo"
        class="w-8 h-8 object-contain"
      />
      <div>Image Tools</div>
    </button>
  </div>

  <nav class="flex-1 px-3 py-4 lg:p-4 space-y-1">
    {#each tools as tool}
      <button
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold duration-200 {appState.currentTool ===
        tool.id
          ? 'bg-stone-100 dark:bg-(--hover-bg) text-stone-900 dark:text-white'
          : 'text-stone-500 dark:text-stone-500 hover:bg-stone-50 dark:hover:bg-(--hover-bg)/50 hover:text-stone-900 dark:hover:text-stone-200'}"
        onclick={() => (appState.currentTool = tool.id)}
      >
        <svelte:component
          this={tool.icon}
          class="w-4 h-4 {appState.currentTool === tool.id
            ? 'text-primary'
            : ''}"
        />
        {tool.name}
      </button>
    {/each}
  </nav>

  <footer class="p-6 border-t border-stone-100 dark:border-(--border-color)">
    <p
      class="text-[11px] font-medium text-stone-400 dark:text-stone-600 tracking-wider uppercase flex items-center gap-1.5"
    >
      By Dev
      <svg
        aria-hidden="true"
        height="12"
        viewBox="0 0 16 16"
        version="1.1"
        width="12"
        class="fill-rose-500 animate-pulse"
      >
        <path
          d="m8 14.25.345.666a.75.75 0 0 1-.69 0l-.008-.004-.018-.01a7.152 7.152 0 0 1-.31-.17 22.055 22.055 0 0 1-3.434-2.414C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002ZM4.25 2.5c-1.336 0-2.75 1.164-2.75 3 0 2.15 1.58 4.144 3.365 5.682A20.58 20.58 0 0 0 8 13.393a20.58 20.58 0 0 0 3.135-2.211C12.92 9.644 14.5 7.65 14.5 5.5c0-1.836-1.414-3-2.75-3-1.373 0-2.609.986-3.029 2.456a.749.749 0 0 1-1.442 0C6.859 3.486 5.623 2.5 4.25 2.5Z"
        ></path>
      </svg>
      for devs
    </p>
  </footer>
</aside>

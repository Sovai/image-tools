<script lang="ts">
  import {
    ArrowRight,
    Image as ImageIcon,
    CodeXml,
    Eraser,
    Shield,
    Github,
  } from "lucide-svelte";
  import Button from "./ui/Button.svelte";
  import logo from "../../assets/logo.png";
  import logoDark from "../../assets/logo-dark.png";
  import ThemeToggle from "./ThemeToggle.svelte";
  import { appState } from "../state.svelte";

  const navigateToApp = () => {
    window.history.pushState({}, "", "/app");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const features = [
    {
      icon: ImageIcon,
      title: "Convert & Optimize",
      description:
        "Professional-grade compression and format switching in seconds.",
    },
    {
      icon: CodeXml,
      title: "Vector Precision",
      description: "Clean and optimize SVG code for lean web performance.",
    },
    {
      icon: Eraser,
      title: "Subject Isolation",
      description:
        "Remove backgrounds instantly with advanced on-device edge detection.",
    },
    {
      icon: Shield,
      title: "Total Privacy",
      description:
        "Your data never leaves your machine. 100% secure processing.",
    },
  ];
</script>

<div
  class="h-screen w-full bg-stone-50 dark:bg-[#332f2c] text-stone-900 dark:text-stone-100 font-sans selection:bg-stone-900 selection:text-white dark:selection:bg-white dark:selection:text-stone-900 flex flex-col overflow-hidden bg-grid-pattern"
>
  <nav
    class="h-16 shrink-0 border-b border-stone-100 dark:border-stone-800 bg-white/80 dark:bg-[#332f2c]/80 backdrop-blur-md sticky top-0 z-50 px-6 lg:px-12"
  >
    <div class="max-w-7xl mx-auto h-full flex items-center justify-between">
      <button
        class="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer border-none bg-transparent p-0 text-left"
        onclick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <img
          src={appState.theme === "dark" ? logoDark : logo}
          alt="Logo"
          class="w-8 h-8 object-contain"
        />
        <span class="text-xl font-bold tracking-tight">Image Tools</span>
      </button>
      <div class="flex items-center gap-2">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          class="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-(--hover-bg) text-stone-600 dark:text-stone-400 transition-colors"
          aria-label="GitHub Repository"
        >
          <Github class="w-5 h-5" />
        </a>
        <ThemeToggle />
      </div>
    </div>
  </nav>

  <main class="flex-1 overflow-y-auto flex flex-col">
    <section class="flex-1 flex flex-col px-6 lg:px-12">
      <div
        class="max-w-7xl mx-auto py-8 lg:py-12 flex-1 flex flex-col items-center justify-center text-center w-full"
      >
        <h1
          class="text-5xl lg:text-7xl font-extrabold tracking-tight mb-4 text-black dark:text-white leading-tight"
        >
          Professional image tools <br class="hidden lg:block" />
          <span class="text-stone-500 dark:text-stone-400"
            >right in your browser.</span
          >
        </h1>
        <p
          class="text-lg lg:text-xl text-stone-600 dark:text-stone-400 max-w-2xl mx-auto mb-8"
        >
          A suite of powerful, privacy-focused image utilities for developers
          and designers. No uploads, no servers, just performance.
        </p>

        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 w-full"
        >
          {#each features as feature}
            <div
              class="p-6 bg-stone-50 dark:bg-(--card-bg) border border-stone-200 dark:border-(--border-color) rounded-3xl transition-all hover:bg-white dark:hover:bg-(--bg-secondary) hover:shadow-xl hover:shadow-stone-200/50 dark:hover:shadow-none group text-left"
            >
              <div
                class="w-12 h-12 rounded-2xl bg-white dark:bg-(--bg-color) border border-stone-200 dark:border-(--border-color) flex items-center justify-center mb-6 transition-transform group-hover:-translate-y-1"
              >
                <feature.icon
                  class="w-6 h-6 text-stone-700 dark:text-stone-200"
                />
              </div>
              <h3 class="text-xl font-bold mb-3">{feature.title}</h3>
              <p
                class="text-stone-600 dark:text-stone-400 leading-relaxed text-sm"
              >
                {feature.description}
              </p>
            </div>
          {/each}
        </div>

        <div
          class="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Button
            size="lg"
            onclick={navigateToApp}
            class="w-full sm:w-auto px-16 text-xl h-16 rounded-full shadow-lg hover:shadow-xl transition-all font-black tracking-widest"
          >
            GET STARTED
            <ArrowRight class="ml-2 w-6 h-6" />
          </Button>
        </div>
      </div>
    </section>

    <footer
      class="py-6 px-6 lg:px-12 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-[#332f2c]"
    >
      <div
        class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8"
      >
        <div class="flex items-center gap-3">
          <img
            src={appState.theme === "dark" ? logoDark : logo}
            alt="Logo"
            class="w-8 h-8 object-contain opacity-50 grayscale"
          />
          <span class="font-bold text-lg uppercase tracking-widest opacity-50"
            >Image Tools</span
          >
        </div>
        <div class="flex flex-col items-center md:items-end gap-1">
          <p class="text-sm text-stone-500 font-medium">
            &copy; 2026 Image Tools. All rights reserved.
          </p>
          <p class="text-xs text-stone-400">Built with Svelte & Tailwind.</p>
        </div>
      </div>
    </footer>
  </main>
</div>

<style>
  :global(:root) {
    --radius: 1.5rem; /* More rounded */
  }

  .bg-grid-pattern {
    background-image: radial-gradient(
      circle,
      rgba(0, 0, 0, 0.05) 1px,
      transparent 1px
    );
    background-size: 32px 32px;
  }

  :global(.dark) .bg-grid-pattern {
    background-image: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px
    );
  }
</style>

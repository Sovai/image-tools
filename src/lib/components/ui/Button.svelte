<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    onclick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    type?: 'button' | 'submit' | 'reset';
    children: Snippet;
  }

  let {
    onclick,
    disabled = false,
    loading = false,
    variant = 'primary',
    size = 'md',
    class: className = '',
    type = 'button',
    children
  }: Props = $props();

  const variants = {
    primary: 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20',
    secondary: 'bg-stone-900 dark:bg-white text-white dark:text-black hover:opacity-90',
    ghost: 'text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400',
    danger: 'text-red-500 hover:text-red-600',
    outline: 'bg-white dark:bg-(--bg-color) text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-(--border-color) hover:bg-stone-50 dark:hover:bg-(--hover-bg)'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px]',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  };
</script>

<button
  {type}
  class="flex items-center justify-center gap-2 rounded-xl font-bold transition-all disabled:opacity-50 {variants[variant]} {sizes[size]} {className}"
  onclick={() => !loading && onclick?.()}
  disabled={disabled || loading}
>
  {#if loading}
    <svg class="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Processing...</span>
  {:else}
    {@render children()}
  {/if}
</button>

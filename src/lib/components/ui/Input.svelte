<script lang="ts">
  interface Props {
    id?: string;
    label?: string;
    type?: 'text' | 'number' | 'range' | 'select' | 'checkbox';
    value?: any;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: { label: string; value: any }[];
    suffix?: string;
    class?: string;
  }

  let {
    id,
    label,
    type = 'text',
    value = $bindable(),
    oninput,
    onchange,
    placeholder,
    min,
    max,
    step,
    options = [],
    suffix,
    class: className = ''
  }: Props = $props();
</script>

<div class="space-y-2 {className}">
  {#if label || suffix}
    <div class="flex justify-between items-center">
      {#if label}
        <label for={id} class="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</label>
      {/if}
      {#if suffix}
        <span class="text-[10px] font-black text-primary">{suffix}</span>
      {/if}
    </div>
  {/if}

  {#if type === 'range'}
    <input
      {id}
      type="range"
      {min}
      {max}
      {step}
      bind:value
      onchange={onchange}
      class="w-full h-1 bg-stone-200 dark:bg-(--border-color) rounded-lg appearance-none cursor-pointer accent-primary"
    />
  {:else if type === 'select'}
    <select
      {id}
      bind:value
      onchange={onchange}
      class="custom-select w-full appearance-none bg-white dark:bg-(--input-bg) border border-stone-200 dark:border-(--border-color) rounded-lg px-3 pr-10 py-2 text-xs font-bold outline-none cursor-pointer transition-all focus:border-primary/50"
    >
      {#each options as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  {:else if type === 'checkbox'}
    <label class="flex items-center justify-between cursor-pointer group">
      <input {id} type="checkbox" bind:checked={value} onchange={onchange} class="sr-only peer" />
      <div class="w-8 h-4 bg-stone-200 dark:bg-(--border-color) rounded-full peer peer-checked:bg-primary relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-transform peer-checked:after:translate-x-4"></div>
    </label>
  {:else}
    <input
      {id}
      {type}
      {placeholder}
      bind:value
      oninput={oninput}
      onchange={onchange}
      class="w-full bg-white dark:bg-(--input-bg) border border-stone-200 dark:border-(--border-color) rounded-lg px-3 py-2 text-xs font-bold focus:border-primary outline-none transition-colors"
    />
  {/if}
</div>

<style>
  .custom-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 14px;
  }
</style>

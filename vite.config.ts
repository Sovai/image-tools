import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// jSquash codecs ship their own .wasm; exclude from optimizeDeps so Vite
// serves the wasm assets correctly (esp. inside web workers).
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: [
      '@jsquash/png',
      '@jsquash/jpeg',
      '@jsquash/webp',
      '@jsquash/avif',
      '@jsquash/oxipng',
    ],
  },
})

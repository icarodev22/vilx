import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // caminhos relativos: o site funciona na raiz ou em qualquer subpasta
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          ogl: ['ogl'],
        },
      },
    },
  },
})

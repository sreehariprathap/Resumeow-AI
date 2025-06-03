import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: ''
        },
        {
          src: 'public/icon.png',
          dest: ''
        },
        {
          src: 'public/sidepanel.html',
          dest: ''
        },
        {
          src: 'public/service-worker.js',
          dest: ''
        }
      ]
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: undefined
      }
    }
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3000,
    open: true
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { VitePWA } from 'vite-plugin-pwa'

// Check if building for PWA or extension
const isPWA = process.env.BUILD_TARGET === 'pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    ...(isPWA ? [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.png', 'offline.html'],
        manifest: {
          name: 'Prompter - Resume & Cover Letter Assistant',
          short_name: 'Prompter',
          description: 'Create optimized resume and cover letter prompts for AI assistants',
          theme_color: '#000000',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'icon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 300
                }
              }
            }
          ]
        }
      })
    ] : []),
    viteStaticCopy({
      targets: isPWA ? [
        // PWA-specific files
        {
          src: 'public/screenshots/*',
          dest: 'screenshots'
        }
      ] : [
        // Extension-specific files
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
      input: isPWA ? {
        main: path.resolve(__dirname, 'web.html'),
      } : {
        main: path.resolve(__dirname, 'index.html'),
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

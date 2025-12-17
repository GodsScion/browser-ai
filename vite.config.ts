import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      writeBundle() {
        copyFileSync('manifest.json', 'dist/manifest.json')
      }
    }
  ],
  build: {
    sourcemap: true, // Enable source maps for debugging
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Use different formats for different entry points
          if (chunkInfo.name === 'background') {
            return '[name].js' // Keep background as ES module for dynamic imports
          }
          return '[name].js'
        },
        chunkFileNames: (chunkInfo) => {
          // Ensure chunk names don't start with underscore
          const name = chunkInfo.name || 'chunk'
          return name.startsWith('_') ? name.substring(1) + '.js' : name + '.js'
        },
        assetFileNames: '[name].[ext]',
        format: 'es' // Use ES modules format for dynamic imports
      },
      external: [
        '@anthropic-ai/sdk/lib/transform-json-schema'
      ]
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020' // Ensure compatibility with Chrome service workers
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
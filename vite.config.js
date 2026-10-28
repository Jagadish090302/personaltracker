import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative asset paths work on a GitHub Pages project site.
export default defineConfig({
  plugins: [react()],
  base: './',
})
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // base relativ: merge și la rădăcină, și într-un subfolder (GitHub Pages).
  base: './',
  plugins: [react()],
});

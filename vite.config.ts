import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: { env: Record<string, string | undefined> };

// Versiunea aplicației: o creștem manual la fiecare lansare (și în package.json).
const release = '3.2';

// Număr de versiune afișat în aplicație: data build-ului (UTC) și commit-ul.
const sha = (process.env.GITHUB_SHA ?? '').slice(0, 7) || 'local';
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: {
    __APP_RELEASE__: JSON.stringify(release),
    __APP_VERSION__: JSON.stringify(`${release} · ${stamp} UTC · ${sha}`),
  },
  // base relativ: merge și la rădăcină, și într-un subfolder (GitHub Pages).
  base: './',
  plugins: [react()],
});

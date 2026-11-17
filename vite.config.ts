import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Datenbank-Pakete vorab bündeln: sonst lädt der Dev-Server beim ersten Import neu (stört Browser-Tests).
  optimizeDeps: { include: ['dexie', 'fflate', 'zod'] },
  plugins: [
    react(),
    VitePWA({
      // Neue Version nie mitten in einer Sitzung aktivieren (Schritt 12.6).
      registerType: 'prompt',
      manifest: {
        name: 'Madar',
        short_name: 'Madar',
        lang: 'de',
        start_url: '/',
        display: 'standalone',
        background_color: '#F7F6F2',
        theme_color: '#1F3A5F',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
});

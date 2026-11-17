import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// Kennung des Builds (Cloudflare gibt den Commit mit, sonst fragt git); wird in den Einstellungen angezeigt.
function buildId(): string {
  const fromCi = process.env.CF_PAGES_COMMIT_SHA;
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'lokal';
  }
}

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  // Datenbank-Pakete vorab bündeln: sonst lädt der Dev-Server beim ersten Import neu (stört Browser-Tests).
  optimizeDeps: { include: ['dexie', 'fflate', 'zod'] },
  plugins: [
    react(),
    VitePWA({
      // Neue Version nie mitten in einer Sitzung aktivieren (Schritt 12.6).
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Madar',
        short_name: 'Madar',
        description: 'Der Lernort, an dem du nur noch lernen musst.',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f2f2f7',
        theme_color: '#1f3a5f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Schriften und Bilder gehören dazu, sonst fehlt offline die Schrift. Nicht benötigte Schriftschnitte (kyrillisch, griechisch, vietnamesisch) bleiben draußen.
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,webmanifest}'],
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,hebrew}-*.woff2'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});

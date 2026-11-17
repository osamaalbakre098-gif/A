import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Baut Galerie oder App-Vorschau als EINE selbstständige HTML-Datei: TARGET=gallery|app
const target = process.env.TARGET === 'app' ? 'app' : 'gallery';

export default defineConfig({
  root: 'static',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: `../dist-static/${target}`,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: `static/${target}.html` },
  },
});

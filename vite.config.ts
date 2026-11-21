import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative Basis: die App läuft so unter jedem Pfad, z. B. auf GitHub Pages
// unter /Suryoyo-App/ – ohne dass der Repository-Name hier stehen muss.
export default defineConfig({
  base: './',
  // Alle Lektionen stecken bewusst mit im App-Code, damit sie offline da sind
  // (etwa 190 KB komprimiert). Die Standardwarnung ab 500 KB ist deshalb höher gesetzt.
  // Das Glossar für den Übersetzer ist ein eigener Teil (etwa 60 KB), der erst beim
  // Öffnen des Übersetzers geladen wird; der Service Worker legt ihn trotzdem ab.
  build: { chunkSizeWarningLimit: 1200 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Mamlo – Surayt lernen',
        short_name: 'Mamlo',
        description: 'Surayt lernen – damit du am Familientisch mitreden kannst.',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FBF7F0',
        theme_color: '#4B3FD6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Langes Drücken auf das App-Symbol (Android): direkt in den Übersetzer.
        shortcuts: [
          {
            name: 'Übersetzer',
            short_name: 'Übersetzer',
            description: 'Wort oder Satz übersetzen',
            url: './#/uebersetzer',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
});

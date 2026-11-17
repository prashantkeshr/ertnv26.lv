import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

// eport.live is served from the domain root on GitHub Pages, so the base is "/".
// To preview on a project page (user.github.io/<repo>/) set EPORT_BASE="/<repo>/".
export default defineConfig({
  base: process.env.EPORT_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5400, strictPort: true },
  preview: { port: 5401, strictPort: true },
  // SVG flags stay separate files so a visitor downloads only the flags actually shown, not ~270 inlined into JavaScript.
  build: { target: 'es2022', sourcemap: false, assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined) },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
  },
});

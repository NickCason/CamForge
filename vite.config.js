import { defineConfig } from 'vite';

export default defineConfig({
  base: '/CamForge/',
  optimizeDeps: {
    include: ['jspdf', 'svg2pdf.js'],
  },
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('firebase') || id.includes('@firebase')) {
            return 'firebase';
          }

          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts';
          }

          if (id.includes('react-easy-crop')) {
            return 'image-tools';
          }

          return 'vendor';
        },
      },
    },
  },
}));

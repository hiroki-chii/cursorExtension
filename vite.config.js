import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        overlay: resolve(projectRoot, 'overlay.html'),
      },
    },
  },
});

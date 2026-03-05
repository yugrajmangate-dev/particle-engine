import { defineConfig } from 'vite';

export default defineConfig({
  base: '/particle-engine/',
  server: {
    open: true,
  },
  build: {
    target: 'esnext',
  },
});

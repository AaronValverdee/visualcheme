import { defineConfig } from 'vite';

/** Set BASE_PATH=/repo-name/ in CI for GitHub Pages project sites. */
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  server: {
    port: 3000,
    open: false
  },
  build: {
    target: 'esnext'
  }
});

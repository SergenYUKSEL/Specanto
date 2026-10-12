import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'demo',
  plugins: [react()],
  publicDir: '../public',
  build: { outDir: '../site-dist', emptyOutDir: true },
  server: {
    port: 5188,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001', '/openapi.json': 'http://127.0.0.1:3001', '/health': 'http://127.0.0.1:3001' },
  },
});

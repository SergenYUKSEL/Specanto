import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This host exists only for browser integration tests and is never part of the demo build.
export default defineConfig({
  root: 'e2e/fixtures',
  plugins: [react()],
  publicDir: false,
  server: { port: 5192, strictPort: true, fs: { allow: [process.cwd()] } },
});

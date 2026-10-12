import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'specanto', cssFileName: 'styles' },
    rolldownOptions: { external: [/^react(?:\/.*)?$/, /^react-dom(?:\/.*)?$/] },
    sourcemap: true,
  },
});

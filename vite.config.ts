import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'specanto', cssFileName: 'styles' },
    // Preserve runtime package conditions so Node/SSR imports do not select DOM-only Markdown code.
    rolldownOptions: { external: [/^react(?:\/.*)?$/, /^react-dom(?:\/.*)?$/, 'react-markdown', 'yaml'] },
    sourcemap: true,
  },
});

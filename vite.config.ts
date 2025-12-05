import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  esbuild: {
    target: 'esnext',
  },
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: false
    }
  }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true,
    allowedHosts: ['divergram.com', 'www.divergram.com', 'manager.divergram.com', 'api.divergram.com'],
  },
  preview: {
    host: true,
    allowedHosts: ['divergram.com', 'www.divergram.com', 'manager.divergram.com', 'api.divergram.com'],
  },
});

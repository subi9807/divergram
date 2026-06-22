import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '..',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true,
    allowedHosts: ['divergram.com', 'www.divergram.com', 'manager.divergram.com', 'api.divergram.com'],
  },
  preview: {
    host: '127.0.0.1',
    allowedHosts: ['divergram.com', 'www.divergram.com', 'manager.divergram.com', 'api.divergram.com'],
  },
});

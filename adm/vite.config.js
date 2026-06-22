import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: '..',
  plugins: [react()],
  preview: {
    allowedHosts: ['adm.divergram.com', 'manager.divergram.com', '110.45.180.149'],
  },
});

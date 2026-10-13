import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Admin-only credentials and endpoints live beside this Vite app.
  envDir: '.',
  plugins: [react()],
  preview: {
    allowedHosts: ['adm.divergram.com', 'manager.divergram.com', 'partner.divergram.com', 'mns.divergram.com', '110.45.180.149'],
  },
});

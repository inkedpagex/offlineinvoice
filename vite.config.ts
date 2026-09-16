import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative assets work in Electron / offline file:// protocol
  server: {
    port: 5173,
    open: false,
  },
});

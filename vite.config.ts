import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const dirname = typeof import.meta.dirname !== 'undefined'
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  // In AI Studio preview or when DISABLE_HMR is set, disable client WebSocket HMR to prevent WS reconnection errors
  const isHmrDisabled = process.env.DISABLE_HMR === 'true' || Boolean(process.env.APPLET_ID);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(dirname, '.'),
      },
    },
    optimizeDeps: {
      force: true,
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      hmr: !isHmrDisabled,
      watch: isHmrDisabled ? null : {},
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 3000,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

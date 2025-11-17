import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: 'https://github.com/LeBoroda/ms-order-maker',
  plugins: [react()],
  server: {
    proxy: {
      // Proxy MoySklad API requests to avoid CORS issues
      '/api/moysklad': {
        target: 'https://api.moysklad.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/moysklad/, '/api/remap/1.2'),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
        },
      },
    },
  },
});

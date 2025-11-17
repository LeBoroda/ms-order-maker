import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: 'https://github.com/LeBoroda/ms-order-maker',
  plugins: [react()],
  // Note: MoySklad API may require CORS configuration or a backend proxy
  // If you encounter CORS errors, consider:
  // 1. Configuring CORS in your MoySklad account settings
  // 2. Using a backend proxy server
  // 3. Using Vite proxy in development (uncomment below)
  /*
  server: {
    proxy: {
      '/api/moysklad': {
        target: 'https://api.moysklad.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/moysklad/, '/api/remap/1.2'),
        secure: true,
      },
    },
  },
  */
});

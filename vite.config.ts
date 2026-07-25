import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
        '/login': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/admin': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/backup': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Backend base URL baked in at build time; empty means "use the dev proxy".
      'process.env.BACKEND_URL': JSON.stringify(env.BACKEND_URL || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

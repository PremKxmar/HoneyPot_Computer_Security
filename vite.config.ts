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
    build: {
      rollupOptions: {
        output: {
          // Split the heavy, rarely-changing libraries out of the app bundle so
          // they download in parallel and stay cached across deploys.
          // React itself is left in the entry chunk: every other vendor
          // depends on it, so splitting it out just produces an empty file.
          manualChunks: {
            charts: ['recharts'],
            map: ['leaflet', 'react-leaflet'],
            motion: ['framer-motion'],
            ai: ['@google/genai'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      '/gemini-api': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gemini-api/, ''),
      },
      '/groq-api': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/groq-api/, ''),
      },
      '/gtts': {
        target: 'https://translate.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gtts/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            );
            proxyReq.setHeader('Accept', 'audio/mpeg,audio/*,*/*;q=0.8');
            proxyReq.setHeader('Referer', 'https://translate.google.com/');
          });
        },
      },
      '/gtts-api': {
        target: 'https://translate.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gtts-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            );
            proxyReq.setHeader('Accept', 'audio/mpeg,audio/*,*/*;q=0.8');
          });
        },
      },
      '/owm-api': {
        target: 'https://api.openweathermap.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/owm-api/, ''),
      },
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nominatim/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'AiraAI/1.0 (multilingual voice assistant demo)');
            proxyReq.setHeader('Accept', 'application/json');
          });
        },
      },
      '/tavily-api': {
        target: 'https://api.tavily.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/tavily-api/, ''),
      },
      '/ddg-api': {
        target: 'https://api.duckduckgo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ddg-api/, '') || '/',
      },
      '/google-cse': {
        target: 'https://www.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/google-cse/, ''),
      },
      '/openai-api': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/openai-api/, ''),
      },
      '/wiki-api': {
        target: 'https://en.wikipedia.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/wiki-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'AiraAI/1.0 (multilingual voice assistant demo)');
            proxyReq.setHeader('Api-User-Agent', 'AiraAI/1.0');
            proxyReq.setHeader('Accept', 'application/json');
          });
        },
      },
    },
  },
});

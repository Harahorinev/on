import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    federation({
      name: 'company',
      filename: 'remoteEntry.js',
      exposes: {
        './CompanyApp': './src/App.tsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
  server: { port: 5176, cors: true },
  preview: { port: 5176, cors: true },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});

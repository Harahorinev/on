import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
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
  server: { port: 5176 },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});

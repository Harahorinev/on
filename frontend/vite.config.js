/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
const getRemoteUrl = (envKey, port) => {
    const env = process.env[envKey];
    if (env && typeof env === 'string' && env.trim())
        return `${env.trim()}/assets/remoteEntry.js`;
    return `http://localhost:${port}/assets/remoteEntry.js`;
};
export default defineConfig({
    plugins: [
        react(),
        federation({
            name: 'host',
            remotes: {
                auth: getRemoteUrl('VITE_REMOTE_AUTH_URL', 5174),
                user: getRemoteUrl('VITE_REMOTE_USER_URL', 5175),
                company: getRemoteUrl('VITE_REMOTE_COMPANY_URL', 5176),
            },
            shared: ['react', 'react-dom', 'react-router-dom'],
        }),
    ],
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
        pool: 'threads',
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
});

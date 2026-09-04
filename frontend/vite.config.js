import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development, /api requests are proxied to the backend on
// port 3000 so the frontend dev server can run standalone on port 5173.
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
    build: {
        outDir: 'dist',
    },
});

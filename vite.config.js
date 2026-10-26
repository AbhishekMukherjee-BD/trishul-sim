import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default function() {
  return defineConfig({
    plugins: [
      tailwindcss(),
      react()
    ],
    server: {
      port: 5173,
      host: true
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          portal: resolve(__dirname, 'portal.html')
        }
      }
    }
  });
}

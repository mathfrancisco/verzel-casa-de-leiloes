import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = 'http://localhost:3000';

// Bibliotecas estáveis em chunks próprios: mudam pouco entre deploys e ficam em cache.
function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (
    /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(id)
  )
    return 'vendor-react';
  if (
    /node_modules\/(socket\.io-client|engine\.io-client|engine\.io-parser|socket\.io-parser|@socket\.io)\//.test(
      id,
    )
  )
    return 'vendor-socket';
  if (/node_modules\/@tanstack\//.test(id)) return 'vendor-query';
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: vendorChunk } } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiTarget,
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
});

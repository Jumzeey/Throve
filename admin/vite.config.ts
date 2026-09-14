import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const dir = path.dirname(fileURLToPath(import.meta.url));

function pick(...values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, dir, '');
  const apiUrl = pick(
    process.env.VITE_API_URL,
    process.env.PUBLIC_API_URL,
    fileEnv.VITE_API_URL,
    fileEnv.PUBLIC_API_URL,
    'https://throve-production.up.railway.app',
  );

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(dir, 'src'),
        react: path.resolve(dir, 'node_modules/react'),
        'react-dom': path.resolve(dir, 'node_modules/react-dom'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
    define: {
      __THROVE_API_URL__: JSON.stringify(apiUrl),
    },
    server: {
      port: 5180,
      strictPort: true,
    },
  };
});

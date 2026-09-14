import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Read all env (Vercel injects SUPABASE_* / PUBLIC_* without VITE_ prefix).
  const env = loadEnv(mode, dir, '');

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
  const apiUrl = env.VITE_API_URL || env.PUBLIC_API_URL || '';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(dir, 'src'),
        // Force a single React instance — monorepo root also has React (Expo),
        // which otherwise causes invalid hook calls with react-router.
        react: path.resolve(dir, 'node_modules/react'),
        'react-dom': path.resolve(dir, 'node_modules/react-dom'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
    // Map existing Vercel names into the VITE_* keys the app reads.
    // Do not expose SERVICE_ROLE or other secrets here.
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    server: {
      port: 5180,
      strictPort: true,
    },
  };
});

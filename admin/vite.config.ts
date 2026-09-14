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
  // Prefer process.env (what Vercel injects at build), then .env files.
  const fileEnv = loadEnv(mode, dir, '');

  const supabaseUrl = pick(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_URL,
    fileEnv.VITE_SUPABASE_URL,
    fileEnv.SUPABASE_URL,
  );
  const supabaseAnonKey = pick(
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
    fileEnv.VITE_SUPABASE_ANON_KEY,
    fileEnv.SUPABASE_ANON_KEY,
  );
  const apiUrl = pick(
    process.env.VITE_API_URL,
    process.env.PUBLIC_API_URL,
    fileEnv.VITE_API_URL,
    fileEnv.PUBLIC_API_URL,
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[vite] Supabase URL/anon key empty at build. Expected SUPABASE_URL + SUPABASE_ANON_KEY (or VITE_*).',
    );
  } else {
    console.info('[vite] Supabase env resolved for admin build.');
  }

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
    // Custom globals — Vite overwrites import.meta.env.VITE_* when those keys are unset.
    define: {
      __THROVE_SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __THROVE_SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
      __THROVE_API_URL__: JSON.stringify(apiUrl),
    },
    server: {
      port: 5180,
      strictPort: true,
    },
  };
});

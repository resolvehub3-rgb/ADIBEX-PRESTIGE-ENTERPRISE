import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {loadLocalEnv, renderSitemap} from './scripts/sitemap-core.mjs';

/**
 * Serves /sitemap.xml during `vite dev` and `vite preview` through the exact
 * same module the production Vercel function (api/sitemap.ts) uses, so local
 * output and production output cannot drift apart.
 */
function sitemapMiddleware() {
  loadLocalEnv(process.cwd());

  const middleware = async (req: any, res: any, next: () => void) => {
    const requestUrl = req.url || '';
    const pathname = requestUrl.split('?')[0];
    if (pathname !== '/sitemap.xml') return next();

    try {
      const result = await renderSitemap({
        searchParams: new URLSearchParams(requestUrl.split('?')[1] || ''),
        supabaseUrl: process.env.VITE_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY,
      });
      res.statusCode = result.status;
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Cache-Control', 'no-store');
      res.end(result.body);
    } catch {
      next();
    }
  };

  return {
    name: 'adibex-sitemap',
    configureServer(server: {middlewares: {use: (fn: any) => void}}) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: {middlewares: {use: (fn: any) => void}}) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), sitemapMiddleware()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

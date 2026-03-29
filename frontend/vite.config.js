import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Set VITE_SITE_URL in .env (e.g. https://www.yourstore.com) for production builds.
 * Used in index.html (Open Graph, canonical) and generated robots.txt / sitemap.xml.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const siteUrl = (env.VITE_SITE_URL || 'https://example.com').replace(/\/$/, '');

  return {
    plugins: [
      react(),
      {
        name: 'inject-site-url',
        transformIndexHtml(html) {
          return html.split('__SITE_URL__').join(siteUrl);
        },
      },
      {
        name: 'seo-robots-sitemap',
        closeBundle() {
          const dist = path.join(__dirname, 'dist');
          if (!fs.existsSync(dist)) return;
          const robots = `User-agent: *
Allow: /

Disallow: /admin

Sitemap: ${siteUrl}/sitemap.xml
`;
          const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc><changefreq>weekly</changefreq><priority>1</priority></url>
  <url><loc>${siteUrl}/shop</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${siteUrl}/categories</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${siteUrl}/about</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${siteUrl}/contact</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${siteUrl}/track</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>
`;
          fs.writeFileSync(path.join(dist, 'robots.txt'), robots);
          fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});

import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://aman751997.github.io',
  base: '/citadel',
  // Parallel lesson authors build into private dirs: CITADEL_OUT=/tmp/x CITADEL_CACHE=/tmp/x-cache npm run build
  ...(process.env.CITADEL_OUT ? { outDir: process.env.CITADEL_OUT } : {}),
  ...(process.env.CITADEL_CACHE ? { cacheDir: process.env.CITADEL_CACHE } : {}),
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
    },
  },
});

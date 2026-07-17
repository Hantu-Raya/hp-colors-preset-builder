import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://hantu-raya.github.io',
  base: '/hp-colors-preset-builder/',
  integrations: [preact()],
  vite: {
    resolve: {
      alias: {
        'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
        'react/jsx-runtime': 'preact/jsx-runtime'
      }
    },
    optimizeDeps: {
      include: ['lucide-preact']
    }
  }
});

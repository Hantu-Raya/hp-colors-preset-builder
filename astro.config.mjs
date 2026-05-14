import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://hantu-raya.github.io',
  base: '/hp-colors-preset-builder/',
  integrations: [react()]
});

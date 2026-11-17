// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ncaohoc.dev',
  integrations: [sitemap()],
  // Link cũ /cheatsheets/ chuyển sang /kien-thuc/.
  // Cloudflare trả 301 nhờ public/_redirects; trang dưới đây là dự phòng khi chạy ở chỗ khác.
  redirects: {
    '/cheatsheets': '/kien-thuc/',
    '/cheatsheets/[...slug]': '/kien-thuc/[...slug]',
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: false,
    },
  },
});

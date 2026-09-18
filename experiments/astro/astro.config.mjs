import { defineConfig } from 'astro/config';
export default defineConfig({
 site: process.env.SITE_URL || 'https://yijieqwq.github.io',
 base: process.env.BASE_PATH || '/Chunqiu-Detector-Problem-solution',
 output: 'static', trailingSlash: 'always', devToolbar: {enabled:false},
 build:{inlineStylesheets:'never'},
});

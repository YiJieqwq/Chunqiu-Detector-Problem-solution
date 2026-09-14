import { defineConfig } from 'vitepress'
import sidebar from './data/sidebar'

export default defineConfig({
  title: '春秋检测器解决方案',
  description: 'Chunqiu Detector Problem Solutions — 社区实测整理的检测项说明与处置方案（中英双语）',
  lang: 'zh-CN',
  base: '/Chunqiu-Detector-Problem-solution/',
  appearance: 'dark',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,
  head: [
    ['meta', { name: 'theme-color', content: '#141218' }],
    ['meta', { property: 'og:title', content: '春秋检测器解决方案' }],
    ['meta', { property: 'og:description', content: '社区实测整理的检测项说明与处置方案 · 中英双语' }]
  ],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '中文文档', link: '/zh/', activeMatch: '^/zh/' },
      { text: 'English', link: '/en/', activeMatch: '^/en/' },
      { text: '致谢名单', link: '/thanks' },
      { text: 'GitHub', link: 'https://github.com/mingzun09/Chunqiu-Detector-Problem-solution' }
    ],
    sidebar: {
      '/zh/': sidebar.zh,
      '/en/': sidebar.en
    },
    outline: { level: [2, 3], label: '本页目录' },
    search: {
      provider: 'local',
      options: {
        translations: { button: { buttonText: '搜索', buttonAriaLabel: '搜索' } },
        miniSearch: {
          options: {
            tokenize: (text: string) => text.split(/[\s\-_/，。、；：！？（）【】]+/).flatMap((w) =>
              typeof Intl !== 'undefined' && (Intl as any).Segmenter
                ? [...new (Intl as any).Segmenter('zh', { granularity: 'word' }).segment(w)].map((s: any) => s.segment)
                : [w]
            )
          }
        }
      }
    },
    docFooter: { prev: '上一篇', next: '下一篇' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色',
    darkModeSwitchTitle: '切换到深色',
    lastUpdatedText: '最后更新',
    editLink: { pattern: 'https://github.com/mingzun09/Chunqiu-Detector-Problem-solution/edit/main/:path', text: '在 GitHub 上编辑此页' },
    footer: {
      message: '内容整理自社区实测，仅供参考；操作风险自负。<br>Licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY-4.0</a>',
      copyright: 'Copyright © 2026 Chunqiu Detector Solutions contributors'
    }
  }
})

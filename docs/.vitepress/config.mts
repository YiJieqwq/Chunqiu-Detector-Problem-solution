import { defineConfig } from 'vitepress'
import sidebar from './data/sidebar'

const REPO = 'https://github.com/mingzun09/Chunqiu-Detector-Problem-solution'


/* 构建时把每个检测条目的正文包成 .cq-card（避免运行时 JS 包装被 hydration 重建导致的框分裂/漏包）
   规则：H3 条目的内容按 H4 分段，每段正文各自一个 .cq-card；H4 标题留在框外 */
const cqCardsPlugin = (md: any) => {
  md.core.ruler.push('cq_cards', (state: any) => {
    const tokens: any[] = state.tokens
    const isH = (t: any, tag: string) => t.type === 'heading_open' && t.tag === tag
    const mk = (content: string) => {
      const t = new state.Token('html_block', '', 0)
      t.content = content
      t.block = true
      return t
    }
    const out: any[] = []
    let i = 0
    while (i < tokens.length) {
      const t = tokens[i]
      if (!isH(t, 'h3')) { out.push(t); i++; continue }

      // 该 H3 的范围：[i, end)
      let end = i + 1
      while (end < tokens.length && !(isH(tokens[end], 'h2') || isH(tokens[end], 'h3'))) end++

      out.push(tokens[i]); i++                        // h3 open
      if (i < end) { out.push(tokens[i]); i++ }        // h3 inline
      if (i < end) { out.push(tokens[i]); i++ }        // h3 close

      let inCard = false
      let footer = false   // 版权卡 / 章节入口卡等“页脚块”：不包进卡片
      const openCard = () => { if (!inCard && !footer) { out.push(mk('<div class="cq-card">\n')); inCard = true } }
      const closeCard = () => { if (inCard) { out.push(mk('</div>\n')); inCard = false } }

      let segStart = i
      for (let k = i; k < end; k++) {
        // 页脚块（版权卡 / 三章入口卡）：先收尾当前卡片，且此后不再开卡
        if (tokens[k].type === 'html_block' && /cq-(copyright|chapters)/.test(tokens[k].content || '')) {
          closeCard(); footer = true; out.push(tokens[k]); continue
        }
        if (isH(tokens[k], 'h4')) {
          // H4 之前的正文先收尾成卡片
          if (k > segStart) openCard()
          closeCard()
          out.push(tokens[k])                          // h4 open
          if (k + 1 < end) out.push(tokens[k + 1])     // h4 inline
          if (k + 2 < end) out.push(tokens[k + 2])     // h4 close
          k += 2
          segStart = k + 1
          continue
        }
        if (k >= segStart ^ inCard) { /* noop: 保持简单 */ }
        // 非标题 token：若当前段落有内容则开卡
        if (k === segStart) openCard()
        out.push(tokens[k])
      }
      closeCard()
      i = end
    }
    state.tokens = out
    return true
  })
}

export default defineConfig({
  title: '春秋检测器解决方案',
  description: 'Chunqiu Detector Problem Solutions — 社区实测整理的检测项说明与处置方案（中英双语）',
  base: '/Chunqiu-Detector-Problem-solution/',
  appearance: 'dark',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,
  markdown: {
    config: cqCardsPlugin
  },
  head: [
    ['meta', { name: 'theme-color', content: '#141218' }],
    ['meta', { property: 'og:title', content: '春秋检测器解决方案' }],
    ['meta', { property: 'og:description', content: '社区实测整理的检测项说明与处置方案 · 中英双语' }],
    ['script', {}, `(function(){
  /* 顶部阅读进度条 */
  function prog(){
    var d=document.getElementById('cq-progress');
    if(!d){d=document.createElement('div');d.id='cq-progress';document.body.appendChild(d);}
    var h=document.documentElement, m=h.scrollHeight-h.clientHeight;
    d.style.width=(m>0?(h.scrollTop||document.body.scrollTop)/m*100:0)+'%';
  }
  document.addEventListener('scroll',prog,{passive:true});
  window.addEventListener('resize',prog);
  document.addEventListener('DOMContentLoaded',prog);

  /* 移动端：点击侧边栏里的链接后自动收起侧边栏（点分类标题只展开/折叠，不收起） */
  document.addEventListener('click',function(e){
    if(window.innerWidth>=960) return;
    var t=e.target;
    var a=t.closest && t.closest('.VPSidebar a');
    if(!a) return;
    var backdrop=document.querySelector('.VPBackdrop');
    if(backdrop){ backdrop.click(); return; }
    var ham=document.querySelector('.VPNavBarHamburger');
    if(ham) ham.click();
  },true);
})();`]
  ],

  /* 按语言划分 locale：VitePress 会为每个 locale 单独建立搜索索引（中文页只搜中文，英文页只搜英文） */
  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '中文文档', link: '/zh/', activeMatch: '^/zh/' },
          { text: 'English', link: '/en/', activeMatch: '^/en/' },
          { text: '致谢名单', link: '/thanks' },
          { text: 'GitHub', link: REPO }
        ],
        sidebar: { '/zh/': sidebar.zh },
        outline: { level: [2, 3], label: '本页目录' },
        docFooter: { prev: '上一篇', next: '下一篇' },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '目录',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色',
        darkModeSwitchTitle: '切换到深色',
        lastUpdatedText: '最后更新',
        footer: {
          message: '内容整理自社区实测，仅供参考；操作风险自负。<br>Licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY-4.0</a>',
          copyright: 'Copyright © 2026 Chunqiu Detector Solutions contributors'
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: '中文文档', link: '/zh/', activeMatch: '^/zh/' },
          { text: 'English', link: '/en/', activeMatch: '^/en/' },
          { text: 'Credits', link: '/thanks' },
          { text: 'GitHub', link: REPO }
        ],
        sidebar: { '/en/': sidebar.en },
        outline: { level: [2, 3], label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme',
        lastUpdatedText: 'Last updated',
        footer: {
          message: 'Compiled from community reports, for reference only; all operations are at your own risk.<br>Licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY-4.0</a>',
          copyright: 'Copyright © 2026 Chunqiu Detector Solutions contributors'
        }
      }
    }
  },

  themeConfig: {
    logo: '/logo.svg',
    search: {
      provider: 'local',
      options: {
        translations: { button: { buttonText: '搜索 / Search', buttonAriaLabel: '搜索文档' } },
        miniSearch: {
          options: {
            tokenize: (text: string) => text
              .split(/[\s\-_/，。、；：！？（）【】]+/)
              .flatMap((w) =>
                typeof Intl !== 'undefined' && (Intl as any).Segmenter
                  ? [...new (Intl as any).Segmenter('zh', { granularity: 'word' }).segment(w)].map((s: any) => s.segment)
                  : [w]
              )
          }
        }
      }
    },
    editLink: { pattern: `${REPO}/edit/main/:path`, text: '在 GitHub 上编辑此页' }
  }
})

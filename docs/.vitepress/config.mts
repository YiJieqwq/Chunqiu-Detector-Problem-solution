import nativeItems from './items.mjs'
import { defineConfig } from 'vitepress'
import sidebar from './data/sidebar'

const REPO = 'https://github.com/mingzun09/Chunqiu-Detector-Problem-solution'


export default defineConfig({
  title: '春秋检测器解决方案',
  description: 'Chunqiu Detector Problem Solutions — 社区实测整理的检测项说明与处置方案（中英双语）',
  base: '/Chunqiu-Detector-Problem-solution/',
  appearance: 'dark',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,
  markdown: {
    config: nativeItems
  },
  head: [
    ['meta', { name: 'theme-color', content: '#141218' }],
    ['meta', { property: 'og:title', content: '春秋检测器解决方案' }],
    ['meta', { property: 'og:description', content: '社区实测整理的检测项说明与处置方案 · 中英双语' }],
    ['script', {}, `(function(){
  /* 视图模式：默认桌面端（用 width=1024 让窄屏也走桌面布局）；可在右上角「⋯」菜单切换为移动端 */
  var KEY='cq-view';
  function apply(mode){
    var content = mode==='mobile' ? 'width=device-width,initial-scale=1' : 'width=1024';
    var vp=document.querySelector('meta[name="viewport"]');
    if(vp){ vp.setAttribute('content', content); }
    else { vp=document.createElement('meta'); vp.name='viewport'; vp.setAttribute('content', content); document.head.appendChild(vp); }
  }
  var mode='desktop';
  try{ mode = localStorage.getItem(KEY) || 'desktop'; }catch(e){}
  apply(mode);
})();`],
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
        outline: false, aside: false,
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
        outline: false, aside: false,
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
          /* 排序权重：关键字出现在“越高的层级”权重越高
             title = 当前小节标题（条目名 / 检测方式 / 解决办法…）
             titles = 面包屑（祖先标题）
             text  = 正文 */
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 12, titles: 3, text: 1 }
          },
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

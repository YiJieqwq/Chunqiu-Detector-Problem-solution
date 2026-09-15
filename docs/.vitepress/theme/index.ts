import DefaultTheme from 'vitepress/theme'
import './custom.css'
import type { EnhanceAppContext } from 'vitepress'

/**
 * 站点增强（客户端）——折叠改为“class + CSS”驱动，避免运行时改 DOM 结构带来的错位
 *
 * 结构（构建时生成，见 config.mts 的 markdown 插件）：
 *   <h3 id="...">条目名</h3>
 *   <div class="cq-item-body">
 *     <h4>检测方式</h4><div class="cq-card">…</div>
 *     <h4>解决办法</h4><div class="cq-card">…</div>
 *   </div>
 *
 * 折叠：给 h3 加/去 .cq-collapsed，CSS 负责隐藏 h3 + .cq-item-body
 */
const STORE_KEY = 'cq-fold-v6'

const readState = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
  } catch {
    return {}
  }
}
const writeState = (s: Record<string, boolean>) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s))
  } catch {}
}


/** 右上角「⋯」菜单：注入“桌面端 / 移动端”切换；并修正语言切换链接 */
function injectViewToggle() {
  // 语言切换链接修正：/en/zh/… → /en/…（locales 前缀映射在当前目录结构下会拼错）
  document.querySelectorAll('.VPNavBarExtra a[href*="/en/zh/"], .VPNavBarExtra a[href*="/zh/en/"]').forEach((a) => {
    a.setAttribute('href', (a.getAttribute('href') || '').replace('/en/zh/', '/en/').replace('/zh/en/', '/zh/'))
  })

  const menu = document.querySelector('.VPNavBarExtra .VPMenu')
  if (!menu || menu.querySelector('.cq-view-item')) return
  let mode = 'desktop'
  try { mode = localStorage.getItem('cq-view') || 'desktop' } catch {}
  const group = document.createElement('div')
  group.className = 'group cq-view-item'
  const item = document.createElement('div')
  item.className = 'item'
  const label = document.createElement('p')
  label.className = 'label'
  label.textContent = '界面 / View'
  const action = document.createElement('div')
  action.className = 'appearance-action'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'cq-view-btn'
  btn.textContent = mode === 'desktop' ? '桌面端 / Desktop' : '移动端 / Mobile'
  btn.addEventListener('click', () => {
    try { localStorage.setItem('cq-view', mode === 'desktop' ? 'mobile' : 'desktop') } catch {}
    location.reload()
  })
  action.appendChild(btn)
  item.appendChild(label)
  item.appendChild(action)
  group.appendChild(item)
  menu.appendChild(group)
}

function init() {
  injectViewToggle()
  const doc = document.querySelector('.vp-doc')
  if (!doc) return

  /* 只有“正文”页（/items）的条目可折叠；前言页与概述页不折叠 */
  const isItems = /\/items$/.test(location.pathname.replace(/\/$/, ''))
  const state = readState()
  const items = Array.from(doc.querySelectorAll('h3')) as HTMLElement[]

  const render = (h: HTMLElement) => {
    if (!isItems) {
      h.classList.remove('cq-collapsed', 'cq-foldable')
      return
    }
    h.classList.add('cq-foldable')
    const collapsed = h.id in state ? !state[h.id] : true // 默认折叠
    h.classList.toggle('cq-collapsed', collapsed)
  }

  items.forEach((h) => {
    if (!h.id) h.id = 'cq-' + Math.abs((h.textContent || '').length * 7919 + items.indexOf(h))
    if (!h.dataset.cqReady) {
      h.dataset.cqReady = '1'
      h.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('a')) return
        if (!isItems) return
        const collapsed = h.id in state ? !state[h.id] : true
        state[h.id] = collapsed // 记录“展开”
        writeState(state)
        render(h)
      })
    }
    render(h)
  })

  /* 跳转锚点时自动展开目标条目 */
  const expandTarget = () => {
    const id = decodeURIComponent((location.hash.replace(/^#\/?/, '').split('?')[0] || ''))
    if (!id) return
    const el = document.getElementById(id)
    if (!el) return
    const body = el.closest('.cq-item-body')
    let h: HTMLElement | null = null
    if (el.tagName === 'H3') h = el as HTMLElement
    else if (body) h = body.previousElementSibling as HTMLElement | null
    else if (el.closest('h4')) {
      const b = (el.closest('h4') as HTMLElement).closest('.cq-item-body')
      h = b ? (b.previousElementSibling as HTMLElement) : null
    }
    if (h && h.tagName === 'H3') {
      state[h.id] = true
      writeState(state)
      render(h)
    }
  }
  if (!(window as any).__cqExpand) {
    ;(window as any).__cqExpand = expandTarget
    window.addEventListener('hashchange', () => setTimeout(expandTarget, 60))
  }
  setTimeout(expandTarget, 80)

  /* 右下角：全部展开 / 全部折叠 */
  let btn = document.getElementById('cq-fold-all') as HTMLButtonElement | null
  if (!btn) {
    btn = document.createElement('button')
    btn.id = 'cq-fold-all'
    btn.type = 'button'
    document.body.appendChild(btn)
  }
  let allOpen = false
  btn.textContent = '全部展开'
  btn.onclick = () => {
    allOpen = !allOpen
    items.forEach((h) => {
      state[h.id] = allOpen
      writeState(state)
      render(h)
    })
    btn!.textContent = allOpen ? '全部折叠' : '全部展开'
  }
}

export default {
  extends: DefaultTheme,
  enhanceApp({ router }: EnhanceAppContext) {
    if (typeof window === 'undefined') return
    const run = () => {
      setTimeout(init, 60)
      setTimeout(injectViewToggle, 200)
      setInterval(injectViewToggle, 800)
    }
    window.addEventListener('load', run)
    ;(router as any).onAfterRouteChanged = run
  }
}

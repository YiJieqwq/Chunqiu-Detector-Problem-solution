import DefaultTheme from 'vitepress/theme'
import './custom.css'
import type { EnhanceAppContext } from 'vitepress'

/**
 * 站点增强：
 *  1. 条目折叠：每个 H3（检测条目）可折叠/展开，默认折叠
 *     - 点击标题切换；跳转锚点（侧边栏 / 本页目录 / 外链）自动展开目标
 *     - 右下角提供「全部展开 / 全部折叠」
 *  2. 进度条与「移动端点条目后收起抽屉」由 config.mts 的 head 脚本负责，这里不重复
 */
const OPEN_KEY = 'cq-open-items'

function readOpen(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(OPEN_KEY) || '[]'))
  } catch {
    return new Set<string>()
  }
}
function writeOpen(set: Set<string>) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify([...set]))
  } catch {}
}

function initCollapse() {
  const doc = document.querySelector('.vp-doc')
  if (!doc) return

  const heads = Array.from(doc.querySelectorAll('h3')) as HTMLElement[]
  if (!heads.length) return

  const open = readOpen()

  const bodyOf = (h: HTMLElement) => {
    const out: HTMLElement[] = []
    let el = h.nextElementSibling as HTMLElement | null
    while (el && !/^H[1-3]$/.test(el.tagName)) {
      out.push(el)
      el = el.nextElementSibling as HTMLElement | null
    }
    return out
  }

  const render = (h: HTMLElement) => {
    const isOpen = open.has(h.id)
    bodyOf(h).forEach((el) => {
      el.style.display = isOpen ? '' : 'none'
    })
    h.classList.toggle('cq-collapsed', !isOpen)
  }

  heads.forEach((h) => {
    if (!h.id) h.id = 'item-' + Math.abs(h.textContent!.length * 7919 + heads.indexOf(h))
    h.classList.add('cq-foldable')
    if (!h.dataset.cqReady) {
      h.dataset.cqReady = '1'
      h.addEventListener('click', (e) => {
        // 标题里的锚点链接不触发折叠
        if ((e.target as HTMLElement).closest('a')) return
        if (open.has(h.id)) open.delete(h.id)
        else open.add(h.id)
        writeOpen(open)
        render(h)
      })
    }
    render(h)
  })

  /* 跳转锚点时自动展开目标条目 */
  const expandTarget = () => {
    const raw = location.hash.replace(/^#\/?/, '')
    const id = decodeURIComponent(raw.split('?')[0] || '')
    if (!id) return
    const el = document.getElementById(id)
    if (!el) return
    let h = el.tagName === 'H3' ? el : null
    if (!h) {
      // 找到目标元素之前最近的 H3
      const all = heads.filter((x) => x.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
      h = all[all.length - 1] || null
      // 若目标本身就在 H3 里
      const parentH3 = el.closest('h3')
      if (parentH3) h = parentH3 as HTMLElement
    }
    if (h && !open.has(h.id)) {
      open.add(h.id)
      writeOpen(open)
      render(h)
    }
  }
  if (window.__cqExpandTarget !== expandTarget) {
    window.__cqExpandTarget = expandTarget
    window.addEventListener('hashchange', () => setTimeout(expandTarget, 60))
  }
  setTimeout(expandTarget, 80)

  /* 右下角：全部展开 / 全部折叠 */
  if (!document.getElementById('cq-fold-all')) {
    const btn = document.createElement('button')
    btn.id = 'cq-fold-all'
    btn.type = 'button'
    let allOpen = false
    const sync = () => {
      btn.textContent = allOpen ? '全部折叠' : '全部展开'
    }
    btn.addEventListener('click', () => {
      allOpen = !allOpen
      heads.forEach((h) => (allOpen ? open.add(h.id) : open.delete(h.id)))
      writeOpen(open)
      heads.forEach(render)
      sync()
    })
    sync()
    document.body.appendChild(btn)
  }
}

export default {
  extends: DefaultTheme,
  enhanceApp({ router }: EnhanceAppContext) {
    if (typeof window === 'undefined') return
    const run = () => setTimeout(initCollapse, 60)
    window.addEventListener('load', run)
    ;(router as any).onAfterRouteChanged = run
  }
}

import DefaultTheme from 'vitepress/theme'
import './custom.css'
import type { EnhanceAppContext } from 'vitepress'

/**
 * 站点增强（客户端）
 *
 * 折叠策略：
 *   H2 章节
 *     - 「声明」「说明与反馈」：可折叠，默认折叠
 *     - 其余（目录 / 序章 / 检测项正文 / 各检测分类 / 附录）：不可折叠
 *   H3 条目
 *     - 序章下的条目（用语介绍与规范…）：不可折叠
 *     - 检测分类下的条目：可折叠，默认折叠
 *   H4 小节（真解锁设备 / 检测方式 / 解决办法…）：可折叠，默认展开
 *   跳转锚点时自动展开目标；右下角「全部展开 / 全部折叠」
 */
const STORE_KEY = 'cq-fold-v3'

type State = Record<string, boolean>

const readState = (): State => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as State
  } catch {
    return {}
  }
}
const writeState = (s: State) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s))
  } catch {}
}

/* 规则表 */
const H2_FOLDABLE = ['声明', '说明与反馈', 'Disclaimer', 'Help & Feedback']
const H3_NOFOLD_IN = ['序章', 'Prologue'] // 这些章节下的 H3 不可折叠
const H3_OPEN_IN = ['序章', 'Prologue'] // 且默认展开

function init() {
  const doc = document.querySelector('.vp-doc')
  if (!doc) return

  const state = readState()
  const titleOf = (h: HTMLElement) => (h.textContent || '').replace(/[\u200b-\u200f\ufeff]/g, '').trim()
  const level = (el: Element) => (/^H([1-6])$/.test(el.tagName) ? Number(el.tagName[1]) : 0)

  /** 取标题后、遇到“同级或更高级标题”为止的所有元素 */
  const bodyOf = (h: HTMLElement) => {
    const lv = Number(h.tagName[1])
    const out: HTMLElement[] = []
    let el = h.nextElementSibling as HTMLElement | null
    while (el) {
      const l = level(el)
      if (l && l <= lv) break
      out.push(el)
      el = el.nextElementSibling as HTMLElement | null
    }
    return out
  }

  /** H3/H4 所属的 H2 章节名 */
  const sectionOf = (el: HTMLElement) => {
    let owner = ''
    for (const h2 of Array.from(doc.querySelectorAll('h2'))) {
      if (el.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_PRECEDING) owner = titleOf(h2 as HTMLElement)
      else break
    }
    return owner
  }

  /** 该标题是否可折叠，以及默认是否展开 */
  const policy = (h: HTMLElement): { foldable: boolean; open: boolean } => {
    const t = titleOf(h)
    const lv = Number(h.tagName[1])
    if (lv === 2) {
      const foldable = H2_FOLDABLE.includes(t)
      return { foldable, open: foldable ? false : true }
    }
    if (lv === 3) {
      const sec = sectionOf(h)
      const noFold = H3_NOFOLD_IN.some((p) => sec.startsWith(p))
      if (noFold) return { foldable: false, open: true }
      return { foldable: true, open: H3_OPEN_IN.some((p) => sec.startsWith(p)) }
    }
    if (lv === 4) return { foldable: true, open: true }
    return { foldable: false, open: true }
  }

  /** 把 H3 的正文包进 .cq-card（只包一次） */
  const wrap = (h: HTMLElement) => {
    if (h.tagName !== 'H3') return null
    const nodes = bodyOf(h)
    if (!nodes.length) return null
    if (nodes.length === 1 && nodes[0].classList.contains('cq-card')) return nodes[0]
    const card = document.createElement('div')
    card.className = 'cq-card'
    h.insertAdjacentElement('afterend', card)
    nodes.forEach((n) => card.appendChild(n))
    return card
  }

  const nodesOf = (h: HTMLElement) => {
    if (h.tagName === 'H3') {
      const c = wrap(h)
      return c ? [c] : []
    }
    return bodyOf(h)
  }

  const apply = (h: HTMLElement) => {
    if (!h.id) h.id = 'cq-' + Math.random().toString(36).slice(2, 8)
    const { foldable, open: dflt } = policy(h)
    h.classList.toggle('cq-foldable', foldable)
    if (!foldable) {
      h.classList.remove('cq-collapsed')
      nodesOf(h).forEach((n) => ((n as HTMLElement).style.display = ''))
      return
    }
    const isOpen = h.id in state ? state[h.id] : dflt
    nodesOf(h).forEach((n) => ((n as HTMLElement).style.display = isOpen ? '' : 'none'))
    h.classList.toggle('cq-collapsed', !isOpen)
  }

  const heads = Array.from(doc.querySelectorAll('h2, h3, h4')) as HTMLElement[]
  heads.forEach((h) => {
    if (!h.dataset.cqReady) {
      h.dataset.cqReady = '1'
      h.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('a')) return
        if (!h.classList.contains('cq-foldable')) return
        if (!h.id) h.id = 'cq-' + Math.random().toString(36).slice(2, 8)
        const { open: dflt } = policy(h)
        const cur = h.id in state ? state[h.id] : dflt
        state[h.id] = !cur
        writeState(state)
        apply(h)
      })
    }
    apply(h)
  })

  /* 跳转锚点：自动展开目标（含其所属 H3 与章节） */
  const expandTarget = () => {
    const id = decodeURIComponent(location.hash.replace(/^#\/?/, '').split('?')[0] || '')
    if (!id) return
    const el = document.getElementById(id)
    if (!el) return
    const chain: HTMLElement[] = []
    let h: HTMLElement | null = null
    if (el.matches('h2,h3,h4')) h = el as HTMLElement
    else if (el.closest('h4')) h = el.closest('h4') as HTMLElement
    else if (el.closest('.cq-card')) {
      let prev = (el.closest('.cq-card') as HTMLElement).previousElementSibling as HTMLElement | null
      while (prev && !/^H[234]$/.test(prev.tagName)) prev = prev.previousElementSibling as HTMLElement | null
      h = prev
    }
    if (h) {
      chain.push(h)
      const sec = sectionOf(h)
      for (const h2 of Array.from(doc.querySelectorAll('h2')))
        if (titleOf(h2 as HTMLElement) === sec) chain.push(h2 as HTMLElement)
    }
    chain.forEach((x) => {
      if (!x.classList.contains('cq-foldable')) return
      state[x.id] = true
      apply(x)
    })
    if (chain.length) writeState(state)
  }
  if (!(window as any).__cqExpand) {
    ;(window as any).__cqExpand = expandTarget
    window.addEventListener('hashchange', () => setTimeout(expandTarget, 60))
  }
  setTimeout(expandTarget, 80)

  /* 右下角：全部展开 / 全部折叠（只作用于可折叠标题） */
  let btn = document.getElementById('cq-fold-all') as HTMLButtonElement | null
  if (!btn) {
    btn = document.createElement('button')
    btn.id = 'cq-fold-all'
    btn.type = 'button'
    document.body.appendChild(btn)
  }
  let allOpen = false
  const sync = () => (btn!.textContent = allOpen ? '全部折叠' : '全部展开')
  btn.onclick = () => {
    allOpen = !allOpen
    heads.filter((h) => h.classList.contains('cq-foldable')).forEach((h) => {
      state[h.id] = allOpen
      apply(h)
    })
    writeState(state)
    sync()
  }
  sync()
}

export default {
  extends: DefaultTheme,
  enhanceApp({ router }: EnhanceAppContext) {
    if (typeof window === 'undefined') return
    const run = () => setTimeout(init, 60)
    window.addEventListener('load', run)
    ;(router as any).onAfterRouteChanged = run
  }
}

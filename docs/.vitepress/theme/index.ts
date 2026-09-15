import DefaultTheme from 'vitepress/theme'
import './custom.css'
import type { EnhanceAppContext } from 'vitepress'

/**
 * 站点增强（客户端）
 *
 * 1) 卡片：只包“最后一级”的内容
 *    - H4 小节标题留在框外，其正文自己成框
 *    - H3 条目中不属于任何 H4 的正文，单独成框
 * 2) 折叠策略
 *    - H2 声明 / 说明与反馈：可折叠，默认折叠；其余 H2 不可折叠
 *    - H3：序章下的不可折叠；检测项可折叠、默认折叠
 *    - H4：可折叠、默认展开
 * 3) 跳转锚点自动展开目标；右下角「全部展开 / 全部折叠」
 */
const STORE_KEY = 'cq-fold-v4'

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

const H2_FOLDABLE = ['声明', '说明与反馈', 'Disclaimer', 'Help & Feedback']
const H3_NOFOLD_IN = ['序章', 'Prologue']
const H3_OPEN_IN = ['序章', 'Prologue']

function init() {
  const doc = document.querySelector('.vp-doc')
  if (!doc) return

  const state = readState()
  const titleOf = (h: HTMLElement) => (h.textContent || '').replace(/[\u200b-\u200f\ufeff]/g, '').trim()
  const lv = (el: Element) => (/^H([1-6])$/.test(el.tagName) ? Number(el.tagName[1]) : 0)

  /** 标题后、遇到“同级或更高级标题”为止的元素 */
  const rawBody = (h: HTMLElement) => {
    const n = Number(h.tagName[1])
    const out: HTMLElement[] = []
    let el = h.nextElementSibling as HTMLElement | null
    while (el) {
      const l = lv(el)
      if (l && l <= n) break
      out.push(el)
      el = el.nextElementSibling as HTMLElement | null
    }
    return out
  }

  const sectionOf = (el: HTMLElement) => {
    let owner = ''
    for (const h of Array.from(doc.querySelectorAll('h1, h2'))) {
      if (el.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_PRECEDING) owner = titleOf(h as HTMLElement)
      else break
    }
    return owner
  }

  /* ---------- ① 建卡：只包最后一级内容 ---------- */
  const makeCard = (nodes: HTMLElement[], after: HTMLElement) => {
    const card = document.createElement('div')
    card.className = 'cq-card'
    after.insertAdjacentElement('afterend', card)
    nodes.forEach((n) => card.appendChild(n))
    return card
  }

  const h3s = Array.from(doc.querySelectorAll('h3')) as HTMLElement[]
  for (const h3 of h3s) {
    if (h3.dataset.cqCards) continue
    h3.dataset.cqCards = '1'
    const nodes = rawBody(h3)
    // 按 H4 分段
    const groups: { h4: HTMLElement | null; nodes: HTMLElement[] }[] = []
    let cur: { h4: HTMLElement | null; nodes: HTMLElement[] } = { h4: null, nodes: [] }
    for (const n of nodes) {
      if (/^H4$/.test(n.tagName)) {
        groups.push(cur)
        cur = { h4: n, nodes: [] }
      } else {
        cur.nodes.push(n)
      }
    }
    groups.push(cur)

    const h3Nodes: HTMLElement[] = []
    for (const g of groups) {
      if (g.nodes.length) {
        const anchorEl = g.h4 ?? h3
        const card = makeCard(g.nodes, anchorEl)
        h3Nodes.push(card)
        if (g.h4) (g.h4 as any).__cqNodes = [card]
      }
      if (g.h4) h3Nodes.push(g.h4)
    }
    ;(h3 as any).__cqNodes = h3Nodes
  }

  /* 独立的 H4（不隶属于任何 H3）也各自成卡 */
  for (const h4 of Array.from(doc.querySelectorAll('h4')) as HTMLElement[]) {
    if ((h4 as any).__cqNodes) continue
    const nodes = rawBody(h4)
    if (nodes.length) (h4 as any).__cqNodes = [makeCard(nodes, h4)]
  }

  /* 其余标题（H2 等）的折叠范围 */
  for (const h of Array.from(doc.querySelectorAll('h2')) as HTMLElement[]) {
    ;(h as any).__cqNodes = rawBody(h)
  }

  /* ---------- ② 折叠策略 ---------- */
  const policy = (h: HTMLElement): { foldable: boolean; open: boolean } => {
    const t = titleOf(h)
    const n = Number(h.tagName[1])
    if (n === 2) {
      const foldable = H2_FOLDABLE.includes(t)
      return { foldable, open: !foldable }
    }
    if (n === 3) {
      const sec = sectionOf(h)
      const noFold = H3_NOFOLD_IN.some((p) => sec.startsWith(p))
      return noFold ? { foldable: false, open: true } : { foldable: true, open: H3_OPEN_IN.some((p) => sec.startsWith(p)) }
    }
    if (n === 4) return { foldable: true, open: true }
    return { foldable: false, open: true }
  }

  const nodesOf = (h: HTMLElement): HTMLElement[] => (h as any).__cqNodes || rawBody(h)

  const apply = (h: HTMLElement) => {
    if (!h.id) h.id = 'cq-' + Math.random().toString(36).slice(2, 8)
    const { foldable, open: dflt } = policy(h)
    h.classList.toggle('cq-foldable', foldable)
    if (!foldable) {
      h.classList.remove('cq-collapsed')
      nodesOf(h).forEach((n) => (n.style.display = ''))
      return
    }
    const open = h.id in state ? state[h.id] : dflt
    nodesOf(h).forEach((n) => (n.style.display = open ? '' : 'none'))
    h.classList.toggle('cq-collapsed', !open)
  }

  const heads = Array.from(doc.querySelectorAll('h2, h3, h4')) as HTMLElement[]
  heads.forEach((h) => {
    if (!h.dataset.cqReady) {
      h.dataset.cqReady = '1'
      h.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('a')) return
        if (!h.classList.contains('cq-foldable')) return
        if (!h.id) h.id = 'cq-' + Math.random().toString(36).slice(2, 8)
        const cur = h.id in state ? state[h.id] : policy(h).open
        state[h.id] = !cur
        writeState(state)
        apply(h)
      })
    }
    apply(h)
  })

  /* 跳转锚点：自动展开目标及其所属层级 */
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
      const prevH3 = h.tagName === 'H4' ? (h.previousElementSibling ? null : null) : null
      // 找到包含它的 H3（H4 时）
      if (h.tagName === 'H4') {
        let p: HTMLElement | null = h.previousElementSibling as HTMLElement | null
        while (p && !/^H3$/.test(p.tagName)) p = p.previousElementSibling as HTMLElement | null
        if (p) chain.push(p)
      }
      const sec = sectionOf(h)
      for (const h2 of Array.from(doc.querySelectorAll('h1, h2')))
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

  /* 右下角按钮 */
  let btn = document.getElementById('cq-fold-all') as HTMLButtonElement | null
  if (!btn) {
    btn = document.createElement('button')
    btn.id = 'cq-fold-all'
    btn.type = 'button'
    document.body.appendChild(btn)
  }
  let allOpen = false
  btn.onclick = () => {
    allOpen = !allOpen
    heads.filter((h) => h.classList.contains('cq-foldable')).forEach((h) => {
      state[h.id] = allOpen
      apply(h)
    })
    writeState(state)
    btn!.textContent = allOpen ? '全部折叠' : '全部展开'
  }
  btn.textContent = allOpen ? '全部折叠' : '全部展开'
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

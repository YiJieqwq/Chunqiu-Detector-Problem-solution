import DefaultTheme from 'vitepress/theme'
import './custom.css'
import type { EnhanceAppContext } from 'vitepress'

/**
 * 站点增强（客户端）：
 *  1. 条目正文重新包成「灰色圆角卡片」（.cq-card），标题层级/锚点不受影响
 *  2. 折叠：
 *     - H2「声明」「说明与反馈」默认折叠（可点标题展开）
 *     - H3 条目：序章里的默认展开，检测项默认折叠
 *     - 跳转锚点自动展开目标；右下角「全部展开 / 全部折叠」
 *  3. 进度条与「移动端点条目后收起抽屉」由 config.mts 的 head 脚本负责
 */
const STORE_KEY = 'cq-fold-v2'

type State = Record<string, boolean>

function readState(): State {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as State
  } catch {
    return {}
  }
}
function writeState(s: State) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s))
  } catch {}
}

const SECTION_CLOSED = ['声明', '说明与反馈', 'Disclaimer', 'Help & Feedback']
const PROLOGUE = ['序章', 'Prologue']

function init() {
  const doc = document.querySelector('.vp-doc')
  if (!doc) return

  const state = readState()
  const heads = Array.from(doc.querySelectorAll('h2, h3')) as HTMLElement[]

  /** 取标题后、下一个同级或更高级标题之前的所有元素 */
  const bodyOf = (h: HTMLElement) => {
    const out: HTMLElement[] = []
    let el = h.nextElementSibling as HTMLElement | null
    while (el && !/^H1$|^H2$/.test(el.tagName) && !(h.tagName === 'H2' && el.tagName === 'H2')) {
      out.push(el)
      el = el.nextElementSibling as HTMLElement | null
    }
    return out
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

  /** 该 H3 属于哪个 H2 章节 */
  /** 该元素属于哪个 H2 章节：取“位于它之前且最近的 H2” */
  const sectionOf = (el: HTMLElement) => {
    let owner = ''
    for (const h2 of Array.from(doc.querySelectorAll('h2'))) {
      // rel 含 PRECEDING ⇒ h2 在 el 之前
      if (el.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_PRECEDING) owner = (h2.textContent || '').trim()
      else break
    }
    return owner
  }

  const defaultOpen = (h: HTMLElement) => {
    const title = (h.textContent || '').trim()
    if (h.tagName === 'H2') return !SECTION_CLOSED.includes(title)
    const sec = sectionOf(h)
    return PROLOGUE.some((p) => sec.startsWith(p))
  }

  const apply = (h: HTMLElement) => {
    const key = h.id || (h.id = 'cq-' + Math.random().toString(36).slice(2, 8))
    const isOpen = key in state ? state[key] : defaultOpen(h)
    const nodes = h.tagName === 'H3' ? [wrap(h)!] : bodyOf(h)
    nodes.filter(Boolean).forEach((n) => {
      ;(n as HTMLElement).style.display = isOpen ? '' : 'none'
    })
    h.classList.toggle('cq-collapsed', !isOpen)
    h.classList.add('cq-foldable')
  }

  heads.forEach((h) => {
    if (!h.dataset.cqReady) {
      h.dataset.cqReady = '1'
      h.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('a')) return
        const key = h.id || (h.id = 'cq-' + Math.random().toString(36).slice(2, 8))
        const cur = key in state ? state[key] : defaultOpen(h)
        state[key] = !cur
        writeState(state)
        apply(h)
      })
    }
    apply(h)
  })

  /* 跳转锚点时自动展开 */
  const expandTarget = () => {
    const id = decodeURIComponent((location.hash.replace(/^#\/?/, '').split('?')[0] || ''))
    if (!id) return
    const el = document.getElementById(id)
    if (!el) return
    let h: HTMLElement | null = null
    if (el.matches('h2,h3')) h = el as HTMLElement
    else if (el.closest('h3')) h = el.closest('h3') as HTMLElement
    else if (el.closest('.cq-card')) {
      const card = el.closest('.cq-card') as HTMLElement
      let prev = card.previousElementSibling as HTMLElement | null
      while (prev && !/^H3$/.test(prev.tagName)) prev = prev.previousElementSibling as HTMLElement | null
      h = prev
    }
    if (h) {
      state[h.id] = true
      writeState(state)
      apply(h)
      // 同时展开其所属章节
      const secs = Array.from(doc.querySelectorAll('h2'))
      let owner: HTMLElement | null = null
      for (const s of secs) if (h.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING) owner = s as HTMLElement
      else break
      if (owner) {
        state[owner.id] = true
        writeState(state)
        apply(owner as HTMLElement)
      }
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
  const sync = () => (btn!.textContent = allOpen ? '全部折叠' : '全部展开')
  btn.onclick = () => {
    allOpen = !allOpen
    heads.forEach((h) => {
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

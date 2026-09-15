import DefaultTheme from 'vitepress/theme'
import './custom.css'
import './items.css'
import { nextTick } from 'vue'
import type { EnhanceAppContext } from 'vitepress'

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


let cleanup = () => {}
function init() {
  cleanup()
  injectViewToggle()
  const doc = document.querySelector('.vp-doc')
  const items = Array.from(doc?.querySelectorAll<HTMLDetailsElement>('details.cq-entry') || [])
  const english = /\/en\//.test(location.pathname)
  const key = 'cq-native-items:' + location.pathname
  let saved: Record<string, boolean> = {}
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') } catch {}
  const idOf = (el: Element) => el.querySelector('summary h3')?.id || ''
  for (const item of items) item.open = saved[idOf(item)] === true
  let btn = document.getElementById('cq-fold-all') as HTMLButtonElement | null
  if (!btn && items.length) {
    btn = document.createElement('button'); btn.id = 'cq-fold-all'; btn.type = 'button'
    document.body.appendChild(btn)
  }
  const updateButton = () => {
    if (!btn) return
    btn.hidden = !items.length
    const allOpen = items.length > 0 && items.every(i => i.open)
    btn.textContent = english ? (allOpen ? 'Collapse all' : 'Expand all') : (allOpen ? '全部折叠' : '全部展开')
  }
  let saveTimer: ReturnType<typeof setTimeout>
  const onToggle = (e: Event) => {
    const item = e.target as HTMLDetailsElement
    if (!items.includes(item)) return
    saved[idOf(item)] = item.open
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { try { localStorage.setItem(key, JSON.stringify(saved)) } catch {} }, 120)
    updateButton()
  }
  doc?.addEventListener('toggle', onToggle, true)
  if (btn) btn.onclick = () => {
    const open = !items.every(i => i.open)
    items.forEach(i => { i.open = open })
    updateButton()
  }
  updateButton()
  let frame = 0
  const focusHash = () => {
    let id = ''
    try { id = decodeURIComponent(location.hash.slice(1)) } catch { return }
    const target = document.getElementById(id)
    if (!target) return
    for (let node: HTMLElement | null = target; node; node = node.parentElement) {
      if (node instanceof HTMLDetailsElement) node.open = true
    }
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }))
  }
  window.addEventListener('hashchange', focusHash)
  focusHash()
  cleanup = () => {
    clearTimeout(saveTimer); cancelAnimationFrame(frame)
    doc?.removeEventListener('toggle', onToggle, true)
    window.removeEventListener('hashchange', focusHash)
    if (btn) btn.onclick = null
  }
}
export default {
  extends: DefaultTheme,
  enhanceApp({ router }: EnhanceAppContext) {
    if (typeof window === 'undefined') return
    const run = async () => { await nextTick(); init() }
    window.addEventListener('load', run, { once: true })
    router.onAfterRouteChanged = run
  }
}

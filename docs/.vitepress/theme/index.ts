import DefaultTheme from 'vitepress/theme'
import './custom.css'
import './items.css'
import { nextTick, h } from 'vue'
import Breadcrumbs from './Breadcrumbs.vue'
import type { EnhanceAppContext } from 'vitepress'
let detailHtml: string | null = null

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
async function unlockDetail() {
  const lang=/\/en\//.test(location.pathname)?'en':'zh'
  const base=(document.querySelector('base')?.href || location.origin+'/Chunqiu-Detector-Problem-solution/')
  const r=await fetch(base+'detail/answer_'+lang+'.html.enc'); const x=await r.json()
  const b64=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0))
  const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(prompt('请输入开发者验证密码 / Password')||''),'PBKDF2',false,['deriveKey'])
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(x.s),iterations:x.i,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt'])
  const d=b64(x.d), tag=b64(x.t), all=new Uint8Array(d.length+tag.length); all.set(d);all.set(tag,d.length)
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(x.iv)},key,all); detailHtml=new TextDecoder().decode(plain)
  applyDetail(); sessionStorage.setItem('cq-detail-ok','1')
}
function applyDetail(){ if(!detailHtml || !/\/items/.test(location.pathname)) return; const box=document.createElement('div');box.innerHTML=detailHtml; const fresh=[...box.querySelectorAll('details.cq-entry')], old=[...document.querySelectorAll('.vp-doc details.cq-entry')]; fresh.forEach((n,i)=>{if(old[i]) old[i].replaceWith(n)}); init() }
function init() {
  cleanup()
  injectViewToggle()
  const menu=document.querySelector('.VPNavBarExtra .VPMenu')
  if(menu && !menu.querySelector('.cq-dev-item')){const g=document.createElement('div');g.className='group cq-dev-item';const p=document.createElement('p');p.className='label';p.textContent='开发者验证 / Developer';const b=document.createElement('button');b.className='cq-dev-btn';b.textContent=detailHtml?'已解密 / Decrypted':'输入密码 / Verify';b.onclick=()=>unlockDetail().catch(()=>alert('密码错误或解密失败 / Verification failed'));g.append(p,b);menu.append(g)}
  applyDetail()
  const doc = document.querySelector('.vp-doc')
  const items = Array.from(doc?.querySelectorAll<HTMLDetailsElement>('details.cq-entry') || [])
  const english = /\/en\//.test(location.pathname)
  // Every page entry starts expanded; do not restore legacy collapsed states.
  for (const item of items) item.open = true
  let btn = document.getElementById('cq-fold-all') as HTMLButtonElement | null
  if (!btn && items.length) {
    btn = document.createElement('button'); btn.id = 'cq-fold-all'; btn.type = 'button'
    document.body.appendChild(btn)
  }
  const updateButton = () => {
    if (!btn) return
    btn.hidden = !items.length
    const allOpen = items.length > 0 && items.every(i => i.open)
    btn.textContent = english ? (allOpen ? 'Collapse body' : 'Expand body') : (allOpen ? '正文全部折叠' : '正文全部展开')
  }
  const onToggle = (e: Event) => {
    const item = e.target as HTMLDetailsElement
    if (!items.includes(item)) return
    updateButton()
  }
  doc?.addEventListener('toggle', onToggle, true)
  if (btn) btn.onclick = () => {
    const open = !items.every(i => i.open)
    items.forEach(i => { i.open = open })
    updateButton()
  }
  updateButton()
  // Sidebar state stays owned by VitePress. Invoke its carets, never override classes.
  const sidebar = document.querySelector<HTMLElement>('.VPSidebar')
  let sideButton = document.getElementById('cq-sidebar-fold') as HTMLButtonElement | null
  if (!sideButton) {
    sideButton = document.createElement('button'); sideButton.id = 'cq-sidebar-fold'
    sideButton.type = 'button'; document.body.appendChild(sideButton)
  }
  sideButton.hidden = !sidebar || !doc
  const groups = () => Array.from(sidebar?.querySelectorAll<HTMLElement>('.VPSidebarItem.collapsible') || [])
  const updateSidebar = () => {
    const open = groups().every(g => !g.classList.contains('collapsed'))
    sideButton!.textContent = english ? (open ? 'Collapse sidebar' : 'Expand sidebar') : (open ? '侧边栏全部折叠' : '侧边栏全部展开')
  }
  let active = true
  const afterSidebar = () => { void nextTick(() => { if (active) updateSidebar() }) }
  sideButton.onclick = () => {
    const entries = groups()
    const expand = entries.some(g => g.classList.contains('collapsed'))
    for (const g of entries) {
      if (g.classList.contains('collapsed') === expand) {
        g.querySelector<HTMLElement>(':scope > .item > .caret')?.click()
      }
    }
    afterSidebar()
  }
  sidebar?.addEventListener('click', afterSidebar)
  sidebar?.addEventListener('keydown', afterSidebar)
  updateSidebar()
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
    active = false
    sidebar?.removeEventListener('click', afterSidebar)
    sidebar?.removeEventListener('keydown', afterSidebar)
    if (sideButton) sideButton.onclick = null
    cancelAnimationFrame(frame)
    doc?.removeEventListener('toggle', onToggle, true)
    window.removeEventListener('hashchange', focusHash)
    if (btn) btn.onclick = null
  }
}
export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'doc-before': () => h(Breadcrumbs)
  }),
  enhanceApp({ router }: EnhanceAppContext) {
    if (typeof window === 'undefined') return
    const run = async () => { await nextTick(); init() }
    window.addEventListener('load', run, { once: true })
    router.onAfterRouteChanged = run
  }
}

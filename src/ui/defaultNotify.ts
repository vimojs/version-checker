import type { UpdateAvailableContext } from '../types'

const ROOT_ID = '__vimojs_version_checker__ui__root__'

export function defaultNotify(ctx: UpdateAvailableContext) {
  if (typeof document === 'undefined') return

  const existing = document.getElementById(ROOT_ID)
  if (existing) {
    existing.style.display = 'block'
    return
  }

  const root = document.createElement('div')
  root.id = ROOT_ID
  root.setAttribute('role', 'dialog')

  root.style.position = 'fixed'
  root.style.right = '16px'
  root.style.bottom = '16px'
  root.style.maxWidth = '360px'
  root.style.padding = '12px 14px'
  root.style.borderRadius = '10px'
  root.style.background = '#111827'
  root.style.color = '#ffffff'
  root.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)'
  root.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"
  root.style.zIndex = '2147483647'

  const title = document.createElement('div')
  title.textContent = '检测到新版本'
  title.style.fontSize = '14px'
  title.style.fontWeight = '600'
  title.style.marginBottom = '6px'

  const desc = document.createElement('div')
  desc.textContent = '当前页面可能已过期，建议立即刷新获取最新内容。'
  desc.style.fontSize = '12px'
  desc.style.opacity = '0.9'
  desc.style.lineHeight = '1.4'

  const actions = document.createElement('div')
  actions.style.display = 'flex'
  actions.style.gap = '8px'
  actions.style.marginTop = '10px'

  const laterBtn = document.createElement('button')
  laterBtn.type = 'button'
  laterBtn.textContent = '稍后'
  laterBtn.style.flex = '1'
  laterBtn.style.height = '32px'
  laterBtn.style.borderRadius = '8px'
  laterBtn.style.border = '1px solid rgba(255,255,255,0.25)'
  laterBtn.style.background = 'transparent'
  laterBtn.style.color = '#ffffff'
  laterBtn.style.cursor = 'pointer'
  laterBtn.onclick = () => {
    root.style.display = 'none'
  }

  const updateBtn = document.createElement('button')
  updateBtn.type = 'button'
  updateBtn.textContent = '立即更新'
  updateBtn.style.flex = '1'
  updateBtn.style.height = '32px'
  updateBtn.style.borderRadius = '8px'
  updateBtn.style.border = 'none'
  updateBtn.style.background = '#2563eb'
  updateBtn.style.color = '#ffffff'
  updateBtn.style.cursor = 'pointer'
  updateBtn.onclick = () => ctx.applyUpdate()

  actions.appendChild(laterBtn)
  actions.appendChild(updateBtn)
  root.appendChild(title)
  root.appendChild(desc)
  root.appendChild(actions)

  document.body.appendChild(root)
}


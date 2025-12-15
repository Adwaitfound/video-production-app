"use client"

import { useEffect } from 'react'
import { debug } from '@/lib/debug'

function getElementSelector(el: Element | null): string {
  if (!el || !(el instanceof Element)) return ''
  const parts: string[] = []
  let node: Element | null = el
  let depth = 0
  while (node && depth < 5) {
    const name = node.tagName.toLowerCase()
    const id = node.id ? `#${node.id}` : ''
    const cls = node.className && typeof node.className === 'string' ? 
      '.' + node.className.trim().split(/\s+/).slice(0,3).join('.') : ''
    parts.unshift(`${name}${id}${cls}`)
    node = node.parentElement
    depth++
  }
  return parts.join(' > ')
}

export function GlobalClickTracker() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Ignore clicks inside debug console
      const ignore = target.closest('[data-debug-ignore="true"]')
      if (ignore) return

      const role = target.getAttribute('role') || undefined
      const typeAttr = (target as HTMLButtonElement).type || undefined
      const textContent = (target.innerText || target.textContent || '').trim().slice(0, 80)
      const dataset = { ...target.dataset }
      const selector = getElementSelector(target)

      debug.log('CLICK', 'Global click captured', {
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        selector,
        role,
        type: typeAttr,
        text: textContent,
        dataset: Object.keys(dataset).length ? dataset : undefined,
      })
    }

    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  return null
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  {
    label: 'Bayes',
    href: '/',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="2" y="11" width="4" height="7" rx="0.5" />
        <rect x="8" y="6" width="4" height="12" rx="0.5" />
        <rect x="14" y="3" width="4" height="15" rx="0.5" />
      </svg>
    ),
  },
  {
    label: 'Distribu­tions',
    href: '/distributions',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M2 17C2 17 4 17 6 15C8 13 8.5 4 10 4C11.5 4 12 13 14 15C16 17 18 17 18 17" />
      </svg>
    ),
  },
  {
    label: 'Inference',
    href: '/inference',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M3 10h14M13 6l4 4-4 4" />
      </svg>
    ),
  },
  {
    label: 'Simula­tion',
    href: '/simulation',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" stroke="none">
        <circle cx="5" cy="5" r="1.5" /><circle cx="10" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
        <circle cx="5" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="15" cy="10" r="1.5" />
        <circle cx="5" cy="15" r="1.5" /><circle cx="10" cy="15" r="1.5" /><circle cx="15" cy="15" r="1.5" />
      </svg>
    ),
  },
  {
    label: 'Real-World',
    href: '/applications',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="10" cy="10" r="7" />
        <path d="M3 10h14M10 3c-2.5 2.5-2.5 12 0 14M10 3c2.5 2.5 2.5 12 0 14" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function LeftSidebar() {
  const pathname = usePathname()

  return (
    <aside className="scene-sidebar">
      {ITEMS.map(item => {
        const active = item.href !== null && (
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        )
        const disabled = item.href === null

        if (disabled) {
          return (
            <div key={item.label} className="sidebar-item disabled">
              <div className="sidebar-icon">{item.icon}</div>
              <span className="sidebar-label">{item.label}</span>
            </div>
          )
        }

        return (
          <Link key={item.label} href={item.href} className={`sidebar-item ${active ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <div className="sidebar-icon">{item.icon}</div>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        )
      })}
      <div className="sidebar-spacer" />
      <div className="sidebar-quote">
        &ldquo;Better intuition leads to a clearer world.&rdquo;
      </div>
    </aside>
  )
}

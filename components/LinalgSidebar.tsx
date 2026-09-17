'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  {
    label: 'Transform',
    href: '/linalg',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="3" y="3" width="6" height="6" rx="0.5" />
        <path d="M12 5l3 2-3 2" />
        <path d="M11 13l4-2 1 4" />
      </svg>
    ),
  },
  {
    label: 'Basis',
    href: '/linalg/basis',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M3 17L10 3" />
        <path d="M3 17L18 12" />
        <circle cx="3" cy="17" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Determi­nant',
    href: '/linalg/determinant',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16L8 4L16 8L12 16Z" />
      </svg>
    ),
  },
  {
    label: 'Eigen­vectors',
    href: '/linalg/eigenvectors',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M3 17L17 3" />
        <path d="M14 3l3 0 0 3" />
        <circle cx="10" cy="10" r="4" strokeDasharray="2 2" opacity="0.5" />
      </svg>
    ),
  },
  {
    label: 'Projec­tions',
    href: '/linalg/projections',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M3 14L17 8" />
        <path d="M10 4L8 12" />
        <line x1="10" y1="4" x2="8" y2="12" strokeDasharray="2 2" opacity="0.4" />
        <path d="M8.5 11L7.5 10" strokeWidth="1" />
        <path d="M8.5 11L9.5 10" strokeWidth="1" />
      </svg>
    ),
  },
]

export default function LinalgSidebar() {
  const pathname = usePathname()

  return (
    <aside className="scene-sidebar">
      {ITEMS.map(item => {
        const active = item.href === '/linalg'
          ? pathname === '/linalg'
          : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href}
            className={`sidebar-item ${active ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}>
            <div className="sidebar-icon">{item.icon}</div>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        )
      })}
      <div className="sidebar-spacer" />
      <div className="sidebar-quote">&ldquo;Transform your intuition.&rdquo;</div>
    </aside>
  )
}

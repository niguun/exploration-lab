'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SUBJECTS = [
  { label: 'Probability', href: '/' },
  { label: 'Linear Algebra', href: '/linalg' },
  { label: 'Statistics', href: '#' },
  { label: 'More', href: '#' },
]

export default function PhaseNav() {
  const pathname = usePathname()

  const probRoutes = ['/', '/distributions', '/inference', '/simulation', '/applications']
  const isActive = (href: string) => {
    if (href === '/') return probRoutes.includes(pathname)
    return pathname.startsWith(href)
  }

  return (
    <header className="scene-header">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span className="header-logo">The Exploration Lab</span>
        <span className="header-tagline">Learn Deeper<br />Think Clearer</span>
      </div>
      <nav className="header-nav">
        {SUBJECTS.map(s => (
          s.href === '#' ? (
            <span key={s.label} className="header-nav-item">{s.label}</span>
          ) : (
            <Link key={s.label} href={s.href} className={`header-nav-item ${isActive(s.href) ? 'active' : ''}`}>
              {s.label}
            </Link>
          )
        ))}
      </nav>
    </header>
  )
}

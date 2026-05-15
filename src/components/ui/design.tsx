import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

export const colors = {
  green: '#1a5c42',
  greenDark: '#134433',
  greenSoft: '#e8f5ef',
  border: '#e3e7ee',
  borderWarm: '#e4e1d9',
  text: '#111827',
  muted: '#9ca3af',
  soft: '#f7f8fa',
}

export type AppIconName =
  | 'overview' | 'journal' | 'advisor' | 'goals' | 'profile' | 'admin'
  | 'mirror' | 'scale' | 'copy' | 'income' | 'saving' | 'expense' | 'warning' | 'check'
  | 'insight' | 'chart' | 'transactions' | 'edit' | 'trash' | 'settings' | 'users'
  | 'trendUp' | 'trendDown' | 'transfer' | 'zap'

export function AppIcon({ name, size = 16 }: { name: AppIconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'overview': return <svg {...common}><rect x="3" y="3" width="7" height="8" rx="1.8"/><rect x="14" y="3" width="7" height="5" rx="1.8"/><rect x="14" y="12" width="7" height="9" rx="1.8"/><rect x="3" y="15" width="7" height="6" rx="1.8"/></svg>
    case 'journal': return <svg {...common}><path d="M6 4.5h9.2A2.8 2.8 0 0 1 18 7.3v12.2H7.8A2.8 2.8 0 0 1 5 16.7V5.5a1 1 0 0 1 1-1Z"/><path d="M8.5 4.5v15"/><path d="M11 8h4"/><path d="M11 11h3"/></svg>
    case 'advisor': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.1 5-4.9 2 2.1-4.9 4.9-2.1Z"/><circle cx="12" cy="12" r="1"/></svg>
    case 'goals': return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>
    case 'profile': return <svg {...common}><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>
    case 'admin': return <svg {...common}><path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z"/><path d="M9.5 12.5 11.2 14 15 10"/></svg>
    case 'mirror': return <svg {...common}><rect x="7" y="3" width="10" height="14" rx="5"/><path d="M12 17v4"/><path d="M9 21h6"/></svg>
    case 'scale': return <svg {...common}><path d="M12 3v18"/><path d="M5 7h14"/><path d="m6 7-3 6h6L6 7Z"/><path d="m18 7-3 6h6l-3-6Z"/></svg>
    case 'copy': return <svg {...common}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>
    case 'income': return <svg {...common}><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/><path d="M5 19h14"/></svg>
    case 'saving': return <svg {...common}><path d="M4 10h16v9H4z"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/><path d="M12 14v2"/></svg>
    case 'expense': return <svg {...common}><path d="M12 5v14"/><path d="m18 13-6 6-6-6"/><path d="M5 5h14"/></svg>
    case 'warning': return <svg {...common}><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5"/><path d="M12 17h.01"/></svg>
    case 'check': return <svg {...common}><path d="M20 6 9 17l-5-5"/></svg>
    case 'insight': return <svg {...common}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8.5 14.5A6 6 0 1 1 15.5 14c-.9.7-1.5 1.7-1.5 3h-4c0-1.2-.5-1.9-1.5-2.5Z"/></svg>
    case 'chart': return <svg {...common}><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-7"/></svg>
    case 'transactions': return <svg {...common}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
    case 'edit': return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>
    case 'trash': return <svg {...common}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
    case 'settings': return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7V22H9.2v-.2a1.7 1.7 0 0 0-.8-1.6 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-3.6h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.6V2h5.6v.2a1.7 1.7 0 0 0 .8 1.6 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3.6H21a1.7 1.7 0 0 0-1.6 1.2Z"/></svg>
    case 'users': return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>
    case 'trendUp': return <svg {...common}><path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/></svg>
    case 'trendDown': return <svg {...common}><path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/></svg>
    case 'transfer': return <svg {...common}><path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/></svg>
    case 'zap': return <svg {...common}><path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z"/></svg>
  }
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="fink-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="fink-page-action">{action}</div>}
    </div>
  )
}

export function AppCard({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`fink-card ${className}`} style={style}>{children}</div>
}

export function AppButton({ children, onClick, href, variant = 'primary', style }: {
  children: ReactNode
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  style?: CSSProperties
}) {
  const className = `fink-btn fink-btn-${variant}`
  if (href) return <Link href={href} className={className} style={style}>{children}</Link>
  return <button onClick={onClick} className={className} style={style}>{children}</button>
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <AppCard className="fink-empty-state">
      <div className="fink-empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </AppCard>
  )
}

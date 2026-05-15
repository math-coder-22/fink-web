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

export function EmptyState({ icon, title, children, action }: { icon: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <AppCard className="fink-empty-state">
      <div className="fink-empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </AppCard>
  )
}

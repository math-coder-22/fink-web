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
  | 'trendUp' | 'trendDown' | 'transfer' | 'zap' | 'close'

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
    case 'close': return <svg {...common}><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
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

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium'

const toneStyles: Record<Tone, { bg: string; border: string; color: string; soft: string }> = {
  default: { bg: '#f7f8fa', border: colors.border, color: colors.text, soft: '#f3f4f6' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', soft: '#dcfce7' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', soft: '#fef3c7' },
  danger: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', soft: '#fee2e2' },
  info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', soft: '#dbeafe' },
  premium: { bg: colors.greenSoft, border: '#bbf7d0', color: colors.green, soft: '#dcfce7' },
}

export function SectionCard({
  children,
  title,
  subtitle,
  right,
  icon,
  className = '',
  style,
  bodyStyle,
}: {
  children: ReactNode
  title?: string
  subtitle?: string
  right?: ReactNode
  icon?: ReactNode
  className?: string
  style?: CSSProperties
  bodyStyle?: CSSProperties
}) {
  return (
    <AppCard className={className} style={{ overflow: 'hidden', ...style }}>
      {(title || subtitle || right) && (
        <SectionHeader title={title || ''} subtitle={subtitle} right={right} icon={icon} />
      )}
      <div style={{ padding: 16, ...bodyStyle }}>
        {children}
      </div>
    </AppCard>
  )
}

export function SectionHeader({
  title,
  subtitle,
  right,
  icon,
  style,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
  icon?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
        borderBottom: `1px solid ${colors.border}`,
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && (
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: colors.greenSoft,
                color: colors.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <div style={{ fontSize: 14, fontWeight: 900, color: colors.text, lineHeight: 1.25 }}>
            {title}
          </div>
        </div>
        {subtitle && (
          <div style={{ marginTop: 4, fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
            {subtitle}
          </div>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  note,
  tone = 'default',
  icon,
  style,
}: {
  label: string
  value: string | number
  note?: string
  tone?: Tone
  icon?: ReactNode
  style?: CSSProperties
}) {
  const t = toneStyles[tone]

  return (
    <div
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: '14px 15px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 10.5, fontWeight: 900, color: colors.muted, textTransform: 'uppercase', letterSpacing: '.7px' }}>
          {label}
        </div>
        {icon && <div style={{ color: t.color, display: 'flex', alignItems: 'center' }}>{icon}</div>}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 22,
          fontWeight: 950,
          color: t.color,
          fontFamily: 'var(--font-mono), monospace',
          letterSpacing: '-.6px',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {note && (
        <div style={{ marginTop: 8, color: '#6b7280', fontSize: 11.5, lineHeight: 1.45 }}>
          {note}
        </div>
      )}
    </div>
  )
}

export function StatusBadge({
  children,
  tone = 'default',
  size = 'sm',
  style,
}: {
  children: ReactNode
  tone?: Tone
  size?: 'xs' | 'sm' | 'md'
  style?: CSSProperties
}) {
  const t = toneStyles[tone]
  const padding = size === 'xs' ? '3px 7px' : size === 'md' ? '6px 11px' : '4px 9px'
  const fontSize = size === 'xs' ? 10 : size === 'md' ? 12 : 11

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${t.border}`,
        background: t.bg,
        color: t.color,
        borderRadius: 999,
        padding,
        fontSize,
        fontWeight: 900,
        lineHeight: 1,
        textTransform: 'uppercase',
        letterSpacing: '.35px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function PremiumBanner({
  title = 'Unlock FiNK Premium',
  subtitle = 'Buka fitur premium untuk analytics, forecasting, unlimited items, dan advisor penuh.',
  href = '/upgrade',
  actionLabel = 'Upgrade Premium',
  right,
  style,
}: {
  title?: string
  subtitle?: string
  href?: string
  actionLabel?: string
  right?: ReactNode
  style?: CSSProperties
}) {
  return (
    <AppCard
      style={{
        overflow: 'hidden',
        border: '1px solid rgba(16,185,129,.22)',
        background: 'linear-gradient(135deg,#0f172a 0%,#064e3b 100%)',
        ...style,
      }}
    >
      <div
        style={{
          padding: 22,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 240, flex: 1 }}>
          <StatusBadge tone="premium" style={{ background: 'rgba(16,185,129,.12)', borderColor: 'rgba(110,231,183,.25)', color: '#6ee7b7' }}>
            FiNK Premium
          </StatusBadge>
          <div style={{ marginTop: 11, fontSize: 28, fontWeight: 950, letterSpacing: '-.8px', lineHeight: 1.15 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ marginTop: 9, maxWidth: 760, color: 'rgba(255,255,255,.72)', fontSize: 12.5, lineHeight: 1.7 }}>
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {right}
          <AppButton href={href} style={{ background: '#10b981', color: '#052e16' }}>
            {actionLabel}
          </AppButton>
        </div>
      </div>
    </AppCard>
  )
}

export function PremiumLockCard({
  title = 'Fitur ini hanya untuk Premium',
  subtitle = 'Upgrade untuk membuka fitur lanjutan FiNK.',
  href = '/upgrade',
  actionLabel = 'Upgrade Premium',
  items,
  style,
}: {
  title?: string
  subtitle?: string
  href?: string
  actionLabel?: string
  items?: string[]
  style?: CSSProperties
}) {
  return (
    <AppCard
      style={{
        overflow: 'hidden',
        background: '#0f172a',
        border: '1px solid rgba(16,185,129,.18)',
        ...style,
      }}
    >
      <div style={{ padding: 22, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <StatusBadge tone="premium" style={{ background: 'rgba(16,185,129,.12)', borderColor: 'rgba(110,231,183,.25)', color: '#6ee7b7' }}>
              🔒 Premium
            </StatusBadge>
            <div style={{ marginTop: 12, fontSize: 26, lineHeight: 1.16, fontWeight: 950, letterSpacing: '-.8px' }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ marginTop: 9, maxWidth: 760, color: 'rgba(255,255,255,.70)', fontSize: 12.5, lineHeight: 1.7 }}>
                {subtitle}
              </div>
            )}
          </div>

          <AppButton href={href} style={{ background: '#10b981', color: '#052e16' }}>
            {actionLabel}
          </AppButton>
        </div>

        {items && items.length > 0 && (
          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
            {items.map((item) => (
              <div
                key={item}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 78,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,.055)',
                  border: '1px solid rgba(255,255,255,.07)',
                  padding: 14,
                }}
              >
                <div style={{ filter: 'blur(3px)', opacity: .65 }}>
                  <div style={{ height: 10, width: '70%', borderRadius: 999, background: 'rgba(255,255,255,.18)' }} />
                  <div style={{ marginTop: 10, height: 10, width: '42%', borderRadius: 999, background: 'rgba(255,255,255,.14)' }} />
                  <div style={{ marginTop: 12, height: 18, borderRadius: 10, background: 'rgba(255,255,255,.1)' }} />
                </div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 10 }}>
                  <div style={{ fontSize: 12.3, lineHeight: 1.4, fontWeight: 900, color: '#6ee7b7' }}>
                    {item}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppCard>
  )
}


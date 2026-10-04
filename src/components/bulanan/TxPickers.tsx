'use client'

import { useState, useMemo, useEffect } from 'react'
import { AppIcon } from '@/components/ui/design'

export const TYPE_LABELS: Record<string, string> = { out: 'Expense', inn: 'Income', save: 'Savings' }
export const TYPE_DOT: Record<string, string> = { out: '#991b1b', inn: '#1a5c42', save: '#1e40af' }

const lbl: React.CSSProperties = { display:'block', fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:'4px' }
const inp: React.CSSProperties = { fontFamily:'Inter, system-ui, sans-serif', fontSize:'13px', width:'100%', padding:'8px 10px', border:'1.5px solid #e3e7ee', borderRadius:'6px', background:'#f7f8fa', outline:'none', color:'#111827' }

function useEscapeToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
}

const chevron = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink:0 }}>
    <path d="M2 4l4 4 4-4" />
  </svg>
)

const popup: React.CSSProperties = { position:'absolute', left:0, right:0, top:'calc(100% + 6px)', zIndex:71, background:'#fff', border:'1px solid #e3e7ee', borderRadius:'10px', boxShadow:'0 12px 32px rgba(15,23,42,.12)', overflow:'hidden' }
const overlay: React.CSSProperties = { position:'fixed', inset:0, zIndex:70 }

export function TypePicker({ value, onPick, label = 'Type' }: {
  value: 'out' | 'inn' | 'save'
  onPick: (v: 'out' | 'inn' | 'save') => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  useEscapeToClose(open, () => setOpen(false))

  return (
    <div style={{ position:'relative', minWidth:0 }}>
      <span style={lbl}>{label}</span>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Pick type"
        aria-expanded={open}
        style={{ ...inp, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'6px' }}
      >
        <span style={{ display:'flex', alignItems:'center', gap:'8px', overflow:'hidden' }}>
          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:TYPE_DOT[value], flexShrink:0 }} />
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{TYPE_LABELS[value]}</span>
        </span>
        {chevron}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={overlay} />
          <div style={{ ...popup, padding:'4px' }}>
            {(['out','inn','save'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => { onPick(v); setOpen(false) }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:'9px', padding:'9px 10px', border:'none', borderRadius:'7px', background: v === value ? '#f0fdf4' : 'transparent', cursor:'pointer', fontFamily:'Inter, system-ui, sans-serif', fontSize:'13px', fontWeight: v === value ? 700 : 500, color:'#111827', textAlign:'left' }}
              >
                <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:TYPE_DOT[v], flexShrink:0 }} />
                <span style={{ flex:1 }}>{TYPE_LABELS[v]}</span>
                {v === value && <AppIcon name="check" size={14} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function CategoryPicker({ value, onPick, groups, label = 'Category' }: {
  value: string
  onPick: (v: string) => void
  groups: { group: string; items: string[] }[]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  useEscapeToClose(open, () => setOpen(false))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map(g => ({ group: g.group, items: g.items.filter(i => i.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0)
  }, [groups, search])

  return (
    <div style={{ position:'relative', minWidth:0 }}>
      <span style={lbl}>{label}</span>
      <button
        type="button"
        onClick={() => { setSearch(''); setOpen(v => !v) }}
        aria-label="Pick category"
        aria-expanded={open}
        style={{ ...inp, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'6px' }}
      >
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: value ? '#111827' : '#9ca3af' }}>
          {value || '— Select category —'}
        </span>
        {chevron}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={overlay} />
          <div style={popup}>
            <div style={{ padding:'8px', borderBottom:'1px solid #eef1f5' }}>
              <input
                autoFocus
                placeholder="Search category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #e3e7ee', borderRadius:'7px', outline:'none', background:'#f7f8fa', fontFamily:'Inter, system-ui, sans-serif', fontSize:'12.5px', color:'#111827' }}
              />
            </div>
            <div style={{ maxHeight:'230px', overflowY:'auto', padding:'4px' }}>
              {filtered.length === 0 && (
                <div style={{ padding:'14px', textAlign:'center', fontSize:'12.5px', color:'#9ca3af' }}>No categories found</div>
              )}
              {filtered.map(g => (
                <div key={g.group}>
                  <div style={{ padding:'7px 10px 3px', fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.6px' }}>{g.group}</div>
                  {g.items.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => { onPick(item); setOpen(false) }}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', border:'none', borderRadius:'7px', background: item === value ? '#f0fdf4' : 'transparent', cursor:'pointer', fontFamily:'Inter, system-ui, sans-serif', fontSize:'13px', fontWeight: item === value ? 700 : 500, color:'#111827', textAlign:'left' }}
                    >
                      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item}</span>
                      {item === value && <AppIcon name="check" size={14} />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

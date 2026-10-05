'use client'

/* Shared delete-confirmation dialog — one consistent look everywhere. */

interface Props {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const baseFont: React.CSSProperties = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px' }

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  return (
    <div
      onClick={onCancel}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(17,24,39,.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', animation:'finkFadeIn .15s ease' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        style={{ ...baseFont, background:'#fff', borderRadius:'14px', padding:'20px', width:'100%', maxWidth:'340px', boxShadow:'0 20px 50px rgba(0,0,0,.25)', animation:'finkPopIn .15s ease' }}
      >
        <div style={{ fontSize:'15px', fontWeight:800, color:'#111827', marginBottom:'8px' }}>{title}</div>
        <div style={{ fontSize:'12.5px', color:'#6b7280', lineHeight:1.5, marginBottom:'18px' }}>{message}</div>
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ ...baseFont, border:'1.5px solid #e3e7ee', background:'#fff', color:'#374151', fontWeight:700, borderRadius:'9px', padding:'8px 16px', cursor:'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ ...baseFont, border:'none', background:'#b91c1c', color:'#fff', fontWeight:700, borderRadius:'9px', padding:'8px 16px', cursor:'pointer' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes finkFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes finkPopIn { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  )
}

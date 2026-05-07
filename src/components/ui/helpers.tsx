// Format angka ke Rupiah
export const fmt = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
export const fmtNum = (n: number) => Math.round(n || 0).toLocaleString('id-ID')
export const pNum = (s: string | number): number => {
  if (typeof s === 'number') return s
  if (!s) return 0
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0
}

// Drag handle SVG
export const DRAG_HANDLE = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="4" cy="3" r=".7" fill="currentColor" stroke="none"/>
    <circle cx="8" cy="3" r=".7" fill="currentColor" stroke="none"/>
    <circle cx="4" cy="6" r=".7" fill="currentColor" stroke="none"/>
    <circle cx="8" cy="6" r=".7" fill="currentColor" stroke="none"/>
    <circle cx="4" cy="9" r=".7" fill="currentColor" stroke="none"/>
    <circle cx="8" cy="9" r=".7" fill="currentColor" stroke="none"/>
  </svg>
)

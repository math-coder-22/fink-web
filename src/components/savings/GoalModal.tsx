'use client'

import { useState, useEffect } from 'react'
import type { SavingsGoal, GoalType } from '@/types/savings'
import { futureValue } from '@/hooks/useSavings'

const inp: React.CSSProperties = {
  width:'100%', padding:'9px 12px', border:'1.5px solid #e4e1d9', borderRadius:'8px',
  fontSize:'14px', fontFamily:'inherit', outline:'none', background:'#f9fafb', color:'#111827',
}
const sel: React.CSSProperties = {
  ...inp,
  appearance:'none', WebkitAppearance:'none',
  backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
  backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', paddingRight:'28px', cursor:'pointer',
}
const lbl: React.CSSProperties = { fontSize:'11px', fontWeight:700, color:'#6b7280', display:'block', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.5px' }
const row: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }

type FormData = Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>

const defaultForm = (): FormData => ({
  name:'', type:'biasa', status:'active',
  target:0, current:0, monthly:0, deadline:'',
  useInvest:false, returnRate:8,
  expense:0, coverageTarget:6,
  eduCurrent:0, eduInflasi:8,
  pensionExp:0, pensionInflasi:5,
})

interface Props {
  goal:    SavingsGoal | null   // null = tambah baru
  onSave:  (data: FormData) => void
  onClose: () => void
}

export default function GoalModal({ goal, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormData>(defaultForm())

  useEffect(() => {
    if (goal) {
      const { id, createdAt, updatedAt, ...rest } = goal
      setForm({ ...defaultForm(), ...rest })
    } else {
      setForm(defaultForm())
    }
  }, [goal])

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function handleTypeChange(t: GoalType) {
    set('type', t)
    // Auto-hitung target untuk darurat
    if (t === 'darurat') {
      set('target', (form.expense || 0) * (form.coverageTarget || 6))
    }
  }

  function calcDaruratTarget(expense: number, months: number) {
    set('expense', expense)
    set('coverageTarget', months)
    set('target', expense * months)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    let finalForm = { ...form }

    // Auto-hitung target pendidikan dari inflasi
    if (form.type === 'pendidikan' && form.eduCurrent && form.deadline) {
      const years = Math.max(0, (new Date(form.deadline).getTime() - Date.now()) / (1000*60*60*24*365))
      finalForm.target = futureValue(form.eduCurrent, form.eduInflasi || 8, years)
    }
    // Auto-hitung target pensiun: 25x annual expense
    if (form.type === 'pensiun' && form.pensionExp && form.deadline) {
      const years = Math.max(0, (new Date(form.deadline).getTime() - Date.now()) / (1000*60*60*24*365))
      const futureAnnual = futureValue(form.pensionExp * 12, form.pensionInflasi || 5, years)
      finalForm.target = 25 * futureAnnual
    }

    onSave(finalForm)
  }

  const isEdit = !!goal

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'520px', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,.18)' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #e4e1d9', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
          <div style={{ fontSize:'16px', fontWeight:700 }}>{isEdit ? '✏ Edit Goal' : '+ Tambah Goal Baru'}</div>
          <button onClick={onClose} style={{ width:'28px', height:'28px', border:'none', background:'#f3f4f6', borderRadius:'6px', fontSize:'16px', cursor:'pointer', color:'#4b5563' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Nama */}
          <div>
            <label style={lbl}>Nama Goal</label>
            <input required style={inp} value={form.name} placeholder="Contoh: Dana Darurat Keluarga"
              onChange={e => set('name', e.target.value)} />
          </div>

          {/* Jenis + Status */}
          <div style={row}>
            <div>
              <label style={lbl}>Jenis Goal</label>
              <select style={sel} value={form.type} onChange={e => handleTypeChange(e.target.value as GoalType)}>
                <option value="biasa">💰 Tabungan Biasa</option>
                <option value="darurat">🛡️ Dana Darurat</option>
                <option value="pendidikan">🎓 Pendidikan Anak</option>
                <option value="pensiun">🌅 Dana Pensiun</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select style={sel} value={form.status} onChange={e => set('status', e.target.value as SavingsGoal['status'])}>
                <option value="active">Aktif</option>
                <option value="pending">Pending</option>
                <option value="complete">Selesai</option>
                <option value="archived">Arsip</option>
              </select>
            </div>
          </div>

          {/* Dana Darurat fields */}
          {form.type === 'darurat' && (
            <div style={{ background:'#f0fdf4', borderRadius:'10px', padding:'12px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'#15803d' }}>🛡️ Konfigurasi Dana Darurat</div>
              <div style={row}>
                <div>
                  <label style={lbl}>Pengeluaran/Bulan (Rp)</label>
                  <input style={inp} type="number" min="0" placeholder="5000000" value={form.expense || ''}
                    onChange={e => calcDaruratTarget(parseFloat(e.target.value)||0, form.coverageTarget||6)} />
                </div>
                <div>
                  <label style={lbl}>Target Coverage (Bulan)</label>
                  <input style={inp} type="number" min="1" max="24" value={form.coverageTarget||6}
                    onChange={e => calcDaruratTarget(form.expense||0, parseFloat(e.target.value)||6)} />
                </div>
              </div>
              <div style={{ fontSize:'12px', color:'#15803d' }}>
                Target otomatis: <strong>Rp {((form.expense||0)*(form.coverageTarget||6)).toLocaleString('id-ID')}</strong>
              </div>
            </div>
          )}

          {/* Pendidikan fields */}
          {form.type === 'pendidikan' && (
            <div style={{ background:'#fef9c3', borderRadius:'10px', padding:'12px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'#854d0e' }}>🎓 Konfigurasi Dana Pendidikan</div>
              <div style={row}>
                <div>
                  <label style={lbl}>Biaya Pendidikan Saat Ini (Rp)</label>
                  <input style={inp} type="number" min="0" placeholder="100000000" value={form.eduCurrent||''}
                    onChange={e => set('eduCurrent', parseFloat(e.target.value)||0)} />
                </div>
                <div>
                  <label style={lbl}>Inflasi Pendidikan (%/Thn)</label>
                  <input style={inp} type="number" min="0" max="30" value={form.eduInflasi||8}
                    onChange={e => set('eduInflasi', parseFloat(e.target.value)||8)} />
                </div>
              </div>
              <div style={{ fontSize:'12px', color:'#854d0e' }}>Target akan dihitung otomatis berdasarkan inflasi saat form disimpan.</div>
            </div>
          )}

          {/* Pensiun fields */}
          {form.type === 'pensiun' && (
            <div style={{ background:'#fff7ed', borderRadius:'10px', padding:'12px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'#9a3412' }}>🌅 Konfigurasi Dana Pensiun</div>
              <div style={row}>
                <div>
                  <label style={lbl}>Pengeluaran/Bulan Saat Ini (Rp)</label>
                  <input style={inp} type="number" min="0" placeholder="10000000" value={form.pensionExp||''}
                    onChange={e => set('pensionExp', parseFloat(e.target.value)||0)} />
                </div>
                <div>
                  <label style={lbl}>Inflasi (%/Tahun)</label>
                  <input style={inp} type="number" min="0" max="20" value={form.pensionInflasi||5}
                    onChange={e => set('pensionInflasi', parseFloat(e.target.value)||5)} />
                </div>
              </div>
              <div style={{ fontSize:'12px', color:'#9a3412' }}>Target = 25× pengeluaran tahunan proyeksi (25x Rule).</div>
            </div>
          )}

          {/* Target — biasa & override */}
          {(form.type === 'biasa' || form.type === 'darurat') && (
            <div>
              <label style={lbl}>Target Dana (Rp)</label>
              <input required style={inp} type="number" min="0" placeholder="50000000" value={form.target||''}
                onChange={e => set('target', parseFloat(e.target.value)||0)} />
            </div>
          )}

          {/* Dana terkumpul + tabungan/bln */}
          <div style={row}>
            <div>
              <label style={lbl}>Dana Terkumpul (Rp)</label>
              <input style={inp} type="number" min="0" value={form.current||''} placeholder="0"
                onChange={e => set('current', parseFloat(e.target.value)||0)} />
            </div>
            <div>
              <label style={lbl}>Tabungan/Bulan Aktual (Rp)</label>
              <input style={inp} type="number" min="0" value={form.monthly||''} placeholder="0"
                onChange={e => set('monthly', parseFloat(e.target.value)||0)} />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label style={lbl}>Target Tanggal Selesai</label>
            <input style={inp} type="date" value={form.deadline}
              onChange={e => set('deadline', e.target.value)} />
          </div>

          {/* Investasi toggle */}
          <div style={{ background:'#f7f8fa', borderRadius:'10px', padding:'12px' }}>
            <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', gap:'12px' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:600 }}>Gunakan Investasi</div>
                <div style={{ fontSize:'11.5px', color:'#9ca3af', marginTop:'1px' }}>Hitung dengan return investasi (formula anuitas)</div>
              </div>
              <input type="checkbox" checked={form.useInvest} onChange={e => set('useInvest', e.target.checked)}
                style={{ width:'16px', height:'16px', accentColor:'#1a5c42', flexShrink:0 }} />
            </label>
            {form.useInvest && (
              <div style={{ marginTop:'10px' }}>
                <label style={lbl}>Return Investasi (%/Tahun)</label>
                <input style={inp} type="number" min="0" max="50" value={form.returnRate}
                  onChange={e => set('returnRate', parseFloat(e.target.value)||0)} />
              </div>
            )}
          </div>

          <button type="submit"
            style={{ background:'#1a5c42', color:'#fff', border:'none', padding:'11px', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {isEdit ? 'Simpan Perubahan' : 'Tambah Goal'}
          </button>
        </form>
      </div>
    </div>
  )
}

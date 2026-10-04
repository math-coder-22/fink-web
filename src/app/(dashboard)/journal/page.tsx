'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useMonthContext, MONTH_NAMES, MONTHS_ORDER } from '@/components/layout/DashboardShell'
import { useBulanan } from '@/hooks/useBulanan'
import BudgetPanel   from '@/components/bulanan/BudgetPanel'
import IncomePanel   from '@/components/bulanan/IncomePanel'
import CatatanHarian from '@/components/bulanan/CatatanHarian'
import { RekonModal, TxDetailModal } from '@/components/bulanan/BulananModals'
import ReviewModal from '@/components/bulanan/ReviewModal'
import SetupBudgetModal from '@/components/bulanan/SetupBudgetModal'
import type { MonthKey } from '@/types/database'
import DebtPanel from '@/components/bulanan/DebtPanel'
import { AppIcon } from '@/components/ui/design'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

type MobileTab    = 'transactions' | 'budget' | 'income'
type DesktopPanel = 'budget' | 'income'

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID')
const pct = (actual: number, plan: number) => plan > 0 ? Math.round((actual / plan) * 100) : 0
const outcomeText = (n: number) => `${n >= 0 ? '+' : '-'} ${fmt(n)}`

/* ─── TX DETAIL MODAL (transaksi per item budget) ─────── */


/* ─── RECONCILIATION MODAL ─────────────────────────────────── */




/* ─── MAIN CONTENT ─────────────────────────────────────────── */
function BulananContent({ curMonth, curYear }: { curMonth: MonthKey; curYear: number }) {
  const {
    plan, updatePlan, tx, loading, refreshing, saving,
    addTx, updateTx, deleteTx,
    computedBudget, computedIncome, computedSaving, computedDebt,
    renameTxCat,
    copyBudgetToNext,
    rawSisa,
  } = useBulanan({ curMonth, curYear })

  const [desktopPanel, setDesktopPanel] = useState<DesktopPanel>('budget')
  const [mobileTab,    setMobileTab]    = useState<MobileTab>('transactions')
  const [isMobile,     setIsMobile]     = useState(false)
  const [rekonOpen,    setRekonOpen]    = useState(false)
  const [refleksiOpen, setRefleksiOpen] = useState(false)
  const [setupBudgetOpen, setSetupBudgetOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [txDetailLabel, setTxDetailLabel] = useState<string|null>(null)
  const [copyTarget, setCopyTarget] = useState<string|null>(null)
  const [copyToast, setCopyToast] = useState<string|null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  const budget         = useMemo(() => computedBudget(), [computedBudget])
  const incomeComputed = useMemo(() => computedIncome(), [computedIncome])
  const savingComputed = useMemo(() => computedSaving(), [computedSaving])
  const debtComputed   = useMemo(() => typeof computedDebt === 'function' ? computedDebt() : [], [computedDebt])
  const sisaApp        = rawSisa

  // Stable callbacks so memo() in panels actually skips renders when data is unchanged.
  const handleBudgetChange = useCallback((b: any[]) => updatePlan(prev=>({...prev,budget:b})), [updatePlan])
  const handleSavingChange = useCallback((s: any[]) => updatePlan(prev=>({...prev,saving:s})), [updatePlan])
  const handleDebtChange   = useCallback((d: any[]) => updatePlan(prev=>({...prev,debt:d})), [updatePlan])
  const handleIncomeChange = useCallback((inc: any[]) => updatePlan(prev=>({...prev,income:inc})), [updatePlan])

  async function handleRekon(aktual: number, selisih: number, type: 'out'|'inn') {
    const now = new Date()
    const day = String(now.getDate()).padStart(2,'0')
    await addTx({
      date: day, type,
      cat:  'Rekonsiliasi',
      note: `Balance reconciliation — actual: ${fmt(aktual)}, difference: ${selisih>0?'+':''}${fmt(selisih)}`,
      amt:  Math.abs(selisih),
      debt: false, settled: false,
    })
  }

  const phSub = (() => {
    const now      = new Date()
    const nowMonth = MONTHS_ORDER[now.getMonth()]
    const nowYear  = now.getFullYear()
    if (curYear === nowYear && curMonth === nowMonth) {
      const last = new Date(nowYear, now.getMonth()+1, 0).getDate()
      return `Day ${now.getDate()} of ${last} · ${Math.max(1, last - now.getDate() + 1)} days remaining · FiNK System`
    }
    const selDate = new Date(curYear, MONTHS_ORDER.indexOf(curMonth), 1)
    const nowDate = new Date(nowYear, now.getMonth(), 1)
    return selDate < nowDate
      ? 'This month has passed · FiNK System'
      : 'This month has not started yet · FiNK System'
  })()

  const nextMonthLabel = (() => {
    const idx   = MONTHS_ORDER.indexOf(curMonth)
    const nextM = MONTHS_ORDER[(idx + 1) % 12]
    const nextY = idx === 11 ? curYear + 1 : curYear
    return `${MONTH_NAMES[nextM]} ${nextY}`
  })()

  function handleCopyBudget() {
    setCopyTarget(nextMonthLabel)
  }

  async function confirmCopyBudget() {
    const label = copyTarget
    setCopyTarget(null)
    if (!label) return
    await copyBudgetToNext()
    setCopyToast(`Budget copied to ${label}!`)
    window.setTimeout(() => setCopyToast(null), 3200)
  }



  const card: React.CSSProperties      = { background:'#fff', border:'1px solid #e3e7ee', borderRadius:'16px', boxShadow:'0 2px 12px rgba(15,23,42,.05)', marginBottom:'14px', overflow:'hidden' }
  const cardHead: React.CSSProperties  = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid #e3e7ee', gap:'12px', background:'#fff' }
  const cardTitle: React.CSSProperties = { fontSize:'14px', fontWeight:900, color:'#111827', letterSpacing:'-.2px' }
  const cardSub: React.CSSProperties   = { fontSize:'11.5px', color:'#9ca3af', marginTop:'3px', lineHeight:1.45 }
  const colLabels: React.CSSProperties = { display:'flex', alignItems:'center', padding:'8px 16px', gap:'6px', background:'#f7f8fa', borderBottom:'1px solid #e3e7ee', fontSize:'10px', fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.65px' }
  const actionBtn: React.CSSProperties = { display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px', border:'1.5px solid #e3e7ee', borderRadius:'10px', background:'#fff', fontSize:'12px', fontWeight:800, color:'#4b5563', cursor:'pointer', boxShadow:'0 1px 2px rgba(15,23,42,.04)' }

  const MOBILE_TABS: { key: MobileTab; label: string }[] = [
    { key:'transactions', label:'Transactions' },
    { key:'budget',       label:'Expense' },
    { key:'income',       label:'Income' },
  ]

  const activePanel = isMobile ? mobileTab : desktopPanel

  const journalSummary = useMemo(() => {
    const incomeActual = incomeComputed.reduce((s:any, c:any) => s + (c.items || []).reduce((ss:any, i:any) => ss + Number(i.actual || 0), 0), 0)
    const incomePlan = incomeComputed.reduce((s:any, c:any) => s + (c.items || []).reduce((ss:any, i:any) => ss + Number(i.plan || 0), 0), 0)
    const expenseOnlyActual = budget.reduce((s:any, c:any) => s + (c.items || []).reduce((ss:any, i:any) => ss + Number(i.actual || 0), 0), 0)
    const expenseOnlyPlan = budget.reduce((s:any, c:any) => s + (c.items || []).reduce((ss:any, i:any) => ss + Number(i.plan || 0), 0), 0)
    const debtActual = debtComputed.reduce((s:any, i:any) => s + Number(i.actual || 0), 0)
    const debtPlan = debtComputed.reduce((s:any, i:any) => s + Number(i.plan || 0), 0)
    const expenseActual = expenseOnlyActual + debtActual
    const expensePlan = expenseOnlyPlan + debtPlan
    const savingActual = savingComputed.reduce((s:any, i:any) => s + Number(i.actual || 0), 0)
    const savingPlan = savingComputed.reduce((s:any, i:any) => s + Number(i.plan || 0), 0)
    const outcome = incomeActual - expenseActual - savingActual
    return { incomeActual, incomePlan, expenseActual, expensePlan, savingActual, savingPlan, outcome }
  }, [incomeComputed, budget, debtComputed, savingComputed])

  const outcomeTone = journalSummary.outcome >= 0 ? '#4f2fe6' : '#b91c1c'
  const remainingDays = (() => {
    const now = new Date()
    const nowMonth = MONTHS_ORDER[now.getMonth()]
    const nowYear = now.getFullYear()
    if (curYear === nowYear && curMonth === nowMonth) {
      const last = new Date(nowYear, now.getMonth()+1, 0).getDate()
      return Math.max(1, last - now.getDate() + 1)
    }
    const selectedMonthIndex = MONTHS_ORDER.indexOf(curMonth)
    return new Date(curYear, selectedMonthIndex + 1, 0).getDate()
  })()
  const dailyRecommendation = Math.floor(Math.max(0, journalSummary.outcome) / remainingDays)
  const outcomeMessage =
    journalSummary.outcome > 0
      ? `≈ ${fmt(dailyRecommendation)} / day`
      : journalSummary.outcome < 0
        ? `Deficit ${fmt(Math.abs(journalSummary.outcome))}`
        : "This month's budget is fully used"
  const outcomeSubMessage = ''

  const SummaryMetric = ({ label, value, actual, plan, color }: { label:string; value:number; actual:number; plan:number; color:string }) => {
    const percentage = pct(actual, plan)
    if (isMobile) {
      return (
        <div style={{ minWidth:0, display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'none' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:9.5, fontWeight:950, color, textTransform:'uppercase', letterSpacing:'.55px' }}>{label}</div>
            <div style={{ marginTop:3, fontSize:9.5, color:'#64748b', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{percentage}% · plan {fmt(plan)}</div>
          </div>
          <div style={{ fontSize:13.5, fontWeight:950, color, fontFamily:'var(--font-mono), monospace', letterSpacing:'-.45px', whiteSpace:'nowrap' }}>{fmt(value)}</div>
        </div>
      )
    }
    return (
      <div style={{ minWidth:0, borderLeft:'none', padding:'0' }}>
        <div style={{ fontSize:9.5, fontWeight:950, color, textTransform:'uppercase', letterSpacing:'.55px' }}>{label}</div>
        <div style={{ marginTop:6, fontSize:15, fontWeight:950, color, fontFamily:'var(--font-mono), monospace', letterSpacing:'-.5px', overflowWrap:'anywhere' }}>{fmt(value)}</div>
        <div style={{ marginTop:7, height:5, borderRadius:999, background:'#e5e7eb', overflow:'hidden' }}>
          <div style={{ width:`${Math.min(100, Math.max(0, percentage))}%`, height:'100%', borderRadius:999, background:color }} />
        </div>
        <div style={{ marginTop:7, fontSize:9.5, color:'#64748b', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{percentage}% · plan {fmt(plan)}</div>
      </div>
    )
  }

  const MoreActionsMenu = (
    <div style={{ position:'relative' }}>
      <button onClick={()=>setToolsOpen(v=>!v)} aria-label="More actions" style={{
        width:isMobile ? 31 : 36,
        height:isMobile ? 31 : 36,
        border:'none',
        borderRadius:10,
        background:'transparent',
        color:'#334155',
        fontSize:22,
        lineHeight:1,
        fontWeight:900,
        cursor:'pointer',
        boxShadow:'none',
      }}>⋮</button>

      {toolsOpen && (
        <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', zIndex:60, minWidth:'172px', background:'#fff', border:'1px solid #e3e7ee', borderRadius:'12px', boxShadow:'0 14px 36px rgba(15,23,42,.16)', padding:'6px' }}>
          <button onClick={()=>{ setSetupBudgetOpen(true); setToolsOpen(false) }} style={{ width:'100%', border:'none', background:'#fff', borderRadius:'9px', padding:'9px 10px', textAlign:'left', fontSize:'12px', fontWeight:500, color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
            Setup Budget
          </button>
          <button onClick={()=>{ setRekonOpen(true); setToolsOpen(false) }} style={{ width:'100%', border:'none', background:'#fff', borderRadius:'9px', padding:'9px 10px', textAlign:'left', fontSize:'12px', fontWeight:500, color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
            Reconcile
          </button>
          <button onClick={()=>{ handleCopyBudget(); setToolsOpen(false) }} style={{ width:'100%', border:'none', background:'#fff', borderRadius:'9px', padding:'9px 10px', textAlign:'left', fontSize:'12px', fontWeight:500, color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
            Copy Budget to Next Month
          </button>
        </div>
      )}
    </div>
  )

  const ReviewButton = (
    <button onClick={()=>setRefleksiOpen(true)} style={{
      display:'inline-flex',
      alignItems:'center',
      justifyContent:'center',
      padding:isMobile ? '6px 10px' : '7px 12px',
      border:'1px solid #8ab39f',
      borderRadius:9,
      background:'#fff',
      color:'#1a5c42',
      fontSize:isMobile ? 11 : 12,
      fontWeight:600,
      cursor:'pointer',
      boxShadow:'none',
    }}>
      Review
    </button>
  )

  const JournalOutcomeHero = (
    <div style={{
      position:'relative',
      border:'1px solid #e3e7ee',
      borderRadius:18,
      background:'linear-gradient(135deg,#ffffff 0%,#fbfaff 48%,#ffffff 100%)',
      boxShadow:'0 10px 28px rgba(15,23,42,.07)',
      padding:isMobile ? '14px 16px 12px' : '16px 18px',
      marginBottom:14,
      overflow:'hidden',
    }}>
      <div style={{ position:'absolute', right:-70, top:-70, width:170, height:170, borderRadius:999, background:'rgba(79,47,230,.06)' }} />

      <div style={{
        position:'relative',
        display:'grid',
        gridTemplateColumns:isMobile ? '1fr' : 'minmax(340px, .78fr) minmax(0, 2.05fr)',
        gap:isMobile ? 10 : 20,
        alignItems:'center',
      }}>
        <div style={{
          minWidth:0,
          display:'grid',
          gridTemplateColumns:isMobile ? 'auto minmax(0, 1fr) auto' : 'auto minmax(0, 1fr)',
          gap:isMobile ? 12 : 16,
          alignItems:'center',
          paddingRight:isMobile ? 0 : 20,
          borderRight:isMobile ? 'none' : '1px solid #e5e7eb',
        }}>
          <div style={{
            width:isMobile ? 38 : 52,
            height:isMobile ? 38 : 52,
            borderRadius:isMobile ? 14 : 16,
            background:'linear-gradient(135deg, rgba(79,47,230,.13), rgba(79,47,230,.06))',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            color:'#4f2fe6',
            flexShrink:0,
          }}>
            <AppIcon name="clipboard" size={isMobile ? 17 : 24} />
          </div>

          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:isMobile ? 10 : 12, fontWeight:950, color:'#4f2fe6', textTransform:'uppercase', letterSpacing:'.65px' }}>
              Outcome
            </div>
            <div style={{ marginTop:7, fontSize:isMobile ? 20 : 22, fontWeight:950, color:outcomeTone, letterSpacing:'-.9px', fontFamily:'var(--font-mono), monospace', lineHeight:1.05, whiteSpace:isMobile ? 'normal' : 'nowrap' }}>
              {outcomeText(journalSummary.outcome)}
            </div>
            <div style={{ marginTop:8, fontSize:isMobile ? 11.5 : 12.5, lineHeight:1.45, fontWeight:700, color: journalSummary.outcome < 0 ? '#dc2626' : '#374151' }}>
              {outcomeMessage}
            </div>
          </div>

          {isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:6, alignSelf:'start', paddingTop:2 }}>
              {ReviewButton}
              {MoreActionsMenu}
            </div>
          )}
        </div>

        <div style={{
          display:'grid',
          gridTemplateColumns:isMobile ? '1fr' : 'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)',
          gap:isMobile ? 4 : 14,
          alignItems:'center',
          paddingTop:isMobile ? 10 : 0,
          borderTop:isMobile ? '1px solid #e5e7eb' : 'none',
        }}>
          <SummaryMetric label="Income" value={journalSummary.incomeActual} actual={journalSummary.incomeActual} plan={journalSummary.incomePlan} color="#15803d" />
          {!isMobile && <div style={{ color:'#111827', opacity:.75, fontSize:20, fontWeight:900, textAlign:'center' }}>-</div>}
          <SummaryMetric label="Expenses/Debt" value={journalSummary.expenseActual} actual={journalSummary.expenseActual} plan={journalSummary.expensePlan} color="#dc2626" />
          {!isMobile && <div style={{ color:'#111827', opacity:.75, fontSize:20, fontWeight:900, textAlign:'center' }}>-</div>}
          <SummaryMetric label="Savings" value={journalSummary.savingActual} actual={journalSummary.savingActual} plan={journalSummary.savingPlan} color="#2563eb" />
        </div>
      </div>
    </div>
  )

  const CatatanCard = (
    <div style={card}>
      <div style={cardHead}>
        <div>
          <div style={cardTitle}>Daily Transactions</div>
          <div style={cardSub}>Expenses are automatically reflected in budget actuals</div>
        </div>
        <span style={{ fontSize:'9.5px', fontWeight:600, background:'#f7f8fa', color:'#4b5563', border:'1px solid #e3e7ee', padding:'2px 8px', borderRadius:'20px' }}>
          {tx.length} record{tx.length !== 1 ? 's' : ''}
        </span>
      </div>
      <CatatanHarian tx={tx} budget={budget} income={plan.income} saving={savingComputed} debt={debtComputed}
        curMonth={curMonth} curYear={curYear}
        onAdd={addTx} onUpdate={updateTx} onDelete={deleteTx} />
    </div>
  )

  const RightCard = (
    <div style={card}>
      <div style={cardHead}>
        <div>
          <div style={cardTitle}>{activePanel==='budget' ? 'Expense' : 'Income'}</div>
          <div style={cardSub}>{activePanel==='budget' ? 'Actuals are calculated automatically from daily transactions' : 'Monthly income sources'}</div>
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:'3px', background:'#f7f8fa', border:'1px solid #e3e7ee', borderRadius:'10px', padding:'3px' }}>
            {(['budget','income'] as DesktopPanel[]).map(p => (
              <button key={p} onClick={()=>setDesktopPanel(p)} style={{ fontSize:'11.5px', fontWeight:600, background:desktopPanel===p?'#fff':'none', color:desktopPanel===p?'#111827':'#9ca3af', border:'none', padding:'6px 14px', borderRadius:'8px', cursor:'pointer', boxShadow:desktopPanel===p?'0 1px 3px rgba(0,0,0,.07)':'none' }}>
                {p==='budget' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={colLabels}>
        <div style={{ width:'14px' }}/>
        <div style={{ flex:1 }}>{activePanel==='budget' ? 'Category / Item' : 'Income Source'}</div>
        {isMobile ? (
          <div style={{ textAlign:'right', whiteSpace:'nowrap' }}>PLAN / ACTUAL</div>
        ) : (
          <>
            <div style={{ width:'100px', flexShrink:0, textAlign:'right', whiteSpace:'nowrap' }}>{activePanel==='budget' ? 'Budget' : 'Target'}</div>
            <div style={{ width:'100px', flexShrink:0, textAlign:'right', whiteSpace:'nowrap' }}>Actual</div>
          </>
        )}
        <div style={{ width:'18px' }}/>
      </div>
      <div style={{ padding:'14px 16px' }}>
        {activePanel==='budget' ? (
          <>
            <BudgetPanel
              budget={budget} saving={savingComputed} debt={debtComputed}
              onBudgetChange={handleBudgetChange}
              onSavingChange={handleSavingChange}
              onRename={renameTxCat}
              onItemClick={setTxDetailLabel}
              isMobile={isMobile}
            />
            <DebtPanel
              debt={debtComputed}
              onDebtChange={handleDebtChange}
              onRename={renameTxCat}
              isMobile={isMobile}
            />
          </>
        ) : (
          <IncomePanel
            income={incomeComputed}
            onIncomeChange={handleIncomeChange}
            onRename={renameTxCat}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="fink-journal-page">
      {/* HEADER */}
      <div style={{ display:isMobile ? 'none' : 'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'14px', flexWrap:'wrap' }}>
        <div>
          {!isMobile && (
            <>
              <h1 style={{ fontSize: isMobile?'17px':'19px', fontWeight:700, letterSpacing:'-.3px' }}>
                {MONTH_NAMES[curMonth]} {curYear}
              </h1>
              <p style={{ fontSize:'12px', color:'#9ca3af', marginTop:'3px' }}>{phSub}</p>
            </>
          )}
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
          {loading && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Loading...</span>}
          {!loading && refreshing && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Syncing...</span>}
          {saving && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Saving...</span>}
          {!isMobile && (
            <>
              {ReviewButton}
              {MoreActionsMenu}
            </>
          )}
        </div>
      </div>

      {isMobile && (loading || refreshing || saving) && (
        <div style={{
          position:'fixed',
          top:10,
          right:12,
          zIndex:80,
          display:'flex',
          alignItems:'center',
          gap:6,
          padding:'6px 9px',
          borderRadius:999,
          background:'rgba(255,255,255,.92)',
          border:'1px solid rgba(226,232,240,.9)',
          boxShadow:'0 8px 20px rgba(15,23,42,.12)',
          backdropFilter:'blur(10px)',
          WebkitBackdropFilter:'blur(10px)',
          fontSize:10.5,
          fontWeight:700,
          color:'#64748b',
        }}>
          <span style={{
            width:7,
            height:7,
            borderRadius:999,
            background:saving ? '#2563eb' : refreshing ? '#f59e0b' : '#94a3b8',
            display:'inline-block',
          }} />
          {saving ? 'Saving' : refreshing ? 'Syncing' : 'Loading'}
        </div>
      )}

      {JournalOutcomeHero}


      {/* MOBILE: 3-tab */}
      {isMobile ? (
        <>
          <div
            style={{
              position:'sticky',
              top:'0px',
              zIndex:30,
              display:'flex',
              background:'rgba(255,255,255,0.92)',
              backdropFilter:'blur(12px)',
              WebkitBackdropFilter:'blur(12px)',
              border:'1px solid rgba(227,231,238,0.9)',
              borderRadius:'16px',
              padding:'6px 12px',
              marginBottom:'16px',
              boxShadow:'0 8px 24px rgba(15,23,42,.10)',
            }}
          >
            {MOBILE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={()=>setMobileTab(tab.key)}
                style={{
                  flex:1,
                  padding:'10px 6px',
                  border:'none',
                  borderRadius:'12px',
                  background:mobileTab===tab.key?'#1a5c42':'transparent',
                  color:mobileTab===tab.key?'#fff':'#6b7280',
                  fontSize:'12px',
                  fontWeight:700,
                  cursor:'pointer',
                  transition:'all .18s ease',
                  boxShadow:mobileTab===tab.key?'0 2px 8px rgba(26,92,66,.22)':'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {mobileTab==='transactions' && CatatanCard}
          {(mobileTab==='budget' || mobileTab==='income') && RightCard}
        </>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.1fr', gap:'14px', alignItems:'start' }}>
          {CatatanCard}
          {RightCard}
        </div>
      )}

      <ReviewModal
        open={refleksiOpen}
        onClose={() => setRefleksiOpen(false)}
        budget={budget}
        income={incomeComputed}
        saving={savingComputed}
        debt={debtComputed}
        tx={tx}
        rawSisa={sisaApp}
        monthLabel={`${MONTH_NAMES[curMonth]} ${curYear}`}
        isMobile={isMobile}
      />

      <SetupBudgetModal
        open={setupBudgetOpen}
        onClose={() => setSetupBudgetOpen(false)}
        curMonth={curMonth}
        curYear={curYear}
        currentPlan={plan}
        isMobile={isMobile}
        onApply={(nextPlan) => updatePlan(() => nextPlan)}
      />

      {/* TX DETAIL MODAL */}
      {txDetailLabel && (
        <TxDetailModal label={txDetailLabel} tx={tx} onClose={()=>setTxDetailLabel(null)} />
      )}

      {/* RECONCILIATION MODAL */}
      {rekonOpen && (
        <RekonModal sisaApp={sisaApp} onClose={()=>setRekonOpen(false)} onSave={handleRekon} />
      )}

      {/* COPY BUDGET CONFIRMATION */}
      {copyTarget && (
        <ConfirmDialog
          title={`Copy budget to ${copyTarget}?`}
          message={<>The existing budget in <strong style={{ color:'#111827' }}>{copyTarget}</strong> will be overwritten with this month's budget.</>}
          confirmLabel="Copy Budget"
          onConfirm={confirmCopyBudget}
          onCancel={()=>setCopyTarget(null)}
        />
      )}

      {/* COPY BUDGET SUCCESS TOAST */}
      {copyToast && (
        <div style={{ position:'fixed', left:'50%', bottom:'max(24px, env(safe-area-inset-bottom))', transform:'translateX(-50%)', zIndex:1200, background:'#1a5c42', color:'#fff', fontSize:'13px', fontWeight:700, padding:'10px 16px', borderRadius:'12px', boxShadow:'0 12px 32px rgba(15,23,42,.25)', display:'flex', alignItems:'center', gap:'8px', whiteSpace:'nowrap' }}>
          <AppIcon name="check" size={15} />
          {copyToast}
        </div>
      )}

      <style>{`
        .fink-journal-page {
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
          padding-bottom: max(18px, env(safe-area-inset-bottom));
        }

        @media (max-width: 768px) {
          .fink-journal-page {
            padding-bottom: calc(72px + env(safe-area-inset-bottom));
          }
          .fink-journal-page input,
          .fink-journal-page select,
          .fink-journal-page button {
            max-width: 100%;
          }
        }

        @media (max-width: 560px) {
          .fink-journal-page > div:first-child {
            gap: 10px !important;
          }
          .fink-journal-page > div:first-child > div:first-child {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export default function BulananPage() {
  const { curMonth, curYear } = useMonthContext()
  return <BulananContent key={`${curMonth}-${curYear}`} curMonth={curMonth} curYear={curYear} />
}
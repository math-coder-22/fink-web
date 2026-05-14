import { AppButton, AppCard, EmptyState, PageHeader } from '@/components/ui/design'

export default function PortofolioPage() {
  return (
    <div>
      <PageHeader
        title="Investment Portfolio"
        subtitle="Mutual Funds · Stocks · Gold · Bonds"
        action={<AppButton variant="secondary">+ Tambah Aset</AppButton>}
      />

      <AppCard style={{ marginBottom: 14 }}>
        <div style={{ padding:'16px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'12px' }}>
          <div>
            <div style={{ fontSize:'10px', fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px' }}>Total Aset</div>
            <div style={{ fontSize:'22px', fontWeight:850, fontFamily:'var(--font-mono), monospace', color:'#1a5c42', marginTop:4 }}>Rp 0</div>
          </div>
          <div>
            <div style={{ fontSize:'10px', fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px' }}>Return</div>
            <div style={{ fontSize:'22px', fontWeight:850, fontFamily:'var(--font-mono), monospace', color:'#111827', marginTop:4 }}>0%</div>
          </div>
          <div>
            <div style={{ fontSize:'10px', fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px' }}>Status</div>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#4b5563', marginTop:8 }}>Belum ada data portofolio</div>
          </div>
        </div>
      </AppCard>

      <EmptyState icon="📈" title="Portfolio Coming Soon">
        Halaman portofolio sedang disiapkan dengan gaya visual yang sama seperti Dashboard dan Smart Saving.
      </EmptyState>
    </div>
  )
}

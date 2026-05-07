import { AppCard, EmptyState, PageHeader } from '@/components/ui/design'

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your account, preferences, and FiNK workspace"
      />

      <AppCard style={{ marginBottom: 14 }}>
        <div style={{ padding:'16px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:'12px' }}>
          {[
            ['Profile', 'Kelola identitas dan email akun.'],
            ['Currency', 'Format mata uang dan preferensi angka.'],
            ['Security', 'Pengaturan login dan keamanan data.'],
          ].map(([title, desc]) => (
            <div key={title} style={{ padding:'14px', border:'1px solid #e3e7ee', borderRadius:'10px', background:'#f7f8fa' }}>
              <div style={{ fontSize:'13px', fontWeight:800, color:'#111827' }}>{title}</div>
              <div style={{ fontSize:'12px', color:'#6b7280', marginTop:4, lineHeight:1.45 }}>{desc}</div>
            </div>
          ))}
        </div>
      </AppCard>

      <EmptyState icon="⚙️" title="Settings Coming Soon">
        Struktur halaman sudah diseragamkan. Fitur detail pengaturan dapat ditambahkan bertahap.
      </EmptyState>
    </div>
  )
}

import {
  AppButton,
  MetricCard,
  PageHeader,
  PremiumBanner,
  SectionCard,
  StatusBadge,
} from '@/components/ui/design'

const plans = [
  {
    name: 'Free',
    price: 'Rp0',
    desc: 'Untuk mulai mencatat dan memahami kondisi keuangan.',
    badge: 'Basic',
    tone: 'default' as const,
    featured: false,
    button: 'Paket Saat Ini',
    items: [
      '7 expense items',
      '1 income source',
      '1 saving item',
      '1 debt item',
      'Financial Health',
      "Today's Insight dasar",
    ],
  },
  {
    name: 'Premium 3 Bulan',
    price: 'Rp45.000',
    desc: 'Pilihan ringan untuk membuka fitur premium FiNK.',
    badge: 'Coba Premium',
    tone: 'premium' as const,
    featured: false,
    button: 'Pilih 3 Bulan',
    items: [
      'Unlimited budget',
      'Unlimited income sources',
      'Unlimited goals',
      'Full Advisor',
      'Forecasting & analytics',
    ],
  },
  {
    name: 'Premium Tahunan',
    price: 'Rp149.000',
    desc: 'Paket paling hemat untuk kebiasaan finansial jangka panjang.',
    badge: 'Best Value',
    tone: 'success' as const,
    featured: true,
    button: 'Pilih Tahunan',
    items: [
      'Semua fitur Premium',
      'Hemat dibanding 3 bulanan',
      'Unlimited history',
      'Advanced Advisor',
      'Goal prediction',
    ],
  },
]

const rows = [
  ['Expense items', '7 item', 'Unlimited'],
  ['Income sources', '1 sumber', 'Unlimited'],
  ['Saving item', '1 item', 'Unlimited'],
  ['Debt item', '1 item', 'Unlimited'],
  ['Smart Goals', '2 aktif', 'Unlimited'],
  ['Advisor', "Financial Health + Today's Insight", 'Full Advisor'],
  ['Forecasting', 'Tidak tersedia', 'Tersedia'],
  ['Analytics', 'Basic', 'Advanced'],
]

export default function UpgradePage() {
  return (
    <div>
      <PageHeader
        title="Upgrade FiNK"
        subtitle="Pilih paket Premium yang paling sesuai"
      />

      <PremiumBanner
        title="Buka Financial Advisor Pribadi"
        subtitle="Upgrade untuk membuka unlimited budget, unlimited income, unlimited goals, forecasting, analytics, dan rekomendasi premium agar FiNK tidak hanya mencatat uang, tetapi membantu membaca arah keuanganmu."
        href="/settings"
        actionLabel="Kembali ke Profile"
        style={{ marginBottom: 18 }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(245px,1fr))',
          gap: 16,
          marginBottom: 18,
        }}
      >
        {plans.map((plan) => (
          <SectionCard
            key={plan.name}
            style={{
              overflow: 'hidden',
              border: plan.featured
                ? '1px solid rgba(16,185,129,.45)'
                : '1px solid #e3e7ee',
              background: plan.featured ? '#10b981' : '#fff',
            }}
            bodyStyle={{
              padding: 22,
              color: plan.featured ? '#052e16' : '#111827',
            }}
          >
            <StatusBadge
              tone={plan.tone}
              style={
                plan.featured
                  ? {
                      background: '#052e16',
                      color: '#6ee7b7',
                      borderColor: '#052e16',
                    }
                  : undefined
              }
            >
              {plan.badge}
            </StatusBadge>

            <h2 style={{ margin: '14px 0 0', fontSize: 24, fontWeight: 900 }}>
              {plan.name}
            </h2>

            <p
              style={{
                margin: '8px 0 0',
                minHeight: 42,
                color: plan.featured ? 'rgba(5,46,22,.78)' : '#6b7280',
                fontSize: 12.5,
                lineHeight: 1.55,
              }}
            >
              {plan.desc}
            </p>

            <div
              style={{
                marginTop: 20,
                fontSize: 38,
                fontWeight: 900,
                letterSpacing: '-.04em',
              }}
            >
              {plan.price}
            </div>

            <button
              style={{
                width: '100%',
                marginTop: 18,
                border: 0,
                borderRadius: 14,
                padding: '12px 14px',
                background: plan.featured ? '#052e16' : '#10b981',
                color: '#fff',
                fontWeight: 900,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {plan.button}
            </button>

            <div style={{ marginTop: 18, display: 'grid', gap: 9 }}>
              {plan.items.map((item) => (
                <div key={item} style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  ✓ {item}
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        title="Perbandingan fitur"
        subtitle="Free untuk tracking dasar. Premium untuk planning dan intelligence."
        style={{ marginBottom: 18 }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e3e7ee' }}>
                  Fitur
                </th>
                <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e3e7ee' }}>
                  Free
                </th>
                <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 12, color: '#047857', borderBottom: '1px solid #e3e7ee' }}>
                  Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([feature, free, premium]) => (
                <tr key={feature}>
                  <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 800, color: '#111827', borderBottom: '1px solid #eef2f7' }}>
                    {feature}
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: 13, color: '#6b7280', borderBottom: '1px solid #eef2f7' }}>
                    {free}
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 800, color: '#047857', borderBottom: '1px solid #eef2f7' }}>
                    {premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Ringkasan paket"
        subtitle="Pilih tahunan untuk value terbaik."
        bodyStyle={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
          gap: 12,
        }}
      >
        <MetricCard
          label="Premium 3 Bulan"
          value="Rp45.000"
          note="Cocok untuk mencoba fitur premium"
          tone="premium"
        />
        <MetricCard
          label="Premium Tahunan"
          value="Rp149.000"
          note="Paket paling hemat"
          tone="success"
        />
        <MetricCard
          label="Hemat Tahunan"
          value="Rp31.000"
          note="Dibanding 4x paket 3 bulan"
          tone="info"
        />
      </SectionCard>

      <div style={{ marginTop: 18 }}>
        <AppButton href="/settings" variant="ghost">
          ← Kembali ke Profile
        </AppButton>
      </div>
    </div>
  )
}

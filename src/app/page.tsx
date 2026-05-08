import Link from 'next/link'

const rupiah = (value: string) => value

export default function LandingPage() {
  const features = [
    {
      title: 'Monthly Budget',
      desc: 'Atur pemasukan, pengeluaran, dan sisa dana bulanan dalam satu halaman yang rapi.',
      icon: '📒',
    },
    {
      title: 'Smart Saving',
      desc: 'Pantau target dana darurat, pendidikan, pensiun, dan tujuan keluarga lainnya.',
      icon: '🏦',
    },
    {
      title: 'Financial Insight',
      desc: 'Dapatkan ringkasan kondisi keuangan keluarga agar keputusan lebih terarah.',
      icon: '💡',
    },
  ]

  const steps = [
    'Catat pemasukan dan pengeluaran',
    'Tentukan budget dan target tabungan',
    'Pantau progres keluarga setiap bulan',
  ]

  return (
    <main style={{
      minHeight: '100dvh',
      background: 'linear-gradient(145deg, #f4f7f4 0%, #eef4ef 45%, #ffffff 100%)',
      color: '#111827',
      overflowX: 'hidden',
    }}>
      {/* NAVBAR */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backdropFilter: 'blur(14px)',
        background: 'rgba(255,255,255,.78)',
        borderBottom: '1px solid rgba(226,232,240,.9)',
      }}>
        <div style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              fontFamily: 'serif',
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-.6px',
              color: '#111827',
            }}>
              Fi<span style={{ color: '#1a5c42' }}>NK</span>
            </div>
            <div style={{
              width: '1px',
              height: '24px',
              background: '#d7ded8',
            }} />
            <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: 600 }}>
              Smart Family Finance
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href="/login" style={{
              textDecoration: 'none',
              color: '#1a5c42',
              fontWeight: 700,
              fontSize: '14px',
              padding: '10px 14px',
              borderRadius: '12px',
            }}>
              Masuk
            </Link>
            <Link href="/login?mode=register" style={{
              textDecoration: 'none',
              color: 'white',
              background: '#1a5c42',
              fontWeight: 800,
              fontSize: '14px',
              padding: '10px 16px',
              borderRadius: '12px',
              boxShadow: '0 10px 24px rgba(26,92,66,.22)',
            }}>
              Daftar
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '54px 20px 34px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(320px, .95fr)',
        gap: '34px',
        alignItems: 'center',
      }} className="landing-hero">
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '999px',
            background: '#ecfdf5',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '13px',
            fontWeight: 800,
            marginBottom: '18px',
          }}>
            ✨ Aplikasi keuangan keluarga modern
          </div>

          <h1 style={{
            margin: 0,
            fontSize: 'clamp(38px, 5vw, 64px)',
            lineHeight: 1.02,
            letterSpacing: '-2.2px',
            fontWeight: 900,
            color: '#0f172a',
          }}>
            Kelola keuangan keluarga dengan lebih tenang.
          </h1>

          <p style={{
            margin: '20px 0 0',
            fontSize: '18px',
            lineHeight: 1.75,
            color: '#64748b',
            maxWidth: '620px',
          }}>
            FiNK membantu keluarga mencatat transaksi bulanan, menyusun budget,
            memantau target tabungan, dan memahami kondisi keuangan melalui ringkasan yang mudah dibaca.
          </p>

          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '28px',
          }}>
            <Link href="/login?mode=register" style={{
              textDecoration: 'none',
              background: '#1a5c42',
              color: '#fff',
              fontWeight: 900,
              padding: '14px 20px',
              borderRadius: '14px',
              boxShadow: '0 16px 34px rgba(26,92,66,.25)',
            }}>
              Mulai Gratis
            </Link>
            <Link href="/login" style={{
              textDecoration: 'none',
              background: '#fff',
              color: '#1f2937',
              fontWeight: 800,
              padding: '14px 20px',
              borderRadius: '14px',
              border: '1px solid #e3e7ee',
              boxShadow: '0 10px 24px rgba(15,23,42,.06)',
            }}>
              Masuk ke Akun
            </Link>
          </div>

          <div style={{
            display: 'flex',
            gap: '18px',
            flexWrap: 'wrap',
            marginTop: '28px',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 650,
          }}>
            <span>✅ Budget bulanan</span>
            <span>✅ Smart Saving</span>
            <span>✅ SaaS ready</span>
          </div>
        </div>

        {/* MOCK CARD */}
        <div style={{
          background: '#fff',
          border: '1px solid #e3e7ee',
          borderRadius: '28px',
          padding: '18px',
          boxShadow: '0 30px 80px rgba(15,23,42,.12)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a5c42, #357447)',
            borderRadius: '22px',
            padding: '24px',
            color: '#fff',
            marginBottom: '14px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: 'flex-start',
              marginBottom: '26px',
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, opacity: .78, letterSpacing: '.8px' }}>
                  LEFT TO SPEND
                </div>
                <div style={{
                  marginTop: '8px',
                  fontSize: '34px',
                  fontWeight: 900,
                  letterSpacing: '-1px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}>
                  {rupiah('Rp 4.096.111')}
                </div>
                <div style={{ marginTop: '6px', opacity: .82, fontSize: '14px' }}>
                  Sisa dana yang masih tersedia
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,.16)',
                border: '1px solid rgba(255,255,255,.18)',
                borderRadius: '16px',
                padding: '10px 12px',
                fontWeight: 800,
              }}>
                Mei 2026
              </div>
            </div>

            <div style={{
              height: '8px',
              background: 'rgba(255,255,255,.22)',
              borderRadius: '99px',
              overflow: 'hidden',
            }}>
              <div style={{ width: '62%', height: '100%', background: '#fff', borderRadius: '99px' }} />
            </div>
            <div style={{
              marginTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              opacity: .85,
            }}>
              <span>Progress pemasukan</span>
              <strong>62%</strong>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }} className="landing-mini-grid">
            {[
              ['INCOME', 'Rp 6.992.200', '#15803d', '#f0fdf4'],
              ['EXPENSE', 'Rp 2.896.089', '#b91c1c', '#fff7f7'],
              ['SAVING', 'Rp 0', '#1d4ed8', '#eff6ff'],
              ['SMART SAVING', '3 goals', '#1a5c42', '#f0fdf4'],
            ].map(([label, value, color, bg]) => (
              <div key={label} style={{
                border: '1px solid #e3e7ee',
                borderRadius: '18px',
                padding: '16px',
                background: bg,
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: '#6b7280',
                  letterSpacing: '.8px',
                }}>
                  {label}
                </div>
                <div style={{
                  marginTop: '8px',
                  color,
                  fontWeight: 900,
                  fontSize: '20px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '18px 20px 60px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '16px',
        }} className="landing-feature-grid">
          {features.map((feature) => (
            <div key={feature.title} style={{
              background: '#fff',
              border: '1px solid #e3e7ee',
              borderRadius: '22px',
              padding: '22px',
              boxShadow: '0 16px 40px rgba(15,23,42,.06)',
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '15px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                marginBottom: '16px',
              }}>
                {feature.icon}
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>{feature.title}</h3>
              <p style={{ margin: '10px 0 0', color: '#64748b', lineHeight: 1.65, fontSize: '14.5px' }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '16px',
          background: '#fff',
          border: '1px solid #e3e7ee',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 16px 40px rgba(15,23,42,.06)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, .9fr) minmax(0, 1.1fr)',
          gap: '24px',
          alignItems: 'center',
        }} className="landing-steps">
          <div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 900, letterSpacing: '-.7px' }}>
              Dari catatan harian menjadi keputusan keluarga.
            </h2>
            <p style={{ margin: '10px 0 0', color: '#64748b', lineHeight: 1.7 }}>
              FiNK dirancang agar rutinitas mencatat keuangan terasa ringan, tetapi tetap menghasilkan informasi yang berguna.
            </p>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {steps.map((step, idx) => (
              <div key={step} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1px solid #eef2f7',
                fontWeight: 750,
                color: '#334155',
              }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '999px',
                  background: '#1a5c42',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 900,
                }}>
                  {idx + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 860px) {
          .landing-hero {
            grid-template-columns: 1fr !important;
            padding-top: 34px !important;
          }
          .landing-feature-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-steps {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
          nav span {
            display: none;
          }
          .landing-mini-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  )
}

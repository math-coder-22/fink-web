import Image from 'next/image'
import Link from 'next/link'
import { AppIcon, type AppIconName } from '@/components/ui/design'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  return (
    <main style={{
      minHeight: '100dvh',
      background: 'linear-gradient(145deg, #f4f7f4 0%, #eef4ef 48%, #ffffff 100%)',
      color: '#111827',
      overflowX: 'hidden',
    }}>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(255,255,255,.82)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid #e3e7ee',
      }}>
        <div style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '15px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              fontFamily: 'serif',
              fontSize: '29px',
              fontWeight: 900,
              letterSpacing: '-.8px',
            }}>
              Fi<span style={{ color: '#1a5c42' }}>NK</span>
            </div>
            <div style={{ width: 1, height: 25, background: '#d7ded8' }} />
            <div className="landing-nav-subtitle" style={{
              color: '#64748b',
              fontSize: '14px',
              fontWeight: 700,
            }}>
              Smart Family Finance
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href="/login" style={{
              textDecoration: 'none',
              color: '#1a5c42',
              fontSize: '14px',
              fontWeight: 800,
              padding: '10px 14px',
              borderRadius: '12px',
            }}>
              Masuk
            </Link>
            <Link href="/login?mode=register" style={{
              textDecoration: 'none',
              color: '#fff',
              background: '#1a5c42',
              fontSize: '14px',
              fontWeight: 900,
              padding: '10px 16px',
              borderRadius: '12px',
              boxShadow: '0 12px 28px rgba(26,92,66,.24)',
            }}>
              Daftar Gratis
            </Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero" style={{
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '58px 20px 34px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, .92fr) minmax(360px, 1.08fr)',
        gap: '38px',
        alignItems: 'center',
      }}>
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
            fontWeight: 900,
            marginBottom: '18px',
          }}>
            <AppIcon name="insight" size={15} /> Personal finance app untuk keluarga
          </div>

          <h1 style={{
            margin: 0,
            fontSize: 'clamp(38px, 5.2vw, 66px)',
            lineHeight: 1.02,
            letterSpacing: '-2.2px',
            fontWeight: 950,
            color: '#0f172a',
          }}>
            Kelola keuangan keluarga dengan lebih tenang.
          </h1>

          <p style={{
            margin: '20px 0 0',
            color: '#64748b',
            fontSize: '18px',
            lineHeight: 1.75,
            maxWidth: '620px',
          }}>
            FiNK membantu Anda mencatat transaksi bulanan, menyusun budget,
            memantau Goals, dan melihat ringkasan keuangan keluarga secara jelas.
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
              Mulai Sekarang
            </Link>
            <Link href="/login" style={{
              textDecoration: 'none',
              background: '#fff',
              color: '#1f2937',
              fontWeight: 850,
              padding: '14px 20px',
              borderRadius: '14px',
              border: '1px solid #e3e7ee',
              boxShadow: '0 10px 24px rgba(15,23,42,.06)',
            }}>
              Masuk ke Akun
            </Link>
          </div>

          <div className="landing-benefits" style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            marginTop: '28px',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 750,
          }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><AppIcon name="journal" size={14} />Journal</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><AppIcon name="goals" size={14} />Goals</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><AppIcon name="insight" size={14} />Financial Insight</span>
          </div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e3e7ee',
          borderRadius: '28px',
          padding: '12px',
          boxShadow: '0 30px 80px rgba(15,23,42,.13)',
        }}>
          <div style={{
            borderRadius: '22px',
            overflow: 'hidden',
            border: '1px solid #e7ebf0',
            background: '#f8fafc',
          }}>
            <Image
              src="/landing-dashboard.png"
              alt="Dashboard FiNK Smart Family Finance"
              width={1180}
              height={720}
              priority
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
        </div>
      </section>

      <section style={{
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '16px 20px 64px',
      }}>
        <div className="landing-feature-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '16px',
        }}>
          {[
            ['journal', 'Journal', 'Atur rencana pemasukan dan pengeluaran setiap bulan dengan ringkas.'],
            ['goals', 'Goals', 'Buat target tabungan seperti dana darurat, pendidikan, dan pensiun.'],
            ['insight', 'Insight Keluarga', 'Lihat sisa dana, spending rate, dan kondisi keuangan secara cepat.'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{
              background: '#fff',
              border: '1px solid #e3e7ee',
              borderRadius: '22px',
              padding: '22px',
              boxShadow: '0 16px 40px rgba(15,23,42,.06)',
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                background: '#f0fdf4',
                color: '#1a5c42',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                marginBottom: 16,
              }}>
                <AppIcon name={icon as AppIconName} size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{title}</h3>
              <p style={{ margin: '10px 0 0', color: '#64748b', lineHeight: 1.65, fontSize: 14.5 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .landing-hero {
            grid-template-columns: 1fr !important;
            padding-top: 36px !important;
          }
          .landing-feature-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 540px) {
          .landing-nav-subtitle {
            display: none !important;
          }
          .landing-benefits {
            flex-direction: column !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </main>
  )
}

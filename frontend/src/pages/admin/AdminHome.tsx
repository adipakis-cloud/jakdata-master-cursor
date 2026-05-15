import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { officialProfile } from '../../config/officialProfile';
import { api } from '../../lib/api';

type TerritorialOverview = {
  populasi?: { totalWarga?: number; totalKeluarga?: number };
  territorial?: { rt?: number; rw?: number };
  laporan?: { total?: number };
  warmindo?: { aktifOutlets?: number };
};

export default function AdminHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TerritorialOverview | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    api
      .get<TerritorialOverview>('/dashboard/territorial-overview')
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  return (
    <div
      className="-m-4 lg:-m-6"
      style={{
        minHeight: 'calc(100vh - 3.5rem)',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
        padding: '0',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          padding: '32px 24px 24px',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ flexShrink: 0 }}>
            {!imgError ? (
              <img
                src={officialProfile.photo}
                alt={officialProfile.name}
                onError={() => setImgError(true)}
                style={{
                  width: '110px',
                  height: '140px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  border: '3px solid #f59e0b',
                  boxShadow: '0 4px 20px rgba(30, 58, 138, 0.45)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '110px',
                  height: '140px',
                  borderRadius: '12px',
                  border: '3px solid #f59e0b',
                  background: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: '#f59e0b',
                }}
              >
                SP
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'inline-block',
                background: '#f59e0b',
                color: '#1e3a8a',
                padding: '3px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              {officialProfile.title}
            </div>

            <h1
              style={{
                fontSize: '20px',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 12px',
                lineHeight: 1.3,
              }}
            >
              {officialProfile.name}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {[
                { label: officialProfile.party, gold: true },
                { label: officialProfile.commission },
                { label: officialProfile.dapil },
                { label: officialProfile.period },
              ].map((tag) => (
                <span
                  key={tag.label}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: tag.gold ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                    color: tag.gold ? '#1e3a8a' : 'white',
                    border: tag.gold ? 'none' : '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {tag.label}
                </span>
              ))}
            </div>

            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              📍 {officialProfile.wilayah}
            </p>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#f59e0b',
              margin: '0 0 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Fokus Komisi VIII DPR RI
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {officialProfile.focus.map((f) => (
              <span
                key={f}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#1e3a8a',
                  fontWeight: '600',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%)',
          padding: '20px 24px',
        }}
      >
        <h2
          style={{
            fontSize: '13px',
            fontWeight: '700',
            color: '#f59e0b',
            margin: '0 0 14px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Statistik Wilayah Dapil 3
        </h2>

        {stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Total Warga', value: stats.populasi?.totalWarga?.toLocaleString('id-ID'), icon: '👥' },
              { label: 'Total Keluarga', value: stats.populasi?.totalKeluarga?.toLocaleString('id-ID'), icon: '👨‍👩‍👧' },
              { label: 'Total RT', value: stats.territorial?.rt?.toLocaleString('id-ID'), icon: '📍' },
              { label: 'Total RW', value: stats.territorial?.rw?.toLocaleString('id-ID'), icon: '🏘️' },
              { label: 'Total Laporan', value: stats.laporan?.total?.toLocaleString('id-ID'), icon: '📋' },
              { label: 'Warmindo Aktif', value: stats.warmindo?.aktifOutlets?.toLocaleString('id-ID'), icon: '🍜' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'white' }}>{item.value ?? '—'}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Memuat statistik...</div>
        )}
      </div>

      <div
        style={{
          background: '#1e3a8a',
          padding: '20px 24px 32px',
        }}
      >
        <h2
          style={{
            fontSize: '13px',
            fontWeight: '700',
            color: '#f59e0b',
            margin: '0 0 14px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Menu Utama
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { icon: '📊', label: 'Command Center', path: '/admin/dashboard' },
            { icon: '📋', label: 'Laporan Masuk', path: '/admin/laporan' },
            { icon: '🎁', label: 'Bantuan Sosial', path: '/admin/bantuan' },
            { icon: '🍜', label: 'Warmindo', path: '/admin/warmindo' },
            { icon: '👥', label: 'Data Warga', path: '/admin/warga' },
            { icon: '🗺️', label: 'Wilayah', path: '/admin/wilayah' },
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '14px 10px',
                color: 'white',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: '600' }}>{item.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


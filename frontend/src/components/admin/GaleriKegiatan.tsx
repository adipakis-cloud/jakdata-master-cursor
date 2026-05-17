import { PAN } from './berandaTheme';

type KegiatanItem = {
  id: number;
  judul: string;
  tanggal: string;
  lokasi: string;
  kategori: string;
  deskripsi: string;
  tags: string[];
};

const kegiatanData: KegiatanItem[] = [
  {
    id: 1,
    judul: 'Reses Masa Sidang I 2026',
    tanggal: '15 Januari 2026',
    lokasi: 'Jakarta Barat',
    kategori: 'Reses',
    deskripsi:
      'Kegiatan reses bersama warga Dapil 3 DKI Jakarta membahas aspirasi dan kebutuhan masyarakat',
    tags: ['Reses', 'Aspirasi Warga', 'Jakarta Barat'],
  },
  {
    id: 2,
    judul: 'Sosialisasi Program Bantuan Sosial',
    tanggal: '10 Februari 2026',
    lokasi: 'Jakarta Utara',
    kategori: 'Sosialisasi',
    deskripsi: 'Sosialisasi program bantuan sosial Komisi VIII DPR RI kepada warga kurang mampu',
    tags: ['Bansos', 'Komisi VIII', 'Jakarta Utara'],
  },
  {
    id: 3,
    judul: 'Kunjungan Kerja Komisi VIII DPR RI',
    tanggal: '5 Maret 2026',
    lokasi: 'Kepulauan Seribu',
    kategori: 'Kunjungan Kerja',
    deskripsi:
      'Kunjungan kerja Komisi VIII DPR RI ke Kepulauan Seribu dalam rangka pengawasan program sosial',
    tags: ['Kunker', 'Komisi VIII', 'Kepulauan Seribu'],
  },
];

function KegiatanCard({ item }: { item: KegiatanItem }) {
  return (
    <article
      className="kegiatan-card"
      style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          height: 180,
          background: PAN.blue,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: PAN.white,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            background: 'rgba(255,255,255,0.2)',
            border: `1px solid ${PAN.white}`,
          }}
        >
          {item.kategori}
        </span>
        <span style={{ fontSize: 32, marginBottom: 8 }} aria-hidden>
          📸
        </span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{item.kategori}</span>
      </div>

      <div style={{ padding: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#666' }}>📅 {item.tanggal}</p>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#666' }}>📍 {item.lokasi}</p>
        <h3 style={{ margin: '8px 0', fontSize: 15, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.35 }}>
          {item.judul}
        </h3>
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 13,
            color: '#555',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.deskripsi}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {item.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 6,
                background: PAN.blueBg,
                color: PAN.blue,
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export function GaleriKegiatan() {
  return (
    <section style={{ margin: '0 24px 24px' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '16px 24px',
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: PAN.white,
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          Dokumentasi Kegiatan & Reses
        </h2>
        <button
          type="button"
          onClick={() => alert('Fitur segera hadir')}
          style={{
            background: PAN.white,
            color: PAN.blue,
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + Tambah Kegiatan
        </button>
      </div>

      <div className="galeri-kegiatan-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {kegiatanData.map((item) => (
          <KegiatanCard key={item.id} item={item} />
        ))}
      </div>

      <style>{`
        .kegiatan-card:hover {
          box-shadow: 0 8px 24px rgba(0, 71, 171, 0.3);
          transform: translateY(-2px);
        }
        @media (max-width: 1024px) {
          .galeri-kegiatan-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .galeri-kegiatan-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

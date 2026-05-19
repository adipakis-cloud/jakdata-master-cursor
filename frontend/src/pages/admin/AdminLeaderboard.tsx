import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

type SkorKomponen = {
  dataWarga: number;
  kualitasLaporan: number;
  konsistensiAktif: number;
  validasiData: number;
  kelengkapanData: number;
  kecepatanInput: number;
  bonusKhusus: number;
  penalti: number;
};

type LeaderRow = {
  rank: number;
  id: number;
  nama: string;
  email: string;
  role: string;
  wilayah: string;
  kinerjaSkor: number;
  kinerjaBintang: number;
  kinerjaLevel: string;
  totalWargaInput: number;
  totalLaporanInput: number;
  lastActivityAt: string | null;
  komponen: SkorKomponen;
  rekomendasi: string[];
};

type WilayahRow = {
  kecamatan: string;
  avgSkor: number;
  totalKoordinator: number;
  nonaktif: number;
  top: number;
};

const LEVEL_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  top: { label: '🏆 TOP', bg: '#fef3c7', color: '#92400e' },
  bintang: { label: '⭐ BINTANG', bg: '#dbeafe', color: '#1e40af' },
  aktif: { label: '✅ AKTIF', bg: '#dcfce7', color: '#166534' },
  baru: { label: '🆕 BARU', bg: '#f3f4f6', color: '#374151' },
  nonaktif: { label: '⚠️ NON-AKTIF', bg: '#fee2e2', color: '#991b1b' },
};

function skorColor(skor: number) {
  if (skor >= 75) return '#16a34a';
  if (skor >= 50) return '#ca8a04';
  return '#dc2626';
}

function KomponenBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  return (
    <div className="text-xs">
      <div className="flex justify-between text-gray-600 mb-0.5">
        <span>{label}</span>
        <span className="font-mono">
          {value}
          {max > 0 ? `/${max}` : ''}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: value < 0 ? '#dc2626' : '#2563eb',
          }}
        />
      </div>
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const b = LEVEL_BADGE[level] ?? LEVEL_BADGE.baru;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ background: b.bg, color: b.color }}
    >
      {b.label}
    </span>
  );
}

export function AdminLeaderboard() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [wilayah, setWilayah] = useState<WilayahRow[]>([]);
  const [kecamatanList, setKecamatanList] = useState<{ id: number; nama: string }[]>([]);
  const [stats, setStats] = useState({
    totalKoordinator: 0,
    avgSkor: 0,
    distribution: { top: 0, bintang: 0, aktif: 0, baru: 0, nonaktif: 0 },
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [kecamatanId, setKecamatanId] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (kecamatanId) params.kecamatanId = kecamatanId;
      if (level) params.level = level;
      if (search.trim()) params.search = search.trim();

      const [lb, ws, kc] = await Promise.all([
        api.get('/koordinator/scoring/leaderboard', { params }),
        api.get('/koordinator/scoring/wilayah-summary'),
        api.get('/wilayah/kecamatan'),
      ]);

      setRows(lb.data.data ?? []);
      setStats(lb.data.stats ?? stats);
      setTotalPages(lb.data.pagination?.totalPages ?? 1);
      setWilayah(ws.data.data ?? []);
      setKecamatanList(kc.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, kecamatanId, level, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRecalculate() {
    if (!window.confirm('Hitung ulang skor semua koordinator? Proses bisa memakan waktu.')) return;
    setRecalcLoading(true);
    try {
      await api.post('/koordinator/scoring/recalculate', {});
      await load();
    } catch (e) {
      console.error(e);
      alert('Gagal menghitung ulang skor');
    } finally {
      setRecalcLoading(false);
    }
  }

  const dist = stats.distribution;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📊 Kinerja Koordinator Lapangan</h1>
          <p className="text-sm text-gray-500 mt-1">Berbasis data aktual — diperbarui otomatis</p>
        </div>
        <button
          type="button"
          className="btn-primary shrink-0"
          disabled={recalcLoading}
          onClick={handleRecalculate}
        >
          {recalcLoading ? 'Menghitung…' : '🔄 Hitung Ulang Skor'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Total Koordinator', stats.totalKoordinator, '📋'],
          ['Rata-rata Skor', stats.avgSkor, '📈'],
          ['Top Performers', dist.top, '🏆'],
          ['Aktif', dist.aktif + dist.bintang, '✅'],
          ['Non-aktif', dist.nonaktif, '⚠️'],
        ].map(([label, val, icon]) => (
          <div key={String(label)} className="rounded-xl bg-white p-4 border border-gray-100 shadow-sm">
            <span className="text-lg">{icon}</span>
            <p className="text-xs text-gray-500 mt-2">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{val}</p>
          </div>
        ))}
      </div>

      {wilayah.length > 0 && (
        <div className="rounded-xl bg-white p-4 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Ringkasan per Kecamatan</h2>
          <div className="space-y-2">
            {wilayah.map((w) => (
              <div key={w.kecamatan} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 text-gray-700 truncate" title={w.kecamatan}>
                  {w.kecamatan}
                </span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${w.avgSkor}%`,
                      background: skorColor(w.avgSkor),
                    }}
                  />
                </div>
                <span className="w-10 text-right font-mono font-semibold" style={{ color: skorColor(w.avgSkor) }}>
                  {w.avgSkor}
                </span>
                <span className="w-20 text-right text-gray-500 text-xs">{w.totalKoordinator} kord.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Kecamatan</span>
          <select
            className="input"
            value={kecamatanId}
            onChange={(e) => {
              setKecamatanId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Kecamatan</option>
            {kecamatanList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Level</span>
          <select
            className="input"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Level</option>
            <option value="top">top</option>
            <option value="bintang">bintang</option>
            <option value="aktif">aktif</option>
            <option value="baru">baru</option>
            <option value="nonaktif">nonaktif</option>
          </select>
        </label>
        <label className="text-sm flex-1 min-w-[200px]">
          <span className="block text-gray-500 mb-1">Cari nama</span>
          <input
            className="input w-full"
            placeholder="Nama koordinator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
          />
        </label>
        <button type="button" className="btn-secondary" onClick={() => (setPage(1), load())}>
          Terapkan
        </button>
      </div>

      <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Memuat leaderboard…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">Wilayah</th>
                  <th className="p-3">Level</th>
                  <th className="p-3 min-w-[120px]">Skor</th>
                  <th className="p-3">Warga</th>
                  <th className="p-3">Laporan</th>
                  <th className="p-3">Last Aktif</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    >
                      <td className="p-3 font-bold text-gray-800">#{r.rank}</td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{r.nama}</div>
                        <div className="text-xs text-gray-500">{r.email}</div>
                      </td>
                      <td className="p-3 text-gray-600 max-w-[180px] truncate">{r.wilayah}</td>
                      <td className="p-3">
                        <LevelBadge level={r.kinerjaLevel} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${r.kinerjaSkor}%`, background: skorColor(r.kinerjaSkor) }}
                            />
                          </div>
                          <span className="font-bold w-8" style={{ color: skorColor(r.kinerjaSkor) }}>
                            {r.kinerjaSkor}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">{r.totalWargaInput}</td>
                      <td className="p-3">{r.totalLaporanInput}</td>
                      <td className="p-3 text-xs text-gray-500">
                        {r.lastActivityAt
                          ? new Date(r.lastActivityAt).toLocaleDateString('id-ID')
                          : '—'}
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={`${r.id}-detail`} className="bg-blue-50/50">
                        <td colSpan={8} className="p-4">
                          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
                            <KomponenBar label="Data Warga" value={r.komponen.dataWarga} max={20} />
                            <KomponenBar label="Kualitas Laporan" value={r.komponen.kualitasLaporan} max={15} />
                            <KomponenBar label="Konsistensi" value={r.komponen.konsistensiAktif} max={15} />
                            <KomponenBar label="Validasi Data" value={r.komponen.validasiData} max={20} />
                            <KomponenBar label="Kelengkapan" value={r.komponen.kelengkapanData} max={10} />
                            <KomponenBar label="Kecepatan" value={r.komponen.kecepatanInput} max={10} />
                            <KomponenBar label="Bonus" value={r.komponen.bonusKhusus} max={10} />
                            <KomponenBar label="Penalti" value={r.komponen.penalti} max={50} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between p-3 border-t border-gray-100">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Sebelumnya
          </button>
          <span className="text-sm text-gray-500">
            Halaman {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya →
          </button>
        </div>
      </div>
    </div>
  );
}

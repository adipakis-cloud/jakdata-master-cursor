import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

function formatRp(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

const LAPORAN_STATUS_COLORS: Record<string, string> = {
  baru: '#6b7280',
  diproses: '#2563eb',
  selesai: '#16a34a',
  ditolak: '#dc2626',
  eskalasi: '#ea580c',
  menunggu_data: '#64748b',
};

const EKO_ORDER = ['sangat_miskin', 'miskin', 'rentan', 'sedang', 'mampu'] as const;
const EKO_COLORS: Record<string, string> = {
  sangat_miskin: '#7f1d1d',
  miskin: '#dc2626',
  rentan: '#ea580c',
  sedang: '#2563eb',
  mampu: '#16a34a',
};

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl bg-white p-5 shadow border border-gray-100 flex flex-col justify-between min-h-[120px]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex justify-between items-start gap-2">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-[13px] text-gray-500 mt-1">{label}</p>
        <p className="text-[28px] font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function LaporanStatusBars({ data: byStatus }: { data: { status: string; _count: { id: number } }[] }) {
  const total = Math.max(1, byStatus.reduce((s, x) => s + x._count.id, 0));
  return (
    <div className="space-y-2">
      {byStatus.map(({ status, _count }) => (
        <div key={status} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 text-gray-600 capitalize">{String(status).replace(/_/g, ' ')}</span>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(_count.id / total) * 100}%`,
                background: LAPORAN_STATUS_COLORS[status] ?? '#94a3b8',
              }}
            />
          </div>
          <span className="w-12 text-right font-mono text-gray-800">{_count.id}</span>
        </div>
      ))}
    </div>
  );
}

function EkonomiBars({ data: rows, total }: { data: { statusEkonomi: string | null; _count: { id: number } }[]; total: number }) {
  return (
    <div className="space-y-2">
      {EKO_ORDER.map((key) => {
        const row = rows.find((r) => r.statusEkonomi === key);
        const v = row?._count.id ?? 0;
        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: EKO_COLORS[key] }} />
            </div>
            <span className="text-gray-600 w-24 text-right">
              {v.toLocaleString('id-ID')} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminDashboard() {
  const [now, setNow] = useState(() => new Date());
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [overview, setOverview] = useState<any>(null);
  const [wilayah, setWilayah] = useState<any>(null);

  const loadAll = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const [o, w] = await Promise.all([
        api.get('/dashboard/territorial-overview'),
        api.get('/dashboard/wilayah-status'),
      ]);
      setOverview(o.data);
      setWilayah(w.data);
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'Gagal memuat dashboard intelijen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll, tick]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const t = overview?.territorial;
  const p = overview?.populasi;
  const l = overview?.laporan;
  const b = overview?.bantuan;
  const w = overview?.warmindo;
  const ws = wilayah?.summary;
  const kecPct =
    ws && ws.totalKecamatan > 0 ? Math.round((ws.kecamatanAktif / ws.totalKecamatan) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 w-full">
      <header className="border-b border-gray-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">JAKDATA Command — Dapil 3 DKI Jakarta</h1>
          <p className="text-sm text-gray-500">Jakarta Utara · Jakarta Barat · Kepulauan Seribu</p>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <span className="text-sm text-gray-600 font-mono tabular-nums">
            {now.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setTick((x) => x + 1)} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50">
        {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">{err}</div>}
        {loading && !overview && <p className="text-gray-500 text-sm">Memuat…</p>}

        {overview && (
          <div className="space-y-6">
            {ws && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard
                    icon="📋"
                    label="Laporan Masuk"
                    value={(ws.totalLaporan ?? 0).toLocaleString('id-ID')}
                    sub={`Hari ini: ${(ws.laporanHariIni ?? 0).toLocaleString('id-ID')}`}
                  />
                  <StatCard icon="👷" label="Koordinator Aktif" value={ws.totalKoordinator ?? 0} />
                  <StatCard
                    icon="👥"
                    label="Warga Terdaftar"
                    value={(ws.totalWarga ?? 0).toLocaleString('id-ID')}
                  />
                  <StatCard
                    icon="🗺️"
                    label="Wilayah Aktif"
                    value={`${ws.kecamatanAktif ?? 0} / ${ws.totalKecamatan ?? 0}`}
                    sub="Kecamatan Dapil 3"
                  />
                </div>

                <div className="rounded-xl bg-white p-5 shadow border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-semibold text-gray-900">Progress Kecamatan Aktif</h2>
                    <span className="text-sm font-bold text-blue-700">{kecPct}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${kecPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {ws.kecamatanAktif} dari {ws.totalKecamatan} kecamatan memiliki koordinator atau data
                    operasional
                  </p>
                </div>

                {wilayah?.recentLaporan?.length > 0 && (
                  <div className="rounded-xl bg-white p-5 shadow border border-gray-100">
                    <h2 className="font-semibold text-gray-900 mb-3">Laporan Terbaru (Dapil 3)</h2>
                    <ul className="divide-y divide-gray-100">
                      {wilayah.recentLaporan.map((lap: any) => (
                        <li key={lap.id} className="py-2 flex justify-between gap-3 text-sm">
                          <div>
                            <span className="font-mono text-xs text-gray-500">{lap.kodeLaporan}</span>
                            <p className="text-gray-800 capitalize">{String(lap.kategori).replace(/_/g, ' ')}</p>
                            <p className="text-xs text-gray-500">{lap.namaPelapor ?? '—'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs capitalize px-2 py-0.5 rounded bg-gray-100">
                              {lap.status}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(lap.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Link to="/admin/laporan" className="inline-block mt-3 text-sm font-semibold text-blue-700 hover:underline">
                      Semua laporan →
                    </Link>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
              <StatCard icon="🏛️" label="Total Kecamatan" value={t?.kecamatan ?? '—'} />
              <StatCard icon="🏘️" label="Total Kelurahan" value={t?.kelurahan ?? '—'} />
              <StatCard icon="🏠" label="Total RW" value={t?.rw ?? '—'} />
              <StatCard icon="📍" label="Total RT" value={t?.rt ?? '—'} />
              <StatCard
                icon="👥"
                label="Total Warga"
                value={(p?.totalWarga ?? 0).toLocaleString('id-ID')}
                sub={`Rentan: ${(p?.wargaVulnerable ?? 0).toLocaleString('id-ID')}`}
              />
              <StatCard icon="👨‍👩‍👧" label="Total Keluarga" value={(p?.totalKeluarga ?? 0).toLocaleString('id-ID')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white p-5 shadow border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-3">Status Laporan</h2>
                <LaporanStatusBars data={l?.byStatus ?? []} />
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Critical (belum selesai):</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                    {l?.critical ?? 0}
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-white p-5 shadow border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-3">Program Bantuan</h2>
                <p className="text-sm text-gray-600">
                  Program aktif: <span className="font-bold text-gray-900">{b?.programAktif ?? 0}</span>
                </p>
                <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                  Open anomalies:
                  {(b?.openAnomalies ?? 0) > 0 ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">{b.openAnomalies}</span>
                  ) : (
                    <span className="text-green-700 font-semibold">0</span>
                  )}
                </p>
                <Link to="/admin/bantuan" className="inline-block mt-4 text-sm font-semibold text-blue-700 hover:underline">
                  Lihat Anomali →
                </Link>
              </div>
              <div className="rounded-xl bg-white p-5 shadow border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-3">Warmindo Network</h2>
                <p className="text-sm text-gray-600">
                  Outlet: <span className="font-bold text-gray-900">{w?.totalOutlets ?? 0}</span> (aktif {w?.aktifOutlets ?? 0})
                </p>
                <p className="text-sm mt-1">Omzet hari ini: {formatRp(w?.omzetHariIni ?? 0)}</p>
                <p className="text-sm">Gross profit: {formatRp(w?.grossProfitHariIni ?? 0)}</p>
                <Link to="/admin/warmindo" className="inline-block mt-4 btn-primary btn-sm">
                  Detail Network
                </Link>
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">Distribusi Status Ekonomi Warga</h2>
              <EkonomiBars data={p?.byStatusEkonomi ?? []} total={p?.totalWarga ?? 1} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

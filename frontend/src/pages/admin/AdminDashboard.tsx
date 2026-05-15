import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

type Section = 'overview' | 'kota' | 'alerts' | 'warmindo' | 'populasi';

const NAV_INNER: { key: Section; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview Dapil 3', icon: '🗺️' },
  { key: 'kota', label: 'Per Kota', icon: '🏙️' },
  { key: 'alerts', label: 'Alerts', icon: '🚨' },
  { key: 'warmindo', label: 'Warmindo Network', icon: '🍜' },
  { key: 'populasi', label: 'Populasi', icon: '👥' },
];

function formatRp(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

function formatRelative(iso: string | Date) {
  const d = new Date(iso);
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return 'baru saja';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}

function severityLabel(s: string) {
  const u = (s || '').toLowerCase();
  if (u === 'critical') return 'CRITICAL';
  if (u === 'high') return 'HIGH';
  if (u === 'medium') return 'MEDIUM';
  return 'LOW';
}

function severityBadgeClass(s: string) {
  const u = (s || '').toLowerCase();
  if (u === 'critical') return 'bg-red-600 text-white';
  if (u === 'high') return 'bg-orange-500 text-white';
  if (u === 'medium') return 'bg-yellow-400 text-yellow-950';
  return 'bg-gray-400 text-white';
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
  const [section, setSection] = useState<Section>('overview');
  const [now, setNow] = useState(() => new Date());
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [overview, setOverview] = useState<any>(null);
  const [kota, setKota] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [warmindoNet, setWarmindoNet] = useState<any>(null);
  const [kecFilter, setKecFilter] = useState('');

  const loadAll = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const [o, k, a, w] = await Promise.all([
        api.get('/dashboard/territorial-overview'),
        api.get('/dashboard/kota-breakdown'),
        api.get('/dashboard/alerts'),
        api.get('/dashboard/warmindo-network'),
      ]);
      setOverview(o.data);
      setKota(k.data);
      setAlerts(a.data);
      setWarmindoNet(w.data);
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

  const filteredOutlets = useMemo(() => {
    const list = warmindoNet?.outlets ?? [];
    if (!kecFilter) return list;
    return list.filter((o: any) => o.kecamatan === kecFilter);
  }, [warmindoNet, kecFilter]);

  const kecamatanOptions = useMemo(() => {
    const list = warmindoNet?.outlets ?? [];
    const u = [...new Set(list.map((o: any) => o.kecamatan).filter(Boolean))] as string[];
    return u.sort((a, b) => a.localeCompare(b, 'id'));
  }, [warmindoNet]);

  async function acknowledgeAlert(id: number) {
    try {
      await api.patch(`/dashboard/alerts/${id}/acknowledge`);
      setTick((x) => x + 1);
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Gagal acknowledge');
    }
  }

  const t = overview?.territorial;
  const p = overview?.populasi;
  const l = overview?.laporan;
  const b = overview?.bantuan;
  const w = overview?.warmindo;

  const kotaTheme: Record<string, { border: string; head: string }> = {
    'Jakarta Utara': { border: '#1d4ed8', head: '#1e3a8a' },
    'Jakarta Barat': { border: '#15803d', head: '#14532d' },
    'Kepulauan Seribu': { border: '#0d9488', head: '#134e4a' },
  };

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-0 min-h-0">
      <aside
        className="w-full lg:w-[240px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-slate-900 text-slate-100 lg:min-h-[calc(100vh-5rem)]"
        style={{ minWidth: 0 }}
      >
        <div className="p-3 space-y-1">
          {NAV_INNER.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => setSection(n.key)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                section === n.key ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
          <Link
            to="/admin/laporan"
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10"
          >
            <span>📋</span>Laporan
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
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

          {section === 'overview' && overview && (
            <div className="space-y-6">
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
                  <button type="button" className="mt-4 btn-primary btn-sm" onClick={() => setSection('warmindo')}>
                    Detail Network
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-4">Distribusi Status Ekonomi Warga</h2>
                <EkonomiBars data={p?.byStatusEkonomi ?? []} total={p?.totalWarga ?? 1} />
              </div>
            </div>
          )}

          {section === 'kota' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {kota.map((row: any) => {
                const theme = kotaTheme[row.nama] ?? { border: '#334155', head: '#0f172a' };
                return (
                  <div
                    key={row.kode}
                    className="rounded-xl bg-white overflow-hidden shadow border border-gray-100"
                    style={{ borderTop: `4px solid ${theme.border}` }}
                  >
                    <div className="px-4 py-3 text-white font-bold" style={{ background: theme.head }}>
                      {row.nama}
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Kelurahan</p>
                        <p className="font-semibold">{row.kelurahan}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">RW</p>
                        <p className="font-semibold">{row.rw}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">RT</p>
                        <p className="font-semibold">{row.rt}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Warga</p>
                        <p className="font-semibold">{row.warga?.toLocaleString?.('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Warmindo</p>
                        <p className="font-semibold">{row.warmindo}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Omzet Hari Ini</p>
                        <p className="font-semibold">{formatRp(row.warmindoOmzetHariIni ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Laporan Open</p>
                        <p className="font-semibold">{row.laporanOpen}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Anomali Bantuan</p>
                        <p className="font-semibold text-red-700">{row.bantuanAnomalies}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {section === 'alerts' && alerts && (
            <div className="space-y-6">
              {alerts.dynamicAlerts?.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-700 mb-2">Deteksi Otomatis</h2>
                  <div className="space-y-2">
                    {alerts.dynamicAlerts.map((d: any) => (
                      <div key={d.id} className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1 ${severityBadgeClass(d.severity)}`}>
                          {severityLabel(d.severity)}
                        </span>
                        <p className="font-semibold text-gray-900">{d.judul}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{d.deskripsi}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h2 className="text-sm font-bold text-gray-700 mb-2">Operational Alerts</h2>
                <div className="space-y-3">
                  {alerts.alerts?.map((a: any) => (
                    <div key={a.id} className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${severityBadgeClass(a.severity)}`}>{severityLabel(a.severity)}</span>
                        <span className="text-xs text-gray-400">{formatRelative(a.createdAt)}</span>
                      </div>
                      <p className="font-semibold text-gray-900 mt-2">{a.judul}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-3">{a.deskripsi}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">{a.status}</span>
                        {a.status === 'open' && (
                          <button type="button" className="btn-secondary btn-sm text-xs" onClick={() => acknowledgeAlert(a.id)}>
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'warmindo' && warmindoNet && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500 uppercase">Total omzet hari ini</p>
                  <p className="text-2xl font-bold text-gray-900">{formatRp(warmindoNet.totalOmzetHariIni ?? 0)}</p>
                </div>
                <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500 uppercase">Avg achievement %</p>
                  <p
                    className={`text-2xl font-bold ${
                      (warmindoNet.avgAchievementPct ?? 0) >= 75 ? 'text-green-700' : (warmindoNet.avgAchievementPct ?? 0) >= 50 ? 'text-yellow-700' : 'text-red-700'
                    }`}
                  >
                    {(warmindoNet.avgAchievementPct ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500 uppercase">Mencapai target</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {warmindoNet.outletMencapaiTarget ?? 0} / {warmindoNet.totalOutlets ?? 0}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">Perhatian (&lt;75%): {warmindoNet.outletPerhatian ?? 0}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  Filter kecamatan:
                  <select className="input text-sm w-auto min-w-[200px]" value={kecFilter} onChange={(e) => setKecFilter(e.target.value)}>
                    <option value="">Semua</option>
                    {kecamatanOptions.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto shadow-sm">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Outlet</th>
                      <th className="px-3 py-2">Kelurahan</th>
                      <th className="px-3 py-2 text-right">Omzet</th>
                      <th className="px-3 py-2 text-right">Target</th>
                      <th className="px-3 py-2 text-right">Achievement</th>
                      <th className="px-3 py-2 text-right">Stok</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutlets.map((o: any) => {
                      const ach = Number(o.achievementPct ?? 0);
                      const omz = Number(o.omzetHariIni ?? 0);
                      let rowBg = 'bg-white';
                      if (omz === 0) rowBg = 'bg-gray-100';
                      else if (ach >= 100) rowBg = 'bg-green-50';
                      else if (ach >= 75) rowBg = 'bg-white';
                      else rowBg = 'bg-red-50';
                      return (
                        <tr key={o.id} className={`border-b border-gray-100 ${rowBg}`}>
                          <td className="px-3 py-2 font-medium">
                            {o.namaOutlet}
                            <div className="text-xs text-gray-400 font-mono">{o.kodeOutlet}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {o.kelurahan}
                            <div className="text-xs text-gray-400">{o.kecamatan}</div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{formatRp(omz)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatRp(o.targetOmzet ?? 0)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{ach.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right">{o.lowStockCount ?? 0}</td>
                          <td className="px-3 py-2 text-xs">{o.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'populasi' && overview && (
            <div className="rounded-xl bg-white p-5 shadow border border-gray-100 max-w-3xl">
              <h2 className="font-semibold text-gray-900 mb-2">Ringkasan Populasi Dapil 3</h2>
              <p className="text-sm text-gray-600 mb-4">
                Warga: <b>{(p?.totalWarga ?? 0).toLocaleString('id-ID')}</b> · Keluarga:{' '}
                <b>{(p?.totalKeluarga ?? 0).toLocaleString('id-ID')}</b> · Rentan:{' '}
                <b>{(p?.wargaVulnerable ?? 0).toLocaleString('id-ID')}</b>
              </p>
              <EkonomiBars data={p?.byStatusEkonomi ?? []} total={p?.totalWarga ?? 1} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



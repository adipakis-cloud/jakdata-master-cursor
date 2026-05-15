import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

type DashboardRes = {
  outlet: { id: number; namaOutlet: string; status: string; kelurahan: string | null; kecamatan: string | null };
  today: {
    omzet: number;
    grossProfit: number;
    jumlahTransaksi: number;
    targetOmzet: number;
    targetAchievementPct: number;
    performanceStatus: string;
  };
  inventory: { lowStockAlert: boolean; lowStockItems: { namaBahan: string }[] };
  weeklyTrend: { tanggal: string; omzet: number }[];
};

type SignalRes = {
  overallHealth: 'sehat' | 'perhatian' | 'warning';
  signals: { type: string; severity: string; message: string; items?: string[]; data?: unknown }[];
};

export function WarmindoDashboard() {
  const [data, setData] = useState<DashboardRes | null>(null);
  const [signal, setSignal] = useState<SignalRes | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const dash = await api.get('/warmindo/dashboard');
        setData(dash.data);
      } catch (e: any) {
        setErr(e.response?.data?.error ?? 'Gagal memuat dashboard');
        return;
      }
      try {
        const sig = await api.get('/warmindo/signal');
        setSignal(sig.data);
      } catch {
        setSignal(null);
      }
    })();
  }, []);

  const maxOmzet = useMemo(() => {
    if (!data?.weeklyTrend?.length) return 1;
    return Math.max(1, ...data.weeklyTrend.map((d) => d.omzet));
  }, [data]);

  const pct = data?.today.targetAchievementPct ?? 0;
  const barColor = pct >= 100 ? '#16a34a' : pct >= 75 ? '#ca8a04' : '#dc2626';

  return (
    <div className="p-3 space-y-3">
      <header className="rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
        <p className="text-xs text-stone-500">Outlet</p>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-base font-bold text-stone-900 leading-snug">{data?.outlet.namaOutlet ?? '…'}</h1>
          {data?.outlet.status === 'aktif' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 shrink-0">Aktif</span>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-1">
          {[data?.outlet.kelurahan, data?.outlet.kecamatan].filter(Boolean).join(' · ') || '—'}
        </p>
      </header>

      {err && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3 border border-red-100">{err}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white p-3 border border-stone-100 shadow-sm">
              <p className="text-[10px] text-stone-500 uppercase tracking-wide">Omzet hari ini</p>
              <p className="text-sm font-bold text-stone-900">Rp {Math.round(data.today.omzet).toLocaleString('id-ID')}</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-stone-100 shadow-sm">
              <p className="text-[10px] text-stone-500 uppercase tracking-wide">Target %</p>
              <p className="text-sm font-bold text-stone-900">{data.today.targetAchievementPct.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-stone-100 shadow-sm">
              <p className="text-[10px] text-stone-500 uppercase tracking-wide">Gross profit</p>
              <p className="text-sm font-bold text-stone-900">Rp {Math.round(data.today.grossProfit).toLocaleString('id-ID')}</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-stone-100 shadow-sm">
              <p className="text-[10px] text-stone-500 uppercase tracking-wide">Transaksi</p>
              <p className="text-sm font-bold text-stone-900">{data.today.jumlahTransaksi}</p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-3 border border-stone-100 shadow-sm">
            <div className="flex justify-between text-xs text-stone-600 mb-1">
              <span>Pencapaian target</span>
              <span className="font-semibold" style={{ color: barColor }}>
                {data.today.performanceStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
              />
            </div>
          </div>

          {data.inventory.lowStockAlert && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-bold">⚠️ {data.inventory.lowStockItems.length} bahan hampir habis</p>
              <p className="text-xs mt-1">{data.inventory.lowStockItems.map((i) => i.namaBahan).join(', ')}</p>
            </div>
          )}

          <div className="rounded-xl bg-white p-3 border border-stone-100 shadow-sm">
            <p className="text-xs font-semibold text-stone-700 mb-2">Omzet 7 hari</p>
            <div className="flex items-end justify-between gap-1 h-28">
              {data.weeklyTrend.map((d) => (
                <div key={d.tanggal} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-green-600/80 min-h-[4px]"
                    style={{ height: `${(d.omzet / maxOmzet) * 100}%` }}
                    title={`${d.tanggal}: ${d.omzet}`}
                  />
                  <span className="text-[8px] text-stone-500 rotate-0">{d.tanggal.slice(8)}</span>
                </div>
              ))}
            </div>
          </div>

          {signal && (
            <div className="rounded-xl border shadow-sm overflow-hidden">
              {signal.overallHealth === 'sehat' && (
                <div className="bg-green-50 border border-green-200 text-green-900 text-sm p-3 font-semibold rounded-xl">✅ Operasional Normal</div>
              )}
              {signal.overallHealth === 'perhatian' && (
                <div className="bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm font-bold text-amber-900">⚠️ Perlu Perhatian</p>
                  <ul className="mt-2 text-xs text-amber-900 space-y-2 list-disc pl-4">
                    {signal.signals.map((s, i) => (
                      <li key={i}>
                        <span>{s.message}</span>
                        {s.items && s.items.length > 0 && (
                          <p className="text-[10px] mt-0.5 text-amber-800/90 pl-0">{s.items.join(', ')}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {signal.overallHealth === 'warning' && (
                <div className="bg-red-50 border border-red-200 p-3">
                  <p className="text-sm font-bold text-red-900">🚨 Perlu Tindakan Segera</p>
                  <ul className="mt-2 text-xs text-red-900 space-y-2 list-none">
                    {signal.signals.map((s, i) => (
                      <li key={i}>
                        <p className="font-semibold">{s.message}</p>
                        {s.data != null && (
                          <pre className="mt-1 text-[10px] bg-white/60 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(s.data, null, 2)}
                          </pre>
                        )}
                        {s.items && s.items.length > 0 && <p className="mt-0.5 text-[10px]">{s.items.join(', ')}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/warmindo/transaksi/baru"
              className="block text-center rounded-xl py-3 text-sm font-semibold text-white no-underline"
              style={{ backgroundColor: '#16a34a' }}
            >
              + Catat Transaksi
            </Link>
            <Link
              to="/warmindo/keuangan?tab=closing"
              className="block text-center rounded-xl py-3 text-sm font-semibold border border-stone-300 text-stone-800 no-underline bg-white"
            >
              Tutup Hari Ini
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

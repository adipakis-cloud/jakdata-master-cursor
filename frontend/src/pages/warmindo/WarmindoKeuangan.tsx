import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

function formatThousandsInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

function parseThousands(raw: string): number {
  return Number(raw.replace(/\./g, '')) || 0;
}

function varianceBadge(variance: number) {
  if (variance > 5000) return { label: `+Rp ${Math.round(variance).toLocaleString('id-ID')}`, cls: 'text-green-700 bg-green-50 border-green-200' };
  if (variance < -5000) return { label: `-Rp ${Math.round(Math.abs(variance)).toLocaleString('id-ID')}`, cls: 'text-red-700 bg-red-50 border-red-200' };
  return { label: 'Balance', cls: 'text-stone-600 bg-stone-100 border-stone-200' };
}

export function WarmindoKeuangan() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as 'pengeluaran' | 'closing' | 'riwayat') || 'pengeluaran';
  const setTab = (t: 'pengeluaran' | 'closing' | 'riwayat') => {
    setSp({ tab: t });
  };

  const [kat, setKat] = useState('gaji');
  const [desk, setDesk] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [cash, setCash] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [closings, setClosings] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastClosing, setLastClosing] = useState<any>(null);

  const loadSummary = async () => {
    try {
      const peng = await api.get('/warmindo/dashboard');
      const d = peng.data;
      setSummary({ raw: d });
    } catch {
      setSummary(null);
    }
  };

  const loadClosing = async () => {
    try {
      const r = await api.get('/warmindo/closing');
      setClosings(r.data?.closings ?? []);
    } catch {
      setClosings([]);
    }
  };

  useEffect(() => {
    loadSummary();
    loadClosing();
  }, []);

  useEffect(() => {
    if (tab === 'closing') loadSummary();
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const today = summary?.raw?.today;
  const penjualan = today?.omzet ?? 0;
  const pengeluaranHari = today?.pengeluaran ?? 0;
  const estimasiKas = today?.netProfit ?? 0;
  const kasNum = Number(String(cash).replace(/\./g, ''));
  const selisih = Number.isFinite(kasNum) ? kasNum - estimasiKas : NaN;
  let selisihLabel = '—';
  let selisihCls = 'text-stone-600';
  if (Number.isFinite(selisih)) {
    if (selisih > 5000) {
      selisihLabel = `Surplus Rp ${Math.round(selisih).toLocaleString('id-ID')}`;
      selisihCls = 'text-green-700';
    } else if (selisih < -5000) {
      selisihLabel = `Defisit Rp ${Math.round(Math.abs(selisih)).toLocaleString('id-ID')}`;
      selisihCls = 'text-red-700';
    } else {
      selisihLabel = 'Balance';
      selisihCls = 'text-stone-600';
    }
  }

  const savePengeluaran = async () => {
    const j = parseThousands(jumlah);
    if (!Number.isFinite(j) || j <= 0) return;
    setBusy(true);
    setMsg('');
    try {
      await api.post('/warmindo/pengeluaran', { kategori: kat, deskripsi: desk || kat, jumlah: j });
      setToast('Pengeluaran tersimpan');
      setDesk('');
      setJumlah('');
      await loadSummary();
    } catch (e: any) {
      setMsg(e.response?.data?.error ?? 'Gagal');
    } finally {
      setBusy(false);
    }
  };

  const doClosing = async () => {
    const c = Number(String(cash).replace(/\./g, ''));
    if (!Number.isFinite(c)) return;
    setBusy(true);
    setMsg('');
    setLastClosing(null);
    try {
      const r = await api.post('/warmindo/closing', { cashActual: c, notes: notes || undefined });
      setLastClosing(r.data);
      setToast('Hari berhasil ditutup');
      setCash('');
      setNotes('');
      await loadClosing();
      await loadSummary();
    } catch (e: any) {
      if (e.response?.status === 409) {
        setMsg('Hari ini sudah ditutup');
      } else {
        setMsg(e.response?.data?.error ?? 'Closing gagal');
      }
    } finally {
      setBusy(false);
    }
  };

  const vs = lastClosing?.varianceStatus as string | undefined;
  const vsBadge =
    vs === 'surplus'
      ? 'bg-green-100 text-green-800 border-green-200'
      : vs === 'deficit'
        ? 'bg-red-100 text-red-800 border-red-200'
        : 'bg-stone-100 text-stone-700 border-stone-200';

  return (
    <div className="p-3 space-y-3">
      <div className="flex rounded-xl bg-white border border-stone-200 p-1 gap-1">
        {(
          [
            ['pengeluaran', 'Pengeluaran'],
            ['closing', 'Tutup Hari'],
            ['riwayat', 'Riwayat'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${tab === k ? 'bg-green-600 text-white' : 'text-stone-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {toast && <p className="text-xs font-semibold text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{toast}</p>}
      {msg && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2">{msg}</p>}

      {tab === 'pengeluaran' && (
        <div className="rounded-xl bg-white border border-stone-200 p-3 space-y-2">
          <label className="block text-xs text-stone-600">
            Kategori
            <select className="mt-1 w-full border border-stone-200 rounded-lg px-2 py-2 text-sm" value={kat} onChange={(e) => setKat(e.target.value)}>
              <option value="gaji">gaji</option>
              <option value="bahan_baku">bahan_baku</option>
              <option value="sewa">sewa</option>
              <option value="utilitas">utilitas</option>
              <option value="perawatan">perawatan</option>
              <option value="lainnya">lainnya</option>
            </select>
          </label>
          <label className="block text-xs text-stone-600">
            Deskripsi
            <input className="mt-1 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" value={desk} onChange={(e) => setDesk(e.target.value)} />
          </label>
          <label className="block text-xs text-stone-600">
            Jumlah (Rp)
            <input
              className="mt-1 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              inputMode="numeric"
              value={jumlah}
              onChange={(e) => setJumlah(formatThousandsInput(e.target.value))}
            />
          </label>
          <button type="button" disabled={busy} onClick={savePengeluaran} className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-50">
            Simpan Pengeluaran
          </button>
        </div>
      )}

      {tab === 'closing' && summary?.raw && (
        <div className="rounded-xl bg-white border border-stone-200 p-3 space-y-2 text-sm">
          <p>
            Total penjualan hari ini:{' '}
            <span className="font-semibold">Rp {Math.round(penjualan).toLocaleString('id-ID')}</span>
          </p>
          <p>
            Total pengeluaran hari ini:{' '}
            <span className="font-semibold">Rp {Math.round(pengeluaranHari).toLocaleString('id-ID')}</span>
          </p>
          <p className={`font-bold ${estimasiKas >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            Estimasi kas bersih: Rp {Math.round(estimasiKas).toLocaleString('id-ID')}
          </p>
          <label className="block text-xs text-stone-600">
            Kas aktual di tangan
            <input
              className="mt-1 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              inputMode="numeric"
              value={cash}
              onChange={(e) => setCash(formatThousandsInput(e.target.value))}
            />
          </label>
          {Number.isFinite(selisih) && cash !== '' && (
            <p className={`text-xs font-semibold ${selisihCls}`}>
              Selisih: {selisihLabel}
            </p>
          )}
          <label className="block text-xs text-stone-600">
            Catatan (opsional)
            <input className="mt-1 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button type="button" disabled={busy} onClick={doClosing} className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-bold disabled:opacity-50">
            Tutup Hari Ini
          </button>
          {lastClosing && (
            <div className="mt-2 rounded-lg border border-stone-200 p-2 text-xs space-y-1">
              <p className="font-bold">Ringkasan closing</p>
              <p>Variance: Rp {Math.round(lastClosing.variance ?? 0).toLocaleString('id-ID')}</p>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${vsBadge}`}>
                {lastClosing.varianceStatus ?? '—'}
              </span>
            </div>
          )}
        </div>
      )}

      {tab === 'riwayat' && (
        <div className="space-y-2">
          {closings.map((c) => {
            const b = varianceBadge(Number(c.variance));
            return (
              <div key={c.id} className="rounded-xl bg-white border border-stone-200 p-3 text-xs flex justify-between items-center gap-2">
                <div>
                  <p className="font-semibold text-stone-900">{String(c.tanggal).slice(0, 10)}</p>
                  <p className="text-stone-600 mt-0.5">Sales Rp {Math.round(c.totalSales).toLocaleString('id-ID')}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${b.cls}`}>{b.label}</span>
              </div>
            );
          })}
          {!closings.length && <p className="text-sm text-stone-500">Belum ada closing.</p>}
        </div>
      )}
    </div>
  );
}

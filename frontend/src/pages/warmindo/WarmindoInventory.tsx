import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type InvRow = {
  id: number;
  namaBahan: string;
  satuan: string;
  stokSaatIni: number;
  stokMinimum: number;
  hargaBeli: number;
  hargaJual: number;
  lowStock?: boolean;
};

export function WarmindoInventory() {
  const [rows, setRows] = useState<InvRow[]>([]);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sheet, setSheet] = useState<InvRow | null>(null);
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await api.get('/warmindo/inventory');
      setRows(Array.isArray(r.data) ? r.data : []);
      setErr('');
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'Gagal memuat stok');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const lowCount = rows.filter((r) => r.lowStock).length;

  const submitRestock = async () => {
    if (!sheet) return;
    const q = Number(qty);
    const uc = Number(String(cost).replace(/\./g, ''));
    if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(uc) || uc < 0) return;
    setBusy(true);
    try {
      await api.post('/warmindo/restock', { inventoryId: sheet.id, qty: q, unitCost: uc });
      setSheet(null);
      setQty('');
      setCost('');
      setToast('Restock berhasil');
      await load();
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'Restock gagal');
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const la = a.lowStock ? 1 : 0;
    const lb = b.lowStock ? 1 : 0;
    if (la !== lb) return lb - la;
    return a.namaBahan.localeCompare(b.namaBahan, 'id');
  });

  const barPct = (r: InvRow) => {
    if (r.stokMinimum <= 0) return Math.min(100, r.stokSaatIni);
    return Math.min(100, (r.stokSaatIni / Math.max(r.stokMinimum, 1)) * 50);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex justify-between items-center gap-2">
        <h1 className="text-base font-bold text-stone-900">Stok</h1>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-600">{rows.length} item</span>
          {lowCount > 0 && (
            <span className="font-bold px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px]">{lowCount} low</span>
          )}
        </div>
      </div>
      {toast && (
        <p className="text-xs font-semibold text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{toast}</p>
      )}
      {err && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{err}</p>}

      <div className="space-y-2">
        {sorted.map((r) => {
          const open = expanded === r.id;
          return (
            <div key={r.id} className="rounded-xl bg-white border border-stone-200 shadow-sm overflow-hidden">
              <button
                type="button"
                className="w-full text-left p-3"
                onClick={() => setExpanded(open ? null : r.id)}
              >
                <div className="flex justify-between gap-2 items-start">
                  <div>
                    <p className="text-sm font-bold text-stone-900">{r.namaBahan}</p>
                    <p className="text-[10px] text-stone-500">{r.satuan}</p>
                  </div>
                  {r.lowStock && (
                    <span className="text-[9px] font-bold text-red-700 shrink-0 bg-red-50 px-1.5 py-0.5 rounded">⚠ HAMPIR HABIS</span>
                  )}
                </div>
                <p className="text-[10px] text-stone-500 mt-2">Stok vs minimum</p>
                <div className="mt-1 h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.lowStock ? 'bg-red-500' : 'bg-green-600'}`}
                    style={{ width: `${barPct(r)}%` }}
                  />
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  {r.stokSaatIni} / {r.stokMinimum || '—'} {r.satuan}
                </p>
                <p className="text-[10px] text-stone-600 mt-1">
                  Harga beli: Rp {Math.round(r.hargaBeli).toLocaleString('id-ID')} | Harga jual:{' '}
                  {r.hargaJual > 0 ? `Rp ${Math.round(r.hargaJual).toLocaleString('id-ID')}` : '—'}
                </p>
              </button>

              {open && (
                <div className="px-3 pb-3 border-t border-stone-100 space-y-2 text-xs text-stone-600">
                  <p>ID #{r.id}</p>
                  <p>Stok saat ini: {r.stokSaatIni}</p>
                  <p>Stok minimum: {r.stokMinimum}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSheet(r);
                      setQty('');
                      setCost(String(Math.round(r.hargaBeli)));
                    }}
                    className="w-full py-2 text-xs font-bold rounded-lg border border-green-600 text-green-700 bg-green-50"
                  >
                    + Restock
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sheet && (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full max-w-[375px] rounded-t-2xl p-4 space-y-3 shadow-xl">
            <p className="text-sm font-bold">Restock — {sheet.namaBahan}</p>
            <label className="block text-xs text-stone-600">
              Qty tambah
              <input
                className="mt-1 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </label>
            <label className="block text-xs text-stone-600">
              Harga beli per unit
              <input
                className="mt-1 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                inputMode="numeric"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-2 rounded-xl border border-stone-300 text-sm" onClick={() => setSheet(null)}>
                Batal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submitRestock}
                className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-50"
              >
                Restock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

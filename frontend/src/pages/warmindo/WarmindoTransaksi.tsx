import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

type InvRow = {
  id: number;
  namaBahan: string;
  satuan: string;
  hargaJual: number;
  hargaBeli: number;
  stokSaatIni: number;
  stokMinimum: number;
  lowStock?: boolean;
};

type CartLine = {
  key: string;
  productName: string;
  unitPrice: number;
  unitHpp: number;
  qty: number;
  needsManualPrice: boolean;
};

type TrxRow = {
  id: number;
  tanggal: string;
  totalOmzet: number;
  jumlahItem: number;
  metodeBayar: string;
  items?: unknown;
};

type Receipt = {
  namaOutlet: string | null;
  waktu: string;
  items: { productName: string; qty: number; unitPrice: number; subtotal: number }[];
  total: number;
  metodeBayar: string;
};

export function WarmindoTransaksi() {
  const loc = useLocation();
  const [sp] = useSearchParams();
  const initialTab = sp.get('tab') === 'riwayat' ? 'riwayat' : 'catat';
  const [tab, setTab] = useState<'catat' | 'riwayat'>(initialTab);
  const [inv, setInv] = useState<InvRow[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [metode, setMetode] = useState<'tunai' | 'qris' | 'transfer'>('tunai');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [trx, setTrx] = useState<TrxRow[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (loc.pathname.endsWith('/baru')) setTab('catat');
  }, [loc.pathname]);

  const loadInv = async () => {
    const r = await api.get('/warmindo/inventory');
    setInv(Array.isArray(r.data) ? r.data : []);
  };

  const loadTrx = async () => {
    const r = await api.get('/warmindo/transaksi', { params: { limit: 20, page: 1 } });
    const body = r.data;
    setTrx(Array.isArray(body?.data) ? body.data : []);
  };

  useEffect(() => {
    (async () => {
      try {
        setMsg('');
        await Promise.all([loadInv(), loadTrx()]);
      } catch (e: any) {
        setMsg(e.response?.data?.error ?? 'Gagal memuat');
      }
    })();
  }, []);

  const total = useMemo(() => cart.reduce((s, c) => s + c.qty * c.unitPrice, 0), [cart]);

  const addItem = (row: InvRow) => {
    const hpp = row.hargaBeli || 0;
    const key = String(row.id);
    const needsManualPrice = !row.hargaJual || row.hargaJual <= 0;
    const defaultPrice = needsManualPrice ? 0 : row.hargaJual;
    setCart((prev) => {
      const i = prev.findIndex((p) => p.key === key);
      if (i >= 0) {
        const n = [...prev];
        n[i] = { ...n[i], qty: n[i].qty + 1 };
        return n;
      }
      return [
        ...prev,
        {
          key,
          productName: row.namaBahan,
          unitPrice: defaultPrice,
          unitHpp: hpp,
          qty: 1,
          needsManualPrice,
        },
      ];
    });
  };

  const setQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0),
    );
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const setLinePrice = (key: string, raw: string) => {
    const v = Number(raw.replace(/\./g, '').replace(/,/g, '.'));
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, unitPrice: Number.isFinite(v) && v >= 0 ? v : 0 } : c)));
  };

  const submitTrx = async () => {
    if (cart.some((c) => c.needsManualPrice && c.unitPrice <= 0)) {
      setMsg('Isi harga jual untuk item tanpa harga.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const r = await api.post('/warmindo/transaksi', {
        items: cart.map((c) => ({
          productName: c.productName,
          qty: c.qty,
          unitPrice: c.unitPrice,
          unitHpp: c.unitHpp,
        })),
        metodeBayar: metode,
      });
      const namaOutlet = r.data?.namaOutlet ?? null;
      const trxRow = r.data?.transaksi;
      const waktu = trxRow?.tanggal ? new Date(trxRow.tanggal).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');
      const items = cart.map((c) => ({
        productName: c.productName,
        qty: c.qty,
        unitPrice: c.unitPrice,
        subtotal: c.qty * c.unitPrice,
      }));
      setReceipt({
        namaOutlet,
        waktu,
        items,
        total: items.reduce((s, i) => s + i.subtotal, 0),
        metodeBayar: metode,
      });
      setCart([]);
      await loadTrx();
    } catch (e: any) {
      setMsg(e.response?.data?.error ?? 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  };

  const expandTrx = (t: TrxRow) => {
    setExpanded(expanded === t.id ? null : t.id);
  };

  const trxItems = (t: TrxRow) => {
    const raw = (t as any).items;
    if (!Array.isArray(raw)) return [];
    return raw as { productName?: string; qty?: number }[];
  };

  return (
    <div className="p-3 space-y-3 pb-28">
      <div className="flex rounded-xl bg-white border border-stone-200 p-1">
        <button
          type="button"
          className={`flex-1 py-2 text-xs font-semibold rounded-lg ${tab === 'catat' ? 'bg-green-600 text-white' : 'text-stone-600'}`}
          onClick={() => setTab('catat')}
        >
          Catat Transaksi
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-xs font-semibold rounded-lg ${tab === 'riwayat' ? 'bg-green-600 text-white' : 'text-stone-600'}`}
          onClick={() => setTab('riwayat')}
        >
          Riwayat
        </button>
      </div>

      {msg && !receipt && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">{msg}</p>}

      {tab === 'catat' && (
        <>
          <p className="text-xs text-stone-500">Tap bahan untuk menambah ke keranjang</p>
          <div className="grid grid-cols-2 gap-2">
            {inv.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => addItem(i)}
                className="rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm active:scale-[0.98] transition-transform"
              >
                <p className="text-sm font-semibold text-stone-900 leading-snug line-clamp-2">{i.namaBahan}</p>
                <p className="text-xs text-green-700 font-bold mt-1">
                  {i.hargaJual > 0 ? `Rp ${Math.round(i.hargaJual).toLocaleString('id-ID')}` : '—'}
                </p>
                {(!i.hargaJual || i.hargaJual <= 0) && (
                  <p className="text-[10px] text-amber-700 mt-1">Atur harga di keranjang</p>
                )}
              </button>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="rounded-xl bg-white border border-stone-200 p-3 space-y-2">
              <p className="text-xs font-bold text-stone-700">Keranjang</p>
              {cart.map((c) => (
                <div key={c.key} className="border-b border-stone-100 pb-2 last:border-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm flex-1 leading-snug">{c.productName}</span>
                    <button type="button" className="text-[10px] text-red-600 font-semibold shrink-0" onClick={() => removeLine(c.key)}>
                      Hapus
                    </button>
                  </div>
                  {c.needsManualPrice && (
                    <label className="block text-[10px] text-stone-600">
                      Harga jual
                      <input
                        className="mt-0.5 w-full border border-stone-200 rounded-lg px-2 py-1 text-sm"
                        inputMode="decimal"
                        placeholder="0"
                        value={c.unitPrice || ''}
                        onChange={(e) => setLinePrice(c.key, e.target.value)}
                      />
                    </label>
                  )}
                  <div className="flex items-center justify-between text-sm gap-2">
                    <div className="flex items-center gap-2">
                      <button type="button" className="w-7 h-7 rounded-lg border border-stone-300" onClick={() => setQty(c.key, -1)}>
                        −
                      </button>
                      <span className="w-6 text-center font-mono">{c.qty}</span>
                      <button type="button" className="w-7 h-7 rounded-lg border border-stone-300" onClick={() => setQty(c.key, 1)}>
                        +
                      </button>
                    </div>
                    <span className="font-mono text-xs">Rp {(c.qty * c.unitPrice).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
              <p className="text-right text-sm font-bold pt-2 border-t border-stone-100">Total Rp {Math.round(total).toLocaleString('id-ID')}</p>
              <div className="flex gap-1 pt-2">
                {(['tunai', 'qris', 'transfer'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetode(m)}
                    className={`flex-1 py-2 text-[10px] font-semibold rounded-lg border ${
                      metode === m ? 'border-green-700 bg-green-600 text-white' : 'border-stone-200 text-stone-600 bg-white'
                    }`}
                  >
                    {m === 'tunai' ? 'Tunai' : m === 'qris' ? 'QRIS' : 'Transfer'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy || !cart.length}
                onClick={submitTrx}
                className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {busy ? 'Mengirim...' : 'Kirim Transaksi'}
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'riwayat' && (
        <div className="space-y-2">
          {trx.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => expandTrx(t)}
              className="w-full text-left rounded-xl bg-white border border-stone-200 p-3 shadow-sm"
            >
              <div className="flex justify-between items-center text-xs text-stone-500">
                <span>{new Date(t.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.metodeBayar === 'tunai'
                      ? 'bg-stone-100 text-stone-700'
                      : t.metodeBayar === 'qris'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  {t.metodeBayar}
                </span>
              </div>
              <p className="text-sm font-bold text-stone-900 mt-1">Rp {Math.round(t.totalOmzet).toLocaleString('id-ID')}</p>
              <p className="text-[10px] text-stone-500">{t.jumlahItem} item</p>
              {expanded === t.id && (
                <ul className="mt-2 text-xs text-stone-600 space-y-1 border-t border-stone-100 pt-2">
                  {trxItems(t).map((it, idx) => (
                    <li key={idx}>
                      {(it as any).productName ?? 'Item'} × {(it as any).qty ?? 0}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          ))}
          {!trx.length && <p className="text-sm text-stone-500">Belum ada transaksi.</p>}
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-xl space-y-3">
            <p className="text-sm font-bold text-stone-900">{receipt.namaOutlet ?? 'Outlet'}</p>
            <p className="text-xs text-stone-500">{receipt.waktu}</p>
            <ul className="text-xs text-stone-700 space-y-1 max-h-48 overflow-y-auto border border-stone-100 rounded-lg p-2">
              {receipt.items.map((it, idx) => (
                <li key={idx} className="flex justify-between gap-2">
                  <span className="flex-1">
                    {it.productName} × {it.qty}
                  </span>
                  <span className="font-mono shrink-0">Rp {Math.round(it.subtotal).toLocaleString('id-ID')}</span>
                </li>
              ))}
            </ul>
            <p className="text-right text-sm font-bold">Total Rp {Math.round(receipt.total).toLocaleString('id-ID')}</p>
            <p className="text-[10px] text-stone-500">Bayar: {receipt.metodeBayar}</p>
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-bold"
              onClick={() => setReceipt(null)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

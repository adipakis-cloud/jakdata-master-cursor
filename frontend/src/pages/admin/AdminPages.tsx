// ── AdminWarga.tsx ───────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export function AdminWarga() {
  const [warga, setWarga] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [rtList, setRtList] = useState<any[]>([]);
  const [form, setForm] = useState({ nama:'', noHp:'', rtId:'', jenisKelamin:'', pekerjaan:'', kategori:'warga_biasa', statusEkonomi:'', catatan:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/wilayah/rt').then(r => setRtList(r.data)).catch(console.error);
  }, []);

  useEffect(() => { fetchWarga(); }, [q]);

  async function fetchWarga() {
    setLoading(true);
    try { const r = await api.get('/warga', { params: { q, limit: 50 } }); setWarga(r.data.data); setTotal(r.data.total); }
    catch {} finally { setLoading(false); }
  }

  async function saveWarga() {
    if (!form.nama || !form.rtId) return alert('Nama dan RT wajib diisi');
    setSaving(true);
    try { await api.post('/warga', form); setShowForm(false); setForm({ nama:'', noHp:'', rtId:'', jenisKelamin:'', pekerjaan:'', kategori:'warga_biasa', statusEkonomi:'', catatan:'' }); fetchWarga(); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  const kategoriColors: Record<string,string> = { warga_biasa:'badge-gray', ketua_rt:'badge-blue', ketua_rw:'badge-purple', penerima_bantuan:'badge-orange', pekerja_warmindo:'badge-green', koordinator:'badge-blue' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Data Warga</h1><p className="text-sm text-gray-500">{total.toLocaleString('id-ID')} warga terdaftar</p></div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Tambah Warga</button>
      </div>

      <div className="flex gap-3">
        <input className="input flex-1" placeholder="Cari nama warga..." value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-gray-900">Tambah Warga</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="label">Nama Lengkap *</label><input className="input" value={form.nama} onChange={e=>setForm({...form,nama:e.target.value})} placeholder="Nama lengkap" /></div>
              <div><label className="label">No. HP</label><input className="input" type="tel" value={form.noHp} onChange={e=>setForm({...form,noHp:e.target.value})} placeholder="081x..." /></div>
              <div><label className="label">RT *</label>
                <select className="input" value={form.rtId} onChange={e=>setForm({...form,rtId:e.target.value})}>
                  <option value="">Pilih RT...</option>
                  {rtList.map((rt:any) => <option key={rt.id} value={rt.id}>RT {rt.nomor} RW {rt.rw?.nomor} — {rt.rw?.kelurahan?.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Jenis Kelamin</label>
                  <select className="input" value={form.jenisKelamin} onChange={e=>setForm({...form,jenisKelamin:e.target.value})}>
                    <option value="">Pilih...</option><option value="L">Laki-laki</option><option value="P">Perempuan</option>
                  </select>
                </div>
                <div><label className="label">Kategori</label>
                  <select className="input" value={form.kategori} onChange={e=>setForm({...form,kategori:e.target.value})}>
                    <option value="warga_biasa">Warga Biasa</option>
                    <option value="ketua_rt">Ketua RT</option>
                    <option value="ketua_rw">Ketua RW</option>
                    <option value="koordinator">Koordinator</option>
                    <option value="penerima_bantuan">Penerima Bantuan</option>
                    <option value="pekerja_warmindo">Pekerja Warmindo</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Pekerjaan</label><input className="input" value={form.pekerjaan} onChange={e=>setForm({...form,pekerjaan:e.target.value})} placeholder="Pekerjaan (opsional)" /></div>
              <div><label className="label">Status Ekonomi</label>
                <select className="input" value={form.statusEkonomi} onChange={e=>setForm({...form,statusEkonomi:e.target.value})}>
                  <option value="">Pilih...</option>
                  {['sangat_miskin','miskin','rentan','sedang','mampu'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
              <div><label className="label">Catatan</label><textarea className="input" rows={2} value={form.catatan} onChange={e=>setForm({...form,catatan:e.target.value})} placeholder="Catatan tambahan..." /></div>
              <button className="btn-primary w-full justify-center py-3" disabled={saving} onClick={saveWarga}>{saving ? 'Menyimpan...' : 'Simpan Warga'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Memuat...</div> :
        warga.length === 0 ? <div className="p-8 text-center text-gray-400">Belum ada data warga</div> :
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Nama','No. HP','Lokasi','Kategori','Status Ekonomi'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {warga.map((w:any) => (
              <tr key={w.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800">{w.nama}</td>
                <td className="px-4 py-3 text-gray-500">{w.noHp ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">RT {w.rt?.nomor} RW {w.rt?.rw?.nomor}<br/><span className="text-gray-400">{w.rt?.rw?.kelurahan?.nama}</span></td>
                <td className="px-4 py-3"><span className={kategoriColors[w.kategori] ?? 'badge-gray'}>{w.kategori?.replace(/_/g,' ')}</span></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{w.statusEkonomi?.replace('_',' ') ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
    </div>
  );
}

// ── AdminLaporan.tsx ─────────────────────────────────────────────
export function AdminLaporan() {
  const [laporan, setLaporan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status:'', urgency:'' });
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { fetchLaporan(); }, [filter]);

  async function fetchLaporan() {
    setLoading(true);
    try { const r = await api.get('/laporan', { params: { ...filter, limit: 30 } }); setLaporan(r.data.data); }
    catch {} finally { setLoading(false); }
  }

  async function updateStatus(id: number, status: string) {
    await api.patch(`/laporan/${id}/status`, { status });
    fetchLaporan();
    if (selected?.id === id) setSelected({ ...selected, status });
  }

  const urgencyBadge: Record<string,string> = { critical:'badge-red', high:'badge-orange', medium:'badge-yellow', low:'badge-green' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Laporan Warga</h1>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select className="input w-auto" value={filter.urgency} onChange={e=>setFilter({...filter,urgency:e.target.value})}>
          <option value="">Semua Urgensi</option>
          {['critical','high','medium','low'].map(u=><option key={u} value={u}>{u.toUpperCase()}</option>)}
        </select>
        <select className="input w-auto" value={filter.status} onChange={e=>setFilter({...filter,status:e.target.value})}>
          <option value="">Semua Status</option>
          {['baru','diproses','menunggu_data','eskalasi','selesai','ditolak'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Memuat...</div> :
        laporan.length === 0 ? <div className="p-8 text-center text-gray-400">Tidak ada laporan</div> :
        <div className="divide-y divide-gray-50">
          {laporan.map((l:any) => (
            <div key={l.id} className={`p-4 cursor-pointer hover:bg-gray-50 ${l.isEmergency ? 'border-l-2 border-red-500' : ''}`} onClick={()=>setSelected(l)}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 flex-wrap items-center">
                    {l.isEmergency && <span className="badge-red text-xs">🚨</span>}
                    <span className={urgencyBadge[l.urgencyLevel]}>{l.urgencyLevel?.toUpperCase()}</span>
                    <span className="text-xs font-mono text-gray-400">{l.kodeLaporan}</span>
                    <span className="badge-gray text-xs">{l.kategori}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-1">{l.namaPelapor ?? 'Anonim'}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{l.aiSummary ?? l.isiLaporan}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.lokasiText ?? '—'} · {new Date(l.createdAt).toLocaleString('id-ID')}</p>
                </div>
                <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white" value={l.status} onChange={e=>{ e.stopPropagation(); updateStatus(l.id, e.target.value); }}>
                  {['baru','diproses','menunggu_data','eskalasi','selesai','ditolak'].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white">
              <div><p className="font-mono text-xs text-gray-400">{selected.kodeLaporan}</p><h3 className="font-bold text-gray-900">{selected.namaPelapor ?? 'Anonim'}</h3></div>
              <button onClick={()=>setSelected(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <span className={urgencyBadge[selected.urgencyLevel]}>{selected.urgencyLevel?.toUpperCase()}</span>
                <span className="badge-gray">{selected.kategori}</span>
                {selected.subkategori && <span className="badge-gray">{selected.subkategori}</span>}
              </div>
              <div><p className="label">Isi Laporan</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selected.isiLaporan}</p></div>
              {selected.aiSummary && <div><p className="label">Ringkasan AI</p><p className="text-sm text-blue-700 bg-blue-50 rounded-lg p-3">🤖 {selected.aiSummary}</p></div>}
              {selected.lampiranUrls?.length > 0 && (
                <div><p className="label">Lampiran</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.lampiranUrls.map((url:string,i:number) => <a key={i} href={url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">Foto {i+1}</a>)}
                  </div>
                </div>
              )}
              <div><p className="label">Update Status</p>
                <select className="input" value={selected.status} onChange={e=>{ updateStatus(selected.id, e.target.value); }}>
                  {['baru','diproses','menunggu_data','eskalasi','selesai','ditolak'].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AdminWarmindo.tsx ─────────────────────────────────────────────
export function AdminWarmindo() {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTrxForm, setShowTrxForm] = useState(false);
  const [trxForm, setTrxForm] = useState({ totalOmzet:'', totalHpp:'', jumlahItem:'', catatan:'' });

  useEffect(() => {
    Promise.all([api.get('/warmindo'), api.get('/warmindo/summary')])
      .then(([o, s]) => { setOutlets(o.data); setSummary(s.data); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  }, []);

  async function loadDetail(id: number) {
    const [d, k] = await Promise.all([api.get(`/warmindo/${id}`), api.get(`/warmindo/${id}/keuangan`)]);
    setDetail({ ...d.data, keuangan: k.data });
    setSelected(d.data);
  }

  async function saveTrx() {
    if (!trxForm.totalOmzet || !selected) return;
    await api.post(`/warmindo/${selected.id}/transaksi`, trxForm);
    setShowTrxForm(false);
    loadDetail(selected.id);
  }

  const statusColor: Record<string,string> = { aktif:'badge-green', rencana:'badge-blue', persiapan:'badge-yellow', evaluasi:'badge-orange', tutup:'badge-red' };
  const fmtRp = (n:number) => `Rp${(n??0).toLocaleString('id-ID')}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Warmindo & UMKM</h1>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-3"><p className="text-xs text-gray-400">Outlet Aktif</p><p className="text-xl font-bold">{summary.activeOutlets}</p></div>
          <div className="card p-3"><p className="text-xs text-gray-400">Omzet Hari Ini</p><p className="text-xl font-bold">{fmtRp(summary.dailyOmzet)}</p></div>
          <div className="card p-3"><p className="text-xs text-gray-400">Profit Estimate</p><p className={`text-xl font-bold ${summary.profitEstimate < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtRp(summary.profitEstimate)}</p></div>
          <div className="card p-3"><p className="text-xs text-gray-400">Issue Staff/Stok</p><p className="text-xl font-bold text-orange-600">{(summary.staffAttendanceIssues??0) + (summary.lowStock?.length??0)}</p></div>
        </div>
      )}

      {summary?.topProducts?.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Top Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {summary.topProducts.map((p:any) => <div key={p.productName} className="bg-gray-50 rounded-lg p-2"><p className="text-sm font-semibold">{p.productName}</p><p className="text-xs text-gray-500">{p.qty} terjual · {fmtRp(p.total)}</p></div>)}
          </div>
        </div>
      )}

      {summary?.lowStock?.length > 0 && (
        <div className="card p-4 border-l-4 border-orange-400">
          <h2 className="font-semibold mb-2 text-orange-700">Low Stock & Operational Issues</h2>
          <div className="space-y-1 text-sm">
            {summary.lowStock.slice(0,6).map((i:any,idx:number)=><p key={idx}>{i.outlet}: <b>{i.item}</b> {i.stok}/{i.minimum} {i.satuan}</p>)}
            {summary.problematicOutlet && <p className="text-red-600 font-semibold">Problematic outlet: {summary.problematicOutlet.namaOutlet}</p>}
          </div>
        </div>
      )}

      {loading ? <div className="p-8 text-center text-gray-400">Memuat...</div> :
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {outlets.map((o:any) => (
          <div key={o.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={()=>loadDetail(o.id)}>
            <div className="flex items-start justify-between mb-3">
              <div><p className="font-bold text-gray-900">{o.namaOutlet}</p><p className="text-xs text-gray-400 font-mono">{o.kodeOutlet}</p></div>
              <span className={statusColor[o.status] ?? 'badge-gray'}>{o.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Target/Hari</p><p className="text-sm font-bold text-gray-700">{fmtRp(o.targetOmzetHarian)}</p></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Inventory</p><p className="text-sm font-bold text-gray-700">{o.inventory?.length ?? 0} item</p></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Modal Awal</p><p className="text-sm font-bold text-gray-700">{fmtRp(o.modalAwal).replace('Rp','')}</p></div>
            </div>
          </div>
        ))}
      </div>}

      {/* Detail Panel */}
      {selected && detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={()=>setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="p-4 border-b sticky top-0 bg-white flex justify-between">
              <div><h3 className="font-bold">{selected.namaOutlet}</h3><p className="text-xs text-gray-400">{selected.kodeOutlet}</p></div>
              <button onClick={()=>setSelected(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Hari ini */}
              <div><p className="label">Hari Ini</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['Omzet',detail.hariIni?.omzet,'blue'],['Laba Kotor',detail.hariIni?.labaKotor,'green'],['Pengeluaran',detail.hariIni?.pengeluaran,'orange'],['Laba Bersih',detail.hariIni?.labaBersih,detail.hariIni?.labaBersih>=0?'green':'red']].map(([l,v,c])=>(
                    <div key={l as string} className={`bg-${c}-50 rounded-xl p-3`}><p className="text-xs text-gray-500">{l}</p><p className={`font-bold text-${c}-700`}>{fmtRp(v as number)}</p></div>
                  ))}
                </div>
              </div>
              {/* Bulan ini */}
              <div><p className="label">Bulan Ini ({detail.keuangan?.bulan})</p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                  {[['Omzet',detail.keuangan?.omzet],['Laba Kotor',detail.keuangan?.labaKotor],['Total Pengeluaran',detail.keuangan?.pengeluaran],['Laba Bersih',detail.keuangan?.labaBersih]].map(([l,v])=>(
                    <div key={l as string} className="flex justify-between"><span className="text-gray-500">{l}</span><span className="font-semibold">{fmtRp(v as number)}</span></div>
                  ))}
                </div>
              </div>
              {/* Inventory */}
              <div><p className="label">Stok Inventory</p>
                <div className="space-y-1">
                  {detail.inventory?.map((inv:any) => (
                    <div key={inv.id} className={`flex justify-between text-sm p-2 rounded-lg ${inv.stokSaatIni <= inv.stokMinimum ? 'bg-red-50 text-red-700' : 'bg-gray-50'}`}>
                      <span>{inv.namaBahan}</span>
                      <span className="font-semibold">{inv.stokSaatIni} {inv.satuan}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn-primary w-full justify-center" onClick={()=>setShowTrxForm(true)}>+ Catat Transaksi</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaksi Form */}
      {showTrxForm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold">Catat Transaksi Penjualan</h3>
            <div><label className="label">Total Omzet (Rp)</label><input className="input" type="number" value={trxForm.totalOmzet} onChange={e=>setTrxForm({...trxForm,totalOmzet:e.target.value})} /></div>
            <div><label className="label">Total HPP (Rp)</label><input className="input" type="number" value={trxForm.totalHpp} onChange={e=>setTrxForm({...trxForm,totalHpp:e.target.value})} /></div>
            <div><label className="label">Jumlah Item Terjual</label><input className="input" type="number" value={trxForm.jumlahItem} onChange={e=>setTrxForm({...trxForm,jumlahItem:e.target.value})} /></div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={()=>setShowTrxForm(false)}>Batal</button>
              <button className="btn-primary flex-1 justify-center" onClick={saveTrx}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AdminBantuan.tsx ──────────────────────────────────────────────
export function AdminBantuan() {
  const [bantuan, setBantuan] = useState<any[]>([]);
  const [penerima, setPenerima] = useState<any[]>([]);
  const [fairness, setFairness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/bantuan'), api.get('/bantuan/penerima'), api.get('/bantuan/fairness')]).then(([b,p,f]) => { setBantuan(b.data); setPenerima(p.data); setFairness(f.data); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const fmtRp = (n:number) => `Rp${(n??0).toLocaleString('id-ID')}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Manajemen Bantuan</h1>
      {loading ? <div className="p-8 text-center text-gray-400">Memuat...</div> :
      <>
        {fairness && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="card p-3"><p className="text-xs text-gray-400">Fairness Score</p><p className={`text-xl font-bold ${(fairness.snapshot?.fairnessScore??0)<70?'text-red-600':'text-green-600'}`}>{fairness.snapshot?.fairnessScore ?? 0}</p></div>
            <div className="card p-3"><p className="text-xs text-gray-400">Repeated Recipients</p><p className="text-xl font-bold text-orange-600">{fairness.repeatedRecipients?.length ?? 0}</p></div>
            <div className="card p-3"><p className="text-xs text-gray-400">High-Risk Uncovered</p><p className="text-xl font-bold text-red-600">{fairness.uncoveredFamilies?.length ?? 0}</p></div>
            <div className="card p-3"><p className="text-xs text-gray-400">Aid Anomalies</p><p className="text-xl font-bold">{fairness.anomalies?.length ?? 0}</p></div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bantuan.map((b:any) => (
            <div key={b.id} className="card p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-800">{b.nama}</h3>
                <span className="badge-blue">{b.tipe}</span>
              </div>
              <div className="text-sm space-y-1 text-gray-500">
                <div className="flex justify-between"><span>Stok Tersisa</span><span className="font-semibold text-gray-800">{b.stokTersisa} {b.satuan}</span></div>
                <div className="flex justify-between"><span>Nilai</span><span>{fmtRp(b.nilaiPerSatuan)}/ {b.satuan}</span></div>
                <div className="flex justify-between"><span>Penerima</span><span>{b._count?.penerima ?? 0} orang</span></div>
              </div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min(100,(b.stokTersisa/b.stokTotal)*100)}%`}} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{((b.stokTersisa/b.stokTotal)*100).toFixed(0)}% tersisa</p>
            </div>
          ))}
        </div>

        {fairness?.anomalies?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h2 className="font-semibold">Fairness & Aid Anomaly List</h2></div>
            <div className="divide-y divide-gray-50">
              {fairness.anomalies.slice(0,8).map((a:any)=>(
                <div key={a.id} className="p-3 text-sm">
                  <div className="flex justify-between gap-3"><p className="font-semibold">{a.title}</p><span className={a.severity==='critical'?'badge-red':'badge-orange'}>{a.severity}</span></div>
                  <p className="text-gray-500 text-xs mt-1">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h2 className="font-semibold">Daftar Penerima Bantuan</h2></div>
          {penerima.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">Belum ada penerima</div> :
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>{['Nama Penerima','Bantuan','Jumlah','Status','Tanggal'].map(h=><th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {penerima.map((p:any)=>(
                <tr key={p.id}><td className="px-4 py-3 font-medium">{p.namaPenerima}</td><td className="px-4 py-3 text-gray-500">{p.bantuan?.nama}</td><td className="px-4 py-3">{p.jumlahDiterima}</td><td className="px-4 py-3"><span className={p.status==='diterima'?'badge-green':'badge-orange'}>{p.status}</span></td><td className="px-4 py-3 text-gray-400 text-xs">{p.tanggalDiterima?new Date(p.tanggalDiterima).toLocaleDateString('id-ID'):'—'}</td></tr>
              ))}
            </tbody>
          </table>}
        </div>
      </>}
    </div>
  );
}

// ── AdminAI.tsx ───────────────────────────────────────────────────
export function AdminAI() {
  const [recs, setRecs] = useState<any>(null);
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [designForm, setDesignForm] = useState({ platform:'instagram', prompt:'' });
  const [designResult, setDesignResult] = useState('');
  const [designing, setDesigning] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/ai/recommendations'), api.get('/ai/memory')])
      .then(([r,m]) => { setRecs(r.data); setMemory(m.data); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  }, []);

  async function generateContent() {
    if (!designForm.prompt) return;
    setDesigning(true); setDesignResult('');
    try {
      const { data } = await api.post('/ai/design', { tipe:'caption', platform: designForm.platform, inputData: { prompt: designForm.prompt } });
      // Poll for result
      let result = null;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const r = await api.get(`/ai/design/${data.jobId}`);
        if (r.data.status === 'done') { result = r.data.generatedText; break; }
        if (r.data.status === 'failed') break;
      }
      setDesignResult(result ?? 'AI tidak tersedia. Pastikan ANTHROPIC_API_KEY sudah diset di server.');
    } catch { setDesignResult('Gagal menghubungi AI.'); }
    finally { setDesigning(false); }
  }

  const prioColors: Record<string,string> = { critical:'badge-red', high:'badge-orange', medium:'badge-yellow', low:'badge-green' };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">AI Command Center</h1>

      {/* Recommendations */}
      <div className="card p-4">
        <h2 className="font-semibold mb-4">🤖 Rekomendasi AI Terkini</h2>
        {loading ? <p className="text-gray-400 text-sm">Menganalisis data...</p> :
        <div className="space-y-2">
          {[...(recs?.wilayah??[]), ...(recs?.laporan??[]), ...(recs?.warmindo??[]), ...(recs?.bantuan??[]), ...(recs?.governance??[]), ...(recs?.memory??[])].map((r:any,i:number) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className={prioColors[r.prioritas] ?? 'badge-gray'}>{r.prioritas}</span>
              <p className="text-sm text-gray-700">{r.pesan}</p>
            </div>
          ))}
          {(!recs || ([...(recs?.wilayah??[]), ...(recs?.laporan??[]), ...(recs?.warmindo??[]), ...(recs?.bantuan??[]), ...(recs?.governance??[]), ...(recs?.memory??[])].length===0)) && <p className="text-gray-400 text-sm">Tidak ada rekomendasi saat ini. Semua indikator normal.</p>}
        </div>}
      </div>

      {memory && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4">
            <h2 className="font-semibold mb-3">AI Observations</h2>
            <div className="space-y-2">
              {memory.observations?.slice(0,5).map((o:any)=><div key={o.id} className="bg-gray-50 rounded-lg p-3"><div className="flex justify-between"><p className="font-semibold text-sm">{o.title}</p><span className={prioColors[o.severity]??'badge-gray'}>{o.severity}</span></div><p className="text-xs text-gray-500 mt-1">{o.summary}</p></div>)}
            </div>
          </div>
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Decision & Outcome Tracking</h2>
            <div className="space-y-2">
              {memory.recommendations?.slice(0,4).map((r:any)=><div key={r.id} className="bg-gray-50 rounded-lg p-3"><div className="flex justify-between"><p className="font-semibold text-sm">{r.domain}</p><span className={r.status==='accepted'?'badge-green':r.status==='rejected'||r.status==='failed'?'badge-red':'badge-yellow'}>{r.status}</span></div><p className="text-xs text-gray-500 mt-1">{r.recommendation}</p></div>)}
              {memory.outcomes?.slice(0,3).map((o:any)=><div key={o.id} className="text-xs bg-blue-50 rounded-lg p-2 text-blue-800">{o.metricName}: {o.baselineValue} → {o.currentValue} / target {o.targetValue} ({o.status})</div>)}
            </div>
          </div>
        </div>
      )}

      {/* AI Design Generator */}
      <div className="card p-4">
        <h2 className="font-semibold mb-1">✨ AI Design & Media Generator</h2>
        <p className="text-xs text-gray-400 mb-4">Generate caption, copy, atau script untuk kegiatan JAKDATA. AI bekerja di server — tidak ada API key di browser.</p>
        <div className="space-y-3">
          <div><label className="label">Platform</label>
            <div className="flex gap-2">
              {['instagram','tiktok','whatsapp','poster'].map(p=>(
                <button key={p} onClick={()=>setDesignForm({...designForm,platform:p})} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${designForm.platform===p?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div><label className="label">Deskripsi Konten</label>
            <textarea className="input" rows={3} value={designForm.prompt} onChange={e=>setDesignForm({...designForm,prompt:e.target.value})} placeholder="Data Awal Sistem: Kegiatan pendataan warga RT 001 RW 002 Kelurahan Kapuk, 10 Mei 2026..." />
          </div>
          <button className="btn-primary" disabled={designing} onClick={generateContent}>{designing ? '⏳ Generating...' : '✨ Generate'}</button>
          {designResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-semibold mb-2">HASIL:</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{designResult}</p>
              <button onClick={()=>navigator.clipboard?.writeText(designResult)} className="mt-2 text-xs text-blue-600 font-semibold hover:underline">📋 Salin</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AdminWilayah.tsx ──────────────────────────────────────────────
export function AdminWilayah() {
  const [readiness, setReadiness] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/wilayah/rt-readiness', { headers: { Authorization: `Bearer ${localStorage.getItem('jakdata_token')}` } }).then(r=>setReadiness(r.data)).catch(console.error).finally(()=>setLoading(false)); }, []);

  const lengkap = readiness.filter(r=>r.sudahLengkap).length;
  const belum = readiness.filter(r=>!r.sudahLengkap).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Data Wilayah</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 text-center"><p className="text-xs text-gray-500 uppercase font-semibold">Total RT</p><p className="text-2xl font-bold mt-1">{readiness.length}</p></div>
        <div className="card p-4 text-center"><p className="text-xs text-green-600 uppercase font-semibold">RT Lengkap</p><p className="text-2xl font-bold text-green-600 mt-1">{lengkap}</p></div>
        <div className="card p-4 text-center"><p className="text-xs text-orange-600 uppercase font-semibold">RT Belum Lengkap</p><p className="text-2xl font-bold text-orange-500 mt-1">{belum}</p></div>
        <div className="card p-4 text-center"><p className="text-xs text-gray-500 uppercase font-semibold">Coverage</p><p className="text-2xl font-bold mt-1">{readiness.length ? Math.round(lengkap/readiness.length*100) : 0}%</p></div>
      </div>

      {loading ? <div className="p-8 text-center text-gray-400">Memuat...</div> :
      <div className="card overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold">Status RT — Target Minimal 10 Warga</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>{['RT','RW','Kelurahan','Kecamatan','Warga','Progress','Status'].map(h=><th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {readiness.map((rt:any)=>(
              <tr key={rt.id} className={rt.sudahLengkap ? '' : 'bg-orange-50/30'}>
                <td className="px-4 py-2.5 font-medium">RT {rt.nomor}</td>
                <td className="px-4 py-2.5 text-gray-500">RW {rt.rw}</td>
                <td className="px-4 py-2.5 text-gray-500">{rt.kelurahan}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{rt.kecamatan}</td>
                <td className="px-4 py-2.5 font-semibold">{rt.jumlahWarga}/10</td>
                <td className="px-4 py-2.5 w-24">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${rt.sudahLengkap?'bg-green-500':rt.jumlahWarga>0?'bg-orange-400':'bg-red-400'}`} style={{width:`${rt.persen}%`}} />
                  </div>
                </td>
                <td className="px-4 py-2.5"><span className={rt.sudahLengkap?'badge-green':'badge-orange'}>{rt.sudahLengkap?'Lengkap':'Kurang'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );
}

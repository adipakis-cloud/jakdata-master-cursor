import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth.store';

type Page = 'home' | 'tambah_warga' | 'buat_laporan' | 'list_warga';

export function FieldApp() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [page, setPage] = useState<Page>('home');
  const [stats, setStats] = useState<any>(null);
  const [warga, setWarga] = useState<any[]>([]);
  const [rtInfo, setRtInfo] = useState<any>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [s, w] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/warga', { params: { limit: 100 } }),
      ]);
      setStats(s.data.stats);
      setWarga(w.data.data);
      if (user?.rtId) {
        const rt = await api.get(`/wilayah/rt`, { params: { rwId: user.rwId } });
        const myRT = rt.data?.find((r:any) => r.id === user.rtId);
        setRtInfo(myRT);
      }
    } catch (e) { console.error(e); }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const handleLogout = () => { logout(); nav('/login', { replace: true }); };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-semibold">
          ✅ {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-700 text-white px-4 pt-10 pb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-lg">🗺️</div>
            <span className="font-bold text-sm">JAKDATA Lapangan</span>
          </div>
          <button onClick={handleLogout} className="text-blue-200 text-xs hover:text-white">Keluar</button>
        </div>
        <div className="mt-2">
          <p className="text-blue-100 text-sm">Halo, <span className="text-white font-semibold">{user?.nama?.split(' ')[0]}</span></p>
          <p className="text-blue-200 text-xs mt-0.5">{user?.role?.replace(/_/g,' ')}</p>
        </div>
        {rtInfo && (
          <div className="mt-3 bg-white/10 rounded-xl px-3 py-2">
            <p className="text-xs text-blue-200">Wilayah Anda</p>
            <p className="text-white font-semibold text-sm">RT {rtInfo.nomor} — {rtInfo.rw?.kelurahan?.nama}</p>
            <div className="mt-1.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full transition-all" style={{width:`${Math.min(100,(rtInfo._count?.warga/10)*100)}%`}} />
            </div>
            <p className="text-blue-200 text-xs mt-1">{rtInfo._count?.warga ?? 0}/10 warga (target minimal)</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-5">
        {page === 'home' && <FieldHome setPage={setPage} warga={warga} stats={stats} />}
        {page === 'list_warga' && <FieldListWarga warga={warga} setPage={setPage} />}
        {page === 'tambah_warga' && <FieldTambahWarga user={user} setPage={setPage} onSuccess={() => { loadData(); showToast('Warga berhasil ditambahkan!'); }} />}
        {page === 'buat_laporan' && <FieldBuatLaporan user={user} setPage={setPage} onSuccess={() => { loadData(); showToast('Laporan berhasil dikirim!'); }} />}
      </div>
    </div>
  );
}

// ── Home ─────────────────────────────────────────────────────────
function FieldHome({ setPage, warga, stats }: any) {
  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{warga.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Warga Didata</p>
        </div>
        <div className="card p-4 text-center">
          <p className={`text-2xl font-bold ${stats?.laporanCritical > 0 ? 'text-red-600' : 'text-gray-400'}`}>{stats?.laporanCritical ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Laporan Critical</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setPage('tambah_warga')} className="card p-5 text-center hover:shadow-md transition-shadow active:scale-95">
          <div className="text-3xl mb-2">👤</div>
          <p className="font-semibold text-gray-800 text-sm">Tambah Warga</p>
          <p className="text-xs text-gray-400 mt-0.5">Daftarkan warga baru</p>
        </button>
        <button onClick={() => setPage('buat_laporan')} className="card p-5 text-center hover:shadow-md transition-shadow active:scale-95">
          <div className="text-3xl mb-2">📋</div>
          <p className="font-semibold text-gray-800 text-sm">Buat Laporan</p>
          <p className="text-xs text-gray-400 mt-0.5">Laporkan masalah warga</p>
        </button>
      </div>

      <button onClick={() => setPage('list_warga')} className="w-full card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <div className="text-left"><p className="font-semibold text-gray-800">Daftar Warga</p><p className="text-xs text-gray-400">{warga.length} warga terdaftar</p></div>
        </div>
        <span className="text-gray-400">›</span>
      </button>

      {/* Recent warga */}
      {warga.slice(0,5).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-semibold text-gray-700">Baru Ditambahkan</p></div>
          {warga.slice(0,5).map((w:any) => (
            <div key={w.id} className="px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{w.nama[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{w.nama}</p>
                <p className="text-xs text-gray-400">{w.kategori?.replace(/_/g,' ')}</p>
              </div>
              {w.noHp && <a href={`tel:${w.noHp}`} className="text-green-600 text-lg">📞</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── List Warga ────────────────────────────────────────────────────
function FieldListWarga({ warga, setPage }: any) {
  const [q, setQ] = useState('');
  const filtered = warga.filter((w:any) => w.nama.toLowerCase().includes(q.toLowerCase()));

  const kategoriIcon: Record<string,string> = { warga_biasa:'👤', ketua_rt:'🏠', ketua_rw:'🏘️', koordinator:'📋', penerima_bantuan:'🎁', pekerja_warmindo:'🍜' };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={() => setPage('home')} className="text-blue-600 font-semibold text-sm">← Kembali</button>
        <h2 className="font-bold text-gray-900">Daftar Warga</h2>
      </div>
      <input className="input" placeholder="Cari nama..." value={q} onChange={e=>setQ(e.target.value)} />
      <div className="card divide-y divide-gray-50 overflow-hidden">
        {filtered.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">Tidak ditemukan</p>}
        {filtered.map((w:any) => (
          <div key={w.id} className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">{w.nama[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{w.nama}</p>
              <p className="text-xs text-gray-400">{w.noHp ?? 'No HP tidak ada'} · RT {w.rt?.nomor}</p>
            </div>
            <div className="text-center shrink-0">
              <div className="text-lg">{kategoriIcon[w.kategori] ?? '👤'}</div>
              {w.noHp && <a href={`tel:${w.noHp}`} onClick={e=>e.stopPropagation()} className="text-xs text-green-600">Hubungi</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tambah Warga ──────────────────────────────────────────────────
function FieldTambahWarga({ user, setPage, onSuccess }: any) {
  const [rtList, setRtList] = useState<any[]>([]);
  const [form, setForm] = useState({ nama:'', noHp:'', rtId: String(user?.rtId ?? ''), jenisKelamin:'', kategori:'warga_biasa', pekerjaan:'', statusEkonomi:'', catatan:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/wilayah/rt').then(r => setRtList(r.data)).catch(console.error);
  }, []);

  async function submit() {
    if (!form.nama.trim()) { setError('Nama wajib diisi'); return; }
    if (!form.rtId) { setError('RT wajib dipilih'); return; }
    setError(''); setSaving(true);
    try {
      await api.post('/warga', form);
      onSuccess();
      setPage('home');
    } catch (e:any) { setError(e.response?.data?.error ?? 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setPage('home')} className="text-blue-600 font-semibold text-sm">← Kembali</button>
        <h2 className="font-bold text-gray-900">Tambah Warga</h2>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      <div className="card p-4 space-y-4">
        <div><label className="label">Nama Lengkap *</label><input className="input" autoFocus value={form.nama} onChange={e=>setForm({...form,nama:e.target.value})} placeholder="Masukkan nama lengkap" /></div>
        <div><label className="label">No. HP / WA</label><input className="input" type="tel" inputMode="tel" value={form.noHp} onChange={e=>setForm({...form,noHp:e.target.value})} placeholder="081xxx..." /></div>
        <div><label className="label">RT *</label>
          <select className="input" value={form.rtId} onChange={e=>setForm({...form,rtId:e.target.value})}>
            <option value="">Pilih RT...</option>
            {rtList.map((rt:any) => <option key={rt.id} value={rt.id}>RT {rt.nomor} — {rt.rw?.kelurahan?.nama}</option>)}
          </select>
        </div>
        <div><label className="label">Kategori Warga</label>
          <select className="input" value={form.kategori} onChange={e=>setForm({...form,kategori:e.target.value})}>
            <option value="warga_biasa">👤 Warga Biasa</option>
            <option value="ketua_rt">🏠 Ketua RT</option>
            <option value="ketua_rw">🏘️ Ketua RW</option>
            <option value="koordinator">📋 Koordinator</option>
            <option value="penerima_bantuan">🎁 Penerima Bantuan</option>
            <option value="pekerja_warmindo">🍜 Pekerja Warmindo</option>
          </select>
        </div>
        <div><label className="label">Pekerjaan</label><input className="input" value={form.pekerjaan} onChange={e=>setForm({...form,pekerjaan:e.target.value})} placeholder="Pedagang, Buruh, dsb..." /></div>
        <div><label className="label">Status Ekonomi</label>
          <select className="input" value={form.statusEkonomi} onChange={e=>setForm({...form,statusEkonomi:e.target.value})}>
            <option value="">Pilih status...</option>
            <option value="sangat_miskin">Sangat Miskin</option>
            <option value="miskin">Miskin</option>
            <option value="rentan">Rentan</option>
            <option value="sedang">Sedang</option>
            <option value="mampu">Mampu</option>
          </select>
        </div>
        <div><label className="label">Catatan</label><textarea className="input" rows={2} value={form.catatan} onChange={e=>setForm({...form,catatan:e.target.value})} placeholder="Info tambahan (opsional)" /></div>
      </div>

      <button className="btn-primary w-full justify-center py-4 text-base" disabled={saving} onClick={submit}>
        {saving ? '⏳ Menyimpan...' : '✅ Simpan Warga'}
      </button>
    </div>
  );
}

// ── Buat Laporan ──────────────────────────────────────────────────
function FieldBuatLaporan({ user, setPage, onSuccess }: any) {
  const [form, setForm] = useState({ kategori:'', subkategori:'', urgencyLevel:'medium', isiLaporan:'', namaPelapor:'', noHpPelapor:'', lokasiText:'', lampiranUrls:[] as string[] });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const kategoriList = ['bencana','sosial','pendidikan','kesehatan','ekonomi','bantuan'];
  const subkategoriMap: Record<string,string[]> = {
    bencana: ['banjir','kebakaran','longsor','evakuasi','darurat'],
    sosial: ['anak_jalanan','lansia_terlantar','keluarga_tidak_makan','keluarga_miskin'],
    pendidikan: ['anak_putus_sekolah','butuh_seragam','butuh_biaya_sekolah'],
    kesehatan: ['butuh_ambulans','warga_sakit','ibu_hamil_berisiko','butuh_obat'],
    ekonomi: ['kehilangan_pekerjaan','butuh_kerja','umkm_butuh_bantuan','butuh_modal'],
    bantuan: ['bantuan_belum_terima','bantuan_salah_sasaran','penyalahgunaan'],
  };

  async function uploadFoto() {
    if (!fileRef.current?.files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', fileRef.current.files[0]);
      const { data } = await api.post('/laporan/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(f => ({ ...f, lampiranUrls: [...f.lampiranUrls, data.url] }));
    } catch { alert('Gagal upload foto'); }
    finally { setUploading(false); }
  }

  async function submit() {
    if (!form.kategori || !form.isiLaporan.trim()) { setError('Kategori dan isi laporan wajib diisi'); return; }
    setError(''); setSaving(true);
    try {
      await api.post('/laporan', { ...form, namaPelapor: form.namaPelapor || user?.nama, rtId: user?.rtId });
      onSuccess();
      setPage('home');
    } catch (e:any) { setError(e.response?.data?.error ?? 'Gagal mengirim laporan'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setPage('home')} className="text-blue-600 font-semibold text-sm">← Kembali</button>
        <h2 className="font-bold text-gray-900">Buat Laporan</h2>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">{error}</div>}

      <div className="card p-4 space-y-4">
        <div><label className="label">Nama Pelapor</label><input className="input" value={form.namaPelapor} onChange={e=>setForm({...form,namaPelapor:e.target.value})} placeholder={user?.nama ?? 'Nama Anda'} /></div>
        <div><label className="label">No. HP / WA</label><input className="input" type="tel" value={form.noHpPelapor} onChange={e=>setForm({...form,noHpPelapor:e.target.value})} placeholder="081xxx..." /></div>

        <div><label className="label">Kategori Masalah *</label>
          <div className="grid grid-cols-3 gap-2">
            {kategoriList.map(k => (
              <button key={k} onClick={()=>setForm({...form,kategori:k,subkategori:''})}
                className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-colors ${form.kategori===k?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                {k.charAt(0).toUpperCase()+k.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {form.kategori && subkategoriMap[form.kategori] && (
          <div><label className="label">Subkategori</label>
            <select className="input" value={form.subkategori} onChange={e=>setForm({...form,subkategori:e.target.value})}>
              <option value="">Pilih subkategori...</option>
              {subkategoriMap[form.kategori].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
          </div>
        )}

        <div><label className="label">Tingkat Urgensi</label>
          <div className="grid grid-cols-4 gap-2">
            {[['critical','🚨','red'],['high','⚠️','orange'],['medium','📋','yellow'],['low','ℹ️','green']].map(([v,icon,c])=>(
              <button key={v} onClick={()=>setForm({...form,urgencyLevel:v})}
                className={`py-2 text-xs font-bold rounded-xl border transition-colors ${form.urgencyLevel===v?`bg-${c}-500 text-white border-${c}-500`:'bg-white text-gray-500 border-gray-200'}`}>
                {icon}<br/>{v}
              </button>
            ))}
          </div>
        </div>

        <div><label className="label">Lokasi (RT/RW/Alamat)</label><input className="input" value={form.lokasiText} onChange={e=>setForm({...form,lokasiText:e.target.value})} placeholder="RT 001 RW 002 Jl. ..." /></div>

        <div><label className="label">Isi Laporan *</label>
          <textarea className="input" rows={4} value={form.isiLaporan} onChange={e=>setForm({...form,isiLaporan:e.target.value})} placeholder="Jelaskan masalah atau situasi yang terjadi secara detail..." />
        </div>

        <div>
          <label className="label">Foto Bukti (Opsional)</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadFoto} />
          <button onClick={()=>fileRef.current?.click()} disabled={uploading} className="btn-secondary w-full justify-center">
            {uploading ? '⏳ Mengupload...' : '📷 Upload Foto'}
          </button>
          {form.lampiranUrls.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {form.lampiranUrls.map((url,i)=><span key={i} className="badge-green">✅ Foto {i+1}</span>)}
            </div>
          )}
        </div>
      </div>

      <button className="btn-primary w-full justify-center py-4 text-base" disabled={saving} onClick={submit}>
        {saving ? '⏳ Mengirim...' : '📤 Kirim Laporan'}
      </button>
    </div>
  );
}

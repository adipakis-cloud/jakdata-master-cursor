import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { AuthStorage } from '../../lib/auth';
import { useAuth } from '../../store/auth.store';
import { FieldLayout } from './FieldLayout';
import TambahWarga from './TambahWarga';

type FieldCtx = {
  warga: any[];
  stats: any;
  rtInfo: any;
  user: any;
  loadData: () => Promise<void>;
  showToast: (msg: string) => void;
};

const FieldDataContext = createContext<FieldCtx | null>(null);

function useFieldData() {
  const v = useContext(FieldDataContext);
  if (!v) throw new Error('FieldDataContext');
  return v;
}

function prioritasToUrgency(p: string): string {
  const m: Record<string, string> = { RENDAH: 'low', SEDANG: 'medium', TINGGI: 'high', DARURAT: 'critical' };
  return m[p] ?? 'medium';
}

function laporanJudul(l: any): string {
  const raw = String(l.isiLaporan ?? '').trim();
  const first = raw.split(/\n+/)[0];
  if (first && first.length > 0) return first.length > 80 ? `${first.slice(0, 77)}…` : first;
  return String(l.kategori ?? l.kodeLaporan ?? 'Laporan');
}

function laporanStatusUi(status: string): { bg: string; fg: string; label: string } {
  switch (status) {
    case 'baru':
    case 'menunggu_data':
      return { bg: '#fef3c7', fg: '#92400e', label: 'Menunggu' };
    case 'diproses':
    case 'eskalasi':
      return { bg: '#dbeafe', fg: '#1e40af', label: 'Diproses' };
    case 'selesai':
      return { bg: '#dcfce7', fg: '#166534', label: 'Selesai' };
    case 'ditolak':
      return { bg: '#fee2e2', fg: '#991b1b', label: 'Ditolak' };
    default:
      return { bg: '#f3f4f6', fg: '#374151', label: status };
  }
}

function maskNik(s: string | undefined | null): string {
  if (!s || s.length < 4) return '················';
  const tail = s.slice(-4);
  return `············${tail}`;
}

export function FieldApp() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [warga, setWarga] = useState<any[]>([]);
  const [rtInfo, setRtInfo] = useState<any>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadData();
  }, [user?.id]);

  async function loadData() {
    try {
      const [s, w] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/warga', { params: { limit: 100 } }),
      ]);
      setStats(s.data.stats);
      setWarga(Array.isArray(w.data?.data) ? w.data.data : Array.isArray(w.data) ? w.data : []);
      if (user?.rtId) {
        const rt = await api.get(`/wilayah/rt`, { params: { rwId: user.rwId } });
        const myRT = rt.data?.find((r: any) => r.id === user.rtId);
        setRtInfo(myRT);
      } else setRtInfo(null);
    } catch (e) {
      console.error(e);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const ctx: FieldCtx = { warga, stats, rtInfo, user, loadData, showToast };

  return (
    <FieldDataContext.Provider value={ctx}>
      {toast && (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          ✅ {toast}
        </div>
      )}
      <FieldLayout rtInfo={rtInfo}>
        <Routes>
          <Route index element={<Navigate to="laporan" replace />} />
          <Route path="laporan" element={<FieldLaporanListPage />} />
          <Route path="laporan/baru" element={<FieldBuatLaporanRoute />} />
          <Route path="laporan/:id" element={<FieldLaporanDetailRoute />} />
          <Route path="warga" element={<FieldListWargaRoute />} />
          <Route path="warga/tambah" element={<FieldTambahWargaRoute />} />
          <Route path="warga/:id" element={<FieldWargaDetailRoute />} />
          <Route path="bantuan" element={<FieldBantuanRoute />} />
          <Route path="upload" element={<FieldUploadRoute />} />
          <Route path="wilayah" element={<FieldWilayahRoute />} />
          <Route path="profil" element={<FieldProfilRoute onLogout={() => { logout(); nav('/login', { replace: true }); }} />} />
        </Routes>
      </FieldLayout>
    </FieldDataContext.Provider>
  );
}

function FieldLaporanListPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = async (p: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/laporan', { params: { page: p, limit: 10 } });
      const chunk = Array.isArray(data?.data) ? data.data : [];
      setTotalPages(Number(data?.totalPages) || 1);
      setRows((prev) => (append ? [...prev, ...chunk] : chunk));
      setPage(p);
    } catch {
      if (!append) setRows([]);
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPage(1, false);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-[18px] font-bold text-gray-900">Laporan Wilayah Saya</h2>
      <button
        type="button"
        className="w-full rounded-lg py-3 text-[15px] font-semibold text-white"
        style={{ backgroundColor: '#2563eb', minHeight: 44 }}
        onClick={() => nav('/field/laporan/baru')}
      >
        + Buat Laporan
      </button>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((k) => (
            <div key={k} className="h-[72px] animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-red-600">Gagal memuat laporan</p>
          <button type="button" className="btn-secondary mx-auto justify-center px-4 py-2 text-sm" onClick={() => fetchPage(1, false)}>
            Coba Lagi
          </button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="mb-2 text-5xl">📋</div>
          <p className="font-semibold text-gray-800">Belum ada laporan</p>
          <p className="mt-1 text-sm text-gray-500">Tap + Buat Laporan untuk mulai</p>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((l: any) => {
          const st = laporanStatusUi(String(l.status ?? ''));
          const tgl = l.createdAt ? new Date(l.createdAt).toLocaleDateString('id-ID') : '—';
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => nav(`/field/laporan/${l.id}`)}
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm"
              style={{ marginBottom: 8, padding: '12px 16px' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-gray-900">{laporanJudul(l)}</p>
                  <p className="mt-1 text-[12px] text-[#6b7280]">
                    {l.kategori} · {tgl}
                  </p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.fg }}>
                  {st.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {!loading && page < totalPages && (
        <button
          type="button"
          className="btn-secondary w-full justify-center py-3 text-sm"
          disabled={loadingMore}
          onClick={() => fetchPage(page + 1, true)}
        >
          {loadingMore ? 'Memuat…' : 'Muat lebih banyak'}
        </button>
      )}
    </div>
  );
}

function FieldLaporanDetailRoute() {
  const { id } = useParams();
  const nav = useNavigate();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/laporan/${id}`)
      .then((r) => setRow(r.data))
      .catch(() => setRow(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-gray-500">Memuat…</p>;
  if (!row) return <p className="text-sm text-red-600">Laporan tidak ditemukan.</p>;

  const st = laporanStatusUi(String(row.status ?? ''));

  return (
    <div className="space-y-4">
      <button type="button" className="text-sm font-semibold text-blue-600" onClick={() => nav('/field/laporan')}>
        ← Kembali
      </button>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400">{row.kodeLaporan}</p>
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.fg }}>
            {st.label}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-800">{row.kategori}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{row.isiLaporan}</p>
        {row.lokasiText && <p className="mt-2 text-xs text-gray-500">Lokasi: {row.lokasiText}</p>}
      </div>
    </div>
  );
}

const KATEGORI_OPTIONS = [
  { v: 'infrastruktur', l: 'Infrastruktur' },
  { v: 'sosial', l: 'Sosial' },
  { v: 'kesehatan', l: 'Kesehatan' },
  { v: 'keamanan', l: 'Keamanan' },
  { v: 'ekonomi', l: 'Ekonomi' },
  { v: 'lingkungan', l: 'Lingkungan' },
  { v: 'lainnya', l: 'Lainnya' },
];

function FieldBuatLaporanRoute() {
  const { loadData, showToast } = useFieldData();
  const nav = useNavigate();
  return (
    <FieldBuatLaporanForm
      onBack={() => nav('/field/laporan')}
      onSuccess={() => {
        loadData();
        showToast('Laporan berhasil dibuat');
        nav('/field/laporan');
      }}
    />
  );
}

function FieldBuatLaporanForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('');
  const [prioritas, setPrioritas] = useState('SEDANG');
  const [deskripsi, setDeskripsi] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fotoFile) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(fotoFile);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [fotoFile]);

  async function submit() {
    if (!judul.trim() || !kategori || !deskripsi.trim()) {
      setError('Judul, kategori, dan deskripsi wajib diisi');
      return;
    }
    const u = AuthStorage.getUser();
    if (!u) {
      setError('Sesi habis. Silakan login ulang.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      let lampiranUrls: string[] = [];
      if (fotoFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', fotoFile);
        const { data } = await api.post('/laporan/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (data?.url) lampiranUrls = [data.url];
        setUploading(false);
      }

      const isiLaporan = `${judul.trim()}\n\n${deskripsi.trim()}`;
      await api.post('/laporan', {
        isiLaporan,
        kategori,
        subkategori: '',
        urgencyLevel: prioritasToUrgency(prioritas),
        lokasiText: lokasi.trim() || undefined,
        namaPelapor: u.nama,
        rtId: u.rtId ?? undefined,
        rwId: u.rwId ?? undefined,
        kelurahanId: u.kelurahanId ?? undefined,
        kecamatanId: u.kecamatanId ?? undefined,
        lampiranUrls,
      });
      onSuccess();
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Gagal mengirim laporan');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" className="text-sm font-semibold text-blue-600" onClick={onBack}>
          ←
        </button>
        <h2 className="text-lg font-bold text-gray-900">Buat Laporan Baru</h2>
      </div>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card space-y-4 p-4">
        <div>
          <label className="label">Judul</label>
          <input
            className="input min-h-[44px]"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Judul singkat masalah"
            required
          />
        </div>
        <div>
          <label className="label">Kategori</label>
          <select className="input min-h-[44px]" value={kategori} onChange={(e) => setKategori(e.target.value)} required>
            <option value="">Pilih…</option>
            {KATEGORI_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Prioritas</label>
          <select className="input min-h-[44px]" value={prioritas} onChange={(e) => setPrioritas(e.target.value)} required>
            <option value="RENDAH">RENDAH</option>
            <option value="SEDANG">SEDANG</option>
            <option value="TINGGI">TINGGI</option>
            <option value="DARURAT" className="text-red-600">
              DARURAT
            </option>
          </select>
        </div>
        <div>
          <label className="label">Deskripsi</label>
          <textarea
            className="input"
            rows={4}
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Jelaskan situasi secara detail..."
            required
          />
        </div>
        <div>
          <label className="label">Lokasi (opsional)</label>
          <input
            className="input min-h-[44px]"
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            placeholder="Alamat atau patokan lokasi"
          />
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-lg text-sm font-medium text-gray-600"
            style={{ border: '2px dashed #d1d5db', minHeight: 80 }}
          >
            📷 Ambil Foto Bukti
          </button>
          {previewUrl && <img src={previewUrl} alt="" className="mx-auto mt-2 max-h-[200px] rounded-lg object-contain" />}
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-lg py-3 font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: '#2563eb', minHeight: 48 }}
        disabled={saving || uploading}
        onClick={submit}
      >
        {saving || uploading ? 'Mengirim…' : 'Kirim Laporan'}
      </button>
    </div>
  );
}

function FieldListWargaRoute() {
  const nav = useNavigate();
  const [qInput, setQInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const fetchW = async (p: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params: any = { page: p, limit: 20 };
      if (debounced) params.search = debounced;
      const { data } = await api.get('/warga', { params });
      const chunk = Array.isArray(data?.data) ? data.data : [];
      setTotalPages(Number(data?.totalPages) || 1);
      setRows((prev) => (append ? [...prev, ...chunk] : chunk));
      setPage(p);
    } catch {
      if (!append) setRows([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchW(1, false);
  }, [debounced]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[18px] font-bold text-gray-900">Data Warga</h2>
        <button type="button" className="text-xs font-semibold text-blue-600" onClick={() => nav('/field/warga/tambah')}>
          + Tambah Warga
        </button>
      </div>
      <input
        type="search"
        className="input min-h-[44px] w-full rounded-lg"
        placeholder="Cari nama atau NIK..."
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
      />
      {loading && <p className="text-sm text-gray-500">Memuat…</p>}
      <div className="space-y-2">
        {rows.map((w: any) => {
          const nikDisp = maskNik(w.nikEncrypted ?? w.nik ?? '');
          const penerima = w.kategori === 'penerima_bantuan';
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => nav(`/field/warga/${w.id}`)}
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left"
            >
              <p className="font-semibold text-gray-900">{w.nama}</p>
              <p className="text-xs text-gray-500">NIK: {nikDisp}</p>
              <p className="text-[12px] text-[#6b7280]">
                RT {w.rt?.nomor ?? '—'} / RW {w.rt?.rw?.nomor ?? '—'}
              </p>
              <div className="mt-2">
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: penerima ? '#dcfce7' : '#f3f4f6',
                    color: penerima ? '#166534' : '#6b7280',
                  }}
                >
                  {penerima ? 'Penerima' : 'Tidak'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {!loading && page < totalPages && (
        <button
          type="button"
          className="btn-secondary w-full justify-center py-3 text-sm"
          disabled={loadingMore}
          onClick={() => fetchW(page + 1, true)}
        >
          {loadingMore ? 'Memuat…' : 'Muat lebih banyak'}
        </button>
      )}
    </div>
  );
}

function FieldWargaDetailRoute() {
  const { id } = useParams();
  const nav = useNavigate();
  const [w, setW] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/warga/${id}`)
      .then((r) => {
        setW(r.data);
        setErr(false);
      })
      .catch(() => {
        setW(null);
        setErr(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-gray-500">Memuat…</p>;
  if (err || !w) return <p className="text-sm text-red-600">Warga tidak ditemukan.</p>;

  return (
    <div className="space-y-3">
      <button type="button" className="text-sm font-semibold text-blue-600" onClick={() => nav('/field/warga')}>
        ← Kembali
      </button>
      <div className="card space-y-2 p-4 text-sm text-gray-800">
        <p className="text-lg font-bold">{w.nama}</p>
        <p className="text-gray-500">RT {w.rt?.nomor}</p>
        <p className="whitespace-pre-wrap text-gray-700">{w.catatan || '—'}</p>
      </div>
    </div>
  );
}

function FieldTambahWargaRoute() {
  const { user, rtInfo, loadData, showToast } = useFieldData();
  const nav = useNavigate();
  return (
    <TambahWarga
      user={user}
      rtInfo={rtInfo}
      onBack={() => nav('/field/warga')}
      onSuccess={() => {
        loadData();
        showToast('Warga berhasil ditambahkan!');
        nav('/field/warga');
      }}
    />
  );
}

function FieldBantuanRoute() {
  return <FieldBantuanKebutuhan />;
}

function FieldUploadRoute() {
  const nav = useNavigate();
  return <FieldUploadBukti onOpenLaporan={() => nav('/field/laporan/baru')} />;
}

function FieldWilayahRoute() {
  const { user, rtInfo } = useFieldData();
  return <FieldWilayahSaya user={user} rtInfo={rtInfo} />;
}

function FieldProfilRoute({ onLogout }: { onLogout: () => void }) {
  const u = AuthStorage.getUser();
  const initials = useMemo(() => {
    const n = (u?.nama ?? '?').trim();
    const p = n.split(/\s+/).filter(Boolean);
    if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase() || '?';
  }, [u?.nama]);

  const roleLabel = (u?.role ?? '').replace(/_/g, ' ');

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: '#2563eb' }}
        >
          {initials}
        </div>
        <p className="text-[18px] font-semibold text-gray-900">{u?.nama}</p>
        <p className="text-sm text-gray-600">{u?.email}</p>
        <p className="mt-1 text-sm capitalize text-gray-500">{roleLabel}</p>
        <p className="mt-2 text-xs text-gray-500">
          Wilayah: RT {u?.rtId ?? '—'} / RW {u?.rwId ?? '—'} / Kel. {u?.kelurahanId ?? '—'}
        </p>
      </div>
      <button
        type="button"
        className="w-full rounded-lg py-3 text-sm font-semibold"
        style={{ border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'white', minHeight: 44 }}
        onClick={onLogout}
      >
        Keluar dari Akun
      </button>
      <p className="text-center text-[12px] text-[#9ca3af]">JAKDATA Field v0.1</p>
    </div>
  );
}

function FieldWilayahSaya({ user, rtInfo }: { user: any; rtInfo: any }) {
  const [me, setMe] = useState<any>(null);
  useEffect(() => {
    api
      .get('/auth/me')
      .then((r) => setMe(r.data))
      .catch(() => setMe(null));
  }, []);
  return (
    <div className="space-y-3">
      <h2 className="font-bold text-gray-900">Wilayah Saya</h2>
      <div className="card space-y-2 p-4 text-sm text-gray-700">
        <p>
          <span className="text-gray-500">Peran:</span> {user?.role?.replace(/_/g, ' ')}
        </p>
        {me?.kecamatan && (
          <p>
            <span className="text-gray-500">Kecamatan:</span> {me.kecamatan.nama}
          </p>
        )}
        {me?.kelurahan && (
          <p>
            <span className="text-gray-500">Kelurahan:</span> {me.kelurahan.nama}
          </p>
        )}
        {me?.rw && (
          <p>
            <span className="text-gray-500">RW:</span> {me.rw.nomor}
          </p>
        )}
        {me?.rt && (
          <p>
            <span className="text-gray-500">RT:</span> {me.rt.nomor}
          </p>
        )}
        {rtInfo && (
          <p className="border-t border-gray-100 pt-2 text-xs text-gray-500">
            Ringkasan RT aktif: RT {rtInfo.nomor} — {rtInfo.rw?.kelurahan?.nama}
          </p>
        )}
      </div>
    </div>
  );
}

function FieldBantuanKebutuhan() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get('/bantuan')
      .then((r) => {
        const d = r.data;
        setRows(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-3">
      <h2 className="font-bold text-gray-900">Bantuan & Kebutuhan</h2>
      {loading && <p className="text-sm text-gray-500">Memuat…</p>}
      <div className="card divide-y divide-gray-50 overflow-hidden">
        {rows.length === 0 && !loading && <p className="p-6 text-center text-sm text-gray-400">Tidak ada data program.</p>}
        {rows.map((b: any) => (
          <div key={b.id} className="px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">{b.nama}</p>
            <p className="text-xs text-gray-500">
              {b.tipe} · stok {b.stokTersisa ?? 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldUploadBukti({ onOpenLaporan }: { onOpenLaporan: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-gray-900">Upload Bukti</h2>
      <div className="card space-y-3 p-4 text-sm text-gray-700">
        <p>Foto bukti dilampirkan pada alur Buat Laporan (satu tempat, terekam ke server).</p>
        <button type="button" className="btn-primary w-full justify-center py-3" onClick={onOpenLaporan}>
          Buka Buat Laporan
        </button>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { parseNikBirthDate } from '../../lib/nikParse';

type NikInfo = {
  jenisKelamin?: 'L' | 'P';
  tanggalLahir?: string;
  provinsiCode?: string;
};

type DupIssue = {
  type: string;
  severity: 'error' | 'warning';
  message: string;
  existingWarga?: { nama: string; rtNomor?: string };
};

type RtInfo = {
  id?: number;
  nomor?: string;
  rw?: { nomor?: string; kelurahan?: { nama?: string } };
};

const PEKERJAAN_OPTIONS = [
  'Pedagang',
  'Buruh',
  'Karyawan Swasta',
  'Wiraswasta',
  'Ibu Rumah Tangga',
  'Ojek Online',
  'Sopir',
  'Pelajar/Mahasiswa',
  'PNS',
  'Pensiunan',
  'Tidak Bekerja',
  'Lainnya',
];

const STATUS_EKONOMI = [
  { value: 'sangat_miskin', label: 'Sangat Miskin', hint: '< Rp 1 juta/bulan', color: '#dc2626', bg: '#fee2e2' },
  { value: 'miskin', label: 'Miskin', hint: 'Rp 1–2 juta/bulan', color: '#ea580c', bg: '#ffedd5' },
  { value: 'rentan', label: 'Rentan', hint: 'Rp 2–3,5 juta/bulan', color: '#ca8a04', bg: '#fef9c3' },
  { value: 'sedang', label: 'Sedang', hint: 'Rp 3,5–6 juta/bulan', color: '#2563eb', bg: '#dbeafe' },
  { value: 'mampu', label: 'Mampu', hint: '> Rp 6 juta/bulan', color: '#16a34a', bg: '#dcfce7' },
] as const;

function nikBirthToInputValue(tanggalLahir?: string): string {
  const d = parseNikBirthDate(tanggalLahir);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function jenisKelaminLabel(k?: 'L' | 'P'): string {
  if (k === 'P') return 'Perempuan';
  if (k === 'L') return 'Laki-laki';
  return '—';
}

type ModalKind = 'nik' | 'hp' | null;

export type TambahWargaProps = {
  user: { rtId?: number | null; rwId?: number | null };
  rtInfo: RtInfo | null;
  onBack: () => void;
  onSuccess: () => void;
};

export default function TambahWarga({ user, rtInfo, onBack, onSuccess }: TambahWargaProps) {
  const [step, setStep] = useState<'nik' | 'form'>('nik');
  const [nik, setNik] = useState('');
  const [nikChecking, setNikChecking] = useState(false);
  const [nikIssues, setNikIssues] = useState<DupIssue[]>([]);
  const [nikInfo, setNikInfo] = useState<NikInfo | null>(null);
  const [nikValid, setNikValid] = useState(false);

  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | ''>('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [alamat, setAlamat] = useState('');
  const [pekerjaan, setPekerjaan] = useState('');
  const [statusEkonomi, setStatusEkonomi] = useState('');
  const [email, setEmail] = useState('');
  const [medsos, setMedsos] = useState('');
  const [fotoKtp, setFotoKtp] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [pendingWarnings, setPendingWarnings] = useState<DupIssue[]>([]);
  const [saved, setSaved] = useState(false);

  const defaultAlamat = useMemo(() => {
    if (!rtInfo) return '';
    const rt = rtInfo.nomor ?? '—';
    const rw = rtInfo.rw?.nomor ?? '—';
    const kel = rtInfo.rw?.kelurahan?.nama ?? '—';
    return `RT ${rt} RW ${rw} Kel. ${kel}`;
  }, [rtInfo]);

  useEffect(() => {
    if (defaultAlamat && !alamat) setAlamat(defaultAlamat);
  }, [defaultAlamat, alamat]);

  const checkNikRemote = useCallback(async (value: string) => {
    const clean = value.replace(/\s/g, '');
    if (clean.length !== 16) {
      setNikIssues([]);
      setNikInfo(null);
      setNikValid(false);
      return;
    }
    setNikChecking(true);
    try {
      const { data } = await api.get(`/warga/check-nik/${clean}`);
      setNikIssues(data.issues ?? []);
      setNikInfo(data.nikInfo ?? null);
      const hasError = (data.issues ?? []).some((i: DupIssue) => i.severity === 'error');
      setNikValid(Boolean(data.valid) && !hasError);
      if (data.nikInfo?.jenisKelamin) setJenisKelamin(data.nikInfo.jenisKelamin);
      if (data.nikInfo?.tanggalLahir) setTanggalLahir(nikBirthToInputValue(data.nikInfo.tanggalLahir));
    } catch {
      setNikValid(false);
      setNikIssues([{ type: 'invalid_nik_format', severity: 'error', message: 'Gagal memeriksa NIK' }]);
    } finally {
      setNikChecking(false);
    }
  }, []);

  useEffect(() => {
    const clean = nik.replace(/\s/g, '');
    if (clean.length < 16) {
      setNikIssues([]);
      setNikInfo(null);
      setNikValid(false);
      return;
    }
    const t = setTimeout(() => checkNikRemote(nik), 400);
    return () => clearTimeout(t);
  }, [nik, checkNikRemote]);

  function goToForm() {
    if (!nikValid) return;
    setStep('form');
  }

  async function runDuplicateCheck(): Promise<{ block: boolean; warnings: DupIssue[] }> {
    const { data } = await api.post('/warga/check-duplicate', {
      nik: nik.replace(/\s/g, ''),
      noHp: noHp.trim() || undefined,
      nama: nama.trim(),
      tanggalLahirStr: tanggalLahir || undefined,
    });
    if (data.isDuplicate) {
      const err = data.issues?.find((i: DupIssue) => i.severity === 'error');
      setModal('nik');
      setError(err?.message ?? 'Data tidak dapat disimpan');
      return { block: true, warnings: [] };
    }
    const warnings = (data.issues ?? []).filter((i: DupIssue) => i.severity === 'warning');
    return { block: false, warnings };
  }

  async function saveWarga(skipWarningCheck = false) {
    if (!nama.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }
    if (!user.rtId) {
      setError('Akun tidak memiliki RT. Hubungi admin.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      if (!skipWarningCheck) {
        const { block, warnings } = await runDuplicateCheck();
        if (block) return;
        if (warnings.some((w) => w.type === 'duplicate_hp')) {
          setPendingWarnings(warnings);
          setModal('hp');
          return;
        }
        if (warnings.length > 0) setPendingWarnings(warnings);
      }

      const meta: string[] = [];
      if (email.trim()) meta.push(`Email: ${email.trim()}`);
      if (medsos.trim()) meta.push(`Medsos: ${medsos.trim()}`);

      const { data: created } = await api.post('/warga', {
        nama: nama.trim(),
        nik: nik.replace(/\s/g, ''),
        noHp: noHp.trim() || undefined,
        rtId: user.rtId,
        jenisKelamin: jenisKelamin || undefined,
        tanggalLahir: tanggalLahir || undefined,
        alamat: alamat.trim() || undefined,
        pekerjaan: pekerjaan || undefined,
        statusEkonomi: statusEkonomi || undefined,
        kategori: 'warga_biasa',
        catatan: meta.length ? meta.join(' | ') : undefined,
      });

      const wargaId = created?.warga?.id ?? created?.id;
      if (fotoKtp && wargaId) {
        const fd = new FormData();
        fd.append('file', fotoKtp);
        await api.post(`/warga/${wargaId}/foto-ktp`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setSaved(true);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { reason?: string; error?: string } } };
      const data = err.response?.data;
      if (err.response?.status === 409) {
        setModal('nik');
        setError(data?.reason ?? data?.error ?? 'NIK sudah terdaftar');
        return;
      }
      setError(data?.error ?? 'Gagal menyimpan data warga');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setSaved(false);
    setStep('nik');
    setNik('');
    setNama('');
    setNoHp('');
    setJenisKelamin('');
    setTanggalLahir('');
    setAlamat(defaultAlamat);
    setPekerjaan('');
    setStatusEkonomi('');
    setEmail('');
    setMedsos('');
    setFotoKtp(null);
    setNikIssues([]);
    setNikInfo(null);
    setNikValid(false);
    setError('');
  }

  if (saved) {
    return (
      <div className="space-y-4 py-6 text-center">
        <p className="text-2xl">✅</p>
        <p className="text-lg font-bold text-gray-900">Data warga berhasil disimpan</p>
        <button type="button" className="btn-primary w-full justify-center" onClick={resetForm}>
          Tambah Warga Lain
        </button>
        <button type="button" className="btn-secondary w-full justify-center" onClick={onSuccess}>
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-600">
          ← Kembali
        </button>
        <h2 className="text-lg font-bold text-gray-900">Tambah Warga</h2>
      </div>

      {error && !modal && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {step === 'nik' && (
        <div className="card space-y-3 p-4">
          <p className="text-sm font-semibold text-gray-800">Langkah 1 — NIK</p>
          <label className="label">Nomor Induk Kependudukan (16 digit)</label>
          <input
            className="input min-h-[48px] text-lg tracking-widest"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={16}
            value={nik}
            onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
            placeholder="3172010101850001"
          />
          {nikChecking && <p className="text-sm text-gray-500">Memeriksa NIK...</p>}
          {!nikChecking && nik.replace(/\s/g, '').length === 16 && (
            <NikFeedback issues={nikIssues} nikInfo={nikInfo} valid={nikValid} />
          )}
          <button
            type="button"
            className="btn-primary w-full justify-center py-3"
            disabled={!nikValid || nikChecking}
            onClick={goToForm}
          >
            Lanjut Isi Data
          </button>
        </div>
      )}

      {step === 'form' && (
        <>
          <div className="card space-y-4 p-4">
            <p className="text-sm font-semibold text-gray-800">Langkah 2 — Data Diri</p>
            <div>
              <label className="label">Nama Lengkap *</label>
              <input
                className="input min-h-[44px]"
                autoFocus
                maxLength={100}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama sesuai KTP"
              />
            </div>
            <div>
              <label className="label">Email (opsional)</label>
              <input
                className="input min-h-[44px]"
                type="email"
                maxLength={120}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
              />
            </div>
            <div>
              <label className="label">Medsos (opsional)</label>
              <input
                className="input min-h-[44px]"
                maxLength={80}
                value={medsos}
                onChange={(e) => setMedsos(e.target.value)}
                placeholder="@instagram / Facebook"
              />
            </div>
            <div>
              <label className="label">Foto KTP (opsional)</label>
              <input
                className="input min-h-[44px]"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFotoKtp(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-gray-500">Di HP akan langsung membuka kamera</p>
            </div>
            <div>
              <label className="label">No. HP / WA</label>
              <input
                className="input min-h-[44px]"
                type="tel"
                inputMode="tel"
                maxLength={15}
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="08123456789"
              />
              <p className="mt-1 text-xs text-gray-500">Contoh: 08123456789</p>
            </div>
            <div>
              <label className="label">Jenis Kelamin</label>
              <div className="flex gap-3">
                {(['L', 'P'] as const).map((jk) => (
                  <label
                    key={jk}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 py-3"
                  >
                    <input
                      type="radio"
                      name="jk"
                      checked={jenisKelamin === jk}
                      onChange={() => setJenisKelamin(jk)}
                    />
                    <span className="text-sm font-medium">{jk === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Tanggal Lahir</label>
              <input
                className="input min-h-[44px]"
                type="date"
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Alamat</label>
              <input className="input min-h-[44px]" value={alamat} maxLength={255} onChange={(e) => setAlamat(e.target.value)} />
            </div>
            <div>
              <label className="label">Pekerjaan</label>
              <select className="input min-h-[44px]" value={pekerjaan} onChange={(e) => setPekerjaan(e.target.value)}>
                <option value="">Pilih pekerjaan...</option>
                {PEKERJAAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card space-y-3 p-4">
            <p className="text-sm font-semibold text-gray-800">Langkah 3 — Status Ekonomi</p>
            {STATUS_EKONOMI.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatusEkonomi(s.value)}
                className="flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition"
                style={{
                  borderColor: statusEkonomi === s.value ? s.color : '#e5e7eb',
                  backgroundColor: statusEkonomi === s.value ? s.bg : 'white',
                }}
              >
                <div>
                  <p className="font-semibold" style={{ color: s.color }}>
                    {s.label}
                  </p>
                  <p className="text-xs text-gray-600">{s.hint}</p>
                </div>
                {statusEkonomi === s.value && <span>✓</span>}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary w-full justify-center py-4 text-base"
            disabled={saving}
            onClick={() => saveWarga(false)}
          >
            {saving ? 'Menyimpan…' : 'Simpan Data Warga'}
          </button>
        </>
      )}

      {modal === 'nik' && (
        <Modal
          title="⛔ NIK Sudah Terdaftar"
          body={
            error ||
            nikIssues.find((i) => i.severity === 'error')?.message ||
            'NIK ini sudah digunakan warga lain.'
          }
          primary="Tutup"
          onPrimary={() => {
            setModal(null);
            setError('');
          }}
        />
      )}

      {modal === 'hp' && (
        <Modal
          title="⚠️ Nomor HP Sudah Digunakan"
          body={
            pendingWarnings.find((w) => w.type === 'duplicate_hp')?.message ??
            'HP ini sudah dipakai warga lain. Lanjutkan jika berbeda orang.'
          }
          primary="Lanjut Simpan"
          secondary="Batalkan"
          onPrimary={() => {
            setModal(null);
            saveWarga(true);
          }}
          onSecondary={() => setModal(null)}
        />
      )}
    </div>
  );
}

function NikFeedback({
  issues,
  nikInfo,
  valid,
}: {
  issues: DupIssue[];
  nikInfo: NikInfo | null;
  valid: boolean;
}) {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (errors.length > 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <p className="font-semibold">❌ {errors[0].message}</p>
        {errors[0].existingWarga && (
          <p className="mt-1 text-xs">
            Terdaftar: {errors[0].existingWarga.nama} (RT {errors[0].existingWarga.rtNomor ?? '-'})
          </p>
        )}
      </div>
    );
  }

  if (valid) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p className="font-semibold">✅ NIK valid</p>
          {nikInfo && (
            <p className="mt-1 text-xs">
              Jenis kelamin: {jenisKelaminLabel(nikInfo.jenisKelamin)} | Perkiraan lahir:{' '}
              {nikInfo.tanggalLahir ?? '—'}
            </p>
          )}
        </div>
        {warnings.map((w) => (
          <div key={w.message} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            ⚠️ {w.message}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function Modal({
  title,
  body,
  primary,
  secondary,
  onPrimary,
  onSecondary,
}: {
  title: string;
  body: string;
  primary: string;
  secondary?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" className="btn-primary w-full justify-center" onClick={onPrimary}>
            {primary}
          </button>
          {secondary && onSecondary && (
            <button type="button" className="btn-secondary w-full justify-center" onClick={onSecondary}>
              {secondary}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


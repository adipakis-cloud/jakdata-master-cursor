import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth.store';
import { isRoleAllowedInMode } from '../lib/appMode';

type CodeInfo = {
  valid: boolean;
  level?: string;
  levelLabel?: string;
  kecamatan?: string;
  kecamatanId?: number;
  reason?: string;
};

type WilayahOpt = { id: number; nama?: string; nomor?: string };

const STEPS = ['Kode', 'Wilayah', 'Akun'] as const;

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#e5e7eb' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 1) return { score, label: 'Lemah', color: '#dc2626' };
  if (score <= 3) return { score, label: 'Sedang', color: '#ca8a04' };
  return { score, label: 'Kuat', color: '#16a34a' };
}

export function RegisterPage() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(0);
  const [activationCode, setActivationCode] = useState('');
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const [kecamatanId, setKecamatanId] = useState<number | null>(null);
  const [kecamatanNama, setKecamatanNama] = useState('');
  const [kelurahanId, setKelurahanId] = useState<number | ''>('');
  const [rwId, setRwId] = useState<number | ''>('');
  const [rtId, setRtId] = useState<number | ''>('');

  const [kelurahanList, setKelurahanList] = useState<WilayahOpt[]>([]);
  const [rwList, setRwList] = useState<WilayahOpt[]>([]);
  const [rtList, setRtList] = useState<WilayahOpt[]>([]);

  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const level = codeInfo?.level ?? '';
  const strength = useMemo(() => passwordStrength(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const validateCode = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setCodeInfo(null);
      return;
    }
    setCodeLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/auth/check-code/${encodeURIComponent(trimmed)}`);
      setCodeInfo(data);
      if (data.valid && data.kecamatanId) {
        setKecamatanId(data.kecamatanId);
        setKecamatanNama(data.kecamatan ?? '');
      }
    } catch {
      setCodeInfo({ valid: false, reason: 'Gagal memvalidasi kode' });
    } finally {
      setCodeLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => validateCode(activationCode), 400);
    return () => clearTimeout(t);
  }, [activationCode, validateCode]);

  useEffect(() => {
    if (!kecamatanId || !codeInfo?.valid) return;
    if (!['kelurahan', 'rw', 'rt'].includes(level)) return;
    api
      .get('/wilayah/register/kelurahan', { params: { kecamatanId } })
      .then((r) => setKelurahanList(r.data))
      .catch(() => setKelurahanList([]));
  }, [kecamatanId, level, codeInfo?.valid]);

  useEffect(() => {
    if (!kelurahanId || !['rw', 'rt'].includes(level)) return;
    api
      .get('/wilayah/register/rw', { params: { kelurahanId } })
      .then((r) => setRwList(r.data))
      .catch(() => setRwList([]));
  }, [kelurahanId, level]);

  useEffect(() => {
    if (!rwId || level !== 'rt') return;
    api
      .get('/wilayah/register/rt', { params: { rwId } })
      .then((r) => setRtList(r.data))
      .catch(() => setRtList([]));
  }, [rwId, level]);

  const wilayahSummary = useMemo(() => {
    const parts: string[] = [];
    if (kecamatanNama) parts.push(`Kec. ${kecamatanNama}`);
    const kel = kelurahanList.find((k) => k.id === kelurahanId);
    if (kel?.nama) parts.push(`Kel. ${kel.nama}`);
    const rw = rwList.find((r) => r.id === rwId);
    if (rw?.nomor) parts.push(`RW ${rw.nomor}`);
    const rt = rtList.find((r) => r.id === rtId);
    if (rt?.nomor) parts.push(`RT ${rt.nomor}`);
    return parts.join(' · ');
  }, [kecamatanNama, kelurahanId, kelurahanList, rwId, rwList, rtId, rtList]);

  function canProceedStep1() {
    return codeInfo?.valid === true;
  }

  function canProceedStep2() {
    if (!kecamatanId) return false;
    if (level === 'kecamatan') return true;
    if (level === 'kelurahan') return !!kelurahanId;
    if (level === 'rw') return !!kelurahanId && !!rwId;
    if (level === 'rt') return !!kelurahanId && !!rwId && !!rtId;
    return false;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canProceedStep2() || !passwordsMatch) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', {
        nama,
        noHp,
        password,
        confirmPassword,
        activationCode: activationCode.trim(),
        kecamatanId,
        kelurahanId: kelurahanId || undefined,
        rwId: rwId || undefined,
        rtId: rtId || undefined,
      });

      setSuccess(`✅ Berhasil! Selamat datang ${data.user.nama}`);

      if (isRoleAllowedInMode(data.user.role)) {
        login(data.user, data.token);
        setTimeout(() => nav(data.redirectTo ?? '/field', { replace: true }), 2000);
      } else {
        setTimeout(() => nav('/login', { replace: true }), 2500);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error ?? 'Pendaftaran gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl">
            🗺️
          </div>
          <h1 className="text-xl font-bold text-white">Daftar Koordinator JAKDATA</h1>
          <p className="mt-1 text-sm text-blue-200">Dapil 3 DKI Jakarta</p>
        </header>

        <div className="mb-4 flex justify-center gap-2 text-xs">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 font-medium ${
                i === step ? 'bg-white text-blue-900' : i < step ? 'bg-blue-400 text-white' : 'bg-white/20 text-blue-100'
              }`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          {success ? (
            <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 text-center">
              {success}
            </p>
          ) : null}

          {error ? (
            <p className="mb-4 rounded-lg border border-red-100 bg-red-50 p-2 text-sm text-red-600">{error}</p>
          ) : null}

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label">Kode Aktivasi</label>
                <input
                  className="input"
                  placeholder="Contoh: KLD-RT-2026"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  onBlur={() => validateCode(activationCode)}
                />
                {codeLoading && <p className="mt-1 text-xs text-gray-500">Memvalidasi…</p>}
                {!codeLoading && codeInfo?.valid && (
                  <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-800">
                    ✅ Kode valid untuk: Koordinator {codeInfo.levelLabel}
                    <br />
                    Wilayah: Kecamatan {codeInfo.kecamatan}
                  </div>
                )}
                {!codeLoading && codeInfo && !codeInfo.valid && activationCode.trim() && (
                  <p className="mt-1 text-xs text-red-600">❌ {codeInfo.reason ?? 'Kode tidak valid'}</p>
                )}
              </div>
              <button
                type="button"
                className="btn-primary w-full"
                disabled={!canProceedStep1()}
                onClick={() => setStep(1)}
              >
                Lanjut →
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Kecamatan</label>
                <input className="input bg-gray-50" value={kecamatanNama} disabled readOnly />
              </div>
              {['kelurahan', 'rw', 'rt'].includes(level) && (
                <div>
                  <label className="label">Kelurahan</label>
                  <select
                    className="input"
                    value={kelurahanId}
                    onChange={(e) => {
                      setKelurahanId(e.target.value ? +e.target.value : '');
                      setRwId('');
                      setRtId('');
                    }}
                  >
                    <option value="">Pilih kelurahan</option>
                    {kelurahanList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {['rw', 'rt'].includes(level) && (
                <div>
                  <label className="label">RW</label>
                  <select
                    className="input"
                    value={rwId}
                    onChange={(e) => {
                      setRwId(e.target.value ? +e.target.value : '');
                      setRtId('');
                    }}
                    disabled={!kelurahanId}
                  >
                    <option value="">Pilih RW</option>
                    {rwList.map((r) => (
                      <option key={r.id} value={r.id}>
                        RW {r.nomor}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {level === 'rt' && (
                <div>
                  <label className="label">RT</label>
                  <select
                    className="input"
                    value={rtId}
                    onChange={(e) => setRtId(e.target.value ? +e.target.value : '')}
                    disabled={!rwId}
                  >
                    <option value="">Pilih RT</option>
                    {rtList.map((r) => (
                      <option key={r.id} value={r.id}>
                        RT {r.nomor}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setStep(0)}>
                  ← Kembali
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  disabled={!canProceedStep2()}
                  onClick={() => setStep(2)}
                >
                  Lanjut →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama Lengkap</label>
                <input className="input" required value={nama} onChange={(e) => setNama(e.target.value)} />
              </div>
              <div>
                <label className="label">Nomor HP / WA</label>
                <input
                  className="input"
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">Nomor ini akan jadi username login Anda</p>
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password && (
                  <p className="mt-1 text-xs" style={{ color: strength.color }}>
                    Kekuatan: {strength.label}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Konfirmasi Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && (
                  <p className={`mt-1 text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? '✅ cocok' : '❌ tidak cocok'}
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900">
                Anda akan terdaftar sebagai:
                <br />
                <strong>Koordinator {codeInfo?.levelLabel}</strong>
                <br />
                {wilayahSummary || kecamatanNama}
              </div>

              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>
                  ← Kembali
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  style={{ backgroundColor: '#16a34a' }}
                  disabled={loading || !passwordsMatch || password.length < 8}
                >
                  {loading ? 'Mendaftar…' : 'Daftar Sekarang'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-gray-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:underline">
              Login di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

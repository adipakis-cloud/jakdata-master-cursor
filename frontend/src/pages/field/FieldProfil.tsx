import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthStorage } from '../../lib/auth';
import { useAuth } from '../../store/auth.store';
import { ChangePasswordForm } from '../../components/auth/ChangePasswordForm';
import { api } from '../../lib/api';

type Props = {
  onLogout: () => void;
};

export function FieldProfil({ onLogout }: Props) {
  const u = AuthStorage.getUser();
  const { isDefaultPassword, refreshPasswordStatus } = useAuth();
  const location = useLocation();

  const initials = useMemo(() => {
    const n = (u?.nama ?? '?').trim();
    const p = n.split(/\s+/).filter(Boolean);
    if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase() || '?';
  }, [u?.nama]);

  const roleLabel = (u?.role ?? '').replace(/_/g, ' ');
  const [scoreOpen, setScoreOpen] = useState(false);
  const [myScore, setMyScore] = useState<{
    skor: number;
    bintang: number;
    level: string;
    komponen: Record<string, number>;
    rekomendasi: string[];
  } | null>(null);

  const motivasiByLevel: Record<string, string> = {
    top: '🏆 Anda adalah koordinator terbaik di wilayah ini!',
    bintang: '⭐ Kerja bagus! Terus tingkatkan untuk mencapai TOP',
    aktif: '✅ Anda aktif. Tambah data warga untuk naik level',
    baru: '🆕 Mulai input data warga untuk membangun skor Anda',
    nonaktif: '⚠️ Skor Anda turun karena tidak aktif. Login rutin!',
  };

  const levelBadge: Record<string, { label: string; bg: string; color: string }> = {
    top: { label: '🏆 TOP', bg: '#fef3c7', color: '#92400e' },
    bintang: { label: '⭐ BINTANG', bg: '#dbeafe', color: '#1e40af' },
    aktif: { label: '✅ AKTIF', bg: '#dcfce7', color: '#166534' },
    baru: { label: '🆕 BARU', bg: '#f3f4f6', color: '#374151' },
    nonaktif: { label: '⚠️ NON-AKTIF', bg: '#fee2e2', color: '#991b1b' },
  };

  useEffect(() => {
    const role = u?.role ?? '';
    const fieldRoles = [
      'koordinator_kecamatan',
      'koordinator_kelurahan',
      'koordinator_rw',
      'koordinator_rt',
      'petugas_lapangan',
    ];
    if (!fieldRoles.includes(role)) return;
    api
      .get('/koordinator/scoring/my-score')
      .then((res) => setMyScore(res.data.data))
      .catch(() => setMyScore(null));
  }, [u?.role]);

  useEffect(() => {
    refreshPasswordStatus();
  }, [refreshPasswordStatus]);

  useEffect(() => {
    if (location.hash === '#password') {
      document.getElementById('password')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col items-center text-center">
        <span
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: '#2563eb' }}
        >
          {initials}
        </span>
        <p className="text-[18px] font-semibold text-gray-900">{u?.nama}</p>
        <p className="text-sm text-gray-600">{u?.email}</p>
        <p className="mt-1 text-sm capitalize text-gray-500">{roleLabel}</p>
        <p className="mt-2 text-xs text-gray-500">
          Wilayah: RT {u?.rtId ?? '—'} / RW {u?.rwId ?? '—'} / Kel. {u?.kelurahanId ?? '—'}
        </p>
      </header>

      {myScore && (
        <section
          className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Skor Kinerja</h2>
          <div className="flex flex-col items-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white"
              style={{
                background: `conic-gradient(#2563eb ${myScore.skor * 3.6}deg, #e5e7eb 0deg)`,
                boxShadow: 'inset 0 0 0 6px white',
              }}
            >
              <span
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-[#2563eb]"
              >
                {myScore.skor}
              </span>
            </div>
            <span
              className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold"
              style={{
                background: levelBadge[myScore.level]?.bg ?? '#f3f4f6',
                color: levelBadge[myScore.level]?.color ?? '#374151',
              }}
            >
              {levelBadge[myScore.level]?.label ?? myScore.level}
            </span>
            <p className="mt-2 text-lg tracking-widest text-amber-500" aria-label="bintang">
              {'★'.repeat(myScore.bintang)}
              {'☆'.repeat(5 - myScore.bintang)}
            </p>
            <p className="mt-3 text-center text-sm text-gray-600">
              {motivasiByLevel[myScore.level] ?? motivasiByLevel.baru}
            </p>
          </div>

          <button
            type="button"
            className="mt-4 w-full text-sm font-medium text-blue-600"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setScoreOpen((o) => !o)}
          >
            {scoreOpen ? 'Sembunyikan rincian' : 'Lihat rincian komponen'}
          </button>

          {scoreOpen && myScore.komponen && (
            <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              {[
                ['Data Warga', myScore.komponen.dataWarga, 20],
                ['Kualitas Laporan', myScore.komponen.kualitasLaporan, 15],
                ['Konsistensi', myScore.komponen.konsistensiAktif, 15],
                ['Validasi Data', myScore.komponen.validasiData, 20],
                ['Kelengkapan', myScore.komponen.kelengkapanData, 10],
                ['Kecepatan', myScore.komponen.kecepatanInput, 10],
                ['Bonus', myScore.komponen.bonusKhusus, 10],
              ].map(([label, val, max]) => (
                <div key={String(label)} className="text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>{label}</span>
                    <span>
                      {val}/{max}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${Math.min(100, (Number(val) / Number(max)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {myScore.komponen.penalti < 0 && (
                <p className="text-xs text-red-600">Penalti: {myScore.komponen.penalti} poin</p>
              )}
            </div>
          )}

          {myScore.rekomendasi?.length > 0 && (
            <div className="mt-3 space-y-2">
              {myScore.rekomendasi.map((rec) => (
                <p
                  key={rec}
                  className="rounded-lg px-3 py-2 text-xs text-amber-900"
                  style={{ background: '#fef9c3', border: '1px solid #fde047' }}
                >
                  {rec}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      <ChangePasswordForm showDefaultWarning={isDefaultPassword} onPasswordChanged={refreshPasswordStatus} />

      <button
        type="button"
        className="w-full rounded-lg py-3 text-sm font-semibold"
        style={{ border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'white', minHeight: 44 }}
        onClick={onLogout}
      >
        Keluar dari Akun
      </button>
      <p className="text-center text-[12px] text-[#9ca3af]">JAKDATA Field v0.1</p>
    </section>
  );
}

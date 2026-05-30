import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

type KelRow = {
  id: number;
  nama: string;
  status: 'aktif' | 'belum_aktif';
  koordinatorCount: number;
  laporanCount: number;
  wargaCount: number;
};

type KecRow = {
  id: number;
  nama: string;
  kotaNama: string;
  status: 'aktif' | 'belum_aktif';
  koordinatorCount: number;
  laporanCount: number;
  wargaCount: number;
  kelurahan: KelRow[];
};

type WilayahStatus = {
  summary: {
    totalKecamatan: number;
    kecamatanAktif: number;
    totalKelurahan: number;
    kelurahanAktif: number;
    totalKoordinator: number;
    totalLaporan: number;
    totalWarga: number;
  };
  kecamatan: KecRow[];
};

type TabFilter = 'semua' | 'aktif' | 'belum_aktif';

function StatusBadge({ status }: { status: 'aktif' | 'belum_aktif' }) {
  if (status === 'aktif') {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
        ✅ Aktif
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800">
      ⚠ Belum Ada Koordinator
    </span>
  );
}

export function AdminWilayah() {
  const [data, setData] = useState<WilayahStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>('semua');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api
      .get('/dashboard/wilayah-status')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kecamatanBelumAktif = useMemo(
    () => (data?.kecamatan ?? []).filter((k) => k.status === 'belum_aktif').length,
    [data],
  );

  const filtered = useMemo(() => {
    const list = data?.kecamatan ?? [];
    if (tab === 'aktif') return list.filter((k) => k.status === 'aktif');
    if (tab === 'belum_aktif') return list.filter((k) => k.status === 'belum_aktif');
    return list;
  }, [data, tab]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Memuat status wilayah Dapil 3…</div>;
  }

  const s = data?.summary;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Wilayah Dapil 3 — Status Operasional</h1>
        <p className="text-sm text-gray-500">Jakarta Utara · Jakarta Barat · Kepulauan Seribu</p>
      </div>

      {kecamatanBelumAktif > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 font-medium">⚠ {kecamatanBelumAktif} kecamatan belum memiliki koordinator</p>
          <p className="text-red-600 text-sm">Pendataan belum bisa berjalan di wilayah tersebut</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Kecamatan Aktif', `${s?.kecamatanAktif ?? 0} / ${s?.totalKecamatan ?? 0}`],
          ['Kelurahan Aktif', `${s?.kelurahanAktif ?? 0} / ${s?.totalKelurahan ?? 0}`],
          ['Koordinator', String(s?.totalKoordinator ?? 0)],
          ['Laporan Masuk', String(s?.totalLaporan ?? 0)],
        ].map(([label, val]) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-gray-500 font-semibold uppercase">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{val}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(
          [
            ['semua', 'Semua'],
            ['aktif', 'Aktif'],
            ['belum_aktif', 'Belum Aktif'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-secondary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((kec) => (
          <div key={kec.id} className="card overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50"
              onClick={() => setExpanded(expanded === kec.id ? null : kec.id)}
            >
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{kec.nama}</p>
                <p className="text-xs text-gray-500">{kec.kotaNama}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {kec.koordinatorCount} koordinator · {kec.laporanCount} laporan · {kec.wargaCount} warga
                </p>
              </div>
              <StatusBadge status={kec.status} />
            </button>

            {expanded === kec.id && (
              <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-3 space-y-2">
                {kec.kelurahan.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada data kelurahan.</p>
                ) : (
                  kec.kelurahan.map((kel) => (
                    <div
                      key={kel.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white border border-gray-100 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{kel.nama}</p>
                        <p className="text-xs text-gray-500">
                          {kel.koordinatorCount} kord. · {kel.laporanCount} lap. · {kel.wargaCount} warga
                        </p>
                      </div>
                      <StatusBadge status={kel.status} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Konstanta Dapil 3 — Jakarta Utara, Jakarta Barat, Kepulauan Seribu
export const DAPIL3_KOTA_KODES = ['3172', '3173', '3101'] as const;
export const DAPIL3_LABEL = 'DKI Jakarta III (Jakbar + Jakut + Kep. Seribu)';

export const KOORDINATOR_FIELD_ROLES = [
  'koordinator_kecamatan',
  'koordinator_kelurahan',
  'koordinator_rw',
  'koordinator_rt',
  'petugas_lapangan',
] as const;

export function dapil3KotaWhere() {
  return { kode: { in: [...DAPIL3_KOTA_KODES] } };
}

export function dapil3KecamatanWhere() {
  return { kota: { kode: { in: [...DAPIL3_KOTA_KODES] } } };
}

export function dapil3KelurahanWhere() {
  return { kecamatan: { kota: { kode: { in: [...DAPIL3_KOTA_KODES] } } } };
}

export function isDapil3Filter() {
  return {
    kota: {
      kode: { in: [...DAPIL3_KOTA_KODES] },
    },
  };
}

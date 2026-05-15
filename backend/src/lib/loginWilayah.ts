export type WilayahType = 'KOTA' | 'KECAMATAN' | 'KELURAHAN' | 'RW' | 'RT' | 'WARMINDO' | null;

export function computeWilayahMeta(user: {
  kotaId?: number | null;
  kecamatanId?: number | null;
  kelurahanId?: number | null;
  rwId?: number | null;
  rtId?: number | null;
  warmindoId?: number | null;
}): {
  wilayahId: number | null;
  wilayahType: WilayahType;
} {
  if (user.rtId) return { wilayahId: user.rtId, wilayahType: 'RT' };
  if (user.rwId) return { wilayahId: user.rwId, wilayahType: 'RW' };
  if (user.kelurahanId) return { wilayahId: user.kelurahanId, wilayahType: 'KELURAHAN' };
  if (user.kecamatanId) return { wilayahId: user.kecamatanId, wilayahType: 'KECAMATAN' };
  if (user.kotaId) return { wilayahId: user.kotaId, wilayahType: 'KOTA' };
  if (user.warmindoId) return { wilayahId: user.warmindoId, wilayahType: 'WARMINDO' };
  return { wilayahId: null, wilayahType: null };
}

/** Post-login SPA path (lowercase, matches React Router). */
export function loginRedirectTo(role: string): string {
  switch (role) {
    case 'admin_pusat':
    case 'admin_kota':
    case 'admin_kecamatan':
    case 'admin_kelurahan':
    case 'auditor':
    case 'finance_admin':
      return '/admin';
    case 'koordinator_kecamatan':
    case 'koordinator_kelurahan':
    case 'koordinator_rw':
    case 'koordinator_rt':
    case 'petugas_lapangan':
      return '/field';
    case 'manager_warmindo':
    case 'kasir_warmindo':
      return '/warmindo';
    default:
      return '/field';
  }
}

/** Canonical Prisma `UserRole` values used by the API. */
export const FIELD_ROLES = [
  'koordinator_kecamatan',
  'koordinator_kelurahan',
  'koordinator_rw',
  'koordinator_rt',
  'petugas_lapangan',
] as const;

export const WARMINDO_ROLES = ['manager_warmindo', 'kasir_warmindo'] as const;

export function isFieldRole(role: string): boolean {
  return (FIELD_ROLES as readonly string[]).includes(role);
}

export function isWarmindoRole(role: string): boolean {
  return (WARMINDO_ROLES as readonly string[]).includes(role);
}

export function includesFieldRole(role: string | undefined): boolean {
  if (!role) return false;
  return (FIELD_ROLES as readonly string[]).includes(role);
}

export function includesWarmindoRole(role: string | undefined): boolean {
  if (!role) return false;
  return (WARMINDO_ROLES as readonly string[]).includes(role);
}

/** Default dashboard path after login or when redirecting away from a forbidden area. */
export function defaultHomePath(role: string): string {
  switch (role) {
    case 'admin_pusat':
    case 'admin_kota':
    case 'admin_kecamatan':
    case 'admin_kelurahan':
    case 'auditor':
    case 'finance_admin':
      return '/admin/home';
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
      return '/unauthorized';
  }
}

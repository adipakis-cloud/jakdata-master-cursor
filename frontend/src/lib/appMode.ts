// App mode determined by environment variable at build time
// VITE_APP_MODE=command → Command Center (admin only)
// VITE_APP_MODE=field → Field App (koordinator only)
// Default: field

export type AppMode = 'command' | 'field';

export const APP_MODE: AppMode =
  (import.meta.env.VITE_APP_MODE as AppMode) === 'command' ? 'command' : 'field';

export const COMMAND_ROLES = ['admin_pusat', 'admin_kota', 'auditor', 'finance_admin'] as const;

export const FIELD_ROLES = [
  'koordinator_kecamatan',
  'koordinator_kelurahan',
  'koordinator_rw',
  'koordinator_rt',
  'petugas_lapangan',
  'manager_warmindo',
  'kasir_warmindo',
] as const;

/** Roles that use the mobile Field shell (excludes warmindo). */
export const FIELD_SHELL_ROLES = [
  'koordinator_kecamatan',
  'koordinator_kelurahan',
  'koordinator_rw',
  'koordinator_rt',
  'petugas_lapangan',
] as const;

export const WARMINDO_ROLES = ['manager_warmindo', 'kasir_warmindo'] as const;

export function getAllowedRolesForMode(): string[] {
  return APP_MODE === 'command' ? [...COMMAND_ROLES] : [...FIELD_ROLES];
}

export function isRoleAllowedInMode(role: string): boolean {
  return getAllowedRolesForMode().includes(role);
}

export function defaultPathForMode(): string {
  return APP_MODE === 'command' ? '/admin/home' : '/field';
}

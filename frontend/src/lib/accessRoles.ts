/** Maps Prisma `UserRole` to policy labels (e.g. for `jakdata_role` diagnostics). */
export function prismaRoleToAccessRole(role: string): string {
  const m: Record<string, string> = {
    admin_pusat: 'ADMIN_PUSAT',
    admin_kota: 'ADMIN_KOTA',
    admin_kecamatan: 'ADMIN_KECAMATAN',
    admin_kelurahan: 'ADMIN_KELURAHAN',
    auditor: 'AUDITOR',
    finance_admin: 'FINANCE_ADMIN',
    koordinator_kecamatan: 'KOORDINATOR_KECAMATAN',
    koordinator_kelurahan: 'KOORDINATOR_KELURAHAN',
    koordinator_rw: 'KOORDINATOR_RW',
    koordinator_rt: 'KOORDINATOR_RT',
    petugas_lapangan: 'PETUGAS',
    manager_warmindo: 'WARMINDO',
    kasir_warmindo: 'WARMINDO',
  };
  return m[role] ?? role.toUpperCase();
}

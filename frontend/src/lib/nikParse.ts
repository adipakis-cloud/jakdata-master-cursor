/** Parse DD/MM/YY from NIK-derived string into ISO date input value (YYYY-MM-DD). */
export function parseNikBirthDate(tanggalLahirNik?: string): Date | undefined {
  if (!tanggalLahirNik) return undefined;
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(tanggalLahirNik);
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  const currentYY = new Date().getFullYear() % 100;
  year += year > currentYY ? 1900 : 2000;
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

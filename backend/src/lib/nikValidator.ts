export interface NikValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    provinsiCode?: string;
    kotaCode?: string;
    kecamatanCode?: string;
    jenisKelamin?: 'L' | 'P';
    tanggalLahir?: string;
  };
}

export function validateNikFormat(nik: string): NikValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: NikValidationResult['info'] = {};

  if (!nik) {
    return { valid: false, errors: ['NIK tidak boleh kosong'], warnings: [], info };
  }

  const nikClean = nik.replace(/\s/g, '');

  if (!/^\d+$/.test(nikClean)) {
    errors.push('NIK harus berupa angka');
    return { valid: false, errors, warnings, info };
  }

  if (nikClean.length !== 16) {
    errors.push(`NIK harus 16 digit (saat ini ${nikClean.length} digit)`);
    return { valid: false, errors, warnings, info };
  }

  info.provinsiCode = nikClean.substring(0, 2);
  info.kotaCode = nikClean.substring(0, 4);
  info.kecamatanCode = nikClean.substring(0, 6);

  const dd = parseInt(nikClean.substring(6, 8), 10);
  if (dd > 40) {
    info.jenisKelamin = 'P';
    const realDay = dd - 40;
    const mm = nikClean.substring(8, 10);
    const yy = nikClean.substring(10, 12);
    info.tanggalLahir = `${String(realDay).padStart(2, '0')}/${mm}/${yy}`;
  } else {
    info.jenisKelamin = 'L';
    const mm = nikClean.substring(8, 10);
    const yy = nikClean.substring(10, 12);
    info.tanggalLahir = `${String(dd).padStart(2, '0')}/${mm}/${yy}`;
  }

  const dayNum = dd > 40 ? dd - 40 : dd;
  if (dayNum < 1 || dayNum > 31) {
    warnings.push('Tanggal lahir pada NIK tidak valid');
  }

  const month = parseInt(nikClean.substring(8, 10), 10);
  if (month < 1 || month > 12) {
    warnings.push('Bulan lahir pada NIK tidak valid');
  }

  if (info.provinsiCode !== '31') {
    warnings.push(
      `NIK berasal dari provinsi lain (kode ${info.provinsiCode}). ` +
        'Mungkin KTP lama atau warga pendatang.',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

/** Parse DD/MM/YY from NIK info into Date (century heuristic). */
export function parseNikBirthDate(tanggalLahirNik?: string): Date | undefined {
  if (!tanggalLahirNik) return undefined;
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(tanggalLahirNik);
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  const now = new Date();
  const currentYY = now.getFullYear() % 100;
  year += year > currentYY ? 1900 : 2000;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

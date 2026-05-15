import { prisma } from '../config/prisma';
import { validateNikFormat } from './nikValidator';

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  isDuplicate: boolean;
  isWarning: boolean;
  issues: Array<{
    type: 'duplicate_nik' | 'duplicate_hp' | 'duplicate_name_dob' | 'invalid_nik_format';
    severity: 'error' | 'warning';
    message: string;
    existingWarga?: {
      id: number;
      nama: string;
      rtId: number;
      rtNomor?: string;
    };
  }>;
  nikInfo?: ReturnType<typeof validateNikFormat>['info'];
}

function cleanNik(nik: string): string {
  return nik.replace(/\s/g, '');
}

export async function checkWargaDuplicate(params: {
  nik?: string;
  noHp?: string;
  nama?: string;
  tanggalLahir?: Date;
  excludeId?: number;
}): Promise<DuplicateCheckResult> {
  const issues: DuplicateCheckResult['issues'] = [];
  let nikInfo: DuplicateCheckResult['nikInfo'];

  if (params.nik) {
    const nikClean = cleanNik(params.nik);
    const nikValidation = validateNikFormat(nikClean);
    nikInfo = nikValidation.info;

    if (!nikValidation.valid) {
      issues.push({
        type: 'invalid_nik_format',
        severity: 'error',
        message: nikValidation.errors[0] || 'Format NIK tidak valid',
      });
      return {
        hasDuplicate: true,
        isDuplicate: true,
        isWarning: false,
        issues,
        nikInfo,
      };
    }

    for (const warning of nikValidation.warnings) {
      issues.push({
        type: 'invalid_nik_format',
        severity: 'warning',
        message: warning,
      });
    }

    const existingNik = await prisma.warga.findFirst({
      where: {
        nikHash: nikClean,
        deletedAt: null,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      include: { rt: { select: { nomor: true } } },
    });

    if (existingNik) {
      issues.push({
        type: 'duplicate_nik',
        severity: 'error',
        message: `NIK ini sudah terdaftar atas nama "${existingNik.nama}" di RT ${existingNik.rt?.nomor ?? '-'}. Tidak bisa mendaftarkan dua warga dengan NIK yang sama.`,
        existingWarga: {
          id: existingNik.id,
          nama: existingNik.nama,
          rtId: existingNik.rtId,
          rtNomor: existingNik.rt?.nomor != null ? String(existingNik.rt.nomor) : undefined,
        },
      });
    }
  }

  if (params.noHp && params.noHp.replace(/\D/g, '').length >= 10) {
    const existingHp = await prisma.warga.findFirst({
      where: {
        noHp: params.noHp,
        deletedAt: null,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      include: { rt: { select: { nomor: true } } },
    });

    if (existingHp) {
      issues.push({
        type: 'duplicate_hp',
        severity: 'warning',
        message: `Nomor HP ini sudah digunakan oleh "${existingHp.nama}" (RT ${existingHp.rt?.nomor ?? '-'}). Satu HP bisa dipakai oleh keluarga. Lanjutkan jika memang berbeda orang.`,
        existingWarga: {
          id: existingHp.id,
          nama: existingHp.nama,
          rtId: existingHp.rtId,
          rtNomor: existingHp.rt?.nomor != null ? String(existingHp.rt.nomor) : undefined,
        },
      });
    }
  }

  if (params.nama && params.tanggalLahir) {
    const existingName = await prisma.warga.findFirst({
      where: {
        nama: { equals: params.nama, mode: 'insensitive' },
        tanggalLahir: params.tanggalLahir,
        deletedAt: null,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      include: { rt: { select: { nomor: true } } },
    });

    if (existingName) {
      issues.push({
        type: 'duplicate_name_dob',
        severity: 'warning',
        message: `Warga dengan nama dan tanggal lahir yang sama sudah terdaftar di RT ${existingName.rt?.nomor ?? '-'}. Pastikan ini bukan orang yang sama.`,
        existingWarga: {
          id: existingName.id,
          nama: existingName.nama,
          rtId: existingName.rtId,
          rtNomor: existingName.rt?.nomor != null ? String(existingName.rt.nomor) : undefined,
        },
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  const hasWarnings = issues.some((i) => i.severity === 'warning');

  return {
    hasDuplicate: issues.length > 0,
    isDuplicate: hasErrors,
    isWarning: !hasErrors && hasWarnings,
    issues,
    nikInfo,
  };
}

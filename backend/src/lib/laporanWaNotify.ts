import { sendWhatsAppMessage } from '../ai/modules/whatsapp-ai/whatsapp.service';
import { formatPhone } from './waPhone';

const STATUS_LABELS: Record<string, string> = {
  baru: 'Baru — menunggu penanganan',
  diproses: 'Sedang diproses petugas',
  menunggu_data: 'Menunggu data tambahan',
  eskalasi: 'Dieskalasi ke tingkat lebih tinggi',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
};

function toWaJid(noHp: string): string | null {
  const digits = noHp.replace(/\D/g, '');
  if (!digits || digits.length < 10) return null;
  const wa = digits.startsWith('62') ? digits : digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return `${wa}@s.whatsapp.net`;
}

export async function sendLaporanKonfirmasiWa(params: {
  noHp: string;
  kodeLaporan: string;
  kategori: string;
  namaPelapor?: string;
}): Promise<void> {
  const jid = toWaJid(params.noHp);
  if (!jid) return;

  const pesan =
    `✅ *Laporan Anda Diterima*\n\n` +
    `📋 Nomor: *${params.kodeLaporan}*\n` +
    `📍 Kategori: ${params.kategori}\n` +
    `📅 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
    `Status laporan dapat dicek di aplikasi JAKDATA.\n` +
    `Simpan nomor laporan ini untuk referensi.\n\n` +
    `_JAKDATA — Sistem Laporan Warga Dapil 3_`;

  await sendWhatsAppMessage(jid, pesan);
  console.log(`[Laporan] WA konfirmasi terkirim ke ${formatPhone(params.noHp)}`);
}

export async function sendLaporanStatusWa(params: {
  noHp: string;
  kodeLaporan: string;
  status: string;
  catatan?: string;
}): Promise<void> {
  const jid = toWaJid(params.noHp);
  if (!jid) return;

  const statusLabel = STATUS_LABELS[params.status] ?? params.status;
  let pesan =
    `📋 *Update Laporan JAKDATA*\n\n` +
    `Nomor: *${params.kodeLaporan}*\n` +
    `Status: *${statusLabel}*\n` +
    `📅 ${new Date().toLocaleString('id-ID')}\n`;

  if (params.catatan) {
    pesan += `\nCatatan petugas:\n${params.catatan}\n`;
  }

  pesan += `\n_JAKDATA — Sistem Laporan Warga Dapil 3_`;

  await sendWhatsAppMessage(jid, pesan);
  console.log(`[Laporan] WA update status terkirim ke ${formatPhone(params.noHp)}`);
}

export async function trySendLaporanWa(
  fn: () => Promise<void>,
  context: string,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Laporan] WA ${context} gagal:`, msg);
  }
}

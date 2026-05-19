import type { LaporanWarga, ReportStatus, UrgencyLevel } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { aiQueue } from "../../../queues/queue.config";
import { callAIJson } from "../../core/anthropic.service";

export interface WaSenderContext {
  phone: string;
  phoneVariants: string[];
  warga: {
    id: number;
    nama: string;
    rtId: number;
    rtNomor: string;
    rwNomor: string;
    kelurahanNama: string;
    kecamatanNama: string;
  } | null;
  rtId: number | null;
  kelurahanId: number | null;
  kecamatanId: number | null;
  wilayahLabel: string;
  recentLaporan: Array<{ kodeLaporan: string; status: ReportStatus; createdAt: Date }>;
}

interface WaMessageAnalysis {
  intent: "status_check" | "new_laporan" | "general";
  kodeLaporan: string | null;
  isiLaporan: string | null;
  kategori: string | null;
  urgency: "low" | "medium" | "high" | "critical";
  lokasiText: string | null;
  isEmergency: boolean;
  readyToCreate: boolean;
  replyText: string;
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  baru: "Baru — menunggu penanganan",
  diproses: "Sedang diproses petugas",
  menunggu_data: "Menunggu data tambahan dari pelapor",
  eskalasi: "Dieskalasi ke tingkat lebih tinggi",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

const KODE_PATTERN =
  /\b((?:LPR|JAK|LP)-[\d]{4,}(?:-[\d]{3,5})?|[A-Z]{2,4}-\d{4}-\d{3,5})\b/i;

export function phoneFromJid(jid: string): string {
  const digits = jid.replace(/@.*$/, "").replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  const set = new Set<string>();
  if (!digits) return [];
  set.add(digits);
  if (digits.startsWith("62")) {
    set.add(`0${digits.slice(2)}`);
    set.add(digits.slice(2));
  } else if (digits.startsWith("0")) {
    set.add(`62${digits.slice(1)}`);
    set.add(digits.slice(1));
  }
  return [...set];
}

export function jidFromPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const wa = digits.startsWith("62") ? digits : digits.startsWith("0") ? `62${digits.slice(1)}` : `62${digits}`;
  return `${wa}@s.whatsapp.net`;
}

export function extractLaporanCode(text: string): string | null {
  const normalized = text.trim();
  const cekMatch = normalized.match(
    /cek\s+laporan\s+#?\s*((?:LPR|JAK|LP)-[\w-]+)/i
  );
  if (cekMatch?.[1]) return cekMatch[1].toUpperCase();

  const direct = normalized.match(KODE_PATTERN);
  return direct?.[1]?.toUpperCase() ?? null;
}

export async function resolveSenderContext(jid: string): Promise<WaSenderContext> {
  const phone = phoneFromJid(jid);
  const variants = phoneVariants(phone);

  const warga = await prisma.warga.findFirst({
    where: {
      deletedAt: null,
      OR: variants.flatMap((v) => [
        { noHp: v },
        { noHp: { contains: v.slice(-10) } },
      ]),
    },
    include: {
      rt: {
        include: {
          rw: { include: { kelurahan: { include: { kecamatan: true } } } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  let rtId: number | null = warga?.rtId ?? null;
  let kelurahanId: number | null = warga?.rt.rw.kelurahanId ?? null;
  let kecamatanId: number | null = warga?.rt.rw.kelurahan?.kecamatanId ?? null;

  const recentLaporan = await prisma.laporanWarga.findMany({
    where: {
      OR: [
        ...variants.map((v) => ({ noHpPelapor: v })),
        ...variants.map((v) => ({ noHpPelapor: { contains: v.slice(-10) } })),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { kodeLaporan: true, status: true, createdAt: true },
  });

  const wilayahLabel = warga
    ? `RT ${warga.rt.nomor}/RW ${warga.rt.rw.nomor}, ${warga.rt.rw.kelurahan.nama}, ${warga.rt.rw.kelurahan.kecamatan?.nama ?? ""}`
    : "wilayah belum teridentifikasi dari nomor HP";

  return {
    phone,
    phoneVariants: variants,
    warga: warga
      ? {
          id: warga.id,
          nama: warga.nama,
          rtId: warga.rtId,
          rtNomor: warga.rt.nomor,
          rwNomor: warga.rt.rw.nomor,
          kelurahanNama: warga.rt.rw.kelurahan.nama,
          kecamatanNama: warga.rt.rw.kelurahan.kecamatan?.nama ?? "",
        }
      : null,
    rtId,
    kelurahanId,
    kecamatanId,
    wilayahLabel,
    recentLaporan,
  };
}

export async function generateLaporanKodeWa(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LPR-${year}-`;
  const count = await prisma.laporanWarga.count({
    where: { kodeLaporan: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

function phonesMatch(a: string | null | undefined, variants: string[]): boolean {
  if (!a) return false;
  const norm = a.replace(/\D/g, "");
  return variants.some((v) => {
    const nv = v.replace(/\D/g, "");
    return norm === nv || norm.endsWith(nv.slice(-10)) || nv.endsWith(norm.slice(-10));
  });
}

export async function formatLaporanStatusReply(
  kode: string,
  ctx: WaSenderContext
): Promise<string> {
  const laporan = await prisma.laporanWarga.findUnique({
    where: { kodeLaporan: kode },
    include: {
      rt: { include: { rw: { include: { kelurahan: true } } } },
    },
  });

  if (!laporan) {
    return `Laporan dengan kode *${kode}* tidak ditemukan. Periksa penulisan kode (contoh: LPR-2026-001) atau hubungi petugas RT.`;
  }

  if (laporan.noHpPelapor && !phonesMatch(laporan.noHpPelapor, ctx.phoneVariants)) {
    return `Kode *${kode}* terdaftar, tetapi nomor WhatsApp Anda tidak cocok dengan data pelapor. Untuk keamanan, status hanya bisa dicek dari nomor yang sama saat melapor.`;
  }

  const wilayah =
    laporan.rt != null
      ? `RT ${laporan.rt.nomor}/RW ${laporan.rt.rw.nomor}, ${laporan.rt.rw.kelurahan.nama}`
      : laporan.lokasiText ?? "—";

  const statusLabel = STATUS_LABELS[laporan.status] ?? laporan.status;
  const tanggal = laporan.createdAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    `📋 *Status Laporan ${laporan.kodeLaporan}*\n` +
    `Status: ${statusLabel}\n` +
    `Kategori: ${laporan.kategori}${laporan.isEmergency ? " (DARURAT)" : ""}\n` +
    `Wilayah: ${wilayah}\n` +
    `Tanggal: ${tanggal}\n` +
    `Ringkasan: ${laporan.isiLaporan.substring(0, 120)}${laporan.isiLaporan.length > 120 ? "…" : ""}\n\n` +
    `Ketik laporan baru kapan saja — kami siap bantu.`
  );
}

async function resolveTerritoryIds(
  ctx: WaSenderContext,
  lokasiText: string | null
): Promise<{ rtId: number | null; kelurahanId: number | null; kecamatanId: number | null }> {
  if (ctx.rtId != null) {
    return { rtId: ctx.rtId, kelurahanId: ctx.kelurahanId, kecamatanId: ctx.kecamatanId };
  }
  return { rtId: null, kelurahanId: null, kecamatanId: null };
}

export async function createLaporanFromWhatsApp(params: {
  ctx: WaSenderContext;
  isiLaporan: string;
  kategori: string;
  urgency: UrgencyLevel;
  lokasiText: string | null;
  isEmergency: boolean;
  messageType: string;
}): Promise<LaporanWarga> {
  const { ctx, isiLaporan, kategori, urgency, lokasiText, isEmergency, messageType } =
    params;
  const territory = await resolveTerritoryIds(ctx, lokasiText);
  const kodeLaporan = await generateLaporanKodeWa();

  const laporan = await prisma.laporanWarga.create({
    data: {
      kodeLaporan,
      channelType: "whatsapp",
      namaPelapor: ctx.warga?.nama ?? "Warga (via WhatsApp)",
      noHpPelapor: ctx.phone.startsWith("62") ? `0${ctx.phone.slice(2)}` : ctx.phone,
      isiLaporan:
        messageType !== "text" && !isiLaporan.includes("[")
          ? `[${messageType}] ${isiLaporan}`
          : isiLaporan,
      kategori,
      urgencyLevel: urgency,
      lokasiText: lokasiText ?? ctx.wilayahLabel,
      rtId: territory.rtId,
      kelurahanId: territory.kelurahanId,
      kecamatanId: territory.kecamatanId,
      isEmergency,
      status: "baru",
    },
  });

  await prisma.laporanMessage.create({
    data: {
      laporanId: laporan.id,
      senderType: "warga",
      messageText: laporan.isiLaporan,
    },
  });

  if (process.env.ENABLE_AI_WORKERS !== "false") {
    aiQueue
      .add("fraud-check-laporan", { laporanId: laporan.id }, { priority: 8, delay: 3000 })
      .catch((err) => console.error("[WA Laporan] fraud-check enqueue:", err));
  }

  return laporan;
}

export async function resolveKoordinatorRtPhones(rtId: number): Promise<string[]> {
  const phones = new Set<string>();

  const koordinators = await prisma.user.findMany({
    where: {
      aktif: true,
      rtId,
      role: "koordinator_rt",
      noHp: { not: null },
    },
    select: { noHp: true },
  });
  for (const u of koordinators) {
    if (u.noHp) phones.add(u.noHp);
  }

  const rt = await prisma.rT.findUnique({
    where: { id: rtId },
    select: { noHpKetua: true, namaKetua: true },
  });
  if (rt?.noHpKetua) phones.add(rt.noHpKetua);

  return [...phones];
}

export function buildKoordinatorForwardText(
  laporan: LaporanWarga,
  ctx: WaSenderContext,
  originalBody: string
): string {
  const pelapor = ctx.warga?.nama ?? "Warga";
  return (
    `🚨 *LAPORAN DARURAT JAKDATA*\n\n` +
    `Kode: *${laporan.kodeLaporan}*\n` +
    `Pelapor: ${pelapor} (${ctx.phone})\n` +
    `Wilayah: ${laporan.lokasiText ?? ctx.wilayahLabel}\n` +
    `Kategori: ${laporan.kategori}\n\n` +
    `Isi:\n${originalBody.substring(0, 400)}\n\n` +
    `_Mohon segera koordinasi tindak lanjut. Balasan ke warga via nomor JAKDATA._`
  );
}

function buildContextPrompt(ctx: WaSenderContext): string {
  const recent =
    ctx.recentLaporan.length > 0
      ? ctx.recentLaporan
          .map((l) => `- ${l.kodeLaporan}: ${STATUS_LABELS[l.status]}`)
          .join("\n")
      : "Belum ada laporan terbaru dari nomor ini.";

  return `KONTEKS PELAPOR (nomor WhatsApp):
- Nama: ${ctx.warga?.nama ?? "tidak terdaftar di database warga"}
- Wilayah: ${ctx.wilayahLabel}
- RT/RW: ${ctx.warga ? `RT ${ctx.warga.rtNomor}/RW ${ctx.warga.rwNomor}` : "belum diketahui"}
- Kelurahan: ${ctx.warga?.kelurahanNama ?? "—"}
- Laporan terakhir dari nomor ini:
${recent}`;
}

export async function processWhatsAppLaporan(params: {
  jid: string;
  body: string;
  messageType: string;
}): Promise<{
  replyText: string;
  laporanId: number | null;
  isEmergency: boolean;
  rtId: number | null;
}> {
  const { jid, body, messageType } = params;
  const ctx = await resolveSenderContext(jid);
  const text = body.trim();

  const explicitCode = extractLaporanCode(text);
  const isStatusIntent =
    explicitCode != null &&
    (/cek\s+laporan/i.test(text) || text.length < 80);

  if (isStatusIntent && explicitCode) {
    const replyText = await formatLaporanStatusReply(explicitCode, ctx);
    return { replyText, laporanId: null, isEmergency: false, rtId: ctx.rtId };
  }

  const analysis = await callAIJson<WaMessageAnalysis>(
    `Kamu asisten WhatsApp JAKDATA untuk pengaduan warga Dapil Jakarta III.

TUGAS:
1. Tentukan intent: status_check | new_laporan | general
2. Jika warga minta cek status / sebut kode laporan → status_check, isi kodeLaporan
3. Jika warga melaporkan masalah (jalan rusak, banjir, dll) → new_laporan
4. Jika new_laporan dan sudah jelas masalah + lokasi → readyToCreate: true
5. Tulis replyText bahasa Indonesia sopan, max 4 kalimat, personal (sebut nama/wilayah jika ada)
6. Jika darurat (kebakaran, banjir, kecelakaan, kriminal aktif): isEmergency true, urgency critical
7. Jangan buat kode laporan di replyText — sistem yang generate

Kategori: infrastruktur | sosial | ekonomi | kesehatan | darurat

JSON:
{
  "intent": "status_check" | "new_laporan" | "general",
  "kodeLaporan": string | null,
  "isiLaporan": string | null,
  "kategori": string | null,
  "urgency": "low" | "medium" | "high" | "critical",
  "lokasiText": string | null,
  "isEmergency": boolean,
  "readyToCreate": boolean,
  "replyText": string
}`,
    `${buildContextPrompt(ctx)}\n\nPesan warga (${messageType}):\n"${text || `[${messageType}]`}"`
  );

  if (analysis.intent === "status_check") {
    const kode = analysis.kodeLaporan ?? explicitCode;
    if (kode) {
      const replyText = await formatLaporanStatusReply(kode.toUpperCase(), ctx);
      return { replyText, laporanId: null, isEmergency: false, rtId: ctx.rtId };
    }
    return {
      replyText:
        "Untuk cek status, kirim: *cek laporan LPR-2026-001* (ganti dengan kode Anda).",
      laporanId: null,
      isEmergency: false,
      rtId: ctx.rtId,
    };
  }

  let laporanId: number | null = null;
  let replyText = analysis.replyText;
  const isEmergency = analysis.isEmergency || analysis.urgency === "critical";

  const laporanText = analysis.isiLaporan ?? text;
  const shouldCreate =
    analysis.intent === "new_laporan" &&
    laporanText.length > 0 &&
    (analysis.readyToCreate || isEmergency);

  if (shouldCreate) {
    const kategori = analysis.kategori ?? (isEmergency ? "darurat" : "sosial");
    const urgency = (analysis.urgency ?? "medium") as UrgencyLevel;

    const laporan = await createLaporanFromWhatsApp({
      ctx,
      isiLaporan: laporanText,
      kategori,
      urgency,
      lokasiText: analysis.lokasiText,
      isEmergency,
      messageType,
    });
    laporanId = laporan.id;

    const salam = ctx.warga?.nama ? `Pak/Ibu ${ctx.warga.nama.split(" ")[0]}, ` : "";
    replyText =
      `${salam}laporan Anda sudah kami catat.\n\n` +
      `📋 *Nomor laporan: ${laporan.kodeLaporan}*\n` +
      `Simpan nomor ini untuk cek status: *cek laporan ${laporan.kodeLaporan}*\n\n` +
      `${isEmergency ? "🚨 Laporan ditandai DARURAT — koordinator RT kami hubungi segera.\n\n" : ""}` +
      `Terima kasih sudah melapor untuk ${ctx.warga?.kelurahanNama ?? "wilayah Anda"}.`;
  } else if (analysis.intent === "new_laporan") {
    replyText = analysis.replyText;
  }

  return { replyText, laporanId, isEmergency, rtId: ctx.rtId };
}

export async function createEmergencyAlert(params: {
  from: string;
  body: string;
  replyText: string;
  messageId: string;
  laporanId: number | null;
  rtId: number | null;
}): Promise<void> {
  await prisma.aiAlert.create({
    data: {
      alertType: "emergency",
      severity: "critical",
      wilayahScope: "rt",
      wilayahId: params.rtId != null ? String(params.rtId) : "unknown",
      title: "🚨 DARURAT via WhatsApp",
      description: `Pesan darurat dari ${params.from}: ${params.body.substring(0, 200)}`,
      payload: {
        from: params.from,
        messageId: params.messageId,
        laporanId: params.laporanId,
        originalMessage: params.body,
        aiReply: params.replyText,
      },
    },
  });
}


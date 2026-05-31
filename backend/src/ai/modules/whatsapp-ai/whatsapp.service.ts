import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as path from "path";
import * as fs from "fs";
import { prisma } from "../../../config/prisma";
import { jidToPhone } from "../../../lib/waPhone";
import {
  buildKoordinatorForwardText,
  createEmergencyAlert,
  jidFromPhone,
  processWhatsAppLaporan,
  resolveKoordinatorRtPhones,
  resolveSenderContext,
} from "./whatsapp-laporan.service";

const qrcode = require("qrcode-terminal");
const QRCodeImage = require("qrcode");

let globalSocket: ReturnType<typeof makeWASocket> | null = null;
let isConnected = false;

function getWaAuthPath(): string {
  return path.join(process.cwd(), "wa-auth");
}

function waAuthCredsExist(): boolean {
  return fs.existsSync(path.join(getWaAuthPath(), "creds.json"));
}

function clearWaAuthDir(): void {
  const authPath = getWaAuthPath();
  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true });
    console.log("[WhatsApp AI] Folder wa-auth dibersihkan");
  }
}

/** 401/loggedOut: reconnect + QR baru hanya jika creds belum ada; creds expired → stop. */
function shouldReconnectAfterDisconnect(statusCode: number | undefined): boolean {
  if (statusCode === DisconnectReason.loggedOut) {
    if (!waAuthCredsExist()) {
      console.log(
        "[WhatsApp AI] Disconnect 401 — wa-auth/creds.json tidak ada, bersihkan session dan reconnect untuk QR baru",
      );
      clearWaAuthDir();
      return true;
    }
    console.log("[WhatsApp AI] Disconnect 401 — creds ada (session logout/expired), tidak reconnect");
    return false;
  }
  return true;
}

function normalizeWANumber(jid: string): string {
  return jidToPhone(jid);
}

async function forwardEmergencyToKoordinator(params: {
  sock: ReturnType<typeof makeWASocket>;
  rtId: number;
  laporanId: number;
  from: string;
  body: string;
}): Promise<void> {
  const { sock, rtId, laporanId, from, body } = params;
  const ctx = await resolveSenderContext(from);
  const laporan = await prisma.laporanWarga.findUnique({ where: { id: laporanId } });
  if (!laporan) return;

  const phones = await resolveKoordinatorRtPhones(rtId);
  if (phones.length === 0) {
    console.warn(`[WhatsApp AI] Tidak ada nomor koordinator RT ${rtId} untuk forward darurat`);
    return;
  }

  const text = buildKoordinatorForwardText(laporan, ctx, body);

  for (const phone of phones) {
    const jid = jidFromPhone(phone);
    if (!jid) continue;
    try {
      await sock.sendMessage(jid, { text });
      console.log(`[WhatsApp AI] ✓ Forward darurat ke koordinator ${phone}`);
    } catch (err) {
      console.error(`[WhatsApp AI] Gagal forward ke ${phone}:`, err);
    }
  }
}

export async function startWhatsappAI(): Promise<void> {
  const authPath = getWaAuthPath();
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const sock = makeWASocket({
    auth: state,
    browser: ["JAKDATA", "Chrome", "1.0.0"],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
  });

  globalSocket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\n\n");
      console.log("══════════════════════════════════════════");
      console.log("  JAKDATA WhatsApp AI — SCAN QR INI");
      console.log("══════════════════════════════════════════");

      qrcode.generate(qr, { small: true });

      console.log("══════════════════════════════════════════");
      console.log("  Buka WA", process.env.WA_PHONE_NUMBER ?? "08131876268");
      console.log("  ⋮ → Linked Devices → Link a Device");
      console.log("  Arahkan kamera ke QR di atas");
      console.log("══════════════════════════════════════════\n");

      try {
        const qrPath = path.join(process.cwd(), "wa-qr.png");
        await QRCodeImage.toFile(qrPath, qr, { width: 512, margin: 3 });
        console.log(`[WhatsApp AI] 📁 QR juga tersimpan di: ${qrPath}`);
      } catch {
        console.log("[WhatsApp AI] File QR tidak tersimpan, scan dari terminal saja");
      }

      try {
        await prisma.whatsappSession.upsert({
          where: { sessionKey: "main" },
          update: {
            status: "qr_pending",
            qrCode: qr,
            lastSeen: new Date(),
          },
          create: {
            sessionKey: "main",
            status: "qr_pending",
            qrCode: qr,
          },
        });
      } catch {
        console.log("[WhatsApp AI] DB upsert error (non-fatal)");
      }
    }

    if (connection === "open") {
      isConnected = true;
      console.log(
        "[WhatsApp AI] ✓ Terhubung ke WhatsApp",
        process.env.WA_PHONE_NUMBER ?? "08131876268"
      );

      await prisma.whatsappSession.upsert({
        where: { sessionKey: "main" },
        update: { status: "active", qrCode: null, lastSeen: new Date() },
        create: { sessionKey: "main", status: "active" },
      });
    }

    if (connection === "close") {
      isConnected = false;
      globalSocket = null;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = shouldReconnectAfterDisconnect(statusCode);

      console.log(
        `[WhatsApp AI] Koneksi terputus (${statusCode}). Reconnect: ${shouldReconnect}`,
      );

      await prisma.whatsappSession.upsert({
        where: { sessionKey: "main" },
        update: {
          status: shouldReconnect && !waAuthCredsExist() ? "qr_pending" : "disconnected",
          ...(shouldReconnect && !waAuthCredsExist() ? { qrCode: null } : {}),
          lastSeen: new Date(),
        },
        create: { sessionKey: "main", status: "disconnected" },
      });

      if (shouldReconnect) {
        console.log("[WhatsApp AI] Mencoba reconnect dalam 10 detik...");
        setTimeout(() => {
          startWhatsappAI().catch((err) =>
            console.error("[WhatsApp AI] Reconnect gagal:", err),
          );
        }, 10000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const from = msg.key.remoteJid;
      if (!from) continue;

      if (from.includes("@g.us")) continue;

      // Skip pesan dari nomor WA sistem sendiri
      const ownNumber = process.env.WA_PHONE_NUMBER ?? "08131876268";
      const ownJid = "62" + ownNumber.slice(1);
      if (from.includes(ownJid) || from.includes(ownNumber)) {
        console.log("[WhatsApp AI] Skip pesan dari nomor sendiri");
        continue;
      }

      const body =
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        msg.message.imageMessage?.caption ??
        "";

      const isAutoReply =
        body.includes("_Sent via fonnte") ||
        body.includes("_Sent via") ||
        body.toUpperCase().includes("AIGPRE") ||
        body.includes("no-reply@") ||
        body.includes("noreply@") ||
        (body.includes("platform perdagangan") && body.includes("B2B")) ||
        (body.toLowerCase().includes("automatic reply") &&
          body.toLowerCase().includes("office"));

      if (isAutoReply) {
        console.log("[WhatsApp AI] Skip auto-reply / pesan sistem");
        continue;
      }

      // Skip pesan kosong atau tidak ada konten
      if (!body || body.trim() === "" || body === "[text]") {
        console.log("[WhatsApp AI] Skip pesan kosong");
        continue;
      }

      const messageType = msg.message.imageMessage
        ? "image"
        : msg.message.audioMessage
          ? "voice"
          : msg.message.locationMessage
            ? "location"
            : "text";

      const displayBody = body || `[${messageType}]`;
      const normalizedFrom = normalizeWANumber(from);
      console.log(`[WhatsApp AI] Pesan dari ${normalizedFrom}: ${displayBody.substring(0, 50)}...`);

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentCount = await prisma.whatsappMessage.count({
        where: {
          from: normalizedFrom,
          receivedAt: { gte: fiveMinutesAgo },
          aiProcessed: true,
        },
      });
      if (recentCount >= 10) {
        console.log("[WhatsApp AI] Rate limit — skip (terlalu banyak pesan dalam 5 menit)");
        continue;
      }

      const saved = await prisma.whatsappMessage.create({
        data: {
          sessionId: "main",
          from: normalizedFrom,
          messageType,
          body: displayBody,
          aiProcessed: false,
        },
      });

      try {
        const result = await processWhatsAppLaporan({
          jid: from,
          body: displayBody,
          messageType,
        });

        await sock.sendMessage(from, { text: result.replyText });

        await prisma.whatsappMessage.update({
          where: { id: saved.id },
          data: {
            aiProcessed: true,
            aiReply: result.replyText,
            laporanId: result.laporanId != null ? String(result.laporanId) : null,
          },
        });

        if (result.isEmergency) {
          await createEmergencyAlert({
            from: jidToPhone(from),
            body: displayBody,
            replyText: result.replyText,
            messageId: saved.id,
            laporanId: result.laporanId,
            rtId: result.rtId,
          });

          if (result.rtId != null) {
            if (result.laporanId != null) {
              await forwardEmergencyToKoordinator({
                sock,
                rtId: result.rtId,
                laporanId: result.laporanId,
                from,
                body: displayBody,
              });
            } else {
              const phones = await resolveKoordinatorRtPhones(result.rtId);
              const ctx = await resolveSenderContext(from);
              const text =
                `🚨 *LAPORAN DARURAT JAKDATA (belum terdaftar formal)*\n\n` +
                `Dari: ${ctx.warga?.nama ?? "Warga"} (${jidToPhone(from)})\n` +
                `Wilayah: ${ctx.wilayahLabel}\n\n` +
                `Pesan:\n${displayBody.substring(0, 400)}`;
              for (const phone of phones) {
                const jid = jidFromPhone(phone);
                if (jid) await sock.sendMessage(jid, { text }).catch(() => undefined);
              }
            }
          }

          console.warn(`[WhatsApp AI] 🚨 DARURAT — laporan ${result.laporanId ?? "n/a"} dari ${jidToPhone(from)}`);
        }

        console.log(`[WhatsApp AI] ✓ Balasan terkirim ke ${jidToPhone(from)}`);
      } catch (err) {
        console.error(`[WhatsApp AI] Error memproses pesan dari ${jidToPhone(from)}:`, err);

        const errorMessage =
          err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);

        await prisma.whatsappMessage.update({
          where: { id: saved.id },
          data: {
            aiProcessed: false,
            aiReply: `[ERROR] ${errorMessage}`.substring(0, 1000),
          },
        }).catch((dbErr) => console.error("[WhatsApp AI] Gagal simpan error:", dbErr));

        await sock.sendMessage(from, {
          text: "Maaf, sistem sedang mengalami gangguan. Silakan coba beberapa saat lagi atau hubungi petugas kelurahan langsung.",
        });
      }
    }
  });

  console.log("[WhatsApp AI] Memulai koneksi...");
}

export function getWhatsappStatus(): { connected: boolean; socket: boolean } {
  return { connected: isConnected, socket: globalSocket !== null };
}

/** Reset session DB, hapus creds lokal, dan mulai ulang socket untuk QR baru. */
export async function forceWhatsappReconnect(): Promise<void> {
  isConnected = false;

  if (globalSocket) {
    try {
      await globalSocket.logout();
    } catch {
      try {
        globalSocket.end(undefined);
      } catch {
        /* ignore */
      }
    }
    globalSocket = null;
  }

  clearWaAuthDir();

  await prisma.whatsappSession.upsert({
    where: { sessionKey: "main" },
    update: {
      status: "disconnected",
      qrCode: null,
      lastSeen: new Date(),
    },
    create: {
      sessionKey: "main",
      status: "disconnected",
    },
  });

  await startWhatsappAI();
}

/** Kirim pesan WA outbound (broadcast, konfirmasi laporan, dll). */
export async function sendWhatsAppMessage(jidOrPhone: string, text: string): Promise<void> {
  if (!globalSocket || !isConnected) {
    throw new Error('WhatsApp belum terhubung');
  }

  let jid = jidOrPhone;
  if (!jid.includes('@')) {
    const digits = jid.replace(/\D/g, '');
    if (!digits || digits === 'lidinternal') {
      throw new Error('Nomor tujuan tidak valid');
    }
    const wa = digits.startsWith('62') ? digits : digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
    jid = `${wa}@s.whatsapp.net`;
  }

  await globalSocket.sendMessage(jid, { text });
}

export { sendWhatsAppMessage as sendMessage };


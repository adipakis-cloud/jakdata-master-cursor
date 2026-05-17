import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as path from "path";
import * as fs from "fs";
import { prisma } from "../../../config/prisma";
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

function normalizeWANumber(jid: string): string {
  let num = jid
    .replace("@s.whatsapp.net", "")
    .replace("@c.us", "")
    .replace("@lid", "")
    .trim();

  if (!/^\d+$/.test(num) || num.length > 15) {
    return jid;
  }

  if (num.startsWith("08")) {
    num = "62" + num.slice(1);
  }

  return num;
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
  const authPath = path.join(process.cwd(), "wa-auth");
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
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[WhatsApp AI] Koneksi terputus (${statusCode}). Reconnect: ${shouldReconnect}`
      );

      await prisma.whatsappSession.upsert({
        where: { sessionKey: "main" },
        update: { status: "disconnected", lastSeen: new Date() },
        create: { sessionKey: "main", status: "disconnected" },
      });

      if (shouldReconnect) {
        console.log("[WhatsApp AI] Mencoba reconnect dalam 10 detik...");
        setTimeout(() => {
          startWhatsappAI().catch((err) =>
            console.error("[WhatsApp AI] Reconnect gagal:", err)
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

      const body =
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        msg.message.imageMessage?.caption ??
        "";

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
            from,
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
                `Dari: ${ctx.warga?.nama ?? "Warga"} (${ctx.phone})\n` +
                `Wilayah: ${ctx.wilayahLabel}\n\n` +
                `Pesan:\n${displayBody.substring(0, 400)}`;
              for (const phone of phones) {
                const jid = jidFromPhone(phone);
                if (jid) await sock.sendMessage(jid, { text }).catch(() => undefined);
              }
            }
          }

          console.warn(`[WhatsApp AI] 🚨 DARURAT — laporan ${result.laporanId ?? "n/a"} dari ${from}`);
        }

        console.log(`[WhatsApp AI] ✓ Balasan terkirim ke ${from}`);
      } catch (err) {
        console.error(`[WhatsApp AI] Error memproses pesan dari ${from}:`, err);

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

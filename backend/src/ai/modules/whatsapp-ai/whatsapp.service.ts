import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { PrismaClient } from "@prisma/client";
import { callAI } from "../../core/anthropic.service";
import * as path from "path";
import * as fs from "fs";

const qrcode = require("qrcode-terminal");
const QRCodeImage = require("qrcode");

const prisma = new PrismaClient();
const SYSTEM_PROMPT = `Kamu adalah asisten JAKDATA — sistem pengaduan dan informasi warga.
Tugasmu menerima laporan warga, membantu klarifikasi, dan memberikan informasi.

ATURAN:
- Bahasa Indonesia informal tapi sopan
- Maksimal 3 kalimat per balasan
- Jika laporan darurat (kebakaran, banjir, kecelakaan, kriminal): 
  balas dengan instruksi darurat dan tulis [DARURAT] di awal pesan
- Selalu minta informasi: lokasi RT/RW, deskripsi masalah
- Jika warga kirim foto: konfirmasi foto diterima dan minta deskripsi
- Jangan berikan informasi sensitif atau politik
- Jika tidak tahu jawaban: arahkan ke petugas kelurahan

KATEGORI LAPORAN:
- infrastruktur (jalan rusak, lampu mati, saluran tersumbat)
- sosial (konflik warga, kebisingan, keamanan)
- ekonomi (bantuan sosial, UMKM)
- kesehatan (lingkungan kotor, wabah)
- darurat (kebakaran, banjir, kecelakaan)`;

let globalSocket: ReturnType<typeof makeWASocket> | null = null;
let isConnected = false;

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
      console.log("  Buka WA 08131876268");
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

      console.log(`[WhatsApp AI] Pesan dari ${from}: ${body.substring(0, 50)}...`);

      const saved = await prisma.whatsappMessage.create({
        data: {
          sessionId: "main",
          from,
          messageType,
          body: body || `[${messageType}]`,
          aiProcessed: false,
        },
      });

      try {
        const aiResult = await callAI(
          SYSTEM_PROMPT,
          `Pesan dari warga: "${body || `[mengirim ${messageType}]`}"`,
          300
        );

        const replyText = aiResult.text;
        const isEmergency = replyText.includes("[DARURAT]");

        await sock.sendMessage(from, { text: replyText });

        await prisma.whatsappMessage.update({
          where: { id: saved.id },
          data: { aiProcessed: true, aiReply: replyText },
        });

        if (isEmergency) {
          await prisma.aiAlert.create({
            data: {
              alertType: "emergency",
              severity: "critical",
              wilayahScope: "rt",
              wilayahId: "unknown",
              title: "🚨 DARURAT via WhatsApp",
              description: `Pesan darurat dari ${from}: ${body}`,
              payload: {
                from,
                messageId: saved.id,
                originalMessage: body,
                aiReply: replyText,
              },
            },
          });

          console.warn(`[WhatsApp AI] 🚨 DARURAT terdeteksi dari ${from}`);
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

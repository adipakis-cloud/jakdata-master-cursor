import Imap from "node-imap";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { prisma } from "../../../config/prisma";
import { callAIJson } from "../../core/anthropic.service";

const EMAIL_USER = process.env.EMAIL_USER ?? "jakdatabmpan@gmail.com";
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD ?? "";
const IMAP_HOST = process.env.EMAIL_IMAP_HOST ?? "imap.gmail.com";
const IMAP_PORT = Number(process.env.EMAIL_IMAP_PORT ?? 993);
const SMTP_HOST = process.env.EMAIL_SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.EMAIL_SMTP_PORT ?? 587);

interface EmailClassification {
  category: string;
  urgency: "low" | "medium" | "high" | "critical";
  summary: string;
  requiresReply: boolean;
  suggestedReply: string;
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

async function sendAutoReply(
  to: string,
  subject: string,
  replyBody: string
): Promise<void> {
  await transporter.sendMail({
    from: `"JAKDATA System" <${EMAIL_USER}>`,
    to,
    subject: `Re: ${subject}`,
    text: replyBody,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: #1e40af; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">JAKDATA — Sistem Pengaduan Warga</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          ${replyBody.replace(/\n/g, "<br>")}
          <hr style="margin: 20px 0; border-color: #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            Pesan ini dikirim otomatis oleh sistem JAKDATA.<br>
            Email: ${EMAIL_USER} | WhatsApp: ${process.env.WA_PHONE_NUMBER ?? "08131876268"}
          </p>
        </div>
      </div>
    `,
  });
}

async function processEmail(
  uid: number,
  from: string,
  subject: string,
  bodyText: string
): Promise<void> {
  const existing = await prisma.emailMessage.findUnique({
    where: { messageUid: String(uid) },
  });

  if (existing) return;

  console.log(`[Email AI] Memproses email dari ${from}: ${subject}`);

  const classification = await callAIJson<EmailClassification>(
    `Kamu adalah sistem klasifikasi email pengaduan warga untuk JAKDATA.
Analisa email berikut dan klasifikasikan.
Kategori: laporan, keluhan, pertanyaan, darurat, spam, lainnya
Urgency: low, medium, high, critical

Balas HANYA dengan JSON:
{
  "category": string,
  "urgency": "low|medium|high|critical",
  "summary": string,
  "requiresReply": boolean,
  "suggestedReply": string
}

Untuk suggestedReply: tulis balasan dalam bahasa Indonesia yang sopan,
sebutkan bahwa laporan sudah diterima dan akan ditindaklanjuti.
Jika darurat: tambahkan instruksi darurat yang relevan.`,
    JSON.stringify({ from, subject, body: bodyText.substring(0, 1000) })
  );

  const saved = await prisma.emailMessage.create({
    data: {
      messageUid: String(uid),
      fromAddress: from,
      subject,
      bodyText,
      aiCategory: classification.category,
      aiSummary: classification.summary,
    },
  });

  if (classification.requiresReply) {
    try {
      await sendAutoReply(from, subject, classification.suggestedReply);

      await prisma.emailMessage.update({
        where: { id: saved.id },
        data: { aiReplySent: true, aiReplyBody: classification.suggestedReply },
      });

      console.log(`[Email AI] ✓ Auto reply terkirim ke ${from}`);
    } catch (err) {
      console.error(`[Email AI] Gagal kirim reply ke ${from}:`, err);
    }
  }

  if (classification.urgency === "critical" || classification.urgency === "high") {
    await prisma.aiAlert.create({
      data: {
        alertType: classification.category === "darurat" ? "emergency" : "complaint",
        severity: classification.urgency,
        wilayahScope: "kelurahan",
        wilayahId: "unknown",
        title: `📧 Email ${classification.urgency.toUpperCase()}: ${subject.substring(0, 80)}`,
        description: classification.summary,
        payload: {
          emailId: saved.id,
          from,
          subject,
          category: classification.category,
        },
      },
    });
  }

  console.log(
    `[Email AI] ✓ ${from} — kategori: ${classification.category} | urgency: ${classification.urgency}`
  );
}

function fetchUnseenMessages(imap: Imap): void {
  imap.search(["UNSEEN"], (err, results) => {
    if (err || !results || results.length === 0) return;

    const fetch = imap.fetch(results, { bodies: "" });

    fetch.on("message", (msg) => {
      let uid = 0;

      msg.on("attributes", (attrs) => {
        uid = attrs.uid;
      });

      msg.on("body", (stream) => {
        simpleParser(stream, async (parseErr, parsed) => {
          if (parseErr) return;

          const from = parsed.from?.text ?? "unknown";
          const subject = parsed.subject ?? "(tanpa subject)";
          const bodyText = parsed.text ?? "";

          try {
            await processEmail(uid, from, subject, bodyText);
          } catch (e) {
            console.error("[Email AI] Error memproses email:", e);
          }
        });
      });
    });
  });
}

export function startEmailAI(): void {
  if (!EMAIL_PASSWORD) {
    console.warn("[Email AI] EMAIL_PASSWORD tidak diset — Email AI dilewati");
    return;
  }

  const imap = new Imap({
    user: EMAIL_USER,
    password: EMAIL_PASSWORD,
    host: IMAP_HOST,
    port: IMAP_PORT,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    keepalive: {
      interval: 10000,
      idleInterval: 300000,
      forceNoop: true,
    },
  });

  imap.once("ready", () => {
    console.log(`[Email AI] ✓ Terhubung ke Gmail ${EMAIL_USER}`);

    imap.openBox("INBOX", false, (err) => {
      if (err) {
        console.error("[Email AI] Gagal buka inbox:", err);
        return;
      }

      imap.search(["UNSEEN"], (searchErr, results) => {
        if (searchErr || !results || results.length === 0) {
          console.log("[Email AI] Tidak ada email baru saat startup");
        } else {
          console.log(`[Email AI] ${results.length} email belum dibaca`);
          fetchUnseenMessages(imap);
        }
      });

      imap.on("mail", () => {
        console.log("[Email AI] 📧 Email baru masuk!");
        fetchUnseenMessages(imap);
      });
    });
  });

  imap.once("error", (err: Error) => {
    console.error("[Email AI] IMAP error:", err.message);
    console.log("[Email AI] Mencoba reconnect dalam 30 detik...");
    setTimeout(startEmailAI, 30000);
  });

  imap.once("end", () => {
    console.log("[Email AI] Koneksi IMAP terputus. Reconnect dalam 30 detik...");
    setTimeout(startEmailAI, 30000);
  });

  imap.connect();
  console.log("[Email AI] Menghubungkan ke Gmail...");
}

import React from "react";

const CARD_STYLE = {
  background: "rgba(0, 56, 168, 0.4)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 18,
  padding: 28,
};

const Badge = ({ text }: { text: string }) => (
  <span style={{
    background: "rgba(255,255,255,0.15)",
    border: "1.5px solid rgba(255,255,255,0.6)",
    color: "white",
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
    whiteSpace: "nowrap",
  }}>
    {text}
  </span>
);

const FocusItem = ({ icon, label }: { icon: string; label: string }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 8,
    padding: "7px 12px",
    color: "white",
    fontSize: 12,
    fontWeight: 500,
  }}>
    <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
    <span style={{ color: "white" }}>{label}</span>
  </div>
);

export default function BerandaProfileCard() {
  return (
    <div style={{
      background: "linear-gradient(160deg, #0038A8 0%, #0052CC 50%, #003580 100%)",
      minHeight: "100vh",
      padding: "0 32px 40px",
      fontFamily: "system-ui, sans-serif",
    }}>

      {/* ── BANNER PAN ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 24,
        paddingBottom: 8,
        position: "relative",
      }}>
        <img
          src="/pan-logo.png"
          alt="Logo PAN"
          style={{
            width: "70%",
            maxWidth: 700,
            height: "auto",
            filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.4))",
          }}
        />
      </div>

      {/* ── DUA CARD PROFIL ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
        marginTop: 24,
      }}>

        {/* CARD KIRI — Zulkifli Hasan */}
        <div style={CARD_STYLE}>
          {/* Badge row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <Badge text="KETUA UMUM PAN" />
            <Badge text="MENKO PANGAN RI" />
          </div>

          {/* Foto + Nama row */}
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 24 }}>
            <img
              src="/zulkifli-hasan.jpg"
              alt="Zulkifli Hasan"
              style={{
                width: 150,
                height: 190,
                objectFit: "cover",
                objectPosition: "top center",
                borderRadius: 12,
                border: "2px solid rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: "white",
                lineHeight: 1.2,
                marginBottom: 12,
              }}>
                Zulkifli Hasan,<br />S.E., M.M.
              </div>
              <div style={{
                width: 50,
                height: 2,
                background: "rgba(255,255,255,0.4)",
                marginBottom: 12,
              }}/>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                📍 Jakarta — Nasional
              </div>
            </div>
          </div>

          {/* Fokus Bidang */}
          <div style={{
            fontSize: 11,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.65)",
            marginBottom: 12,
            fontWeight: 700,
          }}>
            FOKUS BIDANG
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FocusItem icon="🌾" label="Ketahanan Pangan Nasional" />
            <FocusItem icon="🤝" label="Koordinasi Lintas Kementerian" />
            <FocusItem icon="👨‍🌾" label="Pemberdayaan Petani & Nelayan" />
            <FocusItem icon="📊" label="Stabilitas Harga Pangan" />
            <FocusItem icon="🏗️" label="Infrastruktur Pertanian" />
            <FocusItem icon="🇮🇩" label="Kedaulatan Pangan Indonesia" />
          </div>
        </div>

        {/* CARD KANAN — Sigit Purnomo Said */}
        <div style={CARD_STYLE}>
          {/* Badge row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <Badge text="KETUA UMUM BM PAN" />
            <Badge text="ANGGOTA DPR RI" />
          </div>

          {/* Foto + Nama row */}
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 24 }}>
            <img
              src="/sigit-purnomo-said.jpg"
              alt="Sigit Purnomo Said"
              style={{
                width: 150,
                height: 190,
                objectFit: "cover",
                objectPosition: "top center",
                borderRadius: 12,
                border: "2px solid rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: "white",
                lineHeight: 1.2,
                marginBottom: 12,
              }}>
                Sigit Purnomo Said,<br />S.A.P., S.H.
              </div>
              <div style={{
                width: 50,
                height: 2,
                background: "rgba(255,255,255,0.4)",
                marginBottom: 12,
              }}/>
              <div style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
                marginBottom: 6,
                fontWeight: 600,
              }}>
                F-PAN | Komisi VIII DPR RI | Dapil DKI Jakarta III
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                Periode: 2024–2029
              </div>
              <div style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.65)",
                marginTop: 4,
              }}>
                📍 Jakarta Barat, Jakarta Utara, Kepulauan Seribu
              </div>
            </div>
          </div>

          {/* Fokus Komisi */}
          <div style={{
            fontSize: 11,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.65)",
            marginBottom: 12,
            fontWeight: 700,
          }}>
            FOKUS KOMISI VIII DPR RI
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <FocusItem icon="🕌" label="Agama" />
            <FocusItem icon="👥" label="Sosial" />
            <FocusItem icon="🕋" label="Haji" />
            <FocusItem icon="🤲" label="Bantuan Sosial" />
            <FocusItem icon="⚠️" label="Kebencanaan" />
            <FocusItem icon="👶" label="Perlindungan Anak" />
            <FocusItem icon="👴" label="Lansia" />
            <FocusItem icon="♿" label="Penyandang Disabilitas" />
            <FocusItem icon="🏘️" label="Kelompok Rentan" />
            <FocusItem icon="🌱" label="Pemberdayaan Sosial" />
          </div>
        </div>
      </div>
    </div>
  );
}

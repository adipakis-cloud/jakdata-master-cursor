import { useState, useEffect } from "react";

const Badge = ({ text }: { text: string }) => (
  <span style={{
    background: "rgba(255,255,255,0.2)",
    border: "1.5px solid rgba(255,255,255,0.6)",
    color: "white",
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
    whiteSpace: "nowrap",
    display: "inline-block",
    marginBottom: 4,
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
    padding: "8px 12px",
    color: "white",
    fontSize: 12,
    fontWeight: 500,
  }}>
    <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
    <span style={{ color: "white", lineHeight: 1.3 }}>{label}</span>
  </div>
);

export default function BerandaProfileCard() {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );

  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 900);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const PAGE: React.CSSProperties = {
    background: "linear-gradient(160deg, #0038A8 0%, #0052CC 60%, #003580 100%)",
    minHeight: "100vh",
    padding: mobile ? "12px 12px 32px" : "0 32px 40px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxSizing: "border-box",
    width: "100%",
  };

  const CARD: React.CSSProperties = {
    background: "rgba(0, 40, 130, 0.55)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 16,
    padding: mobile ? 16 : 28,
    width: "100%",
    boxSizing: "border-box",
  };

  const PHOTO: React.CSSProperties = {
    width: mobile ? 110 : 140,
    height: mobile ? 140 : 180,
    objectFit: "cover",
    objectPosition: "top center",
    borderRadius: 10,
    border: "2px solid rgba(255,255,255,0.4)",
    flexShrink: 0,
    display: "block",
  };

  const NAME: React.CSSProperties = {
    fontSize: mobile ? 22 : 26,
    fontWeight: 800,
    color: "white",
    lineHeight: 1.2,
    margin: "10px 0 10px",
  };

  const DIVIDER: React.CSSProperties = {
    width: 40,
    height: 2,
    background: "rgba(255,255,255,0.4)",
    marginBottom: 10,
  };

  const FOCUS_LABEL: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 10,
    fontWeight: 700,
    marginTop: 20,
  };

  return (
    <div style={PAGE}>

      {/* BANNER */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        paddingTop: mobile ? 12 : 24,
        paddingBottom: 16,
      }}>
        <img
          src="/pan-logo.png"
          alt="Logo PAN"
          style={{
            width: mobile ? "100%" : "65%",
            maxWidth: 680,
            height: "auto",
            filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.4))",
          }}
        />
      </div>

      {/* GRID — 1 kolom di mobile, 2 kolom di desktop */}
      <div style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
        gap: mobile ? 16 : 24,
        width: "100%",
        boxSizing: "border-box",
      }}>

        {/* ── CARD ZULKIFLI ── */}
        <div style={CARD}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Badge text="KETUA UMUM PAN" />
            <Badge text="MENKO PANGAN RI" />
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <img src="/zulkifli-hasan.jpg" alt="Zulkifli Hasan" style={PHOTO} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={NAME}>
                Zulkifli Hasan,<br />S.E., M.M.
              </div>
              <div style={DIVIDER} />
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                📍 Jakarta — Nasional
              </div>
            </div>
          </div>

          <div style={FOCUS_LABEL}>FOKUS BIDANG</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}>
            <FocusItem icon="🌾" label="Ketahanan Pangan Nasional" />
            <FocusItem icon="🤝" label="Koordinasi Lintas Kementerian" />
            <FocusItem icon="👨‍🌾" label="Pemberdayaan Petani & Nelayan" />
            <FocusItem icon="📊" label="Stabilitas Harga Pangan" />
            <FocusItem icon="🏗️" label="Infrastruktur Pertanian" />
            <FocusItem icon="🇮🇩" label="Kedaulatan Pangan Indonesia" />
          </div>
        </div>

        {/* ── CARD SIGIT ── */}
        <div style={CARD}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Badge text="KETUA UMUM BM PAN" />
            <Badge text="ANGGOTA DPR RI" />
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <img src="/sigit-purnomo-said.jpg" alt="Sigit Purnomo Said" style={PHOTO} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={NAME}>
                Sigit Purnomo Said,<br />S.A.P., S.H.
              </div>
              <div style={DIVIDER} />
              <div style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.85)",
                fontWeight: 600,
                marginBottom: 4,
                wordBreak: "break-word",
              }}>
                F-PAN | Komisi VIII DPR RI | Dapil DKI Jakarta III
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                Periode: 2024–2029
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                📍 Jakarta Barat, Jakarta Utara, Kepulauan Seribu
              </div>
            </div>
          </div>

          <div style={FOCUS_LABEL}>FOKUS KOMISI VIII DPR RI</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr",
            gap: 8,
          }}>
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

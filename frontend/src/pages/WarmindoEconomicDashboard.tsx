import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

interface OutletSummary {
  id: number;
  kodeOutlet: string;
  namaOutlet: string;
  status: string;
  rt: string;
  kelurahan: string;
  metrics: {
    omzet30Hari: number;
    profit30Hari: number;
    totalTransaksi: number;
    rataHarian: number;
    totalPengeluaran: number;
    targetBulanan: number;
    pencapaianPersen: number;
  };
  aiScore: number | null;
  aiTrend: string | null;
  activeAlerts: number;
}

interface EconomicSummary {
  totalOutlet: number;
  totalOmzet30Hari: number;
  outletKritis: number;
  outletSehat: number;
  outletBelumDianalisa: number;
}

function formatRupiah(num: number): string {
  if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toFixed(1)}jt`;
  }
  if (num >= 1_000) {
    return `Rp ${(num / 1_000).toFixed(0)}rb`;
  }
  return `Rp ${num.toFixed(0)}`;
}

function ScoreGauge({ score }: { score: number | null }) {
  if (score === null) {
    return <span style={{ color: "#9ca3af", fontSize: 12 }}>Belum dianalisa</span>;
  }

  const color =
    score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : score >= 30 ? "#ef4444" : "#7c3aed";

  const label =
    score >= 70 ? "Sehat" : score >= 50 ? "Waspada" : score >= 30 ? "Kritis" : "Darurat";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: `conic-gradient(${color} ${score * 3.6}deg, #e5e7eb ${score * 3.6}deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            color,
          }}
        >
          {Math.round(score)}
        </div>
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend) return null;

  const config: Record<string, { icon: string; color: string; bg: string }> = {
    stable: { icon: "→", color: "#059669", bg: "#d1fae5" },
    recovering: { icon: "↗", color: "#0284c7", bg: "#dbeafe" },
    declining: { icon: "↘", color: "#dc2626", bg: "#fee2e2" },
    critical: { icon: "↓", color: "#7c3aed", bg: "#ede9fe" },
  };

  const cfg = config[trend] ?? config.stable;

  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {cfg.icon} {trend}
    </span>
  );
}

export default function WarmindoEconomicDashboard() {
  const [summary, setSummary] = useState<EconomicSummary | null>(null);
  const [outlets, setOutlets] = useState<OutletSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "kritis" | "sehat">("all");
  const [sortBy, setSortBy] = useState<"omzet" | "score" | "pencapaian">("omzet");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/ai/economic-summary");
      const json = res.data;
      if (json.success) {
        setSummary(json.data.summary);
        setOutlets(json.data.outlets);
      }
    } catch (err) {
      console.error("[Warmindo Dashboard]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredOutlets = outlets
    .filter((o) => {
      if (filter === "kritis") return o.aiScore !== null && o.aiScore < 40;
      if (filter === "sehat") return o.aiScore !== null && o.aiScore >= 70;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "omzet") return b.metrics.omzet30Hari - a.metrics.omzet30Hari;
      if (sortBy === "score") return (b.aiScore ?? 0) - (a.aiScore ?? 0);
      if (sortBy === "pencapaian") return b.metrics.pencapaianPersen - a.metrics.pencapaianPersen;
      return 0;
    });

  const STAT_CARDS = [
    {
      label: "Total Outlet Aktif",
      value: summary?.totalOutlet ?? 0,
      icon: "🏪",
      color: "#3b82f6",
    },
    {
      label: "Total Omzet 30 Hari",
      value: formatRupiah(summary?.totalOmzet30Hari ?? 0),
      icon: "💰",
      color: "#22c55e",
    },
    {
      label: "Outlet Kritis (< 40)",
      value: summary?.outletKritis ?? 0,
      icon: "🔴",
      color: "#ef4444",
    },
    {
      label: "Outlet Sehat (≥ 70)",
      value: summary?.outletSehat ?? 0,
      icon: "✅",
      color: "#22c55e",
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🏪 Warmindo Economic Intelligence</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Sensor ekonomi wilayah — update setiap 60 detik
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          style={{
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: card.color,
                marginBottom: 4,
              }}
            >
              {loading ? "—" : card.value}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, color: "#6b7280" }}>Filter:</span>
        {(["all", "kritis", "sehat"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: filter === f ? "#3b82f6" : "#e5e7eb",
              background: filter === f ? "#3b82f6" : "white",
              color: filter === f ? "white" : "#374151",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: filter === f ? 600 : 400,
            }}
          >
            {f === "all" ? "Semua" : f === "kritis" ? "🔴 Kritis" : "✅ Sehat"}
          </button>
        ))}

        <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 16 }}>Urutkan:</span>
        {(["omzet", "score", "pencapaian"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSortBy(s)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: sortBy === s ? "#6366f1" : "#e5e7eb",
              background: sortBy === s ? "#6366f1" : "white",
              color: sortBy === s ? "white" : "#374151",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: sortBy === s ? 600 : 400,
            }}
          >
            {s === "omzet" ? "Omzet" : s === "score" ? "AI Score" : "Pencapaian"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p>Memuat data ekonomi Warmindo...</p>
        </div>
      ) : filteredOutlets.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
          <p>Tidak ada outlet yang sesuai filter</p>
        </div>
      ) : (
        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px",
              padding: "12px 20px",
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              fontSize: 11,
              fontWeight: 700,
              color: "#6b7280",
              letterSpacing: 0.5,
            }}
          >
            <span>OUTLET</span>
            <span>OMZET 30 HARI</span>
            <span>PROFIT</span>
            <span>PENCAPAIAN</span>
            <span>AI SCORE</span>
            <span>TREND</span>
            <span>ALERT</span>
          </div>

          {filteredOutlets.map((outlet, idx) => (
            <div
              key={outlet.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px",
                padding: "16px 20px",
                borderBottom: idx < filteredOutlets.length - 1 ? "1px solid #f3f4f6" : "none",
                alignItems: "center",
                background: outlet.activeAlerts > 0 ? "#fff5f5" : "white",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = outlet.activeAlerts > 0 ? "#fee2e2" : "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = outlet.activeAlerts > 0 ? "#fff5f5" : "white";
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 2 }}>
                  {outlet.namaOutlet}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  {outlet.kodeOutlet} · RT {outlet.rt} · {outlet.kelurahan}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}>
                  {formatRupiah(outlet.metrics.omzet30Hari)}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  ~{formatRupiah(outlet.metrics.rataHarian)}/hari
                </div>
              </div>

              <div
                style={{
                  fontWeight: 600,
                  color: outlet.metrics.profit30Hari > 0 ? "#059669" : "#dc2626",
                  fontSize: 14,
                }}
              >
                {formatRupiah(outlet.metrics.profit30Hari)}
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color:
                      outlet.metrics.pencapaianPersen >= 80
                        ? "#059669"
                        : outlet.metrics.pencapaianPersen >= 50
                          ? "#f59e0b"
                          : "#dc2626",
                  }}
                >
                  {outlet.metrics.pencapaianPersen}%
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 4,
                    background: "#e5e7eb",
                    borderRadius: 2,
                    marginTop: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(outlet.metrics.pencapaianPersen, 100)}%`,
                      height: "100%",
                      background:
                        outlet.metrics.pencapaianPersen >= 80
                          ? "#22c55e"
                          : outlet.metrics.pencapaianPersen >= 50
                            ? "#f59e0b"
                            : "#ef4444",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>

              <ScoreGauge score={outlet.aiScore} />
              <TrendBadge trend={outlet.aiTrend} />

              <div style={{ textAlign: "center" }}>
                {outlet.activeAlerts > 0 ? (
                  <span
                    style={{
                      background: "#fee2e2",
                      color: "#dc2626",
                      borderRadius: 12,
                      padding: "3px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    🔴 {outlet.activeAlerts}
                  </span>
                ) : (
                  <span style={{ color: "#22c55e", fontSize: 16 }}>✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

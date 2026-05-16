import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

interface AiAlert {
  id: string;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  wilayahScope: string;
  wilayahId: string;
  title: string;
  description: string;
  isResolved: boolean;
  createdAt: string;
}

interface AiRecommendation {
  id: string;
  category: string;
  priority: "low" | "medium" | "high";
  targetWilayahId: string | null;
  title: string;
  body: string;
  isActed: boolean;
  createdAt: string;
}

interface HealthScore {
  id: string;
  wilayahType: string;
  wilayahId: string;
  overallScore: number;
  socialScore: number;
  economicScore: number;
  operationalScore: number;
  period: string;
  calculatedAt: string;
}

const SEVERITY_CONFIG = {
  low: { color: "#22c55e", bg: "#052e16", label: "RENDAH" },
  medium: { color: "#f59e0b", bg: "#1c1008", label: "SEDANG" },
  high: { color: "#ef4444", bg: "#1c0a0a", label: "TINGGI" },
  critical: { color: "#a855f7", bg: "#1a0a2e", label: "KRITIS" },
} as const;

const PRIORITY_CONFIG = {
  low: { color: "#6b7280", label: "Rendah" },
  medium: { color: "#f59e0b", label: "Sedang" },
  high: { color: "#ef4444", label: "Tinggi" },
} as const;

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "#374151",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
      <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 30 }}>{Math.round(value)}</span>
    </div>
  );
}

function AlertCard({ alert, onResolve }: { alert: AiAlert; onResolve: (id: string) => void }) {
  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.medium;
  return (
    <div style={{ borderLeft: `3px solid ${cfg.color}`, background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: `${cfg.color}22`, padding: "2px 6px", borderRadius: 4, letterSpacing: 1 }}>{cfg.label}</span>
            <span style={{ fontSize: 10, color: "#6b7280", background: "#1f2937", padding: "2px 6px", borderRadius: 4 }}>{alert.alertType.toUpperCase()}</span>
          </div>
          <p style={{ color: "#f3f4f6", fontSize: 13, fontWeight: 600, margin: 0, marginBottom: 4 }}>{alert.title}</p>
          <p style={{ color: "#9ca3af", fontSize: 12, margin: 0 }}>{alert.description}</p>
        </div>
        <button type="button" onClick={() => onResolve(alert.id)} style={{ marginLeft: 12, background: "transparent", border: `1px solid ${cfg.color}66`, color: cfg.color, borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Selesai</button>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <span style={{ fontSize: 11, color: "#6b7280" }}>📍 {alert.wilayahScope.toUpperCase()} {alert.wilayahId}</span>
        <span style={{ fontSize: 11, color: "#6b7280" }}>🕐 {new Date(alert.createdAt).toLocaleString("id-ID")}</span>
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: AiRecommendation }) {
  const cfg = PRIORITY_CONFIG[rec.priority] ?? PRIORITY_CONFIG.medium;
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: `${cfg.color}22`, padding: "2px 6px", borderRadius: 4 }}>{cfg.label.toUpperCase()}</span>
          <span style={{ fontSize: 10, color: "#6b7280", background: "#1f2937", padding: "2px 6px", borderRadius: 4 }}>{rec.category.toUpperCase()}</span>
        </div>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{expanded ? "▲" : "▼"}</span>
      </div>
      <p style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 600, margin: 0 }}>{rec.title}</p>
      {expanded && <p style={{ color: "#9ca3af", fontSize: 12, margin: 0, marginTop: 8, lineHeight: 1.6, whiteSpace: "pre-line" }}>{rec.body}</p>}
      <p style={{ fontSize: 11, color: "#4b5563", margin: 0, marginTop: 6 }}>{new Date(rec.createdAt).toLocaleString("id-ID")}</p>
    </div>
  );
}

function HealthScoreCard({ score }: { score: HealthScore }) {
  const overall = score.overallScore;
  const color = overall >= 70 ? "#22c55e" : overall >= 50 ? "#f59e0b" : overall >= 30 ? "#ef4444" : "#a855f7";
  return (
    <div style={{ background: "#111827", border: `1px solid ${color}44`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <p style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 600, margin: 0 }}>{score.wilayahType.toUpperCase()} {score.wilayahId}</p>
          <p style={{ color: "#6b7280", fontSize: 11, margin: 0 }}>{score.period}</p>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color, minWidth: 50, textAlign: "right" }}>{Math.round(overall)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "#6b7280" }}>Sosial</span>
        <ScoreBar value={score.socialScore} color="#3b82f6" />
        <span style={{ fontSize: 11, color: "#6b7280" }}>Ekonomi</span>
        <ScoreBar value={score.economicScore} color="#f59e0b" />
        <span style={{ fontSize: 11, color: "#6b7280" }}>Operasional</span>
        <ScoreBar value={score.operationalScore} color="#22c55e" />
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const [alerts, setAlerts] = useState<AiAlert[]>([]);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [healthScores, setHealthScores] = useState<HealthScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"alerts" | "recs" | "health">("alerts");

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, recsRes, scoresRes] = await Promise.all([
        api.get("/ai/alerts", { params: { limit: 30 } }),
        api.get("/ai/engine-recommendations"),
        api.get("/ai/health-scores", { params: { wilayahType: "rt" } }),
      ]);
      const alertsJson = alertsRes.data;
      const recsJson = recsRes.data;
      const scoresJson = scoresRes.data;
      if (alertsJson.success) setAlerts(alertsJson.data ?? []);
      if (recsJson.success) setRecommendations(recsJson.data ?? []);
      if (scoresJson.success) setHealthScores(scoresJson.data ?? []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[CommandCenter] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleResolve = async (alertId: string) => {
    try {
      await api.patch(`/ai/alerts/${alertId}/resolve`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Gagal resolve alert:", err);
    }
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;
  const highPriorityRecs = recommendations.filter((r) => r.priority === "high").length;
  const criticalScores = healthScores.filter((s) => s.overallScore < 30).length;

  const tabStyle = (active: boolean) => ({
    padding: "8px 16px",
    background: active ? "#1d4ed8" : "transparent",
    border: active ? "1px solid #2563eb" : "1px solid #374151",
    borderRadius: 6,
    color: active ? "#fff" : "#9ca3af",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#f9fafb", fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #1f2937" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f9fafb" }}>🧠 JAKDATA Command Center</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginTop: 4 }}>Territorial Intelligence AI — Update: {lastUpdate.toLocaleTimeString("id-ID")}</p>
        </div>
        <button type="button" onClick={fetchData} style={{ background: "#1f2937", border: "1px solid #374151", color: "#9ca3af", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13 }}>↻ Refresh</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Alert Kritis", value: criticalCount, color: "#a855f7", icon: "🔴" },
          { label: "Alert Tinggi", value: highCount, color: "#ef4444", icon: "⚠️" },
          { label: "Rekomendasi Urgent", value: highPriorityRecs, color: "#f59e0b", icon: "💡" },
          { label: "Wilayah Kritis", value: criticalScores, color: "#3b82f6", icon: "📍" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "#111827", border: `1px solid ${stat.color}33`, borderRadius: 10, padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{loading ? "—" : stat.value}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button type="button" style={tabStyle(activeTab === "alerts")} onClick={() => setActiveTab("alerts")}>🔔 Alert AI ({alerts.length})</button>
        <button type="button" style={tabStyle(activeTab === "recs")} onClick={() => setActiveTab("recs")}>💡 Rekomendasi ({recommendations.length})</button>
        <button type="button" style={tabStyle(activeTab === "health")} onClick={() => setActiveTab("health")}>📊 Health Score ({healthScores.length})</button>
      </div>

      <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 10, padding: 16, minHeight: 400 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p>Memuat data AI...</p>
          </div>
        ) : (
          <>
            {activeTab === "alerts" && (
              <div>
                <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>Menampilkan {alerts.length} alert aktif — auto refresh 30 detik</p>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                    <p>Tidak ada alert aktif saat ini</p>
                  </div>
                ) : (
                  alerts.map((a) => <AlertCard key={a.id} alert={a} onResolve={handleResolve} />)
                )}
              </div>
            )}
            {activeTab === "recs" && (
              <div>
                <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>{recommendations.length} rekomendasi aktif dari AI</p>
                {recommendations.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💡</div>
                    <p>Belum ada rekomendasi AI</p>
                  </div>
                ) : (
                  recommendations.map((r) => <RecommendationCard key={r.id} rec={r} />)
                )}
              </div>
            )}
            {activeTab === "health" && (
              <div>
                <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>Health score wilayah RT — diurutkan dari terendah</p>
                {healthScores.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                    <p>Belum ada data health score</p>
                    <p style={{ fontSize: 12 }}>Health score akan muncul setelah AI worker berjalan</p>
                  </div>
                ) : (
                  healthScores.map((s) => <HealthScoreCard key={s.id} score={s} />)
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

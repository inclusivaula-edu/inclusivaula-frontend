import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient.js";

const SEVERITY = {
  critical: { label: "CRÍTICO", bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
  high:     { label: "ALTO",    bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  medium:   { label: "MÉDIO",   bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  info:     { label: "INFO",    bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd" }
};

const CATEGORY_LABELS = {
  brute_force: "Logins falhos em massa",
  brute_force_ip: "Brute force por IP",
  tenant_violation: "Acesso cross-tenant",
  access_denied: "Acessos negados",
  ai_abuse: "Uso abusivo de IA",
  billing_stuck: "Assinatura travada"
};

export default function SecurityAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => { load(); }, [showResolved]);

  async function getHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
  }

  async function load() {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams();
      if (!showResolved) params.append("resolved", "false");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/security-alerts?${params}`, { headers });
      const j = await res.json();
      setAlerts(j.data || []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/security-watchdog`, {
        method: "POST", headers
      });
      const j = await res.json();
      setScanResult(j.data);
      load();
    } catch {
      setScanResult({ error: true });
    } finally {
      setScanning(false);
    }
  }

  async function resolveAlert(id) {
    try {
      const headers = await getHeaders();
      await fetch(`${import.meta.env.VITE_API_URL}/api/security-alerts/${id}/resolve`, {
        method: "PATCH", headers
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  }

  const activeCount = alerts.filter(a => !a.resolved).length;
  const criticalCount = alerts.filter(a => a.severity === "critical" && !a.resolved).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <button onClick={() => navigate("/dashboard")} style={{
          background: "none", border: "none", color: "#2B9EC3",
          cursor: "pointer", padding: 0, marginBottom: 16, fontSize: 14
        }}>← Voltar</button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ color: "#1a1a2e", margin: "0 0 4px", fontSize: 24 }}>
              🛡️ Central de Segurança
            </h1>
            <p style={{ color: "#5f5e5a", fontSize: 14, margin: 0 }}>
              Monitoramento automático a cada hora via watchdog
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={runScan} disabled={scanning} style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 600,
              background: scanning ? "#9ca3af" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8,
              cursor: scanning ? "not-allowed" : "pointer"
            }}>
              {scanning ? "Escaneando..." : "🔍 Escanear agora"}
            </button>

            <button onClick={() => setShowResolved(!showResolved)} style={{
              padding: "8px 14px", fontSize: 13, border: "1px solid #d3d1c7",
              borderRadius: 8, background: showResolved ? "#e8f7fd" : "#fff",
              cursor: "pointer", color: "#5f5e5a"
            }}>
              {showResolved ? "Ocultar resolvidos" : "Ver resolvidos"}
            </button>
          </div>
        </div>

        {/* Status cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          <div style={{
            background: activeCount === 0 ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${activeCount === 0 ? "#a7f3d0" : "#fca5a5"}`,
            borderRadius: 12, padding: "16px 20px", textAlign: "center"
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: activeCount === 0 ? "#065f46" : "#dc2626" }}>
              {activeCount}
            </div>
            <div style={{ fontSize: 12, color: "#5f5e5a" }}>Alertas ativos</div>
          </div>

          <div style={{
            background: criticalCount === 0 ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${criticalCount === 0 ? "#a7f3d0" : "#fca5a5"}`,
            borderRadius: 12, padding: "16px 20px", textAlign: "center"
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: criticalCount === 0 ? "#065f46" : "#dc2626" }}>
              {criticalCount}
            </div>
            <div style={{ fontSize: 12, color: "#5f5e5a" }}>Críticos</div>
          </div>

          <div style={{
            background: "#f0f9ff", border: "1px solid #bae6fd",
            borderRadius: 12, padding: "16px 20px", textAlign: "center"
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0369a1" }}>⏱️ Automático</div>
            <div style={{ fontSize: 12, color: "#5f5e5a", marginTop: 4 }}>A cada hora</div>
          </div>
        </div>

        {/* Resultado do scan manual */}
        {scanResult && !scanResult.error && (
          <div style={{
            background: scanResult.alerts_created === 0 ? "#ecfdf5" : "#fff7ed",
            border: `1px solid ${scanResult.alerts_created === 0 ? "#a7f3d0" : "#fed7aa"}`,
            borderRadius: 12, padding: "14px 20px", marginBottom: 20, fontSize: 13
          }}>
            {scanResult.alerts_created === 0 ? (
              <span style={{ color: "#065f46" }}>✅ Segurança OK — nenhuma anomalia detectada</span>
            ) : (
              <span style={{ color: "#c2410c" }}>⚠️ {scanResult.alerts_created} alerta(s) gerado(s) neste scan</span>
            )}
            <span style={{ float: "right", color: "#9ca3af", fontSize: 11 }}>
              Logins falhos: {scanResult.login_failures} · Tenant violations: {scanResult.tenant_violations} · Acessos negados: {scanResult.access_denied}
            </span>
          </div>
        )}

        {/* Lista de alertas */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5f5e5a", background: "#fff", borderRadius: 12 }}>Carregando...</div>
          ) : alerts.length === 0 ? (
            <div style={{
              padding: 48, textAlign: "center", background: "#fff",
              borderRadius: 12, boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#065f46", marginBottom: 4 }}>Tudo seguro</div>
              <div style={{ fontSize: 13, color: "#5f5e5a" }}>Nenhum alerta {showResolved ? "" : "ativo "}encontrado</div>
            </div>
          ) : (
            alerts.map(alert => {
              const sev = SEVERITY[alert.severity] || SEVERITY.info;
              return (
                <div key={alert.id} style={{
                  background: "#fff", border: `1px solid ${alert.resolved ? "#e5e7eb" : sev.border}`,
                  borderRadius: 12, padding: "14px 18px",
                  borderLeft: `4px solid ${sev.color}`,
                  opacity: alert.resolved ? 0.6 : 1,
                  boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px",
                          borderRadius: 6, background: sev.bg, color: sev.color
                        }}>
                          {sev.label}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                          {alert.title}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#5f5e5a" }}>
                        {CATEGORY_LABELS[alert.category] || alert.category}
                        {" · "}
                        {new Date(alert.created_at).toLocaleString("pt-BR")}
                      </div>
                      {alert.details && Object.keys(alert.details).length > 0 && (
                        <div style={{
                          marginTop: 8, padding: "6px 10px", background: "#f9fafb",
                          borderRadius: 6, fontSize: 11, fontFamily: "monospace", color: "#5f5e5a"
                        }}>
                          {JSON.stringify(alert.details, null, 0)}
                        </div>
                      )}
                    </div>

                    {!alert.resolved && (
                      <button onClick={() => resolveAlert(alert.id)} style={{
                        padding: "6px 12px", fontSize: 11, fontWeight: 600,
                        background: "none", border: "1px solid #d3d1c7", borderRadius: 6,
                        cursor: "pointer", color: "#5f5e5a", flexShrink: 0
                      }}>
                        ✓ Resolver
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

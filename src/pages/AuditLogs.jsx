import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient.js";

const ACTION_LABELS = {
  "login.success": "Login OK",
  "login.failure": "Login falhou",
  "billing.subscribe": "Assinatura criada",
  "billing.cancel": "Assinatura cancelada",
  "student.delete": "Aluno excluído",
  "teacher.invite": "Professor convidado",
  "teacher.remove": "Professor removido",
  "role.change": "Papel alterado",
  "report.generate": "Relatório gerado",
  "pei.approve": "PEI aprovado",
  "aee.approve": "AEE aprovado",
  "access.denied": "Acesso negado",
  "tenant.violation": "🚨 Acesso cruzado bloqueado"
};

const STATUS_COLORS = {
  success: { bg: "#ecfdf5", color: "#065f46" },
  failure: { bg: "#fef2f2", color: "#dc2626" },
  warning: { bg: "#fffbeb", color: "#92400e" }
};

export default function AuditLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => { load(); }, [filterAction, filterStatus]);

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const params = new URLSearchParams();
    if (filterAction) params.append("action", filterAction);
    if (filterStatus) params.append("status", filterStatus);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const j = await res.json();
      setLogs(j.data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: "#2B9EC3", cursor: "pointer", padding: 0, marginBottom: 16, fontSize: 14 }}>← Voltar</button>

        <h1 style={{ color: "#1a1a2e", margin: "0 0 8px", fontSize: 24 }}>📋 Auditoria de Segurança</h1>
        <p style={{ color: "#5f5e5a", fontSize: 14, marginBottom: 24 }}>Registro de ações sensíveis na sua escola</p>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ padding: 8, border: "1px solid #d3d1c7", borderRadius: 6, fontSize: 13 }}>
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: 8, border: "1px solid #d3d1c7", borderRadius: 6, fontSize: 13 }}>
            <option value="">Todos os status</option>
            <option value="success">Sucesso</option>
            <option value="failure">Falha</option>
            <option value="warning">Aviso</option>
          </select>

          <button onClick={load} style={{ padding: "8px 16px", background: "#2B9EC3", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
            Atualizar
          </button>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#5f5e5a" }}>Carregando...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#5f5e5a" }}>Nenhum log encontrado</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ background: "#f5f5f5" }}>
                <tr>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#5f5e5a" }}>Quando</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#5f5e5a" }}>Ação</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#5f5e5a" }}>Recurso</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#5f5e5a" }}>IP</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#5f5e5a" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => {
                  const color = STATUS_COLORS[l.status] || STATUS_COLORS.success;
                  return (
                    <tr key={l.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                      <td style={{ padding: 12, color: "#5f5e5a", whiteSpace: "nowrap" }}>{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                      <td style={{ padding: 12, color: "#1a1a2e", fontWeight: 500 }}>{ACTION_LABELS[l.action] || l.action}</td>
                      <td style={{ padding: 12, color: "#5f5e5a" }}>{l.resource_type ? `${l.resource_type}${l.resource_id ? ` #${l.resource_id.slice(0, 8)}` : ""}` : "—"}</td>
                      <td style={{ padding: 12, color: "#5f5e5a", fontFamily: "monospace" }}>{l.ip_address || "—"}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, background: color.bg, color: color.color, fontSize: 11, fontWeight: 600 }}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

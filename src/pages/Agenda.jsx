import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import { listAgenda, createAgendamento, updateAgendamento, deleteAgendamento } from "../services/mapiClient";
import icone from "../assets/icone.png";

const cardStyle = {
  background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12,
  padding: "1.5rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)"
};
const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };

const STATUS_INFO = {
  agendado: { label: "Agendado", cor: "#2B9EC3", bg: "#e8f7fd" },
  realizado: { label: "Realizado", cor: "#0F6E56", bg: "#edfff6" },
  cancelado: { label: "Cancelado", cor: "#791f1f", bg: "#fcebeb" }
};

export default function Agenda() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [verTodos, setVerTodos] = useState(false);

  const [form, setForm] = useState({
    student_id: "", data: "", hora: "14:00",
    duracao_minutos: 50, tipo_agrupamento: "individual", observacao: ""
  });

  const carregarAgenda = useCallback(async (todos = verTodos) => {
    try {
      const res = await listAgenda(todos);
      setAgendamentos(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, [verTodos]);

  useEffect(() => {
    async function carregar() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      if (profile?.school_id) {
        const { data } = await supabase
          .from("students").select("id, full_name, grade, disability_type")
          .eq("school_id", profile.school_id).order("full_name");
        setAlunos(data || []);
      }
      carregarAgenda();
    }
    if (user) carregar();
  }, [user, carregarAgenda]);

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function handleAgendar() {
    if (!form.student_id || !form.data || !form.hora) {
      setError("Selecione aluno, data e hora."); return;
    }
    setError(null); setSalvando(true);
    try {
      const dataHora = new Date(`${form.data}T${form.hora}:00`);
      await createAgendamento({
        student_id: form.student_id,
        data_hora: dataHora.toISOString(),
        duracao_minutos: form.duracao_minutos,
        tipo_agrupamento: form.tipo_agrupamento,
        observacao: form.observacao
      });
      mostrarFeedback("✅ Atendimento agendado! Você receberá lembrete por e-mail 24h antes.");
      setForm(f => ({ ...f, data: "", observacao: "" }));
      carregarAgenda();
    } catch (err) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(id, status) {
    try {
      await updateAgendamento(id, { status });
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (status === "realizado") {
        mostrarFeedback("✅ Marcado como realizado — registre a sessão para contar no FUNDEB.");
      }
    } catch {
      mostrarFeedback("Erro ao atualizar.", "erro");
    }
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este agendamento?")) return;
    try {
      await deleteAgendamento(id);
      setAgendamentos(prev => prev.filter(a => a.id !== id));
    } catch {
      mostrarFeedback("Erro ao excluir.", "erro");
    }
  }

  const nomeAluno = (id) => alunos.find(a => a.id === id)?.full_name || "—";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 999
        }}>{feedback.msg}</div>
      )}

      <header style={{ background: "#fff", borderBottom: "0.5px solid #d3d1c7", padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span></span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>📅 Agenda de Atendimentos</h1>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Agende sessões de AEE e receba lembrete por e-mail 24h antes
        </p>

        {error && (
          <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Novo agendamento */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px" }}>Novo agendamento</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="ag-aluno" style={labelStyle}>Aluno *</label>
              <select id="ag-aluno" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }}>
                <option value="">— Selecione —</option>
                {alunos.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}{a.grade ? ` · ${a.grade}` : ""}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label htmlFor="ag-data" style={labelStyle}>Data *</label>
                <input id="ag-data" type="date" min={new Date().toISOString().slice(0, 10)} value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label htmlFor="ag-hora" style={labelStyle}>Hora *</label>
                <input id="ag-hora" type="time" value={form.hora}
                  onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label htmlFor="ag-dur" style={labelStyle}>Duração (min)</label>
                <input id="ag-dur" type="number" min="10" max="240" step="5" value={form.duracao_minutos}
                  onChange={e => setForm(f => ({ ...f, duracao_minutos: Number(e.target.value) }))} style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <div>
                <label htmlFor="ag-tipo" style={labelStyle}>Agrupamento</label>
                <select id="ag-tipo" value={form.tipo_agrupamento} onChange={e => setForm(f => ({ ...f, tipo_agrupamento: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }}>
                  <option value="individual">Individual</option>
                  <option value="dupla">Dupla</option>
                  <option value="pequeno_grupo">Pequeno grupo</option>
                </select>
              </div>
              <div>
                <label htmlFor="ag-obs" style={labelStyle}>Observação</label>
                <input id="ag-obs" value={form.observacao} placeholder="ex: trabalhar CAA com pictogramas"
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={handleAgendar} disabled={salvando} style={{
              padding: 12, background: salvando ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: salvando ? "not-allowed" : "pointer"
            }}>
              {salvando ? "Agendando..." : "📅 Agendar atendimento"}
            </button>
          </div>
        </div>

        {/* Lista */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
            {verTodos ? "Todos os agendamentos" : "Próximos atendimentos"} ({agendamentos.length})
          </p>
          <button onClick={() => { const t = !verTodos; setVerTodos(t); carregarAgenda(t); }} style={{ fontSize: 12 }}>
            {verTodos ? "Ver só próximos" : "Ver todos"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {agendamentos.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#5f5e5a", margin: 0 }}>Nenhum atendimento agendado.</p>
            </div>
          ) : agendamentos.map(ag => {
            const st = STATUS_INFO[ag.status] || STATUS_INFO.agendado;
            const quando = new Date(ag.data_hora).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={ag.id} style={{ ...cardStyle, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>
                    {nomeAluno(ag.student_id)}
                    <span style={{ fontSize: 11, padding: "2px 10px", background: st.bg, color: st.cor, borderRadius: 20, marginLeft: 8 }}>{st.label}</span>
                    {ag.lembrete_enviado && <span title="Lembrete enviado" style={{ marginLeft: 6, fontSize: 12 }}>🔔</span>}
                  </p>
                  <p style={{ fontSize: 12, color: "#5f5e5a", margin: "2px 0 0" }}>
                    {quando} · {ag.duracao_minutos}min · {ag.tipo_agrupamento}
                    {ag.observacao ? ` · ${ag.observacao}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {ag.status === "agendado" && (
                    <>
                      <button onClick={() => mudarStatus(ag.id, "realizado")} style={{ fontSize: 12, color: "#0F6E56", borderColor: "#4CAF82" }}>✓ Realizado</button>
                      <button onClick={() => mudarStatus(ag.id, "cancelado")} style={{ fontSize: 12, color: "#854F0B", borderColor: "#e0c48c" }}>Cancelar</button>
                    </>
                  )}
                  {ag.status === "realizado" && (
                    <button onClick={() => navigate("/aee-sessoes")} style={{ fontSize: 12, color: "#2B9EC3", borderColor: "#2B9EC3" }}>→ Registrar sessão</button>
                  )}
                  <button onClick={() => excluir(ag.id)} aria-label="Excluir agendamento" style={{ fontSize: 12, color: "#a32d2d", borderColor: "#f7c1c1" }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

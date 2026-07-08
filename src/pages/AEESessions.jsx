import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import {
  listAEESessions, createAEESession, updateAEESession, deleteAEESession,
  getAEEFrequencyPDF, generateAEEEvolutionReport
} from "../services/mapiClient";
import icone from "../assets/icone.png";

const HOJE = new Date().toISOString().slice(0, 10);

const PERIODOS = [
  "1º Bimestre 2026", "2º Bimestre 2026", "3º Bimestre 2026", "4º Bimestre 2026",
  "1º Trimestre 2026", "2º Trimestre 2026", "3º Trimestre 2026",
  "1º Semestre 2026", "2º Semestre 2026", "Ano letivo 2026",
  "1º Bimestre 2025", "2º Bimestre 2025", "3º Bimestre 2025", "4º Bimestre 2025",
  "1º Semestre 2025", "2º Semestre 2025", "Ano letivo 2025"
];

function aba(ativo, label, onClick) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer", borderRadius: 8,
      background: ativo ? "#2B9EC3" : "transparent",
      color: ativo ? "#fff" : "#5f5e5a",
      border: ativo ? "none" : "0.5px solid #d3d1c7"
    }}>{label}</button>
  );
}

export default function AEESessions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [tab, setTab] = useState("registrar"); // registrar | historico
  const [sessoes, setSessoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [gerandoEvolucao, setGerandoEvolucao] = useState(false);
  const [evolucao, setEvolucao] = useState(null);
  const [evidencias, setEvidencias] = useState([]);
  const [descEvidencia, setDescEvidencia] = useState("");
  const [enviandoEvidencia, setEnviandoEvidencia] = useState(false);
  const [mostrarEvidencias, setMostrarEvidencias] = useState(false);

  // Formulário de registro
  const [form, setForm] = useState({
    data_sessao:      HOJE,
    duracao_minutos:  50,
    tipo_agrupamento: "individual",
    presente:         true,
    objetivos:        "",
    atividades:       "",
    evolucao:         "",
    periodo:          "1º Semestre 2026"
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregarAlunos() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id, cargo").eq("id", user.id).single();
      const isAdmin = ["coordenador_municipal","coordenador_estadual","secretario_municipal",
        "secretario_estadual","diretor","coordenador"].includes(profile?.cargo);

      let q = supabase.from("students").select("id, full_name, grade, disability_type, school_id").order("full_name");
      if (!isAdmin && profile?.school_id) q = q.eq("school_id", profile.school_id);
      const { data } = await q;
      setAlunos(data || []);
    }
    if (user) carregarAlunos();
  }, [user]);

  useEffect(() => {
    if (alunoSelecionado && tab === "historico") {
      carregarSessoes();
    }
  }, [alunoSelecionado, tab]);

  async function carregarSessoes() {
    if (!alunoSelecionado) return;
    setCarregando(true);
    try {
      const res = await listAEESessions(alunoSelecionado);
      setSessoes(res.data || []);
    } catch {
      mostrarFeedback("Erro ao carregar sessões.", "erro");
    } finally {
      setCarregando(false);
    }
  }

  async function handleRegistrar(e) {
    e.preventDefault();
    if (!alunoSelecionado) { mostrarFeedback("Selecione um aluno primeiro.", "erro"); return; }
    setSalvando(true);
    try {
      await createAEESession({ ...form, student_id: alunoSelecionado });
      mostrarFeedback("Sessão registrada com sucesso!");
      setForm(f => ({ ...f, data_sessao: HOJE, objetivos: "", atividades: "", evolucao: "", presente: true }));
      if (tab === "historico") await carregarSessoes();
    } catch (err) {
      mostrarFeedback(err.message || "Erro ao registrar sessão.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarEdicao(sessao) {
    setSalvando(true);
    try {
      await updateAEESession(sessao.id, sessao);
      mostrarFeedback("Sessão atualizada!");
      setEditandoId(null);
      await carregarSessoes();
    } catch {
      mostrarFeedback("Erro ao salvar.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id) {
    if (!window.confirm("Excluir esta sessão?")) return;
    try {
      await deleteAEESession(id);
      mostrarFeedback("Sessão excluída.");
      setSessoes(prev => prev.filter(s => s.id !== id));
    } catch {
      mostrarFeedback("Erro ao excluir.", "erro");
    }
  }

  async function handleDownloadPDF() {
    if (!alunoSelecionado) { mostrarFeedback("Selecione um aluno.", "erro"); return; }
    setGerandoPDF(true);
    try {
      const blob = await getAEEFrequencyPDF(alunoSelecionado, form.periodo);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      const aluno = alunos.find(a => a.id === alunoSelecionado);
      a.download = `frequencia-aee-${(aluno?.full_name || "aluno").replace(/ /g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      mostrarFeedback("Erro ao gerar PDF de frequência.", "erro");
    } finally {
      setGerandoPDF(false);
    }
  }

  async function carregarEvidencias(alunoId) {
    const { data } = await supabase.from("learning_evidences")
      .select("*").eq("student_id", alunoId)
      .order("created_at", { ascending: false }).limit(30);
    const comUrls = await Promise.all((data || []).map(async ev => {
      const { data: signed } = await supabase.storage.from("evidencias").createSignedUrl(ev.path, 3600);
      return { ...ev, url: signed?.signedUrl };
    }));
    setEvidencias(comUrls);
  }

  async function handleUploadEvidencia(file) {
    if (!file || !alunoSelecionado) return;
    if (file.size > 5 * 1024 * 1024) { mostrarFeedback("Arquivo acima de 5MB.", "erro"); return; }
    setEnviandoEvidencia(true);
    try {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      const nomeSeguro = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${profile.school_id}/${alunoSelecionado}/${Date.now()}-${nomeSeguro}`;
      const { error: upErr } = await supabase.storage.from("evidencias").upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("learning_evidences").insert({
        student_id: alunoSelecionado, school_id: profile.school_id, user_id: user.id,
        descricao: descEvidencia || null, path, mime_type: file.type
      });
      if (insErr) throw insErr;
      setDescEvidencia("");
      mostrarFeedback("✅ Evidência anexada ao aluno!");
      carregarEvidencias(alunoSelecionado);
    } catch {
      mostrarFeedback("Erro ao enviar evidência.", "erro");
    } finally {
      setEnviandoEvidencia(false);
    }
  }

  async function excluirEvidencia(ev) {
    if (!window.confirm("Excluir esta evidência?")) return;
    try {
      await supabase.storage.from("evidencias").remove([ev.path]);
      await supabase.from("learning_evidences").delete().eq("id", ev.id);
      setEvidencias(prev => prev.filter(e => e.id !== ev.id));
    } catch {
      mostrarFeedback("Erro ao excluir.", "erro");
    }
  }

  async function handleRelatorioEvolucao() {
    if (!alunoSelecionado) { mostrarFeedback("Selecione um aluno.", "erro"); return; }
    setGerandoEvolucao(true); setEvolucao(null);
    try {
      const res = await generateAEEEvolutionReport(alunoSelecionado, form.periodo);
      setEvolucao(res.data);
      mostrarFeedback("✅ Relatório de evolução gerado e salvo em Relatórios!");
    } catch (err) {
      mostrarFeedback(err.message, "erro");
    } finally {
      setGerandoEvolucao(false);
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 4000);
  }

  function formatarData(iso) {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  const totalPresencas = sessoes.filter(s => s.presente).length;
  const pctFrequencia  = sessoes.length > 0 ? Math.round((totalPresencas / sessoes.length) * 100) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
        <span style={{ fontSize: 13, color: "#5f5e5a" }}>Sessões AEE</span>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Frequência no AEE</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
          Registre cada sessão de Atendimento Educacional Especializado — exigência do FUNDEB (Decreto 7.611/2011 Art. 9).
        </p>

        {/* Seletor de aluno */}
        <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.25rem", marginBottom: 24, boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#5f5e5a", display: "block", marginBottom: 8 }}>
            👨‍🎓 Aluno *
          </label>
          <select value={alunoSelecionado} onChange={e => { setAlunoSelecionado(e.target.value); setSessoes([]); }}
            style={{ width: "100%", boxSizing: "border-box", fontSize: 14 }}>
            <option value="">Selecione o aluno...</option>
            {alunos.map(a => (
              <option key={a.id} value={a.id}>
                {a.full_name}{a.grade ? ` — ${a.grade}` : ""}{a.disability_type ? ` (${a.disability_type})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Abas */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {aba(tab === "registrar", "📝 Registrar Sessão", () => setTab("registrar"))}
          {aba(tab === "historico", `📋 Histórico${sessoes.length > 0 ? ` (${sessoes.length})` : ""}`, () => { setTab("historico"); carregarSessoes(); })}
        </div>

        {/* Tab: Registrar */}
        {tab === "registrar" && (
          <form onSubmit={handleRegistrar} style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", marginBottom: 20 }}>Nova Sessão AEE</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Data da sessão *</label>
                <input type="date" value={form.data_sessao}
                  onChange={e => setForm(f => ({ ...f, data_sessao: e.target.value }))}
                  required style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Período letivo</label>
                <select value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                  style={{ width: "100%", boxSizing: "border-box" }}>
                  {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Duração (min)</label>
                <input type="number" min={10} max={200} value={form.duracao_minutos}
                  onChange={e => setForm(f => ({ ...f, duracao_minutos: Number(e.target.value) }))}
                  style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Agrupamento</label>
                <select value={form.tipo_agrupamento} onChange={e => setForm(f => ({ ...f, tipo_agrupamento: e.target.value }))}
                  style={{ width: "100%", boxSizing: "border-box" }}>
                  <option value="individual">Individual</option>
                  <option value="pequeno_grupo">Pequeno grupo</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Presença</label>
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  <button type="button" onClick={() => setForm(f => ({ ...f, presente: true }))} style={{
                    flex: 1, padding: "8px 4px", fontSize: 13, cursor: "pointer", borderRadius: 8,
                    background: form.presente ? "#edfff6" : "#fff",
                    color: form.presente ? "#0F6E56" : "#5f5e5a",
                    border: `0.5px solid ${form.presente ? "#4CAF82" : "#d3d1c7"}`,
                    fontWeight: form.presente ? 600 : 400
                  }}>✓ Presente</button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, presente: false }))} style={{
                    flex: 1, padding: "8px 4px", fontSize: 13, cursor: "pointer", borderRadius: 8,
                    background: !form.presente ? "#fcebeb" : "#fff",
                    color: !form.presente ? "#791f1f" : "#5f5e5a",
                    border: `0.5px solid ${!form.presente ? "#a32d2d" : "#d3d1c7"}`,
                    fontWeight: !form.presente ? 600 : 400
                  }}>✗ Falta</button>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Objetivos trabalhados</label>
              <textarea rows={3} value={form.objetivos} onChange={e => setForm(f => ({ ...f, objetivos: e.target.value }))}
                placeholder="Descreva os objetivos da sessão de AEE..."
                style={{ width: "100%", boxSizing: "border-box", fontSize: 13, resize: "vertical" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Atividades realizadas</label>
              <textarea rows={3} value={form.atividades} onChange={e => setForm(f => ({ ...f, atividades: e.target.value }))}
                placeholder="Quais atividades foram realizadas na sessão..."
                style={{ width: "100%", boxSizing: "border-box", fontSize: 13, resize: "vertical" }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Evolução observada</label>
              <textarea rows={3} value={form.evolucao} onChange={e => setForm(f => ({ ...f, evolucao: e.target.value }))}
                placeholder="Registre a evolução e os progressos observados nesta sessão..."
                style={{ width: "100%", boxSizing: "border-box", fontSize: 13, resize: "vertical" }} />
            </div>

            <button type="submit" disabled={salvando || !alunoSelecionado} style={{
              width: "100%", padding: 13, fontSize: 15, fontWeight: 500, borderRadius: 8, border: "none", cursor: "pointer",
              background: salvando || !alunoSelecionado ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
              color: "#fff"
            }}>
              {salvando ? "Salvando..." : "📝 Registrar Sessão"}
            </button>
          </form>
        )}

        {/* Tab: Histórico */}
        {tab === "historico" && (
          <div>
            {!alunoSelecionado ? (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>👆</div>
                <p style={{ fontSize: 14, color: "#5f5e5a" }}>Selecione um aluno acima para ver o histórico de sessões.</p>
              </div>
            ) : carregando ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#5f5e5a", fontSize: 14 }}>Carregando sessões...</div>
            ) : (
              <>
                {/* Resumo de frequência */}
                {sessoes.length > 0 && (
                  <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      {[
                        { label: "Total de sessões", valor: sessoes.length, cor: "#2B9EC3" },
                        { label: "Presenças", valor: totalPresencas, cor: "#4CAF82" },
                        { label: "Faltas", valor: sessoes.length - totalPresencas, cor: "#a32d2d" },
                        { label: "Frequência", valor: pctFrequencia !== null ? `${pctFrequencia}%` : "—", cor: pctFrequencia >= 75 ? "#4CAF82" : "#BA7517" }
                      ].map(m => (
                        <div key={m.label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: m.cor }}>{m.valor}</div>
                          <div style={{ fontSize: 11, color: "#5f5e5a" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleDownloadPDF} disabled={gerandoPDF} style={{
                      padding: "8px 16px", fontSize: 13, cursor: "pointer", borderRadius: 8,
                      background: gerandoPDF ? "#ccc" : "#2B9EC3", color: "#fff", border: "none", fontWeight: 500
                    }}>
                      {gerandoPDF ? "Gerando..." : "📄 PDF de Frequência"}
                    </button>
                    <button onClick={handleRelatorioEvolucao} disabled={gerandoEvolucao} style={{
                      padding: "8px 16px", fontSize: 13, cursor: "pointer", borderRadius: 8, marginLeft: 8,
                      background: gerandoEvolucao ? "#ccc" : "#534AB7", color: "#fff", border: "none", fontWeight: 500
                    }}>
                      {gerandoEvolucao ? "🧠 Analisando sessões..." : "📈 Relatório de Evolução (IA)"}
                    </button>
                  </div>
                )}

                {evolucao && (
                  <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderLeft: "3px solid #534AB7", borderRadius: 12, padding: "1.5rem", marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#534AB7", margin: 0 }}>📈 Evolução — {evolucao.periodo || form.periodo}</h3>
                      <button onClick={() => setEvolucao(null)} style={{ fontSize: 12 }}>Fechar</button>
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>{evolucao.sintese}</p>
                    <p style={{ fontSize: 12, color: "#5f5e5a", marginBottom: 12 }}>
                      Frequência: {evolucao.frequencia?.presencas}/{evolucao.frequencia?.total_sessoes} sessões ({evolucao.frequencia?.taxa_presenca}) — {evolucao.frequencia?.analise}
                    </p>
                    {(evolucao.avancos || []).length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#0F6E56", margin: "0 0 4px" }}>✅ Avanços</p>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {evolucao.avancos.map((a, i) => <li key={i} style={{ fontSize: 13 }}><strong>{a.area}:</strong> {a.descricao}</li>)}
                        </ul>
                      </div>
                    )}
                    {(evolucao.pontos_de_atencao || []).length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#854F0B", margin: "0 0 4px" }}>⚠️ Pontos de atenção</p>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {evolucao.pontos_de_atencao.map((a, i) => <li key={i} style={{ fontSize: 13 }}><strong>{a.area}:</strong> {a.descricao}</li>)}
                        </ul>
                      </div>
                    )}
                    {(evolucao.recomendacoes_pei || []).length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#534AB7", margin: "0 0 4px" }}>📋 Recomendações para o PEI/PAEE</p>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {evolucao.recomendacoes_pei.map((r, i) => <li key={i} style={{ fontSize: 13 }}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {(evolucao.orientacoes_familia || []).length > 0 && (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#2B9EC3", margin: "0 0 4px" }}>👨‍👩‍👧 Orientações à família</p>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {evolucao.orientacoes_familia.map((o, i) => <li key={i} style={{ fontSize: 13 }}>{o}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>📸 Evidências de aprendizagem ({evidencias.length})</p>
                    <button onClick={() => { const abrir = !mostrarEvidencias; setMostrarEvidencias(abrir); if (abrir) carregarEvidencias(alunoSelecionado); }} style={{ fontSize: 12 }}>
                      {mostrarEvidencias ? "Recolher" : "Abrir"}
                    </button>
                  </div>
                  {mostrarEvidencias && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                        <input value={descEvidencia} onChange={e => setDescEvidencia(e.target.value)}
                          placeholder="Descrição (ex: primeira escrita do nome)"
                          style={{ flex: 1, minWidth: 200 }} aria-label="Descrição da evidência" />
                        <label style={{
                          padding: "8px 16px", fontSize: 13, borderRadius: 8, cursor: enviandoEvidencia ? "wait" : "pointer",
                          background: enviandoEvidencia ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", fontWeight: 500
                        }}>
                          {enviandoEvidencia ? "Enviando..." : "📎 Anexar foto/PDF"}
                          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                            disabled={enviandoEvidencia}
                            onChange={e => { handleUploadEvidencia(e.target.files?.[0]); e.target.value = ""; }}
                            style={{ display: "none" }} />
                        </label>
                      </div>
                      {evidencias.length === 0 ? (
                        <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Nenhuma evidência anexada ainda. Fotografe trabalhos, atividades e conquistas do aluno.</p>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                          {evidencias.map(ev => (
                            <div key={ev.id} style={{ border: "0.5px solid #d3d1c7", borderRadius: 8, overflow: "hidden", background: "#f5f9ff" }}>
                              {ev.mime_type?.startsWith("image/") ? (
                                <a href={ev.url} target="_blank" rel="noreferrer">
                                  <img src={ev.url} alt={ev.descricao || "Evidência de aprendizagem"} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                                </a>
                              ) : (
                                <a href={ev.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 100, fontSize: 32, textDecoration: "none" }}>📄</a>
                              )}
                              <div style={{ padding: "6px 8px" }}>
                                <p style={{ fontSize: 11, margin: 0, color: "#2c2c2a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ev.descricao || ""}>
                                  {ev.descricao || "Sem descrição"}
                                </p>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                                  <span style={{ fontSize: 10, color: "#888" }}>{new Date(ev.created_at).toLocaleDateString("pt-BR")}</span>
                                  <button onClick={() => excluirEvidencia(ev)} aria-label="Excluir evidência" style={{ fontSize: 10, padding: "2px 6px", color: "#a32d2d", borderColor: "#f7c1c1" }}>🗑️</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {sessoes.length === 0 ? (
                  <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                    <p style={{ fontSize: 14, color: "#5f5e5a" }}>Nenhuma sessão registrada para este aluno.</p>
                    <button onClick={() => setTab("registrar")} style={{ marginTop: 12, padding: "8px 20px", fontSize: 13, cursor: "pointer", borderRadius: 8, background: "#2B9EC3", color: "#fff", border: "none" }}>
                      Registrar primeira sessão
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {sessoes.map(s => {
                      const isOpen     = expandido === s.id;
                      const isEditando = editandoId === s.id;
                      const [editando, setEditando] = [s, (vals) => setSessoes(prev => prev.map(x => x.id === s.id ? { ...x, ...vals } : x))];

                      return (
                        <div key={s.id} style={{ background: "#fff", border: `0.5px solid ${s.presente ? "#d3d1c7" : "#f7c1c1"}`, borderLeft: `3px solid ${s.presente ? "#4CAF82" : "#a32d2d"}`, borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <div style={{ cursor: "pointer", flex: 1 }} onClick={() => setExpandido(isOpen ? null : s.id)}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: s.presente ? "#0F6E56" : "#a32d2d" }}>
                                  {s.presente ? "✓ Presente" : "✗ Falta"}
                                </span>
                                <span style={{ fontSize: 13, color: "#2c2c2a" }}>{formatarData(s.data_sessao)}</span>
                                <span style={{ fontSize: 12, color: "#5f5e5a" }}>{s.duracao_minutos || 50} min · {s.tipo_agrupamento === "individual" ? "Individual" : "Pequeno grupo"}</span>
                                {s.periodo && <span style={{ fontSize: 11, color: "#2B9EC3" }}>{s.periodo}</span>}
                              </div>
                              {s.evolucao && (
                                <p style={{ fontSize: 12, color: "#5f5e5a", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                                  {s.evolucao}
                                </p>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              {!isEditando ? (
                                <button onClick={() => setEditandoId(s.id)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#BA7517", border: "0.5px solid #BA7517", borderRadius: 6, cursor: "pointer" }}>Editar</button>
                              ) : (
                                <>
                                  <button onClick={() => setEditandoId(null)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer" }}>Cancelar</button>
                                  <button onClick={() => handleSalvarEdicao(sessoes.find(x => x.id === s.id))} disabled={salvando} style={{ fontSize: 11, padding: "4px 10px", background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>{salvando ? "..." : "Salvar"}</button>
                                </>
                              )}
                              <button onClick={() => handleExcluir(s.id)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#a32d2d", border: "0.5px solid #f7c1c1", borderRadius: 6, cursor: "pointer" }}>Excluir</button>
                            </div>
                          </div>

                          {(isOpen || isEditando) && (
                            <div style={{ padding: "0 16px 16px", borderTop: "0.5px solid #f1efe8" }}>
                              {isEditando ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button type="button" onClick={() => setEditando({ presente: true })} style={{ flex: 1, padding: "7px", fontSize: 13, cursor: "pointer", borderRadius: 8, background: s.presente ? "#edfff6" : "#fff", color: s.presente ? "#0F6E56" : "#5f5e5a", border: `0.5px solid ${s.presente ? "#4CAF82" : "#d3d1c7"}` }}>✓ Presente</button>
                                    <button type="button" onClick={() => setEditando({ presente: false })} style={{ flex: 1, padding: "7px", fontSize: 13, cursor: "pointer", borderRadius: 8, background: !s.presente ? "#fcebeb" : "#fff", color: !s.presente ? "#791f1f" : "#5f5e5a", border: `0.5px solid ${!s.presente ? "#a32d2d" : "#d3d1c7"}` }}>✗ Falta</button>
                                  </div>
                                  {[["Objetivos", "objetivos"], ["Atividades", "atividades"], ["Evolução observada", "evolucao"]].map(([label, campo]) => (
                                    <div key={campo}>
                                      <label style={{ fontSize: 12, color: "#5f5e5a", display: "block", marginBottom: 4 }}>{label}</label>
                                      <textarea rows={3} value={s[campo] || ""} onChange={e => setEditando({ [campo]: e.target.value })}
                                        style={{ width: "100%", boxSizing: "border-box", fontSize: 13, resize: "vertical" }} />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                                  {[["Objetivos trabalhados", s.objetivos], ["Atividades realizadas", s.atividades], ["Evolução observada", s.evolucao]].map(([label, val]) => val ? (
                                    <div key={label}>
                                      <p style={{ fontSize: 12, fontWeight: 600, color: "#2B9EC3", margin: "0 0 4px" }}>{label}</p>
                                      <p style={{ fontSize: 13, color: "#2c2c2a", background: "#f5f9ff", borderRadius: 8, padding: "8px 12px", margin: 0, lineHeight: 1.6 }}>{val}</p>
                                    </div>
                                  ) : null)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

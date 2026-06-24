import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import { generateReport } from "../services/mapiClient";
import icone from "../assets/icone.png";

const TIPOS_RELATORIO = [
  { id: "semestral", label: "Relatório Semestral", descricao: "Progresso acadêmico e social do período", emoji: "📊", cor: "#2B9EC3" },
  { id: "familia", label: "Relatório para a Família", descricao: "Linguagem acessível para pais e responsáveis", emoji: "👨‍👩‍👧", cor: "#4CAF82" },
  { id: "aee", label: "Relatório para o AEE", descricao: "Técnico especializado para o atendimento educacional", emoji: "🎓", cor: "#534AB7" },
  { id: "pei", label: "PEI", descricao: "Plano Educacional Individualizado", emoji: "📋", cor: "#BA7517" },
  { id: "paee", label: "PAEE", descricao: "Plano de Atendimento Educacional Especializado", emoji: "📁", cor: "#0F6E56" }
];

const TIPO_MAP = Object.fromEntries(TIPOS_RELATORIO.map(t => [t.id, t]));

const PERIODOS = [
  "1º Bimestre 2026", "2º Bimestre 2026", "3º Bimestre 2026", "4º Bimestre 2026",
  "1º Trimestre 2026", "2º Trimestre 2026", "3º Trimestre 2026",
  "1º Semestre 2026", "2º Semestre 2026", "Ano letivo 2026",
  "1º Bimestre 2025", "2º Bimestre 2025", "3º Bimestre 2025", "4º Bimestre 2025",
  "1º Semestre 2025", "2º Semestre 2025", "Ano letivo 2025"
];

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [alunosSelecionados, setAlunosSelecionados] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(null);
  const [periodo, setPeriodo] = useState("1º Semestre 2026");
  const [loading, setLoading] = useState(false);
  const [relatorioGerado, setRelatorioGerado] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Relatórios salvos
  const [salvos, setSalvos] = useState([]);
  const [alunosMap, setAlunosMap] = useState({});
  const [expandido, setExpandido] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [conteudoEditado, setConteudoEditado] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data: profile } = await supabase
        .from("profiles").select("school_id").eq("id", user.id).single();
      if (!profile?.school_id) return;

      const { data: alunosData } = await supabase
        .from("students").select("id, full_name, grade, disability_type, turma")
        .eq("school_id", profile.school_id).order("full_name");
      setAlunos(alunosData || []);
      const map = {};
      (alunosData || []).forEach(a => { map[a.id] = a; });
      setAlunosMap(map);

      await carregarRelatorios(profile.school_id);
    }
    if (user) carregar();
  }, [user]);

  async function carregarRelatorios(schoolId) {
    const { data } = await supabase
      .from("reports").select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    setSalvos(data || []);
  }

  async function handleGerar() {
    if (alunosSelecionados.length === 0) { setError("Selecione pelo menos um aluno."); return; }
    if (!tipoSelecionado) { setError("Selecione o tipo de relatório."); return; }
    setError(null);
    setLoading(true);
    try {
      for (const alunoId of alunosSelecionados) {
        await generateReport(alunoId, tipoSelecionado, periodo);
      }
      mostrarFeedback(`✅ ${alunosSelecionados.length} relatório(s) gerado(s) e salvo(s)!`);
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      if (profile?.school_id) await carregarRelatorios(profile.school_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAprovar(relId) {
    await supabase.from("reports").update({ aprovado: true }).eq("id", relId);
    setSalvos(prev => prev.map(r => r.id === relId ? { ...r, aprovado: true } : r));
    mostrarFeedback("✅ Relatório aprovado!");
  }

  function handleIniciarEdicao(rel) {
    setEditandoId(rel.id);
    const rep = rel.content?.report || rel.content;
    setConteudoEditado(rep?.observacoes_finais || rep?.sumario_executivo || "");
    setExpandido(rel.id);
  }

  async function handleSalvarEdicao(rel) {
    setSalvando(true);
    try {
      const novoContent = { ...rel.content };
      if (novoContent.report) {
        novoContent.report = { ...novoContent.report, observacoes_finais: conteudoEditado };
      }
      await supabase.from("reports").update({ content: novoContent }).eq("id", rel.id);
      setSalvos(prev => prev.map(r => r.id === rel.id ? { ...r, content: novoContent } : r));
      setEditandoId(null);
      mostrarFeedback("✅ Relatório salvo com sucesso!");
    } catch {
      mostrarFeedback("Erro ao salvar.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(relId) {
    if (!window.confirm("Excluir este relatório permanentemente?")) return;
    await supabase.from("reports").delete().eq("id", relId);
    setSalvos(prev => prev.filter(r => r.id !== relId));
    mostrarFeedback("Relatório excluído.");
  }

  async function handleDownload(rel) {
    try {
      const { getReportPDF } = await import("../services/mapiClient");
      const blob = await getReportPDF(rel.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const aluno = alunosMap[rel.student_id];
      a.download = `relatorio-${aluno?.full_name?.replace(/ /g, "-") || "aluno"}-${rel.report_type}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      mostrarFeedback("Erro ao baixar PDF.", "erro");
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Agrupa relatórios salvos por aluno
  const porAluno = {};
  salvos.forEach(r => {
    const key = r.student_id || "sem_aluno";
    if (!porAluno[key]) porAluno[key] = [];
    porAluno[key].push(r);
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          {feedback.msg}
        </div>
      )}

      <header style={{ background: "#fff", borderBottom: "0.5px solid #d3d1c7", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ fontSize: 13 }}>← Voltar</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Relatórios pedagógicos</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
          Relatórios obrigatórios gerados com IA — fundamentados na Lei Brasileira de Inclusão e PNEE/MEC
        </p>

        {/* FORMULÁRIO DE GERAÇÃO */}
        <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", marginBottom: 32, boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#2B9EC3", marginBottom: 16 }}>📄 Gerar novo relatório</h3>

          {error && <div style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>{error}</div>}

          {/* Aluno(s) */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a" }}>Aluno(s) * <span style={{ color: "#888", fontWeight: 400 }}>— selecione um ou mais</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setAlunosSelecionados(alunos.map(a => a.id))} style={{ fontSize: 11, padding: "3px 10px", background: "#e8f7fd", color: "#1a6e8a", border: "0.5px solid #2B9EC3", borderRadius: 6, cursor: "pointer" }}>
                  Todos
                </button>
                <button type="button" onClick={() => setAlunosSelecionados([])} style={{ fontSize: 11, padding: "3px 10px", background: "#fff", color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer" }}>
                  Limpar
                </button>
              </div>
            </div>
            <div style={{ border: "0.5px solid #d3d1c7", borderRadius: 8, maxHeight: 200, overflowY: "auto", background: "#fff" }}>
              {alunos.length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a", padding: "10px 14px", margin: 0 }}>Nenhum aluno cadastrado.</p>
              ) : alunos.map(a => (
                <label key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 14px", cursor: "pointer",
                  background: alunosSelecionados.includes(a.id) ? "#e8f7fd" : "transparent",
                  borderBottom: "0.5px solid #f1efe8"
                }}>
                  <input type="checkbox" checked={alunosSelecionados.includes(a.id)}
                    onChange={e => setAlunosSelecionados(prev =>
                      e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                    )} />
                  <span style={{ fontSize: 13 }}>
                    {a.full_name}
                    {a.turma ? <span style={{ color: "#5f5e5a" }}> · Turma {a.turma}</span> : ""}
                    {a.grade ? <span style={{ color: "#5f5e5a" }}> · {a.grade}</span> : ""}
                    {a.disability_type ? <span style={{ color: "#2B9EC3" }}> · {a.disability_type}</span> : ""}
                  </span>
                </label>
              ))}
            </div>
            {alunosSelecionados.length > 0 && (
              <p style={{ fontSize: 12, color: "#1a6e8a", marginTop: 6 }}>
                {alunosSelecionados.length} aluno(s) selecionado(s) — será gerado um relatório para cada.
              </p>
            )}
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 10 }}>Tipo de relatório *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {TIPOS_RELATORIO.map(tipo => (
                <div key={tipo.id} onClick={() => setTipoSelecionado(tipo.id)} style={{
                  border: `0.5px solid ${tipoSelecionado === tipo.id ? tipo.cor : "#d3d1c7"}`,
                  borderLeft: `3px solid ${tipoSelecionado === tipo.id ? tipo.cor : "#d3d1c7"}`,
                  borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                  background: tipoSelecionado === tipo.id ? "#f5f9ff" : "#fff"
                }}>
                  <p style={{ fontWeight: 500, marginBottom: 2, fontSize: 13, color: tipo.cor }}>{tipo.emoji} {tipo.label}</p>
                  <p style={{ fontSize: 11, color: "#5f5e5a", margin: 0 }}>{tipo.descricao}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Período */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>Período letivo</label>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <button onClick={handleGerar} disabled={loading} style={{
            width: "100%", padding: "12px",
            background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
            color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer"
          }}>
            {loading ? `Nexus7 gerando ${alunosSelecionados.length > 1 ? alunosSelecionados.length + " relatórios" : "relatório"}...` : `📄 Gerar relatório com IA${alunosSelecionados.length > 1 ? ` (${alunosSelecionados.length} alunos)` : ""}`}
          </button>
        </div>

        {/* RELATÓRIOS SALVOS */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#2B9EC3", marginBottom: 16 }}>
            🗂️ Relatórios salvos ({salvos.length})
          </h3>

          {salvos.length === 0 ? (
            <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
              <p style={{ fontSize: 14, color: "#5f5e5a" }}>Nenhum relatório gerado ainda. Gere o primeiro acima.</p>
            </div>
          ) : Object.entries(porAluno).map(([alunoId, rels]) => {
            const aluno = alunosMap[alunoId];
            return (
              <div key={alunoId} style={{ marginBottom: 24 }}>
                {/* Header do aluno */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                    {aluno?.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{aluno?.full_name || "Aluno"}</p>
                    <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                      {aluno?.grade}{aluno?.turma ? ` · Turma ${aluno.turma}` : ""}{aluno?.disability_type ? ` · ${aluno.disability_type}` : ""}
                    </p>
                  </div>
                </div>

                {/* Cards dos relatórios */}
                <div style={{ paddingLeft: 44, display: "flex", flexDirection: "column", gap: 10 }}>
                  {rels.map(rel => {
                    const cfg = TIPO_MAP[rel.report_type] || { label: rel.report_type, emoji: "📄", cor: "#5f5e5a" };
                    const isOpen = expandido === rel.id;
                    const isEditando = editandoId === rel.id;
                    const rep = rel.content?.report || rel.content;

                    return (
                      <div key={rel.id} style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderLeft: `3px solid ${cfg.cor}`, borderRadius: 10, overflow: "hidden" }}>
                        {/* Header do relatório */}
                        <div style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ cursor: "pointer", flex: 1 }} onClick={() => setExpandido(isOpen ? null : rel.id)}>
                              <p style={{ fontWeight: 500, fontSize: 14, margin: 0, color: cfg.cor }}>
                                {cfg.emoji} {cfg.label}
                                {rel.aprovado && <span style={{ marginLeft: 8, fontSize: 11, background: "#edfff6", color: "#0F6E56", padding: "2px 8px", borderRadius: 20 }}>✅ Aprovado</span>}
                              </p>
                              <p style={{ fontSize: 12, color: "#5f5e5a", margin: "2px 0 0" }}>
                                {rel.period} · {formatarData(rel.created_at)}
                              </p>
                            </div>

                            {/* Botões de ação */}
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              {!rel.aprovado && (
                                <button onClick={() => handleAprovar(rel.id)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#0F6E56", border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer" }}>
                                  👍 Aprovar
                                </button>
                              )}
                              {!isEditando ? (
                                <button onClick={() => handleIniciarEdicao(rel)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#BA7517", border: "0.5px solid #BA7517", borderRadius: 6, cursor: "pointer" }}>
                                  ✏️ Editar
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => setEditandoId(null)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer" }}>
                                    Cancelar
                                  </button>
                                  <button onClick={() => handleSalvarEdicao(rel)} disabled={salvando} style={{ fontSize: 11, padding: "4px 10px", background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                                    {salvando ? "..." : "💾 Salvar"}
                                  </button>
                                </>
                              )}
                              <button onClick={() => handleDownload(rel)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer" }}>
                                ⬇️
                              </button>
                              <button onClick={() => handleExcluir(rel.id)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#a32d2d", border: "0.5px solid #f7c1c1", borderRadius: 6, cursor: "pointer" }}>
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo expandido */}
                        {isOpen && rep && (
                          <div style={{ padding: "0 16px 16px", borderTop: "0.5px solid #f1efe8" }}>
                            {rep.sumario_executivo && (
                              <div style={{ background: "#f5f9ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
                                <strong style={{ color: cfg.cor }}>Sumário:</strong> {rep.sumario_executivo}
                              </div>
                            )}

                            {/* Campo de edição das observações finais */}
                            {isEditando && (
                              <div style={{ marginTop: 12 }}>
                                <label style={{ fontSize: 13, color: "#BA7517", display: "block", marginBottom: 6 }}>
                                  ✏️ Observações finais (editável):
                                </label>
                                <textarea
                                  value={conteudoEditado}
                                  onChange={e => setConteudoEditado(e.target.value)}
                                  rows={5}
                                  style={{ width: "100%", boxSizing: "border-box", fontSize: 13, border: "0.5px solid #BA7517", borderRadius: 8, padding: "10px 12px", resize: "vertical" }}
                                />
                              </div>
                            )}

                            {rep.pontos_positivos?.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "#4CAF82", marginBottom: 6 }}>Pontos positivos</p>
                                {rep.pontos_positivos.map((p, i) => (
                                  <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#edfff6", borderRadius: 6, marginBottom: 4 }}>✅ {p}</div>
                                ))}
                              </div>
                            )}
                            {rep.areas_de_atencao?.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "#BA7517", marginBottom: 6 }}>Áreas de atenção</p>
                                {rep.areas_de_atencao.map((a, i) => (
                                  <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#faeeda", borderRadius: 6, marginBottom: 4 }}>⚠️ {a}</div>
                                ))}
                              </div>
                            )}
                            {rep.recomendacoes?.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "#2B9EC3", marginBottom: 6 }}>Recomendações</p>
                                {rep.recomendacoes.map((r, i) => (
                                  <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#e8f7fd", borderRadius: 6, marginBottom: 4 }}>💡 {r}</div>
                                ))}
                              </div>
                            )}
                            {rep.metas_proxima_periodo?.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "#534AB7", marginBottom: 6 }}>Metas</p>
                                {rep.metas_proxima_periodo.map((m, i) => (
                                  <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#EEEDFE", borderRadius: 6, marginBottom: 4 }}>🎯 {m}</div>
                                ))}
                              </div>
                            )}
                            {(rep.observacoes_finais && !isEditando) && (
                              <div style={{ marginTop: 12, background: "#f1efe8", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#5f5e5a" }}>
                                <strong>Observações finais:</strong> {rep.observacoes_finais}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
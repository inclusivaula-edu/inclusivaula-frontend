import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import { generateReport } from "../services/mapiClient";
import icone from "../assets/icone.png";

const TIPOS_RELATORIO = [
  { id: "semestral",            label: "Relatório Semestral",         descricao: "Progresso acadêmico e social do período",                   emoji: "📊", cor: "#2B9EC3" },
  { id: "familia",              label: "Relatório para a Família",     descricao: "Linguagem acessível para pais e responsáveis",              emoji: "👨‍👩‍👧", cor: "#4CAF82" },
  { id: "aee",                  label: "Relatório AEE",                descricao: "Técnico especializado para o atendimento educacional",      emoji: "🎓", cor: "#534AB7" },
  { id: "pei",                  label: "PEI",                          descricao: "Plano Educacional Individualizado",                        emoji: "📋", cor: "#BA7517" },
  { id: "paee",                 label: "PAEE",                         descricao: "Plano de Atendimento Educacional Especializado",            emoji: "📁", cor: "#0F6E56" },
  { id: "avaliacao_pedagogica", label: "Avaliação Pedagógica",         descricao: "Elegibilidade ao AEE — Art. 9 Res. CNE/CEB 4/2009",       emoji: "🔍", cor: "#534AB7" },
  { id: "evolucao",             label: "Relatório de Evolução AEE",    descricao: "Progresso nas sessões de AEE com base nos registros",      emoji: "📈", cor: "#2B9EC3" },
  { id: "adequacao_curricular", label: "Adequação Curricular",         descricao: "Adaptações por componente curricular — LDB Art. 59",      emoji: "📐", cor: "#BA7517" },
  { id: "termo_ciencia",        label: "Termo de Ciência dos Pais",    descricao: "Documento legal de ciência e concordância da família",     emoji: "✍️", cor: "#4CAF82" }
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

  // Dados carregados
  const [escolas, setEscolas] = useState([]);
  const [alunosPorEscola, setAlunosPorEscola] = useState({}); // { schoolId: [alunos] }
  const [alunosMap, setAlunosMap] = useState({});
  const [escolasMap, setEscolasMap] = useState({});
  const [cargoUsuario, setCargoUsuario] = useState("professor");
  const [schoolIdProprio, setSchoolIdProprio] = useState(null);

  // Filtros do formulário
  const [escolasSelecionadas, setEscolasSelecionadas] = useState([]); // [] = TODAS
  const [todasEscolas, setTodasEscolas] = useState(false);
  const [alunosSelecionados, setAlunosSelecionados] = useState([]); // [] = nenhum selecionado
  const [todosAlunos, setTodosAlunos] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState(null);
  const [periodo, setPeriodo] = useState("1º Semestre 2026");

  // Estado da geração
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [progresso, setProgresso] = useState(null); // { atual, total }

  // Relatórios salvos
  const [salvos, setSalvos] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [conteudoEditado, setConteudoEditado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [filtroSalvos, setFiltroSalvos] = useState("");

  // Alunos visíveis no filtro (baseado nas escolas selecionadas)
  const alunosVisiveis = (() => {
    if (todasEscolas || escolasSelecionadas.length === 0) {
      return Object.values(alunosPorEscola).flat();
    }
    return escolasSelecionadas.flatMap(id => alunosPorEscola[id] || []);
  })();

  useEffect(() => {
    async function carregar() {
      setCarregando(true);

      const { data: profile } = await supabase
        .from("profiles").select("school_id, cargo").eq("id", user.id).single();

      const cargo = profile?.cargo || "professor";
      const mySchoolId = profile?.school_id;
      setCargoUsuario(cargo);
      setSchoolIdProprio(mySchoolId);

      // Cargos com acesso a múltiplas escolas
      const isAdmin = ["coordenador_municipal", "coordenador_estadual",
        "secretario_municipal", "secretario_estadual", "diretor", "coordenador"].includes(cargo);

      let escolasData = [];
      if (isAdmin) {
        const { data } = await supabase.from("schools").select("id, name, city, state").order("name");
        escolasData = data || [];
      } else if (mySchoolId) {
        const { data } = await supabase.from("schools").select("id, name, city, state").eq("id", mySchoolId);
        escolasData = data || [];
      }

      setEscolas(escolasData);
      const eMap = {};
      escolasData.forEach(e => { eMap[e.id] = e; });
      setEscolasMap(eMap);

      // Carrega alunos de todas as escolas visíveis
      const aMap = {};
      const apE = {};
      for (const escola of escolasData) {
        const { data: alunosData } = await supabase
          .from("students").select("id, full_name, grade, disability_type, turma, school_id")
          .eq("school_id", escola.id).order("full_name");
        apE[escola.id] = alunosData || [];
        (alunosData || []).forEach(a => { aMap[a.id] = a; });
      }
      setAlunosPorEscola(apE);
      setAlunosMap(aMap);

      // Se só tem 1 escola, pré-seleciona
      if (escolasData.length === 1) {
        setEscolasSelecionadas([escolasData[0].id]);
      }

      await carregarRelatorios();
      setCarregando(false);
    }
    if (user) carregar();
  }, [user]);

  async function carregarRelatorios() {
    const { data } = await supabase
      .from("reports").select("*")
      .order("created_at", { ascending: false });
    setSalvos(data || []);
  }

  // Calcula IDs de alunos para gerar
  function calcularAlunosParaGerar() {
    if (todosAlunos) return alunosVisiveis.map(a => a.id);
    return alunosSelecionados;
  }

  async function handleGerar() {
    const ids = calcularAlunosParaGerar();
    if (ids.length === 0) { setError("Selecione pelo menos um aluno."); return; }
    if (!tipoSelecionado) { setError("Selecione o tipo de relatório."); return; }
    setError(null);
    setLoading(true);
    setProgresso({ atual: 0, total: ids.length });
    try {
      for (let i = 0; i < ids.length; i++) {
        setProgresso({ atual: i + 1, total: ids.length });
        await generateReport(ids[i], tipoSelecionado, periodo);
      }
      mostrarFeedback(`${ids.length} relatório(s) gerado(s) com sucesso!`);
      setAlunosSelecionados([]);
      setTodosAlunos(false);
      await carregarRelatorios();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgresso(null);
    }
  }

  async function handleAprovar(relId) {
    await supabase.from("reports").update({ aprovado: true }).eq("id", relId);
    setSalvos(prev => prev.map(r => r.id === relId ? { ...r, aprovado: true } : r));
    mostrarFeedback("Relatório aprovado!");
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
      mostrarFeedback("Relatório salvo!");
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
    setTimeout(() => setFeedback(null), 4000);
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  const temMultiEscolas = escolas.length > 1;
  const idsParaGerar = calcularAlunosParaGerar();

  // Filtro dos relatórios salvos
  const salvosVisiveis = salvos.filter(r => {
    if (!filtroSalvos) return true;
    const termo = filtroSalvos.toLowerCase();
    const aluno = alunosMap[r.student_id];
    const escola = escolasMap[aluno?.school_id];
    return (
      aluno?.full_name?.toLowerCase().includes(termo) ||
      escola?.name?.toLowerCase().includes(termo) ||
      r.report_type?.toLowerCase().includes(termo) ||
      r.period?.toLowerCase().includes(termo)
    );
  });

  // Agrupa salvos por aluno
  const porAluno = {};
  salvosVisiveis.forEach(r => {
    const key = r.student_id || "sem_aluno";
    if (!porAluno[key]) porAluno[key] = [];
    porAluno[key].push(r);
  });

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
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Relatórios pedagógicos</h2>
        <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 24 }}>
          Gerados com IA — fundamentados na Lei Brasileira de Inclusão e PNEE/MEC
        </p>

        {/* FORMULÁRIO */}
        <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", marginBottom: 32, boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#2B9EC3", marginBottom: 20 }}>📄 Gerar novo relatório</h3>

          {error && (
            <div role="alert" style={{ background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* BLOCO 1: ESCOLA */}
          {temMultiEscolas && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 13, color: "#5f5e5a", fontWeight: 500 }}>
                  🏫 Escola
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => { setTodasEscolas(true); setEscolasSelecionadas([]); setAlunosSelecionados([]); setTodosAlunos(false); }}
                    style={{ fontSize: 11, padding: "3px 10px", background: todasEscolas ? "#2B9EC3" : "#e8f7fd", color: todasEscolas ? "#fff" : "#1a6e8a", border: "0.5px solid #2B9EC3", borderRadius: 6, cursor: "pointer" }}>
                    TODAS
                  </button>
                  <button type="button" onClick={() => { setTodasEscolas(false); setEscolasSelecionadas([]); setAlunosSelecionados([]); setTodosAlunos(false); }}
                    style={{ fontSize: 11, padding: "3px 10px", background: "#fff", color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer" }}>
                    Limpar
                  </button>
                </div>
              </div>

              {todasEscolas ? (
                <div style={{ padding: "10px 14px", background: "linear-gradient(135deg, #e8f7fd, #edfff6)", border: "0.5px solid #2B9EC3", borderRadius: 8, fontSize: 13, color: "#1a6e8a" }}>
                  Todas as {escolas.length} escolas selecionadas
                </div>
              ) : (
                <div style={{ border: "0.5px solid #d3d1c7", borderRadius: 8, maxHeight: 160, overflowY: "auto", background: "#fff" }}>
                  {escolas.map(e => (
                    <label key={e.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 14px", cursor: "pointer", fontSize: 13,
                      background: escolasSelecionadas.includes(e.id) ? "#e8f7fd" : "transparent",
                      borderBottom: "0.5px solid #f1efe8"
                    }}>
                      <input type="checkbox" checked={escolasSelecionadas.includes(e.id)}
                        onChange={ev => {
                          setEscolasSelecionadas(prev =>
                            ev.target.checked ? [...prev, e.id] : prev.filter(id => id !== e.id)
                          );
                          setAlunosSelecionados([]);
                          setTodosAlunos(false);
                        }} />
                      <div>
                        <span style={{ fontWeight: 500 }}>{e.name}</span>
                        <span style={{ color: "#5f5e5a" }}> · {e.city}{e.state ? `/${e.state}` : ""}</span>
                        <span style={{ fontSize: 11, color: "#2B9EC3", marginLeft: 6 }}>
                          ({(alunosPorEscola[e.id] || []).length} alunos)
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {!todasEscolas && escolasSelecionadas.length > 0 && (
                <p style={{ fontSize: 12, color: "#1a6e8a", marginTop: 6 }}>
                  {escolasSelecionadas.length} escola(s) · {alunosVisiveis.length} alunos disponíveis
                </p>
              )}
            </div>
          )}

          {/* BLOCO 2: ALUNOS */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 13, color: "#5f5e5a", fontWeight: 500 }}>
                👨‍🎓 Aluno(s) *
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => { setTodosAlunos(true); setAlunosSelecionados([]); }}
                  style={{ fontSize: 11, padding: "3px 10px", background: todosAlunos ? "#4CAF82" : "#edfff6", color: todosAlunos ? "#fff" : "#0F6E56", border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer" }}>
                  TODOS
                </button>
                <button type="button" onClick={() => { setTodosAlunos(false); setAlunosSelecionados([]); }}
                  style={{ fontSize: 11, padding: "3px 10px", background: "#fff", color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer" }}>
                  Limpar
                </button>
              </div>
            </div>

            {todosAlunos ? (
              <div style={{ padding: "10px 14px", background: "linear-gradient(135deg, #edfff6, #e8f7fd)", border: "0.5px solid #4CAF82", borderRadius: 8, fontSize: 13, color: "#0F6E56" }}>
                Todos os {alunosVisiveis.length} alunos selecionados
              </div>
            ) : (
              <>
                {alunosVisiveis.length === 0 ? (
                  <div style={{ padding: "10px 14px", background: "#f1efe8", border: "0.5px solid #d3d1c7", borderRadius: 8, fontSize: 13, color: "#5f5e5a" }}>
                    {temMultiEscolas && !todasEscolas && escolasSelecionadas.length === 0
                      ? "Selecione uma escola acima para ver os alunos."
                      : "Nenhum aluno cadastrado."}
                  </div>
                ) : (
                  <div style={{ border: "0.5px solid #d3d1c7", borderRadius: 8, maxHeight: 200, overflowY: "auto", background: "#fff" }}>
                    {alunosVisiveis.map(a => {
                      const escola = escolasMap[a.school_id];
                      return (
                        <label key={a.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 14px", cursor: "pointer", fontSize: 13,
                          background: alunosSelecionados.includes(a.id) ? "#edfff6" : "transparent",
                          borderBottom: "0.5px solid #f1efe8"
                        }}>
                          <input type="checkbox" checked={alunosSelecionados.includes(a.id)}
                            onChange={ev => setAlunosSelecionados(prev =>
                              ev.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                            )} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 500 }}>{a.full_name}</span>
                            {a.turma && <span style={{ color: "#5f5e5a" }}> · Turma {a.turma}</span>}
                            {a.grade && <span style={{ color: "#5f5e5a" }}> · {a.grade}</span>}
                            {a.disability_type && <span style={{ color: "#2B9EC3" }}> · {a.disability_type}</span>}
                            {temMultiEscolas && escola && (
                              <span style={{ fontSize: 11, color: "#BA7517", marginLeft: 4 }}>({escola.name})</span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {(todosAlunos || alunosSelecionados.length > 0) && (
              <p style={{ fontSize: 12, color: "#0F6E56", marginTop: 6, fontWeight: 500 }}>
                {idsParaGerar.length} aluno(s) · serão gerados {idsParaGerar.length} relatório(s)
              </p>
            )}
          </div>

          {/* BLOCO 3: TIPO */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "#5f5e5a", fontWeight: 500, display: "block", marginBottom: 10 }}>
              📋 Tipo de relatório *
            </label>
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

          {/* BLOCO 4: PERÍODO */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, color: "#5f5e5a", fontWeight: 500, display: "block", marginBottom: 6 }}>
              📅 Período letivo
            </label>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* BOTÃO GERAR */}
          <button onClick={handleGerar} disabled={loading || idsParaGerar.length === 0 || !tipoSelecionado} style={{
            width: "100%", padding: "13px",
            background: loading || idsParaGerar.length === 0 || !tipoSelecionado
              ? "#ccc"
              : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
            color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500,
            cursor: loading || idsParaGerar.length === 0 || !tipoSelecionado ? "not-allowed" : "pointer"
          }}>
            {loading && progresso
              ? `Gerando ${progresso.atual} de ${progresso.total}...`
              : idsParaGerar.length > 0 && tipoSelecionado
                ? `📄 Gerar ${idsParaGerar.length} relatório(s) — ${TIPO_MAP[tipoSelecionado]?.label || ""}`
                : "📄 Gerar relatório com IA"}
          </button>

          {/* Barra de progresso durante geração em lote */}
          {loading && progresso && progresso.total > 1 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 6, background: "#f1efe8", borderRadius: 3 }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  width: `${(progresso.atual / progresso.total) * 100}%`,
                  background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                  transition: "width 0.3s"
                }} />
              </div>
              <p style={{ fontSize: 12, color: "#5f5e5a", marginTop: 6, textAlign: "center" }}>
                {progresso.atual}/{progresso.total} relatórios gerados
              </p>
            </div>
          )}
        </div>

        {/* RELATÓRIOS SALVOS */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, color: "#2B9EC3" }}>
              Relatórios salvos ({salvos.length})
            </h3>
            <input
              placeholder="Buscar por aluno, escola, tipo..."
              value={filtroSalvos}
              onChange={e => setFiltroSalvos(e.target.value)}
              style={{ width: 260, fontSize: 13 }}
            />
          </div>

          {salvos.length === 0 ? (
            <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
              <p style={{ fontSize: 14, color: "#5f5e5a" }}>Nenhum relatório gerado ainda.</p>
            </div>
          ) : (
            Object.entries(porAluno).map(([alunoId, rels]) => {
              const aluno = alunosMap[alunoId];
              const escola = escolasMap[aluno?.school_id];
              return (
                <div key={alunoId} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 14, fontWeight: 600, flexShrink: 0
                    }}>
                      {aluno?.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{aluno?.full_name || "Aluno"}</p>
                      <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                        {aluno?.grade}{aluno?.turma ? ` · Turma ${aluno.turma}` : ""}
                        {aluno?.disability_type ? ` · ${aluno.disability_type}` : ""}
                        {temMultiEscolas && escola ? ` · ${escola.name}` : ""}
                      </p>
                    </div>
                  </div>

                  <div style={{ paddingLeft: 44, display: "flex", flexDirection: "column", gap: 10 }}>
                    {rels.map(rel => {
                      const cfg = TIPO_MAP[rel.report_type] || { label: rel.report_type, emoji: "📄", cor: "#5f5e5a" };
                      const isOpen = expandido === rel.id;
                      const isEditando = editandoId === rel.id;
                      const rep = rel.content?.report || rel.content;

                      return (
                        <div key={rel.id} style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderLeft: `3px solid ${cfg.cor}`, borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ cursor: "pointer", flex: 1 }} onClick={() => setExpandido(isOpen ? null : rel.id)}>
                                <p style={{ fontWeight: 500, fontSize: 14, margin: 0, color: cfg.cor }}>
                                  {cfg.emoji} {cfg.label}
                                  {rel.aprovado && (
                                    <span style={{ marginLeft: 8, fontSize: 11, background: "#edfff6", color: "#0F6E56", padding: "2px 8px", borderRadius: 20 }}>
                                      Aprovado
                                    </span>
                                  )}
                                </p>
                                <p style={{ fontSize: 12, color: "#5f5e5a", margin: "2px 0 0" }}>
                                  {rel.period} · {formatarData(rel.created_at)}
                                </p>
                              </div>
                              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                {!rel.aprovado && (
                                  <button onClick={() => handleAprovar(rel.id)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#0F6E56", border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer" }}>
                                    Aprovar
                                  </button>
                                )}
                                {!isEditando ? (
                                  <button onClick={() => handleIniciarEdicao(rel)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#BA7517", border: "0.5px solid #BA7517", borderRadius: 6, cursor: "pointer" }}>
                                    Editar
                                  </button>
                                ) : (
                                  <>
                                    <button onClick={() => setEditandoId(null)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer" }}>
                                      Cancelar
                                    </button>
                                    <button onClick={() => handleSalvarEdicao(rel)} disabled={salvando} style={{ fontSize: 11, padding: "4px 10px", background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                                      {salvando ? "..." : "Salvar"}
                                    </button>
                                  </>
                                )}
                                <button onClick={() => handleDownload(rel)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer" }}>
                                  PDF
                                </button>
                                <button onClick={() => handleExcluir(rel.id)} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#a32d2d", border: "0.5px solid #f7c1c1", borderRadius: 6, cursor: "pointer" }}>
                                  Excluir
                                </button>
                              </div>
                            </div>
                          </div>

                          {isOpen && rep && (
                            <div style={{ padding: "0 16px 16px", borderTop: "0.5px solid #f1efe8" }}>
                              {rep.sumario_executivo && (
                                <div style={{ background: "#f5f9ff", borderRadius: 8, padding: "10px 14px", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
                                  <strong style={{ color: cfg.cor }}>Sumário:</strong> {rep.sumario_executivo}
                                </div>
                              )}
                              {isEditando && (
                                <div style={{ marginTop: 12 }}>
                                  <label style={{ fontSize: 13, color: "#BA7517", display: "block", marginBottom: 6 }}>
                                    Observações finais (editável):
                                  </label>
                                  <textarea value={conteudoEditado} onChange={e => setConteudoEditado(e.target.value)}
                                    rows={5} style={{ width: "100%", boxSizing: "border-box", fontSize: 13, border: "0.5px solid #BA7517", borderRadius: 8, padding: "10px 12px", resize: "vertical" }} />
                                </div>
                              )}
                              {rep.pontos_positivos?.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  <p style={{ fontSize: 12, fontWeight: 600, color: "#4CAF82", marginBottom: 6 }}>Pontos positivos</p>
                                  {rep.pontos_positivos.map((p, i) => (
                                    <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#edfff6", borderRadius: 6, marginBottom: 4 }}>✓ {p}</div>
                                  ))}
                                </div>
                              )}
                              {rep.areas_de_atencao?.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  <p style={{ fontSize: 12, fontWeight: 600, color: "#BA7517", marginBottom: 6 }}>Áreas de atenção</p>
                                  {rep.areas_de_atencao.map((a, i) => (
                                    <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#faeeda", borderRadius: 6, marginBottom: 4 }}>! {a}</div>
                                  ))}
                                </div>
                              )}
                              {rep.recomendacoes?.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  <p style={{ fontSize: 12, fontWeight: 600, color: "#2B9EC3", marginBottom: 6 }}>Recomendações</p>
                                  {rep.recomendacoes.map((r, i) => (
                                    <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#e8f7fd", borderRadius: 6, marginBottom: 4 }}>→ {r}</div>
                                  ))}
                                </div>
                              )}
                              {rep.metas_proxima_periodo?.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  <p style={{ fontSize: 12, fontWeight: 600, color: "#534AB7", marginBottom: 6 }}>Metas</p>
                                  {rep.metas_proxima_periodo.map((m, i) => (
                                    <div key={i} style={{ fontSize: 13, padding: "4px 10px", background: "#EEEDFE", borderRadius: 6, marginBottom: 4 }}>◎ {m}</div>
                                  ))}
                                </div>
                              )}
                              {rep.observacoes_finais && !isEditando && (
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
            })
          )}
        </div>
      </main>
    </div>
  );
}

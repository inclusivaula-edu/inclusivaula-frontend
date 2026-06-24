import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLesson } from "../contexts/LessonContext";
import { supabase } from "../services/supabaseClient";
import { generateLesson } from "../services/mapiClient";
import icone from "../assets/icone.png";

const SERIES = [
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
  "1º EM", "2º EM", "3º EM"
];

const DISCIPLINAS = [
  "Matemática", "Língua Portuguesa", "Ciências", "História",
  "Geografia", "Artes", "Educação Física", "Inglês", "Outra"
];

const PERIODOS = [
  "1º Bimestre 2026", "2º Bimestre 2026", "3º Bimestre 2026", "4º Bimestre 2026",
  "1º Trimestre 2026", "2º Trimestre 2026", "3º Trimestre 2026",
  "1º Semestre 2026", "2º Semestre 2026", "Ano letivo 2026"
];

export default function Classes() {
  const { user } = useAuth();
  const { setJobId, setStatus } = useLesson();
  const navigate = useNavigate();

  // Dados globais
  const [escolas, setEscolas] = useState([]);
  const [escolasMap, setEscolasMap] = useState({});
  const [todasTurmas, setTodasTurmas] = useState([]);   // todas as turmas de todas as escolas
  const [todosAlunos, setTodosAlunos] = useState([]);   // todos os alunos
  const [temMultiEscolas, setTemMultiEscolas] = useState(false);

  // Filtros de cascata (lista principal)
  const [escolaFiltro, setEscolaFiltro] = useState("todas"); // schoolId ou "todas"
  const [turmaFiltro, setTurmaFiltro] = useState("todas");   // classId ou "todas"

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Navegação interna
  const [aba, setAba] = useState("lista"); // lista | criar | detalhe
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [alunosDaTurma, setAlunosDaTurma] = useState([]);
  const [alunosSelecionados, setAlunosSelecionados] = useState([]);

  // Formulário nova turma
  const [formTurma, setFormTurma] = useState({
    name: "", grade: "1º ano", turma: "", disciplina: "Ciências",
    periodo: "1º Bimestre 2026", year: "2026", school_id: ""
  });
  const [salvandoTurma, setSalvandoTurma] = useState(false);

  // Formulário gerar aula
  const [formAula, setFormAula] = useState({ tema: "", objetivo: "", duracao: 50 });
  const [gerandoAula, setGerandoAula] = useState(false);
  const [progresso, setProgresso] = useState(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const { data: profile } = await supabase
        .from("profiles").select("school_id, cargo").eq("id", user.id).single();

      const cargo = profile?.cargo || "professor";
      const mySchoolId = profile?.school_id;

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

      const eMap = {};
      escolasData.forEach(e => { eMap[e.id] = e; });
      setEscolas(escolasData);
      setEscolasMap(eMap);
      setTemMultiEscolas(escolasData.length > 1);

      // Se só tem 1 escola, pré-seleciona
      if (escolasData.length === 1) {
        setEscolaFiltro(escolasData[0].id);
        setFormTurma(p => ({ ...p, school_id: escolasData[0].id }));
      }

      // Carrega turmas de todas as escolas
      const schoolIds = escolasData.map(e => e.id);
      let turmasData = [];
      if (schoolIds.length > 0) {
        const { data } = await supabase
          .from("classes").select("*")
          .in("school_id", schoolIds)
          .order("created_at", { ascending: false });
        turmasData = data || [];
      }
      setTodasTurmas(turmasData);

      // Carrega todos os alunos
      let alunosData = [];
      if (schoolIds.length > 0) {
        const { data } = await supabase
          .from("students").select("id, full_name, grade, disability_type, turma, school_id")
          .in("school_id", schoolIds).order("full_name");
        alunosData = data || [];
      }
      setTodosAlunos(alunosData);

      setLoading(false);
    }
    if (user) carregar();
  }, [user]);

  // Turmas filtradas por escola selecionada
  const turmasFiltradas = todasTurmas.filter(t =>
    escolaFiltro === "todas" || t.school_id === escolaFiltro
  );

  // Turmas visíveis na lista (com filtro de turma específica)
  const turmasVisiveis = turmaFiltro === "todas"
    ? turmasFiltradas
    : turmasFiltradas.filter(t => t.id === turmaFiltro);

  // Alunos filtrados (por escola e turma)
  const alunosFiltrados = (() => {
    let list = todosAlunos;
    if (escolaFiltro !== "todas") list = list.filter(a => a.school_id === escolaFiltro);
    if (turmaFiltro !== "todas") {
      const t = todasTurmas.find(t => t.id === turmaFiltro);
      if (t) list = list.filter(a => a.turma === t.turma && a.grade === t.grade);
    }
    return list;
  })();

  async function handleAbrirTurma(turma) {
    setTurmaSelecionada(turma);
    setAlunosSelecionados([]);

    const { data: enrollments } = await supabase
      .from("enrollments").select("student_id").eq("class_id", turma.id);
    const ids = (enrollments || []).map(e => e.student_id);
    const matriculados = todosAlunos.filter(a => ids.includes(a.id));
    setAlunosDaTurma(matriculados);
    setAlunosSelecionados(matriculados.map(a => a.id));
    setAba("detalhe");
  }

  async function handleCriarTurma() {
    const schoolId = formTurma.school_id || (escolas[0]?.id);
    if (!formTurma.name.trim()) { mostrarFeedback("Informe o nome da turma.", "erro"); return; }
    if (!schoolId) { mostrarFeedback("Selecione a escola.", "erro"); return; }
    setSalvandoTurma(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .insert([{
          school_id: schoolId,
          teacher_id: user.id,
          name: formTurma.name,
          grade: formTurma.grade,
          turma: formTurma.turma || null,
          disciplina: formTurma.disciplina,
          periodo: formTurma.periodo,
          year: formTurma.year
        }])
        .select().single();
      if (error) throw new Error(error.message);
      setTodasTurmas(prev => [data, ...prev]);
      setFormTurma({ name: "", grade: "1º ano", turma: "", disciplina: "Ciências", periodo: "1º Bimestre 2026", year: "2026", school_id: schoolId });
      setAba("lista");
      mostrarFeedback("Turma criada com sucesso!");
    } catch (err) {
      mostrarFeedback(err.message, "erro");
    } finally {
      setSalvandoTurma(false);
    }
  }

  async function handleMatricular(alunoId) {
    const jaMatriculado = alunosDaTurma.find(a => a.id === alunoId);
    if (jaMatriculado) {
      await supabase.from("enrollments").delete().eq("class_id", turmaSelecionada.id).eq("student_id", alunoId);
      setAlunosDaTurma(prev => prev.filter(a => a.id !== alunoId));
      setAlunosSelecionados(prev => prev.filter(id => id !== alunoId));
    } else {
      await supabase.from("enrollments").insert([{ class_id: turmaSelecionada.id, student_id: alunoId }]);
      const aluno = todosAlunos.find(a => a.id === alunoId);
      if (aluno) {
        setAlunosDaTurma(prev => [...prev, aluno]);
        setAlunosSelecionados(prev => [...prev, alunoId]);
      }
    }
  }

  async function handleExcluirTurma(turmaId) {
    if (!window.confirm("Excluir esta turma? As matrículas também serão removidas.")) return;
    await supabase.from("enrollments").delete().eq("class_id", turmaId);
    await supabase.from("classes").delete().eq("id", turmaId);
    setTodasTurmas(prev => prev.filter(t => t.id !== turmaId));
    setAba("lista");
    mostrarFeedback("Turma excluída.");
  }

  async function handleGerarAulaTurma() {
    if (!formAula.tema.trim()) { mostrarFeedback("Informe o tema da aula.", "erro"); return; }
    if (alunosSelecionados.length === 0) { mostrarFeedback("Selecione pelo menos um aluno.", "erro"); return; }
    setGerandoAula(true);
    setProgresso({ atual: 0, total: alunosSelecionados.length });
    try {
      for (let i = 0; i < alunosSelecionados.length; i++) {
        const alunoId = alunosSelecionados[i];
        const aluno = todosAlunos.find(a => a.id === alunoId);
        setProgresso({ atual: i + 1, total: alunosSelecionados.length });
        await generateLesson({
          tema: formAula.tema,
          disciplina: turmaSelecionada.disciplina,
          deficiencia: aluno?.disability_type || "Geral",
          serie: aluno?.grade || turmaSelecionada.grade,
          duracao: Number(formAula.duracao),
          objetivo: formAula.objetivo,
          periodo: turmaSelecionada.periodo,
          student_id: alunoId,
          student: aluno || null
        });
      }
      mostrarFeedback(`${alunosSelecionados.length} aula(s) gerada(s)! Acesse o Histórico.`);
      setFormAula({ tema: "", objetivo: "", duracao: 50 });
    } catch (err) {
      mostrarFeedback(err.message, "erro");
    } finally {
      setGerandoAula(false);
      setProgresso(null);
    }
  }

  function mostrarFeedback(msg, tipo = "sucesso") {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 4000);
  }

  const labelStyle = { fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 };
  const inputFull = { width: "100%", boxSizing: "border-box" };

  // Alunos da escola da turma selecionada (para matricular)
  const alunosDaEscolaDaTurma = todosAlunos.filter(a =>
    turmaSelecionada ? a.school_id === turmaSelecionada.school_id : true
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f9ff" }}>
      {feedback && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: feedback.tipo === "erro" ? "#791f1f" : "#0F6E56",
          color: "#fff", padding: "10px 24px", borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)", maxWidth: "90vw", textAlign: "center"
        }}>{feedback.msg}</div>
      )}

      <header style={{
        background: "#fff", borderBottom: "0.5px solid #d3d1c7",
        padding: "1rem 2rem", display: "flex",
        justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => aba === "detalhe" ? setAba("lista") : aba === "criar" ? setAba("lista") : navigate("/dashboard")}
            style={{ fontSize: 13 }}>
            ← {aba === "detalhe" ? "Turmas" : aba === "criar" ? "Cancelar" : "Voltar"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={icone} alt="InclusivAula" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: "#2B9EC3" }}>
              Inclusiv<span style={{ color: "#4CAF82" }}>Aula</span>
            </span>
          </div>
        </div>
        {aba === "lista" && (
          <button onClick={() => setAba("criar")} style={{
            fontSize: 13, padding: "8px 16px",
            background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
            color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
          }}>+ Nova turma</button>
        )}
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* ── LISTA ── */}
        {aba === "lista" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Turmas</h2>
            <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 20 }}>
              {todasTurmas.length} turma(s) cadastrada(s)
            </p>

            {/* CASCATA: Escola */}
            {temMultiEscolas && (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: "#5f5e5a", fontWeight: 500 }}>🏫 Escola</label>
                  <button onClick={() => { setEscolaFiltro("todas"); setTurmaFiltro("todas"); }}
                    style={{ fontSize: 11, padding: "3px 10px", background: escolaFiltro === "todas" ? "#2B9EC3" : "#e8f7fd", color: escolaFiltro === "todas" ? "#fff" : "#1a6e8a", border: "0.5px solid #2B9EC3", borderRadius: 6, cursor: "pointer" }}>
                    TODAS
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {escolas.map(e => (
                    <button key={e.id} onClick={() => { setEscolaFiltro(e.id); setTurmaFiltro("todas"); }}
                      style={{
                        fontSize: 12, padding: "5px 14px", borderRadius: 20,
                        background: escolaFiltro === e.id ? "#2B9EC3" : "#f5f9ff",
                        color: escolaFiltro === e.id ? "#fff" : "#2B9EC3",
                        border: `0.5px solid ${escolaFiltro === e.id ? "#2B9EC3" : "#d3d1c7"}`,
                        cursor: "pointer"
                      }}>
                      {e.name}
                      <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.8 }}>
                        ({todasTurmas.filter(t => t.school_id === e.id).length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CASCATA: Turma */}
            {turmasFiltradas.length > 0 && (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: "#5f5e5a", fontWeight: 500 }}>📚 Turma</label>
                  <button onClick={() => setTurmaFiltro("todas")}
                    style={{ fontSize: 11, padding: "3px 10px", background: turmaFiltro === "todas" ? "#534AB7" : "#EEEDFE", color: turmaFiltro === "todas" ? "#fff" : "#534AB7", border: "0.5px solid #534AB7", borderRadius: 6, cursor: "pointer" }}>
                    TODAS
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {turmasFiltradas.map(t => (
                    <button key={t.id} onClick={() => setTurmaFiltro(t.id)}
                      style={{
                        fontSize: 12, padding: "5px 14px", borderRadius: 20,
                        background: turmaFiltro === t.id ? "#534AB7" : "#f5f9ff",
                        color: turmaFiltro === t.id ? "#fff" : "#534AB7",
                        border: `0.5px solid ${turmaFiltro === t.id ? "#534AB7" : "#d3d1c7"}`,
                        cursor: "pointer"
                      }}>
                      {t.name}
                      {temMultiEscolas && escolaFiltro === "todas" && (
                        <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.75 }}>
                          ({escolasMap[t.school_id]?.name})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RESULTADO: alunos do filtro */}
            {turmaFiltro !== "todas" && (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: "#5f5e5a", fontWeight: 500 }}>
                    👨‍🎓 Alunos — {alunosFiltrados.length} encontrados
                  </label>
                </div>
                {alunosFiltrados.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>Nenhum aluno nesta turma ainda.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {alunosFiltrados.map(a => (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "0.5px solid #f1efe8" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                          {a.full_name.charAt(0)}
                        </div>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{a.full_name}</span>
                          {a.grade && <span style={{ fontSize: 12, color: "#5f5e5a", marginLeft: 6 }}>{a.grade}</span>}
                          {a.disability_type && <span style={{ fontSize: 12, color: "#2B9EC3", marginLeft: 6 }}>· {a.disability_type}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CARDS DAS TURMAS */}
            {loading ? (
              <p style={{ color: "#5f5e5a", fontSize: 14 }}>Carregando...</p>
            ) : turmasVisiveis.length === 0 ? (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "2.5rem", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
                <p style={{ fontSize: 15, color: "#5f5e5a", marginBottom: 16 }}>
                  {todasTurmas.length === 0 ? "Nenhuma turma cadastrada ainda." : "Nenhuma turma para o filtro selecionado."}
                </p>
                {todasTurmas.length === 0 && (
                  <button onClick={() => setAba("criar")} style={{
                    padding: "10px 24px", fontSize: 14,
                    background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                    color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"
                  }}>Criar primeira turma</button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {turmasVisiveis.map(t => {
                  const escola = escolasMap[t.school_id];
                  return (
                    <div key={t.id} style={{
                      background: "#fff", border: "0.5px solid #d3d1c7",
                      borderLeft: "3px solid #2B9EC3", borderRadius: 10,
                      padding: "16px 20px", cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(43,158,195,0.04)"
                    }} onClick={() => handleAbrirTurma(t)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: "#2B9EC3" }}>
                            {t.name}
                          </p>
                          <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0 }}>
                            {t.grade}{t.turma ? ` · Turma ${t.turma}` : ""}
                            {t.disciplina ? ` · ${t.disciplina}` : ""}
                            {t.periodo ? ` · ${t.periodo}` : ""}
                          </p>
                          {temMultiEscolas && escola && (
                            <p style={{ fontSize: 12, color: "#BA7517", margin: "4px 0 0" }}>
                              🏫 {escola.name}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleExcluirTurma(t.id); }}
                          style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#a32d2d", border: "0.5px solid #f7c1c1", borderRadius: 6, cursor: "pointer" }}>
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── CRIAR TURMA ── */}
        {aba === "criar" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 24 }}>Nova turma</h2>
            <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 8px rgba(43,158,195,0.06)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Escola — só aparece se tiver múltiplas */}
                {temMultiEscolas && (
                  <div>
                    <label style={labelStyle}>Escola *</label>
                    <select value={formTurma.school_id} onChange={e => setFormTurma(p => ({ ...p, school_id: e.target.value }))} style={inputFull}>
                      <option value="">— Selecione a escola —</option>
                      {escolas.map(e => <option key={e.id} value={e.id}>{e.name} · {e.city}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Nome da turma *</label>
                  <input value={formTurma.name} onChange={e => setFormTurma(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: 7º Ano A — Ciências" style={inputFull} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Série</label>
                    <select value={formTurma.grade} onChange={e => setFormTurma(p => ({ ...p, grade: e.target.value }))} style={inputFull}>
                      {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Turma</label>
                    <input value={formTurma.turma} onChange={e => setFormTurma(p => ({ ...p, turma: e.target.value }))}
                      placeholder="A, B, C..." style={inputFull} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ano letivo</label>
                    <input value={formTurma.year} onChange={e => setFormTurma(p => ({ ...p, year: e.target.value }))}
                      placeholder="2026" style={inputFull} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Disciplina</label>
                    <select value={formTurma.disciplina} onChange={e => setFormTurma(p => ({ ...p, disciplina: e.target.value }))} style={inputFull}>
                      {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Período</label>
                    <select value={formTurma.periodo} onChange={e => setFormTurma(p => ({ ...p, periodo: e.target.value }))} style={inputFull}>
                      {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <button onClick={() => setAba("lista")} style={{ flex: 1, padding: "10px", fontSize: 13 }}>
                    Cancelar
                  </button>
                  <button onClick={handleCriarTurma} disabled={salvandoTurma} style={{
                    flex: 2, padding: "10px",
                    background: salvandoTurma ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                    color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 13, fontWeight: 500, cursor: salvandoTurma ? "not-allowed" : "pointer"
                  }}>
                    {salvandoTurma ? "Criando..." : "Criar turma"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── DETALHE DA TURMA ── */}
        {aba === "detalhe" && turmaSelecionada && (
          <>
            <div style={{ background: "linear-gradient(135deg, #2B9EC3, #4CAF82)", borderRadius: 12, padding: "1.2rem 1.5rem", marginBottom: 24, color: "#fff" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{turmaSelecionada.name}</h2>
              <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
                {turmaSelecionada.grade}{turmaSelecionada.turma ? ` · Turma ${turmaSelecionada.turma}` : ""}
                {turmaSelecionada.disciplina ? ` · ${turmaSelecionada.disciplina}` : ""}
                {turmaSelecionada.periodo ? ` · ${turmaSelecionada.periodo}` : ""}
                {temMultiEscolas && escolasMap[turmaSelecionada.school_id] && (
                  <span style={{ marginLeft: 8, opacity: 0.85 }}>
                    · {escolasMap[turmaSelecionada.school_id].name}
                  </span>
                )}
              </p>
            </div>

            {/* Alunos matriculados */}
            <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 500, color: "#2B9EC3", margin: 0 }}>
                  Alunos matriculados ({alunosDaTurma.length})
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => {
                    const ids = alunosDaEscolaDaTurma.map(a => a.id);
                    const novos = ids.filter(id => !alunosDaTurma.find(m => m.id === id));
                    novos.forEach(id => handleMatricular(id));
                  }} style={{ fontSize: 11, padding: "3px 10px", background: "#edfff6", color: "#0F6E56", border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer" }}>
                    + Todos
                  </button>
                </div>
              </div>

              {alunosDaEscolaDaTurma.length === 0 ? (
                <p style={{ fontSize: 13, color: "#5f5e5a" }}>Nenhum aluno cadastrado nesta escola ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alunosDaEscolaDaTurma.map(a => {
                    const matriculado = alunosDaTurma.find(m => m.id === a.id);
                    return (
                      <div key={a.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", borderRadius: 8,
                        background: matriculado ? "#edfff6" : "#f5f9ff",
                        border: `0.5px solid ${matriculado ? "#4CAF82" : "#d3d1c7"}`
                      }}>
                        <div>
                          <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{a.full_name}</p>
                          <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>
                            {a.grade}{a.disability_type ? ` · ${a.disability_type}` : ""}
                          </p>
                        </div>
                        <button onClick={() => handleMatricular(a.id)} style={{
                          fontSize: 12, padding: "5px 12px",
                          background: matriculado ? "#4CAF82" : "#fff",
                          color: matriculado ? "#fff" : "#4CAF82",
                          border: "0.5px solid #4CAF82", borderRadius: 6, cursor: "pointer"
                        }}>
                          {matriculado ? "Matriculado" : "+ Matricular"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gerar aula para a turma */}
            {alunosDaTurma.length > 0 && (
              <div style={{ background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 12, padding: "1.5rem" }}>
                <h3 style={{ fontSize: 15, fontWeight: 500, color: "#534AB7", marginBottom: 8 }}>
                  Gerar aula para a turma
                </h3>
                <p style={{ fontSize: 13, color: "#5f5e5a", marginBottom: 16 }}>
                  O Nexus7 vai gerar uma aula personalizada para cada aluno selecionado, adaptada ao perfil de NEE de cada um.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Tema da aula *</label>
                    <input value={formAula.tema} onChange={e => setFormAula(p => ({ ...p, tema: e.target.value }))}
                      placeholder="Ex: frações, fotossíntese, Segunda Guerra..."
                      style={inputFull} />
                  </div>

                  <div>
                    <label style={labelStyle}>Duração: {formAula.duracao} minutos</label>
                    <input type="range" min="30" max="120" step="10"
                      value={formAula.duracao} onChange={e => setFormAula(p => ({ ...p, duracao: e.target.value }))}
                      style={{ width: "100%", accentColor: "#534AB7" }} />
                  </div>

                  <div>
                    <label style={labelStyle}>Objetivo (opcional)</label>
                    <textarea value={formAula.objetivo} onChange={e => setFormAula(p => ({ ...p, objetivo: e.target.value }))}
                      placeholder="Ex: que o aluno compreenda o conceito de..."
                      rows={2} style={{ ...inputFull, resize: "vertical" }} />
                  </div>

                  {/* Seleção de alunos — com TODOS */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={labelStyle}>
                        Gerar para ({alunosSelecionados.length}/{alunosDaTurma.length} alunos)
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setAlunosSelecionados(alunosDaTurma.map(a => a.id))}
                          style={{ fontSize: 11, padding: "3px 10px", background: "#EEEDFE", color: "#534AB7", border: "0.5px solid #534AB7", borderRadius: 6, cursor: "pointer" }}>
                          TODOS
                        </button>
                        <button onClick={() => setAlunosSelecionados([])}
                          style={{ fontSize: 11, padding: "3px 10px", background: "#fff", color: "#5f5e5a", border: "0.5px solid #d3d1c7", borderRadius: 6, cursor: "pointer" }}>
                          Limpar
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {alunosDaTurma.map(a => (
                        <button key={a.id}
                          onClick={() => setAlunosSelecionados(prev =>
                            prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]
                          )}
                          style={{
                            fontSize: 12, padding: "4px 12px",
                            background: alunosSelecionados.includes(a.id) ? "#534AB7" : "#fff",
                            color: alunosSelecionados.includes(a.id) ? "#fff" : "#534AB7",
                            border: "0.5px solid #534AB7", borderRadius: 20, cursor: "pointer"
                          }}>
                          {a.full_name.split(" ")[0]}
                          {a.disability_type && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}>({a.disability_type.split(" ")[0]})</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleGerarAulaTurma} disabled={gerandoAula || alunosSelecionados.length === 0} style={{
                    width: "100%", padding: "12px",
                    background: gerandoAula || alunosSelecionados.length === 0 ? "#ccc" : "linear-gradient(135deg, #534AB7, #2B9EC3)",
                    color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 15, fontWeight: 500,
                    cursor: gerandoAula || alunosSelecionados.length === 0 ? "not-allowed" : "pointer"
                  }}>
                    {gerandoAula && progresso
                      ? `Gerando ${progresso.atual} de ${progresso.total}...`
                      : `Gerar aula para ${alunosSelecionados.length} aluno(s)`}
                  </button>

                  {gerandoAula && progresso && progresso.total > 1 && (
                    <div>
                      <div style={{ height: 6, background: "#f1efe8", borderRadius: 3 }}>
                        <div style={{
                          height: 6, borderRadius: 3,
                          width: `${(progresso.atual / progresso.total) * 100}%`,
                          background: "linear-gradient(135deg, #534AB7, #2B9EC3)",
                          transition: "width 0.3s"
                        }} />
                      </div>
                      <p style={{ fontSize: 12, color: "#5f5e5a", marginTop: 6, textAlign: "center" }}>
                        {progresso.atual}/{progresso.total} aulas geradas
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => handleExcluirTurma(turmaSelecionada.id)} style={{
              marginTop: 24, width: "100%", padding: "10px",
              background: "#fff", color: "#a32d2d",
              border: "0.5px solid #f7c1c1", borderRadius: 8,
              fontSize: 13, cursor: "pointer"
            }}>
              Excluir turma
            </button>
          </>
        )}
      </main>
    </div>
  );
}
